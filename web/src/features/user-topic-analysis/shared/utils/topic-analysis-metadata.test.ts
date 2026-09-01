import { describe, expect, it } from "vitest";
import {
  buildTopicDetailMetadata,
  buildTopicListMetadata,
} from "./topic-analysis-metadata";

const shareImageUrl = "https://web.example.com/ogp.jpg";

describe("buildTopicListMetadata", () => {
  it("対象の呼び方と名前をタイトルに入れる", () => {
    const metadata = buildTopicListMetadata({
      subjectName: "子育て支援策",
      subjectKindLabel: "施策",
      canonical: "/bills/policy-1/topics",
      shareImageUrl,
    });

    expect(metadata.title).toBe("施策のトピック一覧 - 子育て支援策");
    expect(metadata.description).toBe(
      "子育て支援策に寄せられた意見をAIが整理したトピック一覧"
    );
    expect(metadata.alternates?.canonical).toBe("/bills/policy-1/topics");
    expect(metadata.openGraph).toMatchObject({ type: "website" });
  });

  it("テーマ配下では呼び方が変わる", () => {
    const metadata = buildTopicListMetadata({
      subjectName: "まちの未来について",
      subjectKindLabel: "テーマ",
      canonical: "/interviews/machi/topics",
      shareImageUrl,
    });

    expect(metadata.title).toBe("テーマのトピック一覧 - まちの未来について");
  });
});

describe("buildTopicDetailMetadata", () => {
  it("トピック名と説明をタイトル・説明に使う", () => {
    const metadata = buildTopicDetailMetadata({
      subjectName: "まちの未来について",
      canonical: "/interviews/machi/topics/topic-1",
      shareImageUrl,
      topic: {
        title: "駅前のにぎわい",
        description: "空き店舗の活用を求める声",
      },
    });

    expect(metadata.title).toBe("駅前のにぎわい - まちの未来について");
    expect(metadata.description).toBe("空き店舗の活用を求める声");
    expect(metadata.openGraph).toMatchObject({ type: "article" });
  });

  it("トピックが無ければ総称のタイトルにフォールバックする", () => {
    const metadata = buildTopicDetailMetadata({
      subjectName: "まちの未来について",
      canonical: "/interviews/machi/topics/topic-1",
      shareImageUrl,
      topic: null,
    });

    expect(metadata.title).toBe("トピック詳細 - まちの未来について");
    expect(metadata.description).toBe(
      "まちの未来についてに寄せられた意見トピックの詳細"
    );
  });

  it("説明が空のトピックは総称の説明にフォールバックする", () => {
    const metadata = buildTopicDetailMetadata({
      subjectName: "子育て支援策",
      canonical: "/bills/policy-1/topics/topic-1",
      shareImageUrl,
      topic: { title: "保育の受け入れ枠", description: null },
    });

    expect(metadata.description).toBe(
      "子育て支援策に寄せられた意見トピックの詳細"
    );
  });
});
