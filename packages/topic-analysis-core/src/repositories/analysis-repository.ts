import { createAdminClient } from "@mirai-gikai/supabase";
import type {
  InterviewConfigContext,
  ProgressData,
  TargetOpinion,
} from "../shared/types";
import type { HierarchyTopicRow } from "../utils/build-hierarchy-save-plan";
import {
  hasLinkedOpinion,
  selectLeafTopics,
} from "../utils/select-leaf-topics";

type VersionStatus = "pending" | "running" | "completed" | "failed";

/**
 * 1回の取得で読むページ幅。Supabase/PostgREST の既定行数上限（1000）に依存せず
 * 全件取得するため、この幅でページネーションする。1000 未満の安全な値にする。
 */
const TARGET_OPINIONS_PAGE_SIZE = 500;

const TARGET_OPINIONS_SELECT = `id, opinion_index, title, content, contextual_quote, richness, topic_extracted_at, opinion_id,
       opinions!inner(
         review_status, moderation_status,
         interview_sessions!inner(interview_config_id)
       )`;

/**
 * §8 フィルタ後の分析対象意見を取得する。
 * opinion_segments
 * → opinions(review_status='published', moderation_status='ok')
 * → interview_sessions(interview_config_id) を辿る。
 * 公開済み（review_status が公開状態の正本）かつモデレーションOKの意見のみ分析対象とする。
 */
export async function fetchTargetOpinions(
  interviewConfigId: string
): Promise<TargetOpinion[]> {
  const supabase = createAdminClient();
  const all: TargetOpinion[] = [];

  // keyset(カーソル)ページネーション。(opinion_id, opinion_index) は一意なので、
  // 「直前ページ末尾より後ろ」を順に読む。offset 方式と違い、取得中に新規意見が挿入されても
  // 既読行のズレ（重複・取りこぼし）が起きない（opinion_id はランダム UUID のため offset では危険）。
  let cursor: { opinionId: string; opinionIndex: number } | null = null;

  for (;;) {
    let query = supabase
      .from("opinion_segments")
      .select(TARGET_OPINIONS_SELECT)
      .eq("opinions.review_status", "published")
      .eq("opinions.moderation_status", "ok")
      .eq(
        "opinions.interview_sessions.interview_config_id",
        interviewConfigId
      )
      .order("opinion_id", { ascending: true })
      .order("opinion_index", { ascending: true })
      .limit(TARGET_OPINIONS_PAGE_SIZE);

    if (cursor) {
      // (opinion_id, opinion_index) > (cursor) をタプル比較で表現する。
      query = query.or(
        `opinion_id.gt.${cursor.opinionId},and(opinion_id.eq.${cursor.opinionId},opinion_index.gt.${cursor.opinionIndex})`
      );
    }

    const { data, error } = await query;
    if (error) {
      throw new Error(`Failed to fetch target opinions: ${error.message}`);
    }

    const rows = data ?? [];
    for (const row of rows) {
      all.push({
        opinion_segment_id: row.id,
        opinion_id: row.opinion_id,
        opinion_index: row.opinion_index,
        title: row.title,
        content: row.content,
        contextual_quote: row.contextual_quote,
        richness: row.richness ?? null,
        topic_extracted_at: row.topic_extracted_at ?? null,
      });
    }

    if (rows.length < TARGET_OPINIONS_PAGE_SIZE) break;
    const last = rows[rows.length - 1];
    cursor = {
      opinionId: last.opinion_id,
      opinionIndex: last.opinion_index,
    };
  }

  return all;
}

/**
 * 指定意見にトピック抽出済みウォーターマーク(topic_extracted_at)を記録する（増分用）。
 * 次回以降の増分抽出で「新規(未抽出)」対象から外すため。
 * DB 関数 mark_opinions_extracted で単一トランザクション一括更新する（部分更新を残さない）。
 */
export async function markOpinionsExtracted(
  opinionSegmentIds: string[]
): Promise<void> {
  if (opinionSegmentIds.length === 0) return;
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("mark_opinions_extracted", {
    p_ids: opinionSegmentIds,
    p_extracted_at: new Date().toISOString(),
  });
  if (error) {
    throw new Error(`Failed to mark opinions extracted: ${error.message}`);
  }
}

/** 全意見募集の id・テーマ名を取得する（全テーマ分析の対象列挙・ログ表示用）。 */
export async function listAllInterviewConfigs(): Promise<
  Array<{ id: string; name: string }>
> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("interview_configs")
    .select("id, name");
  if (error) {
    throw new Error(`Failed to list interview configs: ${error.message}`);
  }
  return (data ?? []).map((c) => ({ id: c.id, name: c.name }));
}

/**
 * 意見募集コンテキスト（プロンプト接地用）を取得する。
 * テーマ名・説明に加えて、policies_interview_configs で紐づく施策の
 * 名前と本文（policy_contents の normal 優先）を並べる。
 * 施策0件の抽象テーマ型では policies が空配列になる。
 */
export async function fetchInterviewConfigContext(
  interviewConfigId: string
): Promise<InterviewConfigContext> {
  const supabase = createAdminClient();
  // テーマ本体と紐づく施策は互いに独立なので並列で引く。
  const [
    { data: config, error },
    { data: links, error: linksError },
  ] = await Promise.all([
    supabase
      .from("interview_configs")
      .select("name, description")
      .eq("id", interviewConfigId)
      .single(),
    supabase
      .from("policies_interview_configs")
      .select(
        "policies!inner(name, policy_contents(summary, content, difficulty_level))"
      )
      .eq("interview_config_id", interviewConfigId),
  ]);
  if (error) {
    throw new Error(`Failed to fetch interview config: ${error.message}`);
  }
  if (linksError) {
    throw new Error(`Failed to fetch linked policies: ${linksError.message}`);
  }

  const policies = (links ?? []).map((link) => {
    const contents = link.policies.policy_contents ?? [];
    const normal =
      contents.find((c) => c.difficulty_level === "normal") ?? contents[0];
    return {
      name: link.policies.name,
      summary: normal?.summary ?? null,
      body: normal?.content ?? null,
    };
  });

  return {
    name: config.name,
    description: config.description,
    policies,
  };
}

/** テーマ内で running/pending の version があれば返す（二重起動防止用・§5.3）。 */
export async function findActiveVersionByInterviewConfig(
  interviewConfigId: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic_analysis_version")
    .select("id, status, started_at, created_at")
    .eq("interview_config_id", interviewConfigId)
    .in("status", ["pending", "running"])
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to check active version: ${error.message}`);
  }
  return data;
}

/** 新しい version を作成する（テーマ内連番）。 */
export async function createVersion({
  interviewConfigId,
  trigger,
  model,
  promptVersion,
}: {
  interviewConfigId: string;
  trigger: "manual" | "cron";
  model: string;
  promptVersion: string;
}) {
  const supabase = createAdminClient();
  const { data: last, error: lastError } = await supabase
    .from("topic_analysis_version")
    .select("version")
    .eq("interview_config_id", interviewConfigId)
    .order("version", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (lastError) {
    throw new Error(`Failed to read last version: ${lastError.message}`);
  }
  const nextVersion = (last?.version ?? 0) + 1;

  const { data, error } = await supabase
    .from("topic_analysis_version")
    .insert({
      interview_config_id: interviewConfigId,
      version: nextVersion,
      status: "pending",
      trigger,
      model,
      prompt_version: promptVersion,
    })
    .select()
    .single();

  if (error) {
    // 一意制約違反（23505）= 同時実行で既に active な version が作られた／同一 version 番号が衝突した。
    // one_active_version_per_interview_config による二重起動ガードに弾かれたケースなので、
    // エラーにせず null を返して呼び出し側でスキップ扱いにする（TOCTOU 対策）。
    if (error.code === "23505") {
      return null;
    }
    throw new Error(`Failed to create version: ${error.message}`);
  }
  return data;
}

export async function updateVersionStatus(
  versionId: string,
  status: VersionStatus,
  errorMessage?: string
): Promise<void> {
  const supabase = createAdminClient();
  const patch: Record<string, unknown> = { status };
  if (status === "running") patch.started_at = new Date().toISOString();
  if (errorMessage !== undefined) patch.error_message = errorMessage;
  const { error } = await supabase
    .from("topic_analysis_version")
    .update(patch)
    .eq("id", versionId);
  if (error) {
    throw new Error(`Failed to update version status: ${error.message}`);
  }
}

export async function updateVersionStep(
  versionId: string,
  step: string
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("topic_analysis_version")
    .update({ current_step: step })
    .eq("id", versionId);
  if (error) {
    throw new Error(`Failed to update version step: ${error.message}`);
  }
}

export async function saveProgress(
  versionId: string,
  progress: ProgressData
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("topic_analysis_version")
    .update({ progress: progress as never })
    .eq("id", versionId);
  if (error) {
    throw new Error(`Failed to save progress: ${error.message}`);
  }
}

export async function loadProgress(versionId: string): Promise<ProgressData> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic_analysis_version")
    .select("progress")
    .eq("id", versionId)
    .single();
  if (error) {
    throw new Error(`Failed to load progress: ${error.message}`);
  }
  if (!data.progress) {
    throw new Error(`Progress not found for version ${versionId}`);
  }
  return data.progress as unknown as ProgressData;
}

/**
 * 階層トピックと意見の紐付けを保存する。
 *
 * 親を先に insert して id を確定させ、その id を子の parent_topic_id に載せる。
 * sort_order は平坦化後の並び順（大トピック → 配下の中トピック）。
 *
 * 親→子→紐付けの3往復で、単一トランザクションではない。途中で失敗した version は
 * runAnalysis の catch で failed になり、失敗した version を読む経路が無いため
 * 中途半端な行は表示に出ない。原子性が要るようになったら RPC に寄せる。
 */
export async function saveTopicsAndAssignments(
  versionId: string,
  topics: HierarchyTopicRow[],
  assignments: Array<{ opinion_segment_id: string; topic_index: number }>
): Promise<void> {
  const supabase = createAdminClient();

  if (topics.length === 0) return;

  const idBySortOrder = new Map<number, string>();

  const insertRows = async (
    rows: Array<{
      version_id: string;
      title: string;
      description: string;
      sort_order: number;
      parent_topic_id: string | null;
    }>
  ) => {
    if (rows.length === 0) return;
    const { data, error } = await supabase
      .from("topic")
      .insert(rows)
      .select("id, sort_order");
    if (error) {
      throw new Error(`Failed to insert topics: ${error.message}`);
    }
    for (const row of data ?? []) {
      idBySortOrder.set(row.sort_order, row.id);
    }
  };

  const parents: HierarchyTopicRow[] = [];
  const children: Array<HierarchyTopicRow & { parent_sort_order: number }> = [];
  for (const topic of topics) {
    if (topic.parent_sort_order === null) {
      parents.push(topic);
    } else {
      children.push({ ...topic, parent_sort_order: topic.parent_sort_order });
    }
  }

  await insertRows(
    parents.map((t) => ({
      version_id: versionId,
      title: t.title,
      description: t.description,
      sort_order: t.sort_order,
      parent_topic_id: null,
    }))
  );

  const childRows = children.map((t) => {
    const parentId = idBySortOrder.get(t.parent_sort_order);
    if (!parentId) {
      throw new Error(
        `Failed to insert topics: parent not found for sort_order=${t.sort_order}`
      );
    }
    return {
      version_id: versionId,
      title: t.title,
      description: t.description,
      sort_order: t.sort_order,
      parent_topic_id: parentId,
    };
  });
  await insertRows(childRows);

  const topicOpinionRows = assignments
    .map((a) => {
      const topicId = idBySortOrder.get(a.topic_index);
      return topicId
        ? {
            version_id: versionId,
            opinion_segment_id: a.opinion_segment_id,
            topic_id: topicId,
          }
        : null;
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  if (topicOpinionRows.length > 0) {
    const { error: toError } = await supabase
      .from("topic_opinion")
      .insert(topicOpinionRows);
    if (toError) {
      throw new Error(`Failed to insert topic_opinion: ${toError.message}`);
    }
  }
}

/** 完了処理（status=completed, current_step=done, 件数・時刻を記録）。 */
export async function finalizeVersion(
  versionId: string,
  sourceOpinionCount: number
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("topic_analysis_version")
    .update({
      status: "completed",
      current_step: "done",
      source_opinion_count: sourceOpinionCount,
      completed_at: new Date().toISOString(),
      progress: null,
    })
    .eq("id", versionId);
  if (error) {
    throw new Error(`Failed to finalize version: ${error.message}`);
  }
}

/**
 * version を公開する（§7）。「旧公開版を降ろす → 対象を公開」を DB 関数で
 * 単一トランザクション実行し、公開版が0件になる瞬間を外部から不可視にする
 * （アプリ層で2回 update すると公開読み取りが一時的に404になるため・§8）。
 * one_published_per_interview_config（テーマごと公開は最大1版）も満たす。
 */
export async function publishVersion(versionId: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.rpc("publish_topic_analysis_version", {
    p_version_id: versionId,
  });
  if (error) {
    throw new Error(`Failed to publish version: ${error.message}`);
  }
}

/** 公開/非公開を切り替える（Admin 手動操作・§7）。 */
export async function setVersionPublished(
  versionId: string,
  published: boolean
): Promise<void> {
  if (published) {
    await publishVersion(versionId);
    return;
  }
  const supabase = createAdminClient();
  const { error } = await supabase
    .from("topic_analysis_version")
    .update({ is_published: false })
    .eq("id", versionId);
  if (error) {
    throw new Error(`Failed to unpublish version: ${error.message}`);
  }
}

/** ステータス取得（UI ポーリング用）。 */
export async function getVersionStatus(versionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic_analysis_version")
    .select(
      "id, interview_config_id, version, status, current_step, source_opinion_count, error_message, started_at, completed_at"
    )
    .eq("id", versionId)
    .single();
  if (error) {
    throw new Error(`Failed to get version status: ${error.message}`);
  }
  return data;
}

/** テーマのバージョン一覧（結果ビュー用）。 */
export async function listVersionsByInterviewConfig(
  interviewConfigId: string
) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic_analysis_version")
    .select(
      "id, version, status, is_published, current_step, source_opinion_count, created_at, completed_at"
    )
    .eq("interview_config_id", interviewConfigId)
    .order("version", { ascending: false });
  if (error) {
    throw new Error(`Failed to list versions: ${error.message}`);
  }
  return data ?? [];
}

/**
 * トピックを個別削除する（Admin 手動操作）。
 * LLM の誤割当でタイトル・概要と紐づく意見が整合しないトピックを取り除くための操作。
 * versionId も条件に入れて別 version の同名 topic を誤削除しないようにする。
 * topic_opinion（割当）は FK ON DELETE CASCADE で自動削除される（意見自体は削除されない）。
 */
export async function deleteTopic(
  topicId: string,
  versionId: string
): Promise<void> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic")
    .delete()
    .eq("id", topicId)
    .eq("version_id", versionId)
    .select("id");
  if (error) {
    throw new Error(`Failed to delete topic: ${error.message}`);
  }
  if (!data || data.length === 0) {
    throw new Error(`Topic not found: ${topicId}`);
  }
}

/** version のトピックと割当意見（結果ビュー用）。 */
export async function getTopicsWithOpinions(versionId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("topic")
    .select(
      `id, title, description, sort_order, parent_topic_id,
       topic_opinion(
         opinion_segments(id, title, content, contextual_quote, richness)
       )`
    )
    .eq("version_id", versionId)
    .order("sort_order", { ascending: true });
  if (error) {
    throw new Error(`Failed to get topics: ${error.message}`);
  }
  return data ?? [];
}

/**
 * 葉トピック（意見が紐づくトピック）だけを返す。
 *
 * 増分分析の既存トピックと、階層UIを持たない画面の表示はこちらを使う。
 * 大トピックを混ぜると割当先候補になり、意見が大トピックに直接付いて
 * 「意見は葉にだけ紐づく」という不変条件が崩れる。
 * 判定は意見の有無なので、子を全部削除されて子なしになった親も落ちる。
 */
export async function getLeafTopicsWithOpinions(versionId: string) {
  return selectLeafTopics(await getTopicsWithOpinions(versionId), hasLinkedOpinion);
}
