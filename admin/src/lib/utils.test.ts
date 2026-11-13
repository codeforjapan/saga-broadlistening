import { describe, expect, it } from "vitest";
import { cn } from "./utils";

describe("cn", () => {
  it("サイズトークンと文字色を併用しても両方残す", () => {
    expect(cn("text-compact-body text-muted-foreground")).toBe(
      "text-compact-body text-muted-foreground"
    );
  });

  it("サイズトークンは標準のサイズ指定を上書きする", () => {
    expect(cn("text-sm", "text-body")).toBe("text-body");
    expect(cn("text-caption", "text-base")).toBe("text-base");
  });

  it("文字色同士は従来どおり後勝ちで1つにまとめる", () => {
    expect(cn("text-foreground", "text-primary-accent")).toBe(
      "text-primary-accent"
    );
  });
});
