import type { PurposeTemplateStep, PurposeTypeDefinition } from "./types";

const IMPACT_STEP: PurposeTemplateStep = {
  follow_up_guide: "困ったこと・変わったこと・負担になったこと、何が大事か（届かなくてよい）、十分聞いた後ならどうなっているとよいか",
  question: "そのことで、どんなことに影響がありましたか？",
  quick_replies: [],
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
        follow_up_guide: "「使っていない」なら、次の話題を「使おうとしてやめた場面」にしてよい",
        question:
          "この1年で、この施策に関わる手続きやサービスを使ったことはありますか？",
        quick_replies: ["窓口で", "オンラインで", "両方", "使っていない"],
      },
      {
        follow_up_guide: "1つの場面に絞る、そのときどうしたか、予想外の対処",
        question:
          "それを使ったときに「困った」または「助かった」と感じた場面を1つ教えてください。",
        quick_replies: ["思い出せない"],
      },
      IMPACT_STEP,
      {
        follow_up_guide: null,
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
        follow_up_guide: "「関わっていない」なら、次の話題を身近な人の場面にしてよい",
        question: "いま、このテーマに関わることはありますか？",
        quick_replies: ["自分が", "家族が", "以前は", "関わっていない"],
      },
      {
        follow_up_guide: "1つの場面に絞る、そのときどうしたか、予想外の対処",
        question:
          "このテーマで「困った」または「助かった」と感じた最近の場面を1つ教えてください。",
        quick_replies: ["思い出せない"],
      },
      IMPACT_STEP,
      {
        follow_up_guide: null,
        question: "ほかに、知っておいてほしいことはありますか？",
        quick_replies: ["特にない"],
      },
    ],
  },
};
