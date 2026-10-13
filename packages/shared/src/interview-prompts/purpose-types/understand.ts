import type { PurposeTypeDefinition } from "./types";

/** わかる: 1つの場面の流れと理由を聞く */
export const UNDERSTAND: PurposeTypeDefinition = {
  type: "understand",
  label: "わかる",
  focusInstruction:
    "1つの場面の流れと理由を聞きます。評価や要望は求めません。出ても受け止めるだけで、深掘りしません。",
  bill: {
    perspectiveTechniques: "「いつも」の話は「その中の1回」に絞る。",
    replyExamples: `回答：「通院で月2回くらい、駅から病院まで」
良い例：「通院で月2回、駅から病院までなんですね。いちばん最近のその1回は、始めから終わりまでどんな流れでしたか？」`,
    steps: [
      {
        follow_up_guide: "「ない」なら、次の話題の対象をふだんの過ごし方にしてよい",
        question:
          "この1か月で、この施策に関わるサービスや手続きを使ったことはありますか？",
        quick_replies: [
          "何度も使った",
          "1回くらい",
          "ほとんど使わない",
          "使ったことがない",
        ],
      },
      {
        follow_up_guide: "いつ・どこで・誰と、始めから終わりまでの流れ、予定外の出来事",
        question: "いちばん最近それを使った1回は、いつ、どんな用事でしたか？",
        quick_replies: ["思い出せない"],
      },
      {
        follow_up_guide: "それで何が助かるか。価値までは求めない",
        question:
          "その用事に、ほかの方法ではなくそれを使ったのは、どんなことからですか？",
        quick_replies: [],
      },
      {
        follow_up_guide: null,
        question: "ふだんの使い方で、ほかに知っておいてほしいことはありますか？",
        quick_replies: ["特にない"],
      },
    ],
  },
  theme: {
    perspectiveTechniques: "「いつも」の話は「その中の1回」に絞る。",
    replyExamples: `回答：「友だちとカフェに行った」
良い例：「友だちとカフェに行ったんですね。その日そこを選んだのは、どんなことからですか？」`,
    steps: [
      {
        follow_up_guide: "「ない」なら、次の話題の対象をふだんの過ごし方にしてよい",
        question: "この1か月で、このテーマに関わる場面はありましたか？",
        quick_replies: ["何度か", "1回くらい", "なかった"],
      },
      {
        follow_up_guide: "いつ・どこで・誰と、始めから終わりまでの流れ、予定外の出来事",
        question: "いちばん最近のその場面は、いつ、どこで、何をしていたときですか？",
        quick_replies: ["思い出せない"],
      },
      {
        follow_up_guide: "それで何が助かるか。価値までは求めない",
        question: "そのとき、そうしたのは、どんなことからですか？",
        quick_replies: [],
      },
      {
        follow_up_guide: null,
        question: "このテーマについて、ほかに知っておいてほしいことはありますか？",
        quick_replies: ["特にない"],
      },
    ],
  },
};
