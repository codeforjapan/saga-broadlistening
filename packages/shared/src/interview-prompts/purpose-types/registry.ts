import { DISCOVER } from "./discover";
import { ENVISION } from "./envision";
import { EVALUATE } from "./evaluate";
import type {
  InterviewSubjectKind,
  PurposeTemplateStep,
  PurposeType,
  PurposeTypeDefinition,
} from "./types";
import { UNDERSTAND } from "./understand";
import { VERIFY } from "./verify";

export const PURPOSE_TYPE_DEFINITIONS: Record<PurposeType, PurposeTypeDefinition> =
  {
    understand: UNDERSTAND,
    discover: DISCOVER,
    verify: VERIFY,
    evaluate: EVALUATE,
    envision: ENVISION,
  };

/**
 * 職員に見せる目的（3つ）とチェック1つの組み合わせ。
 * 内部の5型はこの組み合わせから決まる。
 */
export const PURPOSE_OPTIONS = [
  {
    key: "situation",
    label: "今の様子や困りごとを知る",
    checkLabel: "困りごとを中心に聞く",
    off: "understand",
    on: "discover",
  },
  {
    key: "reaction",
    label: "市の案や施策への受け止めを聞く",
    checkLabel: "もう始まっている",
    off: "verify",
    on: "evaluate",
  },
  {
    key: "future",
    label: "これからを描く",
    checkLabel: null,
    off: "envision",
    on: "envision",
  },
] as const satisfies ReadonlyArray<{
  key: string;
  label: string;
  checkLabel: string | null;
  off: PurposeType;
  on: PurposeType;
}>;

export type PurposeOptionKey = (typeof PURPOSE_OPTIONS)[number]["key"];

/** 画面の選択（目的＋チェック）から内部の型を決める */
export function resolvePurposeType(
  optionKey: PurposeOptionKey,
  checked: boolean
): PurposeType {
  const option = PURPOSE_OPTIONS.find((o) => o.key === optionKey);
  if (!option) throw new Error(`Unknown purpose option: ${optionKey}`);
  return checked ? option.on : option.off;
}

/** 内部の型から、画面の選択（目的＋チェック）を復元する */
export function toPurposeSelection(type: PurposeType): {
  optionKey: PurposeOptionKey;
  checked: boolean;
} {
  for (const option of PURPOSE_OPTIONS) {
    if (option.on === type && option.off !== type) {
      return { optionKey: option.key, checked: true };
    }
    if (option.off === type) return { optionKey: option.key, checked: false };
  }
  throw new Error(`Unknown purpose type: ${type}`);
}

/** プロンプトの「目的」に書く表示名 */
export function purposeDisplayName(
  type: PurposeType | null,
  subject: InterviewSubjectKind
): string {
  if (!type) return "市民の経験と考えを聞く";
  const { optionKey, checked } = toPurposeSelection(type);
  const option = PURPOSE_OPTIONS.find((o) => o.key === optionKey);
  if (!option) return "市民の経験と考えを聞く";
  if (type === "verify" && subject === "bill") {
    return `${option.label}（まだ始まっていない案）`;
  }
  if (checked && option.checkLabel) {
    return `${option.label}（${option.checkLabel}）`;
  }
  return option.label;
}

export function getPurposeDefinition(type: PurposeType): PurposeTypeDefinition {
  return PURPOSE_TYPE_DEFINITIONS[type];
}

/** 目的と対象から、質問テンプレートの下書きを返す */
export function getPurposeTemplateSteps(
  type: PurposeType,
  subject: InterviewSubjectKind
): PurposeTemplateStep[] {
  return PURPOSE_TYPE_DEFINITIONS[type][subject].steps.map((step) => ({
    ...step,
    quick_replies: [...step.quick_replies],
  }));
}

/** テンプレート内の話題の短い名前を、step_key から引く */
export function findPurposeStepTitle(
  type: PurposeType | null,
  subject: InterviewSubjectKind,
  stepKey: string | null | undefined
): string | null {
  if (!type || !stepKey) return null;
  const step = PURPOSE_TYPE_DEFINITIONS[type][subject].steps.find(
    (s) => s.step_key === stepKey
  );
  return step?.title ?? null;
}
