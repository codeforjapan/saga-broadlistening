import { describe, expect, it } from "vitest";
import { buildInterviewBriefing } from "./build-interview-briefing";

describe("buildInterviewBriefing", () => {
  it("施策型では決まっていること・時期と場所を出す", () => {
    const briefing = buildInterviewBriefing({
      interviewConfig: {
        name: "市営バスの路線見直し案について",
        opinion_focus: "どの路線をどう変えるか",
        decided_matters: "2027年度に路線を見直すこと",
        publication_mode: "scheduled",
        publication_timing: "2027年3月ごろ",
        publication_place: "chikat",
        estimated_duration: 10,
      },
      billName: "市営バス路線見直し",
      questions: [{ id: "q1" }, { id: "q2" }],
    });
    expect(briefing).toEqual({
      title: "市営バスの路線見直し案について",
      subject: "市営バス路線見直し",
      opinionFocus: "どの路線をどう変えるか",
      decidedMatters: "2027年度に路線を見直すこと",
      publicationText: "2027年3月ごろ、CHIKAT の結果ページでお知らせします",
      topicCount: 2,
      estimatedDuration: 10,
      consultationDesk: "市民の声窓口",
    });
  });

  it("テーマ型では決まっていることを出さず、時期が未定なら「まとまり次第」", () => {
    const briefing = buildInterviewBriefing({
      interviewConfig: {
        name: "10年後の佐賀市を描く",
        description: "10年後の暮らしを考えます",
        decided_matters: "使わない",
        publication_mode: "when_ready",
      },
      billName: null,
      questions: [],
    });
    expect(briefing.subject).toBe("10年後の暮らしを考えます");
    expect(briefing.decidedMatters).toBeNull();
    expect(briefing.publicationText).toBe(
      "まとまり次第、CHIKAT の結果ページでお知らせします"
    );
  });
});
