import { TextPromptClient } from "@langfuse/client";
import { describe, expect, it } from "vitest";
import { compilePrompt } from "./compile-prompt";

describe("compilePrompt", () => {
  it("SDK v5のプロンプトをコンパイルしバージョンリンクを保持する", () => {
    const prompt = new TextPromptClient({
      type: "text",
      name: "greeting",
      version: 3,
      prompt: "Hello, {{name}}!",
      labels: ["production"],
      tags: [],
      config: {},
    });
    const result = compilePrompt(prompt, { name: "World" });
    expect(result.content).toBe("Hello, World!");
    expect(result.metadata).toBe(prompt.toJSON());
    expect(JSON.parse(result.metadata)).toMatchObject({
      name: "greeting",
      version: 3,
    });
  });

  it("プロンプトをコンパイルして正しい形式で返す", () => {
    const fetchedPrompt = {
      compile: (variables: Record<string, string>) =>
        `Hello, ${variables.name}!`,
      toJSON: () => '{"name":"greeting","version":1}',
    };

    const result = compilePrompt(fetchedPrompt, { name: "World" });

    expect(result).toEqual({
      content: "Hello, World!",
      metadata: '{"name":"greeting","version":1}',
    });
  });

  it("variables付きでcompileが呼ばれる", () => {
    const variables = { city: "Tokyo", lang: "ja" };
    let receivedVariables: Record<string, string> = {};

    const fetchedPrompt = {
      compile: (vars: Record<string, string>) => {
        receivedVariables = vars;
        return "compiled";
      },
      toJSON: () => "{}",
    };

    compilePrompt(fetchedPrompt, variables);

    expect(receivedVariables).toEqual({ city: "Tokyo", lang: "ja" });
  });

  it("variablesなしの場合は空オブジェクトでcompileが呼ばれる", () => {
    let receivedVariables: Record<string, string> | undefined;

    const fetchedPrompt = {
      compile: (vars: Record<string, string>) => {
        receivedVariables = vars;
        return "compiled";
      },
      toJSON: () => "{}",
    };

    compilePrompt(fetchedPrompt);

    expect(receivedVariables).toEqual({});
  });
});
