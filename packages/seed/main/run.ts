import { seedLocalAdminUser } from "../shared/admin-user";
import type { AdminClient } from "../shared/helper";
import { clearAllData, createAdminClient } from "../shared/helper";
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
  const { data: insertedOpinions, error: opinionsError } = await supabase
    .from("opinions")
    .insert(seeds.map((seed) => seed.opinion))
    .select("id, interview_session_id");

  if (opinionsError || !insertedOpinions) {
    throw new Error(`Failed to insert opinions: ${opinionsError?.message}`);
  }

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

  const { error: segmentsError } = await supabase
    .from("opinion_segments")
    .insert(segments);

  if (segmentsError) {
    throw new Error(
      `Failed to insert opinion segments: ${segmentsError.message}`
    );
  }

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
  console.log("🌱 Starting database seeding...");

  try {
    await clearAllData(supabase);

    // ローカル開発用のユーザー（ローカル接続時のみ作成される）
    await seedLocalAdminUser(supabase);
    const respondentIds = await seedDemoRespondents(supabase);

    // === tags ===
    console.log("🏷️  Inserting tags...");
    const { data: insertedTags, error: tagsError } = await supabase
      .from("tags")
      .insert(tags)
      .select("id, label");

    if (tagsError || !insertedTags) {
      throw new Error(`Failed to insert tags: ${tagsError?.message}`);
    }
    console.log(`✅ Inserted ${insertedTags.length} tags`);

    // === policies ===
    console.log("📄 Inserting policies...");
    const { data: insertedPolicies, error: policiesError } = await supabase
      .from("policies")
      .insert(policies)
      .select("id, name");

    if (policiesError || !insertedPolicies) {
      throw new Error(`Failed to insert policies: ${policiesError?.message}`);
    }
    console.log(`✅ Inserted ${insertedPolicies.length} policies`);

    // === policy_contents ===
    console.log("📚 Inserting policy contents...");
    const { data: insertedContents, error: contentsError } = await supabase
      .from("policy_contents")
      .insert(createPolicyContents(insertedPolicies))
      .select("id");

    if (contentsError || !insertedContents) {
      throw new Error(
        `Failed to insert policy contents: ${contentsError?.message}`
      );
    }
    console.log(`✅ Inserted ${insertedContents.length} policy contents`);

    // === policies_tags ===
    console.log("🔗 Inserting policies-tags relations...");
    const { data: insertedPoliciesTags, error: policiesTagsError } =
      await supabase
        .from("policies_tags")
        .insert(createPoliciesTags(insertedPolicies, insertedTags))
        .select();

    if (policiesTagsError || !insertedPoliciesTags) {
      throw new Error(
        `Failed to insert policies-tags relations: ${policiesTagsError?.message}`
      );
    }
    console.log(
      `✅ Inserted ${insertedPoliciesTags.length} policies-tags relations`
    );

    // === interview_configs ===
    console.log("💬 Inserting interview configs...");
    const { data: insertedConfigs, error: configsError } = await supabase
      .from("interview_configs")
      .insert([
        createInterviewConfig(),
        createBulkOpinionInterviewConfig(),
        ...additionalInterviewConfigs,
      ])
      .select("id, slug");

    if (configsError || !insertedConfigs) {
      throw new Error(
        `Failed to insert interview configs: ${configsError?.message}`
      );
    }

    const configIdBySlug = new Map(
      insertedConfigs.map((config) => [config.slug, config.id])
    );
    const defaultConfigId = configIdBySlug.get(DEFAULT_CONFIG_SLUG);
    const bulkConfigId = configIdBySlug.get(BULK_OPINION_CONFIG_SLUG);
    if (!defaultConfigId || !bulkConfigId) {
      throw new Error("Interview configs were not inserted as expected");
    }
    console.log(`✅ Inserted ${insertedConfigs.length} interview configs`);

    // === policies_interview_configs ===
    console.log("🔗 Linking policies and interview configs...");
    const { data: insertedLinks, error: linksError } = await supabase
      .from("policies_interview_configs")
      .insert(createPoliciesInterviewConfigs(insertedPolicies, configIdBySlug))
      .select();

    if (linksError || !insertedLinks) {
      throw new Error(
        `Failed to link policies and interview configs: ${linksError?.message}`
      );
    }
    console.log(`✅ Inserted ${insertedLinks.length} policy-config links`);

    // === interview_questions ===
    console.log("❓ Inserting interview questions...");
    const { data: insertedQuestions, error: questionsError } = await supabase
      .from("interview_questions")
      .insert([
        ...createInterviewQuestions(defaultConfigId),
        ...createBulkOpinionQuestions(bulkConfigId),
      ])
      .select("id");

    if (questionsError || !insertedQuestions) {
      throw new Error(
        `Failed to insert interview questions: ${questionsError?.message}`
      );
    }
    console.log(`✅ Inserted ${insertedQuestions.length} interview questions`);

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

    const { error: sessionsError } = await supabase
      .from("interview_sessions")
      .insert(allSessions);

    if (sessionsError) {
      throw new Error(
        `Failed to insert interview sessions: ${sessionsError.message}`
      );
    }
    console.log(`✅ Inserted ${allSessions.length} interview sessions`);

    const defaultSessionIds = defaultSessions.map((session) => session.id);
    const bulkSessionIds = bulkSessions.map((session) => session.id);

    // === interview_messages ===
    console.log("💬 Inserting interview messages...");
    const { data: insertedMessages, error: messagesError } = await supabase
      .from("interview_messages")
      .insert([
        ...createInterviewMessages(defaultSessionIds),
        ...createDemoMessages(),
        ...createAdditionalDemoMessages(),
        ...createBulkOpinionMessages(bulkSessionIds),
        ...createRealisticMessages(realisticSession.id),
      ])
      .select("id, interview_session_id, content");

    if (messagesError || !insertedMessages) {
      throw new Error(
        `Failed to insert interview messages: ${messagesError?.message}`
      );
    }
    console.log(`✅ Inserted ${insertedMessages.length} interview messages`);

    const messageIdByKey = new Map(
      insertedMessages.map((message) => [
        messageKey(message.interview_session_id, message.content),
        message.id,
      ])
    );

    // === opinions / opinion_segments ===
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

    // === opinion_reactions ===
    console.log("👍 Inserting opinion reactions...");
    const { data: publishedOpinions, error: publishedError } = await supabase
      .from("opinions")
      .select("id")
      .eq("review_status", "published")
      .limit(20);

    if (publishedError || !publishedOpinions) {
      throw new Error(
        `Failed to fetch published opinions: ${publishedError?.message}`
      );
    }

    const reactions = createOpinionReactions(
      publishedOpinions.map((opinion) => opinion.id),
      respondentIds
    );
    if (reactions.length > 0) {
      const { error: reactionsError } = await supabase
        .from("opinion_reactions")
        .insert(reactions);
      if (reactionsError) {
        throw new Error(
          `Failed to insert opinion reactions: ${reactionsError.message}`
        );
      }
    }
    console.log(`✅ Inserted ${reactions.length} opinion reactions`);

    // === chat_sessions / chat_messages ===
    console.log("🤖 Inserting policy chat sessions...");
    const aiChatPolicy = insertedPolicies.find(
      (policy) => policy.name === AI_CHAT_POLICY_NAME
    );
    if (!aiChatPolicy) {
      throw new Error(`Policy not found: ${AI_CHAT_POLICY_NAME}`);
    }

    const { data: insertedChatSessions, error: chatSessionsError } =
      await supabase
        .from("chat_sessions")
        .insert(createChatSessions(aiChatPolicy.id, respondentIds))
        .select("id");

    if (chatSessionsError || !insertedChatSessions) {
      throw new Error(
        `Failed to insert chat sessions: ${chatSessionsError?.message}`
      );
    }

    const chatMessages = createChatMessages(
      insertedChatSessions.map((session) => session.id)
    );
    const { error: chatMessagesError } = await supabase
      .from("chat_messages")
      .insert(chatMessages);

    if (chatMessagesError) {
      throw new Error(
        `Failed to insert chat messages: ${chatMessagesError.message}`
      );
    }
    console.log(
      `✅ Inserted ${insertedChatSessions.length} chat sessions and ${chatMessages.length} chat messages`
    );

    console.log("🎉 Database seeding completed successfully!");
    console.log("\n📊 Summary:");
    console.log(`  Tags: ${insertedTags.length}`);
    console.log(`  Policies: ${insertedPolicies.length}`);
    console.log(`  Policy Contents: ${insertedContents.length}`);
    console.log(`  Policies-Tags Relations: ${insertedPoliciesTags.length}`);
    console.log(`  Interview Configs: ${insertedConfigs.length}`);
    console.log(`  Policy-Config Links: ${insertedLinks.length}`);
    console.log(`  Interview Questions: ${insertedQuestions.length}`);
    console.log(`  Interview Sessions: ${allSessions.length}`);
    console.log(`  Interview Messages: ${insertedMessages.length}`);
    console.log(`  Opinions: ${opinionCount}`);
    console.log(`  Opinion Segments: ${segmentCount}`);
    console.log(`  Opinion Reactions: ${reactions.length}`);
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
