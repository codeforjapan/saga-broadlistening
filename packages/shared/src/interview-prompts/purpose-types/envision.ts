import type { PurposeTypeDefinition } from "./types";

const FOCUS = `今のよかった経験を足がかりに、その人が大事にしているものと、望む未来の一場面を聞きます。
未来は「予測」ではなく「その人の価値の表れ」として聞き、実現できるかは問いません。
「あなたの大切な価値は？」と抽象的に聞かず、経験を経由します。肯定面だけを強いません。`;

const PERSPECTIVE =
  "経験を経由して大事なものを聞く。最初から不満を話す人には、まず受け止め、「では、どうなっていたらよいですか」と理想へ進む。";

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
        step_key: "involvement",
        title: "関わり",
        step_kind: "fact",
        turn_budget: 1,
        required: true,
        hint: null,
        question: "いま、この施策に関わる暮らしや仕事をしていますか？",
        quick_replies: ["自分の暮らしで", "家族のことで", "仕事で", "関わっていない"],
      },
      {
        step_key: "good_scene",
        title: "よかった場面",
        step_kind: "episode",
        turn_budget: 4,
        required: true,
        hint: "場面の具体、その場面の何が大事だったか（届かなくてよい）",
        question:
          "この施策に関わることで、「よかった」と感じた最近の場面を1つ教えてください。",
        quick_replies: ["思い出せない"],
      },
      {
        step_key: "future_scene",
        title: "未来の一場面",
        step_kind: "episode",
        turn_budget: 4,
        required: true,
        hint: "誰と・どこで・何を。実現できるかは聞かない",
        question:
          "10年後、この分野がこうなっていたら嬉しい、という場面を1つ描くと、どんな場面ですか？",
        quick_replies: ["思い浮かばない"],
      },
      {
        step_key: "barrier",
        title: "遠ざけているもの",
        step_kind: "reason",
        turn_budget: 3,
        required: true,
        hint: "一般論なら、最近それを感じた場面",
        question: "その場面を遠ざけているものは何ですか？",
        quick_replies: ["わからない"],
      },
      {
        step_key: "sign",
        title: "今ある兆し",
        step_kind: "episode",
        turn_budget: 1,
        required: false,
        hint: null,
        question: "その場面に近いものは、今の佐賀のどこかにもうありますか？",
        quick_replies: ["思い当たらない"],
      },
      {
        step_key: "add_more",
        title: "言い足し",
        step_kind: "add_more",
        turn_budget: 1,
        required: true,
        hint: null,
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
        step_key: "involvement",
        title: "関わり",
        step_kind: "fact",
        turn_budget: 1,
        required: true,
        hint: null,
        question: "佐賀市に住んで（関わって）どのくらいになりますか？",
        quick_replies: ["生まれてからずっと", "10年以上", "10年未満", "住んでいない"],
      },
      {
        step_key: "good_scene",
        title: "よかった場面",
        step_kind: "episode",
        turn_budget: 4,
        required: true,
        hint: "場面の具体、その場面の何が大事だったか（届かなくてよい）",
        question:
          "このテーマに関わることで、この1年に「よかった」と感じた場面を1つ教えてください。",
        quick_replies: ["思い出せない"],
      },
      {
        step_key: "future_scene",
        title: "10年後の一日",
        step_kind: "episode",
        turn_budget: 4,
        required: true,
        hint: "誰と・どこで・何を。実現できるかは聞かない",
        question:
          "10年後、あなたが佐賀で過ごしている一日を、このテーマに関わる場面から描いてみてください。",
        quick_replies: ["思い浮かばない"],
      },
      {
        step_key: "barrier",
        title: "遠ざけているもの",
        step_kind: "reason",
        turn_budget: 3,
        required: true,
        hint: "一般論なら、最近それを感じた場面",
        question: "その一日を遠ざけているものは何ですか？",
        quick_replies: ["わからない"],
      },
      {
        step_key: "sign",
        title: "今ある兆し",
        step_kind: "episode",
        turn_budget: 1,
        required: false,
        hint: null,
        question: "その一日に近いものは、今の佐賀のどこかにもうありますか？",
        quick_replies: ["思い当たらない"],
      },
      {
        step_key: "add_more",
        title: "言い足し",
        step_kind: "add_more",
        turn_budget: 1,
        required: true,
        hint: null,
        question: "ほかに、10年後の佐賀について伝えておきたいことはありますか？",
        quick_replies: ["特にない"],
      },
    ],
  },
};
