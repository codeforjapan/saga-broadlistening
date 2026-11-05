import { describe, expect, it } from "vitest";
import {
  MAX_RELATED_POLICIES,
  RELATED_POLICY_CONTENT_MAX_CHARS,
} from "./constants";
import { toPromptRelatedPolicies } from "./to-prompt-related-policies";

const medical = {
  id: "policy-1",
  name: "子ども医療費の助成拡大",
  policy_contents: [
    {
      title: "高校生まで医療費を助成",
      summary: "助成対象を18歳まで広げます",
      content: "通院・入院ともに自己負担をなくします。",
    },
  ],
};

const afterSchool = {
  id: "policy-2",
  name: "放課後児童クラブの拡充",
  policy_contents: [
    {
      title: "学童の定員を増やす",
      summary: "待機児童を解消します",
      content: "全校区で定員を1.5倍にします。",
    },
  ],
};

describe("toPromptRelatedPolicies", () => {
  it("施策名とコンテンツをプロンプト用の形に整える", () => {
    expect(toPromptRelatedPolicies(["policy-1"], [medical])).toEqual([
      {
        name: "子ども医療費の助成拡大",
        title: "高校生まで医療費を助成",
        summary: "助成対象を18歳まで広げます",
        content: "通院・入院ともに自己負担をなくします。",
      },
    ]);
  });

  it("DB の返却順ではなく、渡した施策IDの順に並べる", () => {
    const result = toPromptRelatedPolicies(
      ["policy-2", "policy-1"],
      [medical, afterSchool]
    );

    expect(result.map((policy) => policy.name)).toEqual([
      "放課後児童クラブの拡充",
      "子ども医療費の助成拡大",
    ]);
  });

  it("取得できなかった施策とコンテンツのない施策は落とす", () => {
    const result = toPromptRelatedPolicies(
      ["policy-1", "policy-2", "policy-3"],
      [medical, { ...afterSchool, policy_contents: [] }]
    );

    expect(result.map((policy) => policy.name)).toEqual([
      "子ども医療費の助成拡大",
    ]);
  });

  it("上限の件数までを紐づけの順に載せる", () => {
    const rows = Array.from({ length: MAX_RELATED_POLICIES + 2 }, (_, i) => ({
      ...medical,
      id: `policy-${i}`,
      name: `施策${i}`,
    }));
    const result = toPromptRelatedPolicies(
      rows.map((row) => row.id),
      rows
    );

    expect(result.map((policy) => policy.name)).toEqual(
      rows.slice(0, MAX_RELATED_POLICIES).map((row) => row.name)
    );
  });

  it("長い本文は上限で切り、省いたことを示す", () => {
    const long = "あ".repeat(RELATED_POLICY_CONTENT_MAX_CHARS + 10);
    const [policy] = toPromptRelatedPolicies(
      ["policy-1"],
      [
        {
          ...medical,
          policy_contents: [{ ...medical.policy_contents[0], content: long }],
        },
      ]
    );

    expect(policy.content).toBe(
      `${"あ".repeat(RELATED_POLICY_CONTENT_MAX_CHARS)}…（以下略）`
    );
  });
});
