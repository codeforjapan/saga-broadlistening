import type { PurposeTypeDefinition } from "./types";

const FOCUS = `今のよかった経験を足がかりに、その人が大事にしているものと、望む未来の一場面を聞きます。
未来は「予測」ではなく「その人の価値の表れ」として聞き、実現できるかは問いません。
「あなたの大切な価値は？」と抽象的に聞かず、経験を通して聞きます。肯定的な面だけを話すよう強いません。`;

const PERSPECTIVE =
  "経験を通して大事なものを聞く。最初から不満を話す人には、まず受け止め、「では、どうなっていたらよいですか」と理想へ進む。";

/** 描く: よかった経験から、大事にしているものと望む未来の一場面を聞く */
export const ENVISION: PurposeTypeDefinition = {
  type: "envision",
  label: "描く",
  focusInstruction: FOCUS,
  bill: {
    perspectiveTechniques: PERSPECTIVE,
    replyExamples: `回答：「子どもが給食の話を家でしてくれた」
良い例：「子どもが給食の話を家でしてくれたんですね。その場面の何が、あなたにとって大事でしたか？」
回答：「特にない。何も変わらない」
良い例：「何も変わらないと感じているんですね。では、10年後どうなっていたら、よかったと思えますか？」`,
    steps: [
      {
        follow_up_guide: null,
        question: "いま、この施策に関わる暮らしや仕事をしていますか？",
        quick_replies: ["自分の暮らしで", "家族のことで", "仕事で", "関わっていない"],
      },
      {
        follow_up_guide: "場面の具体、その場面の何が大事だったか（届かなくてよい）",
        question:
          "この施策に関わることで、最近「よかった」と感じたことがあれば、教えてもらえますか？",
        quick_replies: ["思い出せない"],
      },
      {
        follow_up_guide: "誰と・どこで・何を。実現できるかは聞かない",
        question:
          "10年後、この分野がこうなっていたら嬉しい、と思うのはどんなことですか？",
        quick_replies: ["思い浮かばない"],
      },
      {
        follow_up_guide: "一般論なら、最近それを感じた場面",
        question: "それを遠ざけているものは何ですか？",
        quick_replies: ["わからない"],
      },
      {
        follow_up_guide: null,
        question: "ほかに、伝えておきたいことはありますか？",
        quick_replies: ["特にない"],
      },
    ],
  },
  theme: {
    perspectiveTechniques: PERSPECTIVE,
    replyExamples: `回答：「夏に川沿いを子どもと散歩したとき、知らない人が声をかけてくれて、うれしかった」
良い例：「知らない人に声をかけてもらえて、うれしかったんですね。その場面の何が大事でしたか？」
回答：「特にない。佐賀は何もない」
良い例：「何もないと感じているんですね。では、10年後の佐賀がどうなっていたら、ここで過ごしたいと思えますか？」`,
    steps: [
      {
        follow_up_guide: null,
        question: "佐賀市に住んで（関わって）どのくらいになりますか？",
        quick_replies: ["生まれてからずっと", "10年以上", "10年未満", "住んでいない"],
      },
      {
        follow_up_guide: "場面の具体、その場面の何が大事だったか（届かなくてよい）",
        question:
          "このテーマに関わることで、この1年に「よかった」と感じたことがあれば、教えてもらえますか？",
        quick_replies: ["思い出せない"],
      },
      {
        follow_up_guide: "誰と・どこで・何を。実現できるかは聞かない",
        question:
          "10年後、あなたが佐賀で過ごしている一日を、このテーマに関わる場面から描いてみてください。",
        quick_replies: ["思い浮かばない"],
      },
      {
        follow_up_guide: "一般論なら、最近それを感じた場面",
        question: "その一日を遠ざけているものは何ですか？",
        quick_replies: ["わからない"],
      },
      {
        follow_up_guide: null,
        question: "ほかに、10年後の佐賀について伝えておきたいことはありますか？",
        quick_replies: ["特にない"],
      },
    ],
  },
};
