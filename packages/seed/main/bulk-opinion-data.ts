import { randomUUID } from "node:crypto";
import type { Database } from "@mirai-gikai/supabase";
import { pickRespondent } from "../shared/respondents";
import type { OpinionSeed, SeededInterviewSession } from "./seed-types";

type InterviewConfigInsert =
  Database["public"]["Tables"]["interview_configs"]["Insert"];
type InterviewQuestionInsert =
  Database["public"]["Tables"]["interview_questions"]["Insert"];
type InterviewMessageInsert =
  Database["public"]["Tables"]["interview_messages"]["Insert"];

/** 大量の意見をまとめて投入する意見募集（トピック分析の検証用） */
export const BULK_OPINION_CONFIG_SLUG = "denshi-bl";

/**
 * 対話に使うモデル。data.ts の DEFAULT_CHAT_MODEL と同じ値を使う。
 * data.ts から import すると循環参照になるため定数を分けている。
 */
const BULK_OPINION_CHAT_MODEL = "anthropic/claude-haiku-4.5";

/**
 * 大量意見の投入先となる意見募集を作成する。
 * 施策との紐付けは policies_interview_configs（data.ts）で行う。
 */
export function createBulkOpinionInterviewConfig(): InterviewConfigInsert {
  return {
    name: "船荷証券の電子化について",
    slug: BULK_OPINION_CONFIG_SLUG,
    description:
      "船荷証券の電子化による影響、実務上の課題、国際整合性について意見を伺うテーマ",
    status: "open",
    chat_model: BULK_OPINION_CHAT_MODEL,
    estimated_duration: 20,
    starts_at: "2025-09-15T00:00:00+09:00",
  };
}

/**
 * 意見募集の固定質問を作成
 */
export function createBulkOpinionQuestions(
  configId: string
): Omit<InterviewQuestionInsert, "id" | "created_at" | "updated_at">[] {
  return [
    {
      interview_config_id: configId,
      question:
        "船荷証券の電子化について、あなたはどのように関わっていますか？",
      follow_up_guide:
        "回答者の立場と、そこから見えている論点を引き出してください。",
      quick_replies: [
        "仕事で関わっている",
        "暮らしに影響がある",
        "関心があって見ている",
      ],
      question_order: 1,
    },
    {
      interview_config_id: configId,
      question:
        "電子化によって、あなたの業務や生活にどのような影響がありますか？",
      follow_up_guide:
        "具体的な業務フローの変化やコスト面での影響を掘り下げてください。",
      quick_replies: null,
      question_order: 2,
    },
    {
      interview_config_id: configId,
      question: "実施にあたって、どのような課題や不安がありますか？",
      follow_up_guide:
        "技術面、法的面、コスト面などの具体的な課題を聞いてください。",
      quick_replies: null,
      question_order: 3,
    },
  ];
}

/**
 * トピック解析テスト用の多様な意見パターン（各3件のopinions）
 * 10パターン × 10ループ = 100セッション
 */
const opinionPatterns: Array<{
  summary: string;
  role_title: string;
  role_description: string;
  segments: Array<{
    title: string;
    content: string;
    source_message_content: string;
  }>;
}> = [
  // パターン1: フォワーダー実務者（効率化への期待）
  {
    summary:
      "電子化により船荷証券の処理時間が大幅に短縮され、業務効率が向上する",
    role_title: "フォワーダー",
    role_description:
      "中国航路担当のフォワーダー実務者\n業界経験20年\nB/L手続きに日常的に関与",
    segments: [
      {
        title: "紙の船荷証券の処理に膨大な時間がかかっている",
        content:
          "現在、紙のB/Lは国際郵便で送付するため、到着まで5〜7営業日かかる。この間、貨物は港で滞留し、デマレージ（超過保管料）が発生することも多い。電子化により即時送付が可能になれば、年間で数千万円のコスト削減が見込める。",
        source_message_content:
          "紙のB/Lって本当に面倒で、国際郵便で送ると5〜7営業日かかるんですよ。その間、貨物は港で止まってて、デマレージが発生することもしょっちゅうです。うちの試算だと、電子化すれば年間で数千万円は浮くと思います。",
      },
      {
        title: "電子化でヒューマンエラーが減少する",
        content:
          "紙のB/Lでは記載内容の転記ミスが頻繁に発生し、その修正に多大な手間がかかっている。電子化によりデータ入力の自動化・検証が可能になり、ミスの大幅な削減が期待できる。",
        source_message_content:
          "あと、紙だと転記ミスがすごく多いんです。手書きの内容をシステムに打ち直すので、どうしてもミスが出る。修正にも手間がかかって、現場はかなり疲弊してます。電子化でそのあたりは一気に解決できるはず。",
      },
      {
        title: "国際的な書類のやり取りが簡素化される",
        content:
          "特に中国やASEAN諸国との取引では、書類の紛失や遅延が頻発する。電子化により瞬時に書類を送受信でき、トラッキングも容易になるため、国際取引の信頼性が大幅に向上する。",
        source_message_content:
          "中国やASEANとの取引だと、書類がなくなったり届かなかったりってよくあるんですよ。電子化すれば一瞬で送れますし、どこにあるかも追跡できるので、信頼性が全然違ってくると思います。",
      },
    ],
  },
  // パターン2: 中小船会社経営者（コスト懸念）
  {
    summary: "電子化の方向性には賛同するが、中小企業の導入コスト支援が不可欠",
    role_title: "船会社経営者",
    role_description:
      "内航船会社の経営者\n従業員30名\nアジア近距離航路を主に運航",
    segments: [
      {
        title: "システム導入コストが中小企業にとって大きな負担",
        content:
          "電子B/Lプラットフォームの導入には初期費用で数百万円、月額利用料も数十万円かかると見込まれる。大手船会社には負担できても、我々のような中小企業には大きな出費。補助金や段階的導入の仕組みがなければ、競争力が失われてしまう。",
        source_message_content:
          "うちみたいな中小だと、システム導入だけで数百万、月額もけっこうかかるんですよね。大手はいいけど、正直きつい。補助金とか段階的にやれる仕組みがないと、中小は置いていかれますよ。",
      },
      {
        title: "取引先の対応状況にバラつきがある",
        content:
          "当社の取引先には東南アジアの小規模港湾も多く、相手国の電子化対応が進んでいない場合、結局紙と電子の二重管理が必要になる。国際的な普及状況も考慮した移行スケジュールを設定すべき。",
        source_message_content:
          "取引先に東南アジアの小さい港が多いんですが、向こうが電子化に対応してなかったら結局紙も残さないといけないので、二重管理になるのが心配です。世界の普及状況を見ながら進めてほしい。",
      },
      {
        title: "従業員のITリテラシー向上が課題",
        content:
          "ベテランの船員や事務職の中にはITに不慣れな人も多い。電子化に対応するための研修・教育の支援制度が必要。社内の人材育成コストも考慮してほしい。",
        source_message_content:
          "ベテランの船員とか事務の人、パソコン苦手な人多いんですよ。研修とか教育の支援がないと、現場が回らなくなる。人材育成のコストも馬鹿にならないので、そこも考えてほしいです。",
      },
    ],
  },
  // パターン3: 貿易保険会社（セキュリティ懸念）
  {
    summary:
      "電子化のメリットは理解するが、セキュリティと法的効力の担保が最優先",
    role_title: "リスクアナリスト",
    role_description:
      "貿易保険会社のリスクアナリスト\n海上保険・貿易リスク専門\n法務部門との連携業務",
    segments: [
      {
        title: "電子B/Lの改ざん・不正リスクへの対策が不十分",
        content:
          "紙のB/Lは物理的な原本管理が可能だが、電子化された場合のサイバー攻撃や改ざんリスクへの対策が法案では十分に示されていない。ブロックチェーン等の技術的担保と、万一の不正発生時の法的責任の明確化が必要。",
        source_message_content:
          "紙なら原本の管理ができるんですけど、電子化するとサイバー攻撃とか改ざんのリスクが怖いですね。法案にはそのあたりの対策が具体的に書かれてないのが気になります。ブロックチェーンとかで担保するにしても、万一の時の法的責任をはっきりさせてほしい。",
      },
      {
        title: "紛争解決時の証拠としての法的効力が不明確",
        content:
          "国際取引では紛争が生じた際にB/Lが重要な証拠となるが、電子B/Lの法的証拠力について、各国の裁判所での扱いが統一されていない。準拠法の整備が不可欠。",
        source_message_content:
          "紛争になった時にB/Lって重要な証拠なんですが、電子B/Lだと各国の裁判所でどう扱われるかバラバラなんですよね。そこの法整備がされないまま進めるのは危険だと思います。",
      },
      {
        title: "保険料率の見直しが必要になる",
        content:
          "電子B/Lの導入に伴い、新たなリスク（システム障害、サイバー攻撃等）が生じるため、海上保険の料率体系の見直しが必要。保険業界全体での合意形成に時間がかかる可能性がある。",
        source_message_content:
          "電子化すると、システム障害とかサイバー攻撃って新しいリスクが出てくるので、保険の料率も見直さないといけないんです。業界全体で合意するのに時間がかかりそうで、そこが課題ですね。",
      },
    ],
  },
  // パターン4: 港湾労働者（雇用懸念）
  {
    summary: "電子化により港湾事務職の雇用が失われることを懸念",
    role_title: "港湾事務職員",
    role_description: "港湾事務職員\n通関・書類処理業務を担当\n勤続15年",
    segments: [
      {
        title: "書類処理業務の自動化で雇用が失われる",
        content:
          "現在の港湾事務は船荷証券を含む書類の確認・照合が業務の中心。電子化でこれが自動化されると、私のような事務職員の仕事がなくなる。再就職支援や職業訓練の制度が整備されていないまま進めるのは無責任。",
        source_message_content:
          "今の仕事って、B/Lの確認と照合がメインなんですよ。それが自動化されたら、私みたいな事務職の仕事がなくなる。再就職とか職業訓練の制度もないまま進めるのは無責任だと思います。",
      },
      {
        title: "地方港湾のインフラが対応できない",
        content:
          "大都市の港湾と違い、地方の中小港湾ではネットワーク環境やIT機器の整備が遅れている。全国一律の電子化は地方港湾を切り捨てることにつながる。",
        source_message_content:
          "大きい港はいいけど、地方の小さい港湾ってネット環境もIT機器も全然整ってないですよ。全国一律で電子化しろって言われても、地方は対応できない。切り捨てないでほしい。",
      },
      {
        title: "現場の声が法案に反映されていない",
        content:
          "法案の策定過程で、実際に港湾で働いている我々の意見が十分に聴取されていない。机上の理想論だけで進めてほしくない。現場実態に即した制度設計を求める。",
        source_message_content:
          "法案作る時に、実際に港で働いてる人間の話をちゃんと聞いたんですかね。机の上で考えただけの理想論じゃ困る。現場の実態に合った制度にしてほしいです。",
      },
    ],
  },
  // パターン5: 国際法学者（制度整備重視）
  {
    summary: "MLETR準拠の国内法整備は国際競争力維持のために不可欠",
    role_title: "大学教授",
    role_description:
      "海商法・国際取引法の大学教授\nUNCITRAL関連研究\n政府審議会委員",
    segments: [
      {
        title: "MLETRへの対応は急務",
        content:
          "英国、シンガポール、ドイツなど主要海運国がすでにMLETR（電子的移転可能記録モデル法）に対応した国内法を整備している。日本が遅れると国際取引において不利な立場に置かれ、海運ハブとしての地位が低下する恐れがある。",
        source_message_content:
          "イギリスやシンガポール、ドイツはもうMLETRに対応した国内法を整備してますよね。日本が遅れると国際取引で不利になるし、海運ハブとしての地位も下がってしまう。早急に対応すべきだと考えています。",
      },
      {
        title: "電子B/Lの権利移転メカニズムの法的整備が重要",
        content:
          "紙のB/Lでは裏書・交付による権利移転が確立しているが、電子化においてはこれに相当する確実な権利移転の仕組みを法律で担保する必要がある。本法案の権利移転規定は概ね妥当だが、占有の概念をさらに明確化すべき。",
        source_message_content:
          "紙のB/Lだと裏書で権利移転できるわけですが、電子化するとそれに代わる確実な仕組みが必要です。本法案の権利移転規定はおおむね妥当ですが、占有の概念をもう少し明確にしたほうがいいですね。",
      },
      {
        title: "既存の国際条約との整合性確保",
        content:
          "ヘーグ・ヴィスビー・ルールズやロッテルダム・ルールズとの整合性は法案の現行の枠組みで概ね確保されている。ただし、米国のCOGSA体系を持つ国との取引については、追加的な解釈指針が必要になる場面も想定される。",
        source_message_content:
          "ヘーグ・ヴィスビー・ルールズとの整合性はおおむね取れていると思いますが、アメリカのCOGSA体系の国との取引では追加の解釈指針が要るケースも出てくるでしょうね。",
      },
    ],
  },
  // パターン6: ITベンダー（技術面からの提言）
  {
    summary: "技術的には十分実現可能。標準化とAPI連携が鍵",
    role_title: "物流テックCTO",
    role_description:
      "物流テック企業のCTO\n電子B/Lプラットフォーム開発経験\nブロックチェーン技術専門",
    segments: [
      {
        title: "ブロックチェーン技術で原本性の担保は可能",
        content:
          "分散台帳技術を用いれば、電子B/Lの原本性・唯一性を技術的に担保することは十分可能。すでにTradeLensやBolero等のプラットフォームで実用化されている。技術的なハードルは低い。",
        source_message_content:
          "技術的に言えば、分散台帳を使えば電子B/Lの原本性は十分担保できます。TradeLensやBoleroですでに実用化されてますし、技術的なハードルは正直低いですよ。",
      },
      {
        title: "プラットフォーム間の相互運用性確保が最大の技術課題",
        content:
          "複数の電子B/Lプラットフォームが乱立すると、相互運用性の欠如が新たな障壁になる。法律でAPIの標準仕様やデータフォーマットの統一を義務づけるか、業界標準の策定を促進すべき。",
        source_message_content:
          "プラットフォームが乱立すると相互運用性がなくなって、それ自体が障壁になります。APIの標準仕様を法律で決めるか、業界標準を作るかしないと。",
      },
      {
        title: "クラウドインフラの信頼性確保が前提条件",
        content:
          "電子B/Lは24時間365日利用可能でなければならない。システム障害や災害時のBCP（事業継続計画）対策を法律や省令で義務付ける必要がある。99.99%以上の可用性を保証すべき。",
        source_message_content:
          "電子B/Lは24時間365日使えないとダメですよね。障害時や災害時のBCP対策を法律で義務付けるべきです。99.99%以上の可用性は必須だと思います。",
      },
    ],
  },
  // パターン7: 消費者（一般市民の視点）
  {
    summary: "物流の効率化により商品の価格低下が期待できる",
    role_title: "会社員",
    role_description:
      "会社員\nECサイトでの海外通販を月数回利用\n物流効率化に関心あり",
    segments: [
      {
        title: "物流コスト削減による商品価格の低下に期待",
        content:
          "海外から商品を購入する際、通関や物流の遅延で届くまで時間がかかることが多い。電子化で手続きが早くなれば、配送も早くなり、物流コストも下がって商品が安くなることを期待している。",
        source_message_content:
          "海外通販で買い物すると、届くまでめちゃくちゃ時間かかるんですよね。電子化で手続きが早くなれば配送も早くなるし、物流コストが下がって商品も安くなるんじゃないかなと期待してます。",
      },
      {
        title: "環境面でのペーパーレス化にも賛成",
        content:
          "大量の紙書類を国際郵便で送ることは環境負荷も大きい。デジタル化は環境にも優しい選択だと思う。SDGsの観点からも支持できる。",
        source_message_content:
          "大量の紙を国際郵便で送るのって環境にもよくないですよね。ペーパーレス化はSDGsの観点からもいいことだと思います。",
      },
      {
        title: "配送状況の透明性が向上してほしい",
        content:
          "現状では海外からの荷物がどこにあるのか分からないことが多い。電子化により追跡が容易になり、消費者としても安心して海外通販を利用できるようになることを期待する。",
        source_message_content:
          "海外から頼んだ荷物がどこにあるか全然わからないことが多いんですよ。電子化で追跡しやすくなるなら、安心して海外通販できるようになるので嬉しいです。",
      },
    ],
  },
  // パターン8: 銀行の貿易金融担当（決済実務の視点）
  {
    summary: "L/C決済との連携が円滑にできれば電子化は歓迎",
    role_title: "貿易金融担当",
    role_description:
      "メガバンク貿易金融部門\nL/C（信用状）審査担当\n国際決済業務20年",
    segments: [
      {
        title: "信用状決済における電子B/Lの受け入れ基準が必要",
        content:
          "銀行のL/C決済では、B/Lの原本確認が重要なプロセス。電子B/Lを信用状の呈示書類として受け入れる際の統一基準（eUCP等）との整合性を確保し、銀行業界のガイドラインを事前に策定すべき。",
        source_message_content:
          "L/C決済ではB/Lの原本確認が大事なプロセスなんですが、電子B/Lを信用状の呈示書類として受け入れる統一基準がまだないんですよね。eUCPとの整合性を取って、業界のガイドラインを先に作るべきだと思います。",
      },
      {
        title: "電子化は貿易金融のDXを加速させる好機",
        content:
          "B/Lの電子化が実現すれば、L/Cの電子化、さらには貿易金融全体のデジタルトランスフォーメーションが加速する。サプライチェーンファイナンスの高度化にもつながり、金融機関としても前向きに捉えている。",
        source_message_content:
          "B/Lが電子化されれば、L/Cの電子化、さらに貿易金融全体のDXが一気に進みますよ。サプライチェーンファイナンスも高度化できるので、金融機関としては前向きに見てます。",
      },
      {
        title: "AML/CFT（マネーロンダリング対策）との連携",
        content:
          "電子B/Lの導入により、取引の透明性が向上し、マネーロンダリングやテロ資金供与のリスク検知が容易になる。ただし、既存のAMLシステムとの連携方法を早期に確立する必要がある。",
        source_message_content:
          "電子化で取引の透明性が上がるのはAML的にもプラスですね。マネロンやテロ資金のリスク検知がやりやすくなる。ただ既存のAMLシステムとの連携方法は早めに決めないと。",
      },
    ],
  },
  // パターン9: 税関職員（実務的な懸念）
  {
    summary: "通関手続きの効率化は期待できるが、システム連携に課題がある",
    role_title: "税関職員",
    role_description: "財務省税関職員\n輸出入通関業務担当\nNACCS運用経験",
    segments: [
      {
        title: "NACCSとの連携が不可欠",
        content:
          "日本の通関はNACCS（通関情報処理システム）で電子化されているが、電子B/Lとの自動連携はまだ実現していない。システム改修には相当な予算と期間が必要で、法施行のスケジュールとの整合性を取る必要がある。",
        source_message_content:
          "NACCSで通関は電子化してるんですけど、電子B/Lとの自動連携はまだなんですよね。システム改修にはお金も時間もかかるから、法律のスケジュールと合わせて考えないと現場が混乱します。",
      },
      {
        title: "移行期間中の紙と電子の混在管理が最大の懸念",
        content:
          "全面電子化までの移行期間中、紙のB/Lと電子B/Lが混在する状況が避けられない。二重チェック体制の構築は現場の負担を増やすため、十分な移行期間と段階的な導入が必要。",
        source_message_content:
          "全面電子化までの間、紙と電子が混在する時期が絶対ある。二重チェックって現場の負担がすごいんですよ。移行期間は長めに取って、段階的に進めてほしいです。",
      },
      {
        title: "不正輸入の検知体制の見直し",
        content:
          "現在の紙ベースの検査では、書類の物理的な特徴（透かし等）も不正検知の手がかりになっている。電子化に伴い、新たな不正検知の仕組みを構築する必要がある。",
        source_message_content:
          "今は紙の書類を目視で検査する時に、透かしとかの物理的な特徴も見てるんですが、電子化するとそれができなくなる。新しい不正検知の仕組みが必要ですね。",
      },
    ],
  },
  // パターン10: 荷主企業（サプライチェーンの視点）
  {
    summary: "サプライチェーン全体の可視化・効率化に期待",
    role_title: "SCM部門長",
    role_description:
      "製造業大手のSCM部門長\n年間数千TEUの海上輸送を管理\nDX推進担当",
    segments: [
      {
        title: "サプライチェーンの可視化が大幅に向上する",
        content:
          "電子B/Lにより、貨物のステータスをリアルタイムで追跡できるようになる。これまで「B/Lがどこにあるか分からない」という状況が頻発していたが、電子化でサプライチェーン全体の可視性が飛躍的に向上する。",
        source_message_content:
          "今までB/Lがどこにあるかわからないって状況がよくあったんですよ。電子化でリアルタイムに貨物のステータスが追跡できるようになれば、サプライチェーン全体の可視性が飛躍的に上がります。",
      },
      {
        title: "在庫管理の最適化とキャッシュフロー改善",
        content:
          "B/Lの到着待ちによる貨物の滞留がなくなれば、ジャストインタイム配送が実現しやすくなる。在庫を最小限に抑えられ、運転資金の効率化にもつながる。当社の試算では年間1億円規模の改善効果が見込める。",
        source_message_content:
          "B/Lの到着待ちで貨物が滞留するのがなくなれば、ジャストインタイム配送が実現できます。在庫を最小限に抑えられるし、うちの試算だと年間1億円くらいの改善効果がありそうです。",
      },
      {
        title: "取引先との情報共有がスムーズになる",
        content:
          "現在は取引先ごとに異なるフォーマットで書類をやり取りしているが、電子B/Lの標準化により、取引先との情報共有がスムーズになる。EDI連携も容易になり、受発注から決済までのリードタイムが短縮される。",
        source_message_content:
          "今は取引先ごとにフォーマットが違う書類をやり取りしてるんですけど、電子B/Lで標準化されれば情報共有がスムーズになる。EDI連携も楽になって、受発注から決済までの時間が短くなりますね。",
      },
    ],
  },
];

/** 意見パターンを何周させるか（10 パターン × 10 周 = 100 セッション） */
const BULK_LOOP_COUNT = 10;

/**
 * 大量意見のインタビューセッションを作成（10パターン × 10ループ = 100件）
 */
export function createBulkOpinionSessions(
  configId: string,
  respondentIds: string[]
): SeededInterviewSession[] {
  const now = new Date();
  const sessions: SeededInterviewSession[] = [];

  for (let loop = 0; loop < BULK_LOOP_COUNT; loop++) {
    const baseOffset = loop * 86400000 * 3;

    for (let p = 0; p < opinionPatterns.length; p++) {
      const index = loop * opinionPatterns.length + p;
      sessions.push({
        id: randomUUID(),
        interview_config_id: configId,
        user_id: pickRespondent(respondentIds, index),
        started_at: new Date(
          now.getTime() - baseOffset - (p + 1) * 3600000
        ).toISOString(),
        completed_at: new Date(
          now.getTime() - baseOffset - p * 3600000 - 1800000
        ).toISOString(),
      });
    }
  }

  return sessions;
}

/** 立場を尋ねる最初の質問への回答（賛否ではなく関わり方を答えてもらう） */
function openingReply(roleTitle: string): string {
  return `${roleTitle}として、この話題に日常的に関わっています。`;
}

/**
 * 大量意見のインタビューメッセージを作成
 * 各論点を個別のユーザーメッセージとして作成し、source_message_id の紐付けを可能にする
 */
export function createBulkOpinionMessages(
  sessionIds: string[]
): Omit<InterviewMessageInsert, "id" | "created_at" | "updated_at">[] {
  const messages: Omit<
    InterviewMessageInsert,
    "id" | "created_at" | "updated_at"
  >[] = [];

  for (let i = 0; i < sessionIds.length; i++) {
    const sessionId = sessionIds[i];
    const pattern = opinionPatterns[i % opinionPatterns.length];

    messages.push({
      interview_session_id: sessionId,
      role: "assistant",
      content:
        "こんにちは！船荷証券の電子化に関する施策についてお話を伺います。まず、この話題とどのように関わっていますか？",
    });
    messages.push({
      interview_session_id: sessionId,
      role: "user",
      content: openingReply(pattern.role_title),
    });
    messages.push({
      interview_session_id: sessionId,
      role: "assistant",
      content: "そのお立場から、感じていることを教えてください。",
    });
    // 各論点を個別のユーザーメッセージとして作成
    for (const segment of pattern.segments) {
      messages.push({
        interview_session_id: sessionId,
        role: "user",
        content: segment.source_message_content,
      });
    }
    messages.push({
      interview_session_id: sessionId,
      role: "assistant",
      content: "ありがとうございました。ご意見を承りました。",
    });
  }

  return messages;
}

// =============================================================================
// リアルなインタビューログ（1件、自然な back-and-forth）
//
// 本番のインタビューらしさを再現するため、opinionPatterns の
// 「5 ターンで 3 意見一気に話す」構造ではなく、インタビュアーとの
// 深掘り往復を含む自然な流れで 1 セッションを作成する。
// シミュレーション機能の検証用データとしても有用。
// =============================================================================

/**
 * リアル系セッションのペルソナ情報（1件分）。
 *
 * 医薬品・バイオ原料の国際輸送を担当する中小物流会社のコーディネーター。
 * - 業界歴 8 年、IT は得意ではない
 * - ベトナム・台湾向けが主力
 * - 冷蔵品の通関遅延で何度も痛い思いをしている
 * - 電子化には期待しつつ、中小サポートと国際整合性を条件に挙げる
 */
const realisticPattern = {
  summary:
    "冷蔵医薬品の通関遅延で困ってるから電子化自体は歓迎だけど、中小が使えるサポートと海外取引先との足並みがセットじゃないと結局回らない",
  role_title: "医薬品物流担当",
  role_description:
    "医薬品・バイオ原料の国際輸送を担当する中小物流会社のコーディネーター。\n業界歴 8 年、IT は得意ではない。\n主力航路はベトナム・台湾。",
  segments: [
    {
      title: "冷蔵品の通関遅延が業務負担に直結している",
      content:
        "紙の B/L が届かないせいで冷蔵コンテナが港で足止めされ、温度維持コストが毎日数万円単位で膨らむ。昨夏はワクチン原料が 5 日遅延し、温度管理費用だけで相当の損失が出た。電子化で即時送付できれば、こうした現場の恒常的な痛みは解消に向かう。",
    },
    {
      title: "中小事業者でも使えるサポートが必須",
      content:
        "IT 担当専任を置けない中小企業でも運用できるよう、操作が難しくない標準ツール・日本語のサポート窓口・導入補助金がセットで用意されていないと、結局システム投資余力のある大手だけが恩恵を受ける構図になってしまう。",
    },
    {
      title: "海外取引先との国際整合性が取れないと意味がない",
      content:
        "ベトナム・台湾など主要相手国が紙のままだと、こちらだけ電子化しても紙も併走させる必要があり二度手間。日本独自規格を先行させるより、MLETR など国際モデル法に揃えて「ちゃんと回る」形を優先してほしい。",
    },
  ],
} satisfies {
  summary: string;
  role_title: string;
  role_description: string;
  segments: Array<{
    title: string;
    content: string;
  }>;
};

/**
 * リアル系セッションの会話ログ（インタビュアー↔ インタビュイーの自然な往復）。
 *
 * opinionPatterns の機械的な構造とは違い、
 * - 最初は短答・躊躇、徐々に開示
 * - インタビュアーが都度深掘り（モノローグではない）
 * - 知らない用語を素直に「知らない」と返す
 * - 言い換え・自己訂正・口癖
 * が含まれるようにした。
 */
const realisticConversation: Array<{
  role: "assistant" | "user";
  content: string;
  /** source_message_id として紐付ける segments のインデックス。なければ undefined */
  linksToOpinionIndex?: number;
}> = [
  {
    role: "assistant",
    content:
      "こんにちは。船荷証券（B/L）の電子化に関する施策について、率直なご意見を聞かせてください。まずは、この話題とどのように関わっていますか？",
  },
  {
    role: "user",
    content: "うーん……仕事で毎日関わってはいます、けど、複雑ですね。",
  },
  {
    role: "assistant",
    content:
      "ありがとうございます。差し支えなければ、お立場と、なぜそう感じているのか、もう少し教えていただけますか？",
  },
  {
    role: "user",
    content:
      "医薬品とか、バイオ原料の国際輸送を担当してて、もう 8 年くらいやってます。中小の物流会社です。",
  },
  {
    role: "user",
    content:
      "正直、紙の B/L で困るのは毎日あるんですよ。でも、電子化したら全部解決、って話でもなくて。だから手放しでは喜べない、っていう感じなんです。",
  },
  {
    role: "assistant",
    content: "毎日困る、というのは具体的にはどんな場面ですか？",
  },
  {
    role: "user",
    content:
      "いちばんしんどいのは冷蔵品ですね。B/L が届かないだけでコンテナが港で止まるんで、温度維持のコストが毎日数万単位で積み上がるんですよ。去年の夏、ワクチンの原料で 5 日遅延したんですけど、温度管理だけで本当に痛かったです。",
    linksToOpinionIndex: 0,
  },
  {
    role: "assistant",
    content:
      "5 日の遅延で温度管理コストが数万円単位、それは切実ですね。\n引っかかっているという部分について伺いたいのですが、どういう条件がそろっていれば、安心して進められそうですか？",
  },
  {
    role: "user",
    content:
      "まず、うちみたいな中小でもちゃんと使えるシステムであること。IT 担当が専任でいるような会社じゃないので、誰でも触れて、日本語でサポート窓口があって、できれば導入のお金も補助が出て、くらいまで揃ってないと、結局大手しか恩恵を受けない制度になっちゃうんですよね。",
    linksToOpinionIndex: 1,
  },
  {
    role: "user",
    content:
      "あともう一つは、海外の取引先と足並みがそろってること。うち、ベトナムと台湾がメインなんですけど、向こうが紙のままだったら、結局こっちも紙で作って送らないといけないんですよ。国内だけ電子化しても、二度手間になるだけ、というか。",
    linksToOpinionIndex: 2,
  },
  {
    role: "assistant",
    content:
      "国際整合性の話、とても重要ですね。国際的には MLETR（電子的移転可能記録モデル法）という国連のモデル法があって、イギリスやシンガポールなどで採用が進んでいます。日本として、こういう国際ルールと合わせる方向と、独自規格を先に整える方向だと、どちらが望ましいと感じますか？",
  },
  {
    role: "user",
    content: "あ、えっと、ごめんなさい、MLETR って初めて聞きました……",
  },
  {
    role: "assistant",
    content:
      "失礼しました、先走りました。要するに、主要な取引相手国がすでに採用している国際ルールに揃えるか、日本独自の規格を先に作るか、というイメージです。",
  },
  {
    role: "user",
    content:
      "あー、なるほど。それなら絶対、国際的に揃ってるやつに合わせてほしいです。日本だけ先行してても、さっき話したみたいに取引先が紙なら意味ないので。先進的かどうかより、ちゃんと回るほうを優先してほしいですね。",
  },
  {
    role: "assistant",
    content:
      "承知しました。最後に、この施策を進めるうえで「ここだけは絶対に押さえてほしい」というポイントを一つ挙げるとすると、何になりますか？",
  },
  {
    role: "user",
    content:
      "えー、一つだけ……難しいな。じゃあ、中小事業者のサポート、ですね。これが抜けてると、現場は絶対回らないです。",
  },
  {
    role: "assistant",
    content:
      "ありがとうございました。ここまでの内容をまとめ、レポートを作成します。",
  },
];

/**
 * リアル系セッション 1 件を作成する（直近の日付で挿入）
 */
export function createRealisticSession(
  configId: string,
  respondentIds: string[]
): SeededInterviewSession {
  const now = new Date();
  return {
    id: randomUUID(),
    interview_config_id: configId,
    // 大量意見のセッションと被らない位置の回答者を割り当てる
    user_id: pickRespondent(respondentIds, opinionPatterns.length),
    started_at: new Date(now.getTime() - 40 * 60000).toISOString(),
    completed_at: new Date(now.getTime() - 5 * 60000).toISOString(),
    rating: 4,
  };
}

/**
 * リアル系セッションのメッセージを作成する
 */
export function createRealisticMessages(
  sessionId: string
): Omit<InterviewMessageInsert, "id" | "created_at" | "updated_at">[] {
  return realisticConversation.map((turn) => ({
    interview_session_id: sessionId,
    role: turn.role,
    content: turn.content,
  }));
}

/**
 * 論点の根拠になった会話ログの本文を返す。
 * 会話ログ側の linksToOpinionIndex が正本で、意見側に本文を複製しない。
 * 対応する発言が無いのは seed データの不整合なので fail fast させる。
 */
function findRealisticSourceContent(segmentIndex: number): string {
  const turn = realisticConversation.find(
    (t) => t.linksToOpinionIndex === segmentIndex
  );
  if (!turn) {
    throw new Error(
      `Realistic seed: no source message for segment index ${segmentIndex}`
    );
  }
  return turn.content;
}

/**
 * リアル系セッションの意見（3 論点）。
 */
export function createRealisticOpinion(sessionId: string): OpinionSeed {
  return {
    opinion: {
      interview_session_id: sessionId,
      final_text: buildFinalText(realisticPattern.segments),
      summary: realisticPattern.summary,
      role_title: realisticPattern.role_title,
      role_description: realisticPattern.role_description,
      content_richness: { total: 88 },
      moderation_score: 5,
      review_status: "published",
      is_public_by_user: true,
      is_public_by_admin: true,
      is_data_reuse_consented: true,
    },
    segments: realisticPattern.segments.map((segment, index) => {
      const sourceMessageContent = findRealisticSourceContent(index);
      return {
        opinion_index: index,
        title: segment.title,
        content: segment.content,
        contextual_quote: sourceMessageContent,
        richness: 88,
        sourceMessageContent,
      };
    }),
  };
}

/**
 * 市民が最終確認して提出した意見文（opinions.final_text）を論点から組み立てる。
 * AI が作った要約（summary）とは別に、本文そのものが必須のため。
 */
function buildFinalText(segments: { content: string }[]): string {
  return segments.map((segment) => segment.content).join("\n\n");
}

/** 意見の公開レビュー状態（先頭 30 件のみ公開済みとして扱う） */
const BULK_PUBLISHED_COUNT = 30;
/** 職員が非公開にしたケースを作る位置 */
const BULK_HIDDEN_FROM = 90;

/**
 * 大量意見を作成（100件、各3論点）。
 * source_message_id は run.ts 側で sourceMessageContent から解決する。
 */
export function createBulkOpinions(sessionIds: string[]): OpinionSeed[] {
  return sessionIds.map((sessionId, index) => {
    const pattern = opinionPatterns[index % opinionPatterns.length];
    const isPublicByAdmin = index < BULK_PUBLISHED_COUNT;

    return {
      opinion: {
        interview_session_id: sessionId,
        final_text: buildFinalText(pattern.segments),
        summary: pattern.summary,
        role_title: pattern.role_title,
        role_description: pattern.role_description,
        // total_content_richness / moderation_status は生成列なので投入しない
        content_richness: { total: 40 + (index % 50) },
        moderation_score: index % 20,
        review_status: isPublicByAdmin
          ? "published"
          : index >= BULK_HIDDEN_FROM
            ? "hidden"
            : "pending_review",
        is_public_by_user: true,
        is_public_by_admin: isPublicByAdmin,
        is_data_reuse_consented: index % 3 !== 0,
      },
      segments: pattern.segments.map((segment, segmentIndex) => ({
        opinion_index: segmentIndex,
        title: segment.title,
        content: segment.content,
        contextual_quote: segment.source_message_content,
        richness: 50 + segmentIndex * 5,
        sourceMessageContent: segment.source_message_content,
      })),
    };
  });
}
