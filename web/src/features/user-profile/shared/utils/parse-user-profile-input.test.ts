import { describe, expect, it } from "vitest";
import { parseUserProfileInput } from "./parse-user-profile-input";

const choices = {
  ageGroups: [
    { value: "10s", label: "10代" },
    { value: "20s", label: "20代" },
  ],
  areas: [
    { value: "city", label: "市内" },
    { value: "outside", label: "市外" },
  ],
};

describe("parseUserProfileInput", () => {
  it("両方とも選択肢にある値ならそのまま返す", () => {
    expect(
      parseUserProfileInput({ ageGroup: "20s", area: "city" }, choices)
    ).toEqual({ ageGroup: "20s", area: "city" });
  });

  it("未選択（undefined・null・空文字）は null にする", () => {
    expect(parseUserProfileInput({}, choices)).toEqual({
      ageGroup: null,
      area: null,
    });
    expect(
      parseUserProfileInput({ ageGroup: null, area: "" }, choices)
    ).toEqual({ ageGroup: null, area: null });
  });

  it("一部だけ選んだ場合は、選んだ項目だけ値が入る", () => {
    expect(parseUserProfileInput({ area: "outside" }, choices)).toEqual({
      ageGroup: null,
      area: "outside",
    });
  });

  it("選択肢にないコードが1つでもあれば null を返す", () => {
    expect(
      parseUserProfileInput({ ageGroup: "70s", area: "city" }, choices)
    ).toBeNull();
    expect(
      parseUserProfileInput({ ageGroup: "10s", area: "unknown" }, choices)
    ).toBeNull();
  });

  it("文字列でない値は null を返す", () => {
    expect(parseUserProfileInput({ ageGroup: 20 }, choices)).toBeNull();
  });
});
