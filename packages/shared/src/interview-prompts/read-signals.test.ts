import { describe, expect, it } from "vitest";
import {
  DEFAULT_TURN_SIGNALS,
  parseStructuredOutput,
  readSignals,
} from "./read-signals";

describe("readSignals", () => {
  it("立っているフラグを読む", () => {
    expect(
      readSignals({
        end_request: true,
        personal_request: false,
        off_topic: true,
        summary_response: "revise",
      })
    ).toEqual({
      endRequest: true,
      personalRequest: false,
      offTopic: true,
      summaryResponse: "revise",
    });
  });

  it("読めない項目は既定値にする", () => {
    expect(readSignals({ end_request: "yes", summary_response: "ok" })).toEqual(
      DEFAULT_TURN_SIGNALS
    );
    expect(readSignals(null)).toEqual(DEFAULT_TURN_SIGNALS);
  });
});

describe("parseStructuredOutput", () => {
  it("JSON オブジェクトだけを返す", () => {
    expect(parseStructuredOutput('{"text":"a"}')).toEqual({ text: "a" });
    expect(parseStructuredOutput("[1]")).toBeNull();
    expect(parseStructuredOutput("壊れた{")).toBeNull();
    expect(parseStructuredOutput(undefined)).toBeNull();
  });
});
