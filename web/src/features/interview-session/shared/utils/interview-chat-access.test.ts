import { describe, expect, it } from "vitest";
import { decideInterviewChatAccess } from "./interview-chat-access";

const publishedPolicy = { id: "policy-1", isPublished: true };
const draftPolicy = { id: "policy-2", isPublished: false };

describe("decideInterviewChatAccess", () => {
  describe("プレビュー", () => {
    it("紐づく施策の有効なトークンなら、下書きの意見募集でも許可する", () => {
      expect(
        decideInterviewChatAccess({
          status: "draft",
          policies: [draftPolicy],
          previewPolicyId: "policy-2",
          isTokenValid: true,
        })
      ).toEqual({ mode: "preview", policyId: "policy-2" });
    });

    it("紐づかない施策のトークンでは覗けない", () => {
      expect(
        decideInterviewChatAccess({
          status: "draft",
          policies: [draftPolicy],
          previewPolicyId: "policy-999",
          isTokenValid: true,
        })
      ).toEqual({ mode: "denied" });
    });

    it("トークンが無効なら一般公開と同じ扱いになる", () => {
      expect(
        decideInterviewChatAccess({
          status: "draft",
          policies: [draftPolicy],
          previewPolicyId: "policy-2",
          isTokenValid: false,
        })
      ).toEqual({ mode: "denied" });
    });

    it("トークンだけあって施策の指定がなければプレビューにならない", () => {
      expect(
        decideInterviewChatAccess({
          status: "draft",
          policies: [draftPolicy],
          previewPolicyId: undefined,
          isTokenValid: true,
        })
      ).toEqual({ mode: "denied" });
    });

    it("募集中の意見募集でも、トークンがあれば発行元施策を材料にする", () => {
      expect(
        decideInterviewChatAccess({
          status: "open",
          policies: [draftPolicy],
          previewPolicyId: "policy-2",
          isTokenValid: true,
        })
      ).toEqual({ mode: "preview", policyId: "policy-2" });
    });
  });

  describe("一般公開", () => {
    it("募集中なら公開済み施策を材料に許可する", () => {
      expect(
        decideInterviewChatAccess({
          status: "open",
          policies: [draftPolicy, publishedPolicy],
          previewPolicyId: undefined,
          isTokenValid: false,
        })
      ).toEqual({ mode: "public", policyId: "policy-1" });
    });

    it("抽象テーマ型は施策なしのまま許可する", () => {
      expect(
        decideInterviewChatAccess({
          status: "open",
          policies: [],
          previewPolicyId: undefined,
          isTokenValid: false,
        })
      ).toEqual({ mode: "public", policyId: null });
    });

    it("下書きの意見募集は拒否する", () => {
      expect(
        decideInterviewChatAccess({
          status: "draft",
          policies: [publishedPolicy],
          previewPolicyId: undefined,
          isTokenValid: false,
        })
      ).toEqual({ mode: "denied" });
    });

    it("終了した意見募集は拒否する", () => {
      expect(
        decideInterviewChatAccess({
          status: "closed",
          policies: [publishedPolicy],
          previewPolicyId: undefined,
          isTokenValid: false,
        })
      ).toEqual({ mode: "denied" });
    });

    it("紐づく施策がすべて未公開なら拒否する", () => {
      expect(
        decideInterviewChatAccess({
          status: "open",
          policies: [draftPolicy],
          previewPolicyId: undefined,
          isTokenValid: false,
        })
      ).toEqual({ mode: "denied" });
    });
  });
});
