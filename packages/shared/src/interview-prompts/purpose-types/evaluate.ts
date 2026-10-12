import type { PurposeTemplateStep, PurposeTypeDefinition } from "./types";

const GOOD_POINT_STEP: PurposeTemplateStep = {
  step_key: "good_point",
  title: "良かった点",
  step_kind: "episode",
  turn_budget: 2,
  required: true,
  hint: "それで何が助かったか",
  question: "その中で、良かったと感じた点はどこですか？",
  quick_replies: ["特にない"],
};

const BAD_POINT_STEP: PurposeTemplateStep = {
  step_key: "bad_point",
  title: "困った点",
  step_kind: "episode",
  turn_budget: 2,
  required: true,
  hint: "それで何が困ったか、どうなっているとよいか",
  question: "反対に、困った・物足りなかった点はありますか？",
  quick_replies: ["特にない"],
};

const ADD_MORE_STEP: PurposeTemplateStep = {
  step_key: "add_more",
  title: "言い足し",
  step_kind: "add_more",
  turn_budget: 1,
  required: true,
  hint: null,
  question: "ほかに伝えておきたいことはありますか？",
  quick_replies: ["特にない"],
};

const PERSPECTIVE = "良かった点と困った点は、それぞれの話題で聞く。片方だけを深く掘らない。";

/** 評価する: すでに始まっている施策・サービスが実際の場面でどうだったかを聞く */
export const EVALUATE: PurposeTypeDefinition = {
  type: "evaluate",
  label: "評価する",
  focusInstruction:
    "すでに始まっている施策・サービスが、実際の場面でどうだったかを聞きます。良かった点と困った点を同じ重さで聞きます。市の成果を説明・弁明しません。使っていない人には、使わなかった場面や理由を聞きます。",
  bill: {
    perspectiveTechniques: PERSPECTIVE,
    replyExamples: `回答：「助かったけど、量が減った気がする」
良い例：「助かった一方で、量が減った気がするんですね。量のことに気づいたのは、どんな場面でしたか？」`,
    steps: [
      {
        step_key: "involvement",
        title: "関わり",
        step_kind: "fact",
        turn_budget: 1,
        required: true,
        hint: "「関わりはなかった」なら、次の話題を「知ったきっかけ・使わなかった理由」にしてよい",
        question: "この施策と、どんな形で関わりがありましたか？",
        quick_replies: [
          "対象の当事者として",
          "仕事で",
          "関わりはなかった",
          "施策を知らなかった",
        ],
      },
      {
        step_key: "changed_scene",
        title: "変わった場面",
        step_kind: "episode",
        turn_budget: 3,
        required: true,
        hint: "「特に変わらない」も普通の答え。そのときは変わらなかった理由",
        question:
          "この施策が始まって、暮らしの中で「変わった」と感じた場面を1つ教えてください。",
        quick_replies: ["特に変わらない", "思い出せない"],
      },
      GOOD_POINT_STEP,
      BAD_POINT_STEP,
      {
        step_key: "evaluation",
        title: "全体の受け止め",
        step_kind: "evaluation",
        turn_budget: 3,
        required: true,
        hint: "選んだ理由、続けるならどこを変えるとよいか",
        question: "全体として、この施策をどう受け止めていますか？",
        quick_replies: [
          "良かった",
          "どちらかといえば良かった",
          "どちらかといえば良くなかった",
          "良くなかった",
          "まだ決められない",
        ],
      },
      ADD_MORE_STEP,
    ],
  },
  theme: {
    perspectiveTechniques: PERSPECTIVE,
    replyExamples: `回答：「お知らせは見るけど、どこに書いてあるかわからない」
良い例：「どこに書いてあるかわからないことがあるんですね。最近それを感じたのは、どんなお知らせでしたか？」`,
    steps: [
      {
        step_key: "involvement",
        title: "関わり",
        step_kind: "fact",
        turn_budget: 1,
        required: true,
        hint: "「ほとんどない」なら、次の話題を「ふれなかった理由」にしてよい",
        question:
          "この3か月で、このテーマに関わる市の取り組みにふれたことはありますか？",
        quick_replies: ["よくある", "たまに", "ほとんどない"],
      },
      {
        step_key: "changed_scene",
        title: "役に立った・困った場面",
        step_kind: "episode",
        turn_budget: 3,
        required: true,
        hint: "「特にない」も普通の答え。そのときはふれなかった理由",
        question: "それが役に立った、または困った最近の1回を教えてください。",
        quick_replies: ["特にない", "思い出せない"],
      },
      GOOD_POINT_STEP,
      BAD_POINT_STEP,
      {
        step_key: "evaluation",
        title: "全体の受け止め",
        step_kind: "evaluation",
        turn_budget: 3,
        required: true,
        hint: "選んだ理由、続けるならどこを変えるとよいか",
        question: "全体として、この取り組みは役に立っていると感じますか？",
        quick_replies: [
          "役に立っている",
          "どちらかといえば役に立っている",
          "どちらかといえば役に立っていない",
          "役に立っていない",
          "まだ決められない",
        ],
      },
      ADD_MORE_STEP,
    ],
  },
};
