import { describe, expect, it } from "vitest";
import { canUseReportForSimulation } from "./simulation-scope";

describe("canUseReportForSimulation", () => {
  describe("施策に紐づくテーマ", () => {
    const scope = { interviewConfigId: "config-1", policyId: "policy-1" };

    it("同じ施策のレポートなら使える", () => {
      expect(
        canUseReportForSimulation(scope, {
          configId: "config-1",
          policyIds: ["policy-1"],
        })
      ).toBe(true);
    });

    it("同じ施策なら別テーマのレポートも使える", () => {
      expect(
        canUseReportForSimulation(scope, {
          configId: "config-2",
          policyIds: ["policy-1"],
        })
      ).toBe(true);
    });

    it("複数施策に紐づくレポートは、そのうち1つが一致すれば使える", () => {
      expect(
        canUseReportForSimulation(scope, {
          configId: "config-9",
          policyIds: ["policy-2", "policy-1"],
        })
      ).toBe(true);
    });

    it("別施策のレポートは使えない", () => {
      expect(
        canUseReportForSimulation(scope, {
          configId: "config-3",
          policyIds: ["policy-2"],
        })
      ).toBe(false);
    });

    it("施策に紐づかないレポートは使えない", () => {
      expect(
        canUseReportForSimulation(scope, {
          configId: "config-4",
          policyIds: [],
        })
      ).toBe(false);
    });
  });

  describe("抽象テーマ型（施策なし）", () => {
    const scope = { interviewConfigId: "config-1", policyId: null };

    it("同じテーマのレポートなら使える", () => {
      expect(
        canUseReportForSimulation(scope, {
          configId: "config-1",
          policyIds: [],
        })
      ).toBe(true);
    });

    it("別テーマのレポートは使えない", () => {
      expect(
        canUseReportForSimulation(scope, {
          configId: "config-2",
          policyIds: [],
        })
      ).toBe(false);
    });

    it("借りてこられる施策がないので、施策付きの別テーマも使えない", () => {
      expect(
        canUseReportForSimulation(scope, {
          configId: "config-2",
          policyIds: ["policy-1"],
        })
      ).toBe(false);
    });
  });
});
