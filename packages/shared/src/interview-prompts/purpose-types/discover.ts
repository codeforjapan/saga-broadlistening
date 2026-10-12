import type { PurposeTemplateStep, PurposeTypeDefinition } from "./types";

const IMPACT_STEP: PurposeTemplateStep = {
  step_key: "impact",
  title: "影響",
  step_kind: "reason",
  turn_budget: 3,
  required: true,
  hint: "困ったこと・変わったこと・負担になったこと、何が大事か（届かなくてよい）、十分聞いた後ならどうなっているとよいか",
  question: "そのことで、どんなことに影響がありましたか？",
  quick_replies: [],
};

const OTHER_SIDE_STEP: PurposeTemplateStep = {
  step_key: "other_side",
  title: "反対側の場面",
  step_kind: "episode",
  turn_budget: 2,
  required: false,
  hint: null,
  question: "反対に、「助かった」（「困った」）と感じた場面はありますか？",
  quick_replies: ["特にない"],
};

const PERSPECTIVE =
  "困った場面と助かった場面のどちらから話してもよい。複数出たら、いちばん印象に残っている1つに絞る。";

/** 見つける: 困りごと（助かったこと）1つの出来事と影響を聞く */
export const DISCOVER: PurposeTypeDefinition = {
  type: "discover",
  label: "見つける",
  focusInstruction:
    "困りごと（または助かったこと）1つについて、出来事と影響を本人の言葉で聞きます。原因の分析や解決策は求めません。提案が出たら原文の言葉で受け止めます。",
  bill: {
    perspectiveTechniques: PERSPECTIVE,
    replyExamples: `回答：「オンライン申請の途中でエラーになった」
良い例：「オンライン申請の途中でエラーになったんですね。そのとき、どうしましたか？」`,
    steps: [
      {
        step_key: "involvement",
        title: "関わり",
        step_kind: "fact",
        turn_budget: 1,
        required: true,
        hint: "「使っていない」なら、次の話題を「使おうとしてやめた場面」にしてよい",
        question:
          "この1年で、この施策に関わる手続きやサービスを使ったことはありますか？",
        quick_replies: ["窓口で", "オンラインで", "両方", "使っていない"],
      },
      {
        step_key: "episode",
        title: "困った・助かった場面",
        step_kind: "episode",
        turn_budget: 4,
        required: true,
        hint: "1つの場面に絞る、そのときどうしたか、予想外の対処",
        question:
          "それを使ったときに「困った」または「助かった」と感じた場面を1つ教えてください。",
        quick_replies: ["思い出せない"],
      },
      IMPACT_STEP,
      OTHER_SIDE_STEP,
      {
        step_key: "add_more",
        title: "言い足し",
        step_kind: "add_more",
        turn_budget: 1,
        required: true,
        hint: null,
        question: "ほかに、この施策のことで知っておいてほしいことはありますか？",
        quick_replies: ["特にない"],
      },
    ],
  },
  theme: {
    perspectiveTechniques: PERSPECTIVE,
    replyExamples: `回答：「子どもの熱で急に休むのが大変」
良い例：「子どもの熱で急に休むのが大変なんですね。最近その場面があったとき、どうしましたか？」`,
    steps: [
      {
        step_key: "involvement",
        title: "関わり",
        step_kind: "fact",
        turn_budget: 1,
        required: true,
        hint: "「関わっていない」なら、次の話題を身近な人の場面にしてよい",
        question: "いま、このテーマに関わることはありますか？",
        quick_replies: ["自分が", "家族が", "以前は", "関わっていない"],
      },
      {
        step_key: "episode",
        title: "困った・助かった場面",
        step_kind: "episode",
        turn_budget: 4,
        required: true,
        hint: "1つの場面に絞る、そのときどうしたか、予想外の対処",
        question:
          "このテーマで「困った」または「助かった」と感じた最近の場面を1つ教えてください。",
        quick_replies: ["思い出せない"],
      },
      IMPACT_STEP,
      OTHER_SIDE_STEP,
      {
        step_key: "add_more",
        title: "言い足し",
        step_kind: "add_more",
        turn_budget: 1,
        required: true,
        hint: null,
        question: "ほかに、知っておいてほしいことはありますか？",
        quick_replies: ["特にない"],
      },
    ],
  },
};
