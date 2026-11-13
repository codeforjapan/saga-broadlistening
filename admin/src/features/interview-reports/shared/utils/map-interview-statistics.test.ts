import { describe, expect, it } from "vitest";
import { mapInterviewStatistics } from "./map-interview-statistics";

describe("mapInterviewStatistics", () => {
  const baseRaw = {
    total_sessions: 100,
    completed_sessions: 80,
    avg_rating: 4.25,
    avg_total_content_richness: 72.5,
    avg_message_count: 12.3,
    median_duration_seconds: 345,
    total_duration_seconds: 27600,
    public_by_user_count: 60,
    published_count: 45,
    feedback_irrelevant_questions: 5,
    feedback_not_aligned: 3,
    feedback_misunderstood: 7,
    feedback_too_many_questions: 2,
    feedback_other: 1,
  };

  it("maps raw DB result to InterviewStatistics", () => {
    const result = mapInterviewStatistics(baseRaw);

    expect(result.totalSessions).toBe(100);
    expect(result.completedSessions).toBe(80);
    expect(result.completionRate).toBe(80);
    expect(result.avgRating).toBe(4.25);
    expect(result.avgTotalContentRichness).toBe(72.5);
    expect(result.avgMessageCount).toBe(12.3);
    expect(result.medianDurationSeconds).toBe(345);
    expect(result.totalDurationSeconds).toBe(27600);
    expect(result.publicByUserCount).toBe(60);
    expect(result.publishedCount).toBe(45);
    expect(result.publicRate).toBe(75);
    expect(result.feedbackIrrelevantQuestions).toBe(5);
    expect(result.feedbackNotAligned).toBe(3);
    expect(result.feedbackMisunderstood).toBe(7);
    expect(result.feedbackTooManyQuestions).toBe(2);
    expect(result.feedbackOther).toBe(1);
  });

  it("handles zero total sessions", () => {
    const result = mapInterviewStatistics({
      ...baseRaw,
      total_sessions: 0,
      completed_sessions: 0,
      public_by_user_count: 0,
    });

    expect(result.completionRate).toBe(0);
    expect(result.publicRate).toBe(0);
  });

  it("handles zero feedback counts", () => {
    const result = mapInterviewStatistics({
      ...baseRaw,
      feedback_irrelevant_questions: 0,
      feedback_not_aligned: 0,
      feedback_misunderstood: 0,
      feedback_too_many_questions: 0,
      feedback_other: 0,
    });

    expect(result.feedbackIrrelevantQuestions).toBe(0);
    expect(result.feedbackNotAligned).toBe(0);
    expect(result.feedbackMisunderstood).toBe(0);
    expect(result.feedbackTooManyQuestions).toBe(0);
    expect(result.feedbackOther).toBe(0);
  });

  it("handles null averages", () => {
    const result = mapInterviewStatistics({
      ...baseRaw,
      avg_rating: null,
      avg_total_content_richness: null,
      avg_message_count: null,
      median_duration_seconds: null,
    });

    expect(result.avgRating).toBeNull();
    expect(result.avgTotalContentRichness).toBeNull();
    expect(result.avgMessageCount).toBeNull();
    expect(result.medianDurationSeconds).toBeNull();
  });

  it("falls back to 0 when total_duration_seconds is null", () => {
    const result = mapInterviewStatistics({
      ...baseRaw,
      total_duration_seconds: null,
    });

    expect(result.totalDurationSeconds).toBe(0);
  });
});
