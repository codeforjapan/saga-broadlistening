import { seedLocalAdminUser } from "../shared/admin-user";
import type { AdminClient } from "../shared/helper";
import { clearAllData, createAdminClient } from "../shared/helper";
import {
  createSeedReporter,
  expectOk,
  expectRows,
} from "../shared/insert-seed";
import { seedDemoRespondents } from "../shared/respondents";
import {
  BULK_OPINION_CONFIG_SLUG,
  createBulkOpinionInterviewConfig,
  createBulkOpinionMessages,
  createBulkOpinionQuestions,
  createBulkOpinionSessions,
  createBulkOpinions,
  createRealisticMessages,
  createRealisticOpinion,
  createRealisticSession,
} from "./bulk-opinion-data";
import {
  AI_CHAT_POLICY_NAME,
  additionalInterviewConfigs,
  createAdditionalDemoMessages,
  createAdditionalDemoOpinions,
  createAdditionalDemoSessions,
  createChatMessages,
  createChatSessions,
  createDemoMessages,
  createDemoOpinion,
  createDemoSession,
  createInterviewConfig,
  createInterviewMessages,
  createInterviewQuestions,
  createInterviewSessions,
  createOpinionReactions,
  createOpinions,
  createPoliciesInterviewConfigs,
  createPoliciesTags,
  DEFAULT_CONFIG_SLUG,
  DEMO_OPINION_ID,
  DEMO_OPINION_ID_CITIZEN,
  DEMO_OPINION_ID_DAILY,
  DEMO_OPINION_ID_WORK,
  policies,
  tags,
} from "./data";
import { createPolicyContents } from "./policy-contents-data";
import type { OpinionSeed, OpinionSegmentSeed } from "./seed-types";

/** 投入済みメッセージを (セッションID, 本文) から引くためのキー */
function messageKey(sessionId: string, content: string): string {
  return `${sessionId}\n${content}`;
}

/**
 * 意見と論点をまとめて投入する。
 *
 * `opinion_segments.source_message_id` は対話メッセージの INSERT 後にしか
 * 分からないため、seed が持つ「元メッセージ本文」から解決する。
 * 解決できないのは seed データの不整合なので fail fast させる
 * （silent に進むと source_message_id が欠落した状態で投入される）。
 */
async function insertOpinionsWithSegments(
  supabase: AdminClient,
  seeds: OpinionSeed[],
  messageIdByKey: Map<string, string>
): Promise<{ opinionCount: number; segmentCount: number }> {
  const insertedOpinions = await expectRows(
    "insert opinions",
    supabase
      .from("opinions")
      .insert(seeds.map((seed) => seed.opinion))
      .select("id, interview_session_id")
  );

  const opinionIdBySessionId = new Map(
    insertedOpinions.map((opinion) => [
      opinion.interview_session_id,
      opinion.id,
    ])
  );

  const segments = seeds.flatMap((seed) => {
    const sessionId = seed.opinion.interview_session_id;
    const opinionId = opinionIdBySessionId.get(sessionId);
    if (!opinionId) {
      throw new Error(`Inserted opinion not found for session ${sessionId}`);
    }
    return seed.segments.map((segment) =>
      buildSegmentInsert(segment, opinionId, sessionId, messageIdByKey)
    );
  });

  await expectOk(
    "insert opinion segments",
    supabase.from("opinion_segments").insert(segments)
  );

  return {
    opinionCount: insertedOpinions.length,
    segmentCount: segments.length,
  };
}

function buildSegmentInsert(
  segment: OpinionSegmentSeed,
  opinionId: string,
  sessionId: string,
  messageIdByKey: Map<string, string>
) {
  const { sourceMessageContent, ...rest } = segment;
  if (!sourceMessageContent) {
    return { ...rest, opinion_id: opinionId };
  }

  const sourceMessageId = messageIdByKey.get(
    messageKey(sessionId, sourceMessageContent)
  );
  if (!sourceMessageId) {
    throw new Error(
      `Failed to resolve source message for session ${sessionId}: ${sourceMessageContent}`
    );
  }

  return { ...rest, opinion_id: opinionId, source_message_id: sourceMessageId };
}

async function seedDatabase() {
  const supabase = createAdminClient();
  // 投入ログの出力とサマリー用の件数の記録をまとめて受け持つ
  const reporter = createSeedReporter();
  console.log("🌱 Starting database seeding...");

  try {
    await clearAllData(supabase);

    // ローカル開発用のユーザー（ローカル接続時のみ作成される）
    await seedLocalAdminUser(supabase);
    const respondentIds = await seedDemoRespondents(supabase);

    // === tags ===
    const insertedTags = await reporter.insert({
      startMessage: "🏷️  Inserting tags...",
      label: "tags",
      query: supabase.from("tags").insert(tags).select("id, label"),
    });

    // === policies ===
    const insertedPolicies = await reporter.insert({
      emoji: "📄",
      label: "policies",
      query: supabase.from("policies").insert(policies).select("id, name"),
    });

    // === policy_contents ===
    await reporter.insert({
      emoji: "📚",
      label: "policy contents",
      query: supabase
        .from("policy_contents")
        .insert(createPolicyContents(insertedPolicies))
        .select("id"),
    });

    // === policies_tags ===
    await reporter.insert({
      emoji: "🔗",
      label: "policies-tags relations",
      query: supabase
        .from("policies_tags")
        .insert(createPoliciesTags(insertedPolicies, insertedTags))
        .select(),
    });

    // === interview_configs ===
    const insertedConfigs = await reporter.insert({
      emoji: "💬",
      label: "interview configs",
      query: supabase
        .from("interview_configs")
        .insert([
          createInterviewConfig(),
          createBulkOpinionInterviewConfig(),
          ...additionalInterviewConfigs,
        ])
        .select("id, slug"),
    });

    const configIdBySlug = new Map(
      insertedConfigs.map((config) => [config.slug, config.id])
    );
    const defaultConfigId = configIdBySlug.get(DEFAULT_CONFIG_SLUG);
    const bulkConfigId = configIdBySlug.get(BULK_OPINION_CONFIG_SLUG);
    if (!defaultConfigId || !bulkConfigId) {
      throw new Error("Interview configs were not inserted as expected");
    }

    // === policies_interview_configs ===
    await reporter.insert({
      startMessage: "🔗 Linking policies and interview configs...",
      label: "policy-config links",
      query: supabase
        .from("policies_interview_configs")
        .insert(
          createPoliciesInterviewConfigs(insertedPolicies, configIdBySlug)
        )
        .select(),
    });

    // === interview_questions ===
    await reporter.insert({
      emoji: "❓",
      label: "interview questions",
      query: supabase
        .from("interview_questions")
        .insert([
          ...createInterviewQuestions(defaultConfigId),
          ...createBulkOpinionQuestions(bulkConfigId),
        ])
        .select("id"),
    });

    // === interview_sessions ===
    // ID は seed 側で採番済み。INSERT の戻り順に依存せず紐付けられる
    console.log("🗣️  Inserting interview sessions...");
    const defaultSessions = createInterviewSessions(
      defaultConfigId,
      respondentIds
    );
    const demoSessions = [
      createDemoSession(defaultConfigId, respondentIds),
      ...createAdditionalDemoSessions(defaultConfigId, respondentIds),
    ];
    const bulkSessions = createBulkOpinionSessions(bulkConfigId, respondentIds);
    const realisticSession = createRealisticSession(
      bulkConfigId,
      respondentIds
    );
    const allSessions = [
      ...defaultSessions,
      ...demoSessions,
      ...bulkSessions,
      realisticSession,
    ];

    await expectOk(
      "insert interview sessions",
      supabase.from("interview_sessions").insert(allSessions)
    );
    console.log(`✅ Inserted ${allSessions.length} interview sessions`);
    reporter.record("interview sessions", allSessions.length);

    const defaultSessionIds = defaultSessions.map((session) => session.id);
    const bulkSessionIds = bulkSessions.map((session) => session.id);

    // === interview_messages ===
    const insertedMessages = await reporter.insert({
      emoji: "💬",
      label: "interview messages",
      query: supabase
        .from("interview_messages")
        .insert([
          ...createInterviewMessages(defaultSessionIds),
          ...createDemoMessages(),
          ...createAdditionalDemoMessages(),
          ...createBulkOpinionMessages(bulkSessionIds),
          ...createRealisticMessages(realisticSession.id),
        ])
        .select("id, interview_session_id, content"),
    });

    const messageIdByKey = new Map(
      insertedMessages.map((message) => [
        messageKey(message.interview_session_id, message.content),
        message.id,
      ])
    );

    // === opinions / opinion_segments ===
    // 2 テーブルをまとめて投入するため、ログとサマリーは呼び出し側で扱う
    console.log("📊 Inserting opinions and opinion segments...");
    const opinionSeeds: OpinionSeed[] = [
      ...createOpinions(defaultSessionIds),
      createDemoOpinion(),
      ...createAdditionalDemoOpinions(),
      ...createBulkOpinions(bulkSessionIds),
      createRealisticOpinion(realisticSession.id),
    ];
    const { opinionCount, segmentCount } = await insertOpinionsWithSegments(
      supabase,
      opinionSeeds,
      messageIdByKey
    );
    console.log(
      `✅ Inserted ${opinionCount} opinions and ${segmentCount} opinion segments`
    );
    reporter.record("opinions", opinionCount);
    reporter.record("opinion segments", segmentCount);

    // === opinion_reactions ===
    console.log("👍 Inserting opinion reactions...");
    const publishedOpinions = await expectRows(
      "fetch published opinions",
      supabase
        .from("opinions")
        .select("id")
        .eq("review_status", "published")
        .limit(20)
    );

    const reactions = createOpinionReactions(
      publishedOpinions.map((opinion) => opinion.id),
      respondentIds
    );
    if (reactions.length > 0) {
      await expectOk(
        "insert opinion reactions",
        supabase.from("opinion_reactions").insert(reactions)
      );
    }
    console.log(`✅ Inserted ${reactions.length} opinion reactions`);
    reporter.record("opinion reactions", reactions.length);

    // === chat_sessions / chat_messages ===
    console.log("🤖 Inserting policy chat sessions...");
    const aiChatPolicy = insertedPolicies.find(
      (policy) => policy.name === AI_CHAT_POLICY_NAME
    );
    if (!aiChatPolicy) {
      throw new Error(`Policy not found: ${AI_CHAT_POLICY_NAME}`);
    }

    const insertedChatSessions = await expectRows(
      "insert chat sessions",
      supabase
        .from("chat_sessions")
        .insert(createChatSessions(aiChatPolicy.id, respondentIds))
        .select("id")
    );

    const chatMessages = createChatMessages(
      insertedChatSessions.map((session) => session.id)
    );
    await expectOk(
      "insert chat messages",
      supabase.from("chat_messages").insert(chatMessages)
    );
    console.log(
      `✅ Inserted ${insertedChatSessions.length} chat sessions and ${chatMessages.length} chat messages`
    );

    console.log("🎉 Database seeding completed successfully!");
    reporter.printSummary();
    console.log("\n🔗 Demo opinion URLs:");
    console.log(`  /report/${DEMO_OPINION_ID}#chat-log`);
    console.log(`  /report/${DEMO_OPINION_ID_WORK}#chat-log`);
    console.log(`  /report/${DEMO_OPINION_ID_DAILY}#chat-log`);
    console.log(`  /report/${DEMO_OPINION_ID_CITIZEN}#chat-log`);
  } catch (error) {
    console.error("❌ Error seeding database:", error);
    process.exit(1);
  }
}

// Run the seed function
seedDatabase();
