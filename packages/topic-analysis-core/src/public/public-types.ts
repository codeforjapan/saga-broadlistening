// ユーザー向けトピック分析の読み取り（公開）API のデータ契約（設計 §13 付録 A.4）。
// web の表示と admin MCP の連携が同一の PII セーフな契約を共有する。
// 個人を特定する識別子（user_id・email・電話等）は含めない。

/** 公開 API が返す意見カード（§8 フィルタ後のもののみ）。 */
export type PublicOpinion = {
  id: string;
  /** この論点の出典意見ID（意見詳細への遷移に使う）。 */
  opinion_id: string;
  /**
   * 出典意見が公開済みか（review_status = 'published'）。
   * 意見詳細ページは公開済みかつ公開件数しきい値を満たす場合のみ表示されるため、
   * リンク表示の出し分けに使う。
   */
  opinion_public: boolean;
  /** 出典意見の作成日時（相対表示・日付表示に使う）。 */
  created_at: string | null;
  title: string;
  content: string;
  /** 発言者の立場の短縮タイトル（opinions.role_title）。引用の属性表示に使う。 */
  role_title: string | null;
  contextual_quote: string | null;
  /**
   * 論点単位の情報充実度（0-100）。引用の優先表示・並べ替えに使う（集計には使わない）。
   * 未生成は null。
   */
  richness: number | null;
  /** 引用の出典メッセージID。意見詳細の該当メッセージ（#message-<id>）へ遷移するのに使う。 */
  source_message_id: string | null;
  /**
   * 発言を引き出した質問文（source_message_id から導出）。
   * 導出は Q&A 表示を行う Step 4b で実装するため、4a では null 固定。
   */
  question_snippet: string | null;
};

/** 公開 API が返すトピック（件数は §8 フィルタ後に再計算）。 */
export type PublicTopic = {
  id: string;
  title: string;
  description: string;
  opinion_count: number;
  opinions: PublicOpinion[];
};

/** 公開 API レスポンス全体（§13 A.4）。 */
export type PublicTopicAnalysis = {
  interview_config_id: string;
  version: number;
  generated_at: string | null;
  total_opinions: number;
  topics: PublicTopic[];
};

// ── リポジトリが返す生データ（pure 関数の入力） ──

/** §8 判定に必要な意見属性を相乗した、生の論点行。 */
export type RawOpinionRow = {
  id: string;
  opinion_id: string;
  created_at: string | null;
  title: string;
  content: string;
  contextual_quote: string | null;
  source_message_id: string | null;
  /** 論点単位の情報充実度（0-100・nullable）。引用の優先表示・並べ替えに使う。 */
  richness: number | null;
  review_status: string | null;
  moderation_status: string | null;
  role_title: string | null;
};

/** version 配下の生トピック行（sort_order 昇順）。 */
export type RawTopicRow = {
  id: string;
  title: string;
  description: string;
  opinions: RawOpinionRow[];
};

/** 公開中 version のメタ情報。 */
export type PublishedVersionMeta = {
  interview_config_id: string;
  version: number;
  generated_at: string | null;
};

// ── 回答一覧（回答者1人=1カード）の表示データ ──

/** 回答一覧カード1件（公開意見＝回答者1人）。 */
export type PublicRespondent = {
  /** 出典意見ID（意見詳細への遷移に使う）。 */
  id: string;
  /** 発言者の立場の短縮タイトル（opinions.role_title）。 */
  role_title: string | null;
  /** 意見の要約テキスト（カード本文に表示）。 */
  summary: string | null;
  /** 市民が最終確認・修正して提出した意見本文（opinions.final_text）。 */
  final_text: string;
  /** 出典意見の作成日時（相対表示・日付表示に使う）。 */
  created_at: string | null;
};

/** リポジトリが返す生の意見行（回答一覧用・pure 関数の入力）。 */
export type RawRespondentRow = {
  id: string;
  role_title: string | null;
  summary: string | null;
  final_text: string;
  created_at: string | null;
};

// ── 回答者詳細（立場説明＋会話ログ／分析用） ──
//
// 注意: role_description と messages.content は回答者の**自由記述**であり、
// LLM で構造化・要約されたものではない。§8 の公開判定
// （review_status = 'published'）は通すが、自由記述ゆえ固有名詞等が含まれ得る。
// それでも user_id・email 等の識別子は含めない。

/** 会話ログ1メッセージ。speaker="assistant"=AIの質問 / "user"=回答者の発言。 */
export type TranscriptMessage = {
  id: string;
  speaker: "assistant" | "user";
  content: string;
  created_at: string | null;
};

/** 公開意見1件の詳細（立場説明と会話ログを含む）。 */
export type PublicRespondentDetail = {
  /** 出典意見ID。 */
  id: string;
  /** 発言者の立場の短縮タイトル（opinions.role_title）。 */
  role_title: string | null;
  /** 回答者が自由記述した立場説明（opinions.role_description）。 */
  role_description: string | null;
  /** 意見の要約テキスト。 */
  summary: string | null;
  /** 市民が最終確認・修正して提出した意見本文（opinions.final_text）。 */
  final_text: string;
  /** 出典意見の作成日時。 */
  created_at: string | null;
  /** AIとの会話ログ（質問と回答のやり取り、作成日時昇順）。 */
  messages: TranscriptMessage[];
};

/** 詳細取得の生の意見行（pure 関数の入力）。回答一覧の行に立場説明を加えたもの。 */
export type RawRespondentDetailRow = RawRespondentRow & {
  role_description: string | null;
};

/** 生の会話メッセージ行（pure 関数の入力）。 */
export type RawTranscriptMessageRow = {
  id: string;
  role: string | null;
  content: string;
  created_at: string | null;
};
