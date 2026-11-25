import { randomUUID } from "node:crypto";
import type { Database } from "@mirai-gikai/supabase";

/**
 * テーマの親施策と子施策（Epic #162）。
 *
 * TOP のテーマカード → 親施策ページ（若者支援）→ 子施策ページ（施策紹介）の導線を
 * ローカルで確認するためのデータ。文面は「CHIKAT 若者支援 導線モック」の仮の文案。
 * 親施策＝公開中の子施策を1件以上持つ施策（#154）なので、仮の高齢者支援にも子を1件置く。
 */

type PolicyInsert = Database["public"]["Tables"]["policies"]["Insert"];
type InterviewConfigInsert =
  Database["public"]["Tables"]["interview_configs"]["Insert"];

/** 若者支援のテーマ（きかせて） */
export const YOUTH_CONFIG_SLUG = "wakamono-shien";
/** 高齢者支援のテーマ（仮） */
export const ELDERLY_CONFIG_SLUG = "koureisha-shien";

// 子施策の parent_policy_id で参照するため、親施策の ID は先に決めておく
const YOUTH_PARENT_ID = randomUUID();
const ELDERLY_PARENT_ID = randomUUID();

export const YOUTH_PARENT_NAME = "若者支援";
export const ELDERLY_PARENT_NAME = "高齢者支援";
export const SCHOLARSHIP_POLICY_NAME = "奨学金返還支援";

const THEME_PUBLISHED_AT = "2026-08-31T09:00:00+09:00";

/**
 * 子施策の定義。seed の行・タグ・本文はすべてここから作る（名前の書き間違いで
 * 「Policy not found」にならないよう、子施策の名前はこの配列にだけ書く）。
 */
type ChildPolicyDef = {
  name: string;
  slug: string;
  parentId: string;
  sortOrder: number;
  tag: string | null;
  summary: string;
  content: string;
  overrides?: Partial<PolicyInsert>;
};

function placeholderContent(name: string) {
  return `## この施策のポイント

${name}の内容は準備中です（仮の文面）。`;
}

const scholarshipContent = `## この施策のポイント

佐賀市で働く若者の奨学金返還をサポート

奨学金を受けて大学などを卒業し、佐賀市内の企業等で1年以上勤務している若者に対して、奨学金返還額の一部を支援します。

## この施策が必要な理由

大学などを卒業した後は、仕事や住まい、結婚など、これからの生活についてさまざまな選択をする時期です。その中で奨学金の返還が続くことは、若者にとって経済的な負担の一つになります。`;

function placeholderChild(
  name: string,
  slug: string,
  parentId: string,
  sortOrder: number,
  tag: string | null,
  overrides?: Partial<PolicyInsert>
): ChildPolicyDef {
  return {
    name,
    slug,
    parentId,
    sortOrder,
    tag,
    summary: `${name}の概要（仮の文面）。`,
    content: placeholderContent(name),
    overrides,
  };
}

const childPolicyDefs: ChildPolicyDef[] = [
  {
    name: SCHOLARSHIP_POLICY_NAME,
    slug: "shougakukin",
    parentId: YOUTH_PARENT_ID,
    sortOrder: 0,
    tag: "奨学金返済",
    summary:
      "大学などを卒業後、佐賀市内の企業等で働く若者を対象に、奨学金の返還額の一部を支援する制度です。",
    content: scholarshipContent,
    overrides: {
      department: "企画調整部 企画政策課",
      contact: "企画政策課（代表電話の内線 1111）",
      thumbnail_url:
        "https://placehold.co/600x400/e6f6ff/0068af/png?text=Shougakukin",
      enable_ai_chat: true,
      related_links: [
        {
          label: "佐賀市：奨学金返還支援",
          url: "https://www.city.saga.lg.jp/kurashi/sumai/1/716.html",
          kind: "city_hp",
        },
      ],
    },
  },
  placeholderChild(
    "進学・留学支援（仮）",
    "shingaku-ryugaku",
    YOUTH_PARENT_ID,
    1,
    "進学・留学",
    {
      related_links: [
        {
          label: "進学・留学支援制度の詳細",
          url: "https://example.jp/shingaku-ryugaku",
          kind: "policy_detail",
        },
      ],
    }
  ),
  placeholderChild(
    "若者の交流支援（仮）",
    "wakamono-koryu",
    YOUTH_PARENT_ID,
    2,
    "交流"
  ),
  placeholderChild(
    "地域の見守り支援（仮）",
    "mimamori-shien",
    ELDERLY_PARENT_ID,
    0,
    null
  ),
];

function toChildPolicySeed(def: ChildPolicyDef): PolicyInsert {
  return {
    name: def.name,
    slug: def.slug,
    publish_status: "published",
    published_at: THEME_PUBLISHED_AT,
    parent_policy_id: def.parentId,
    sort_order: def.sortOrder,
    thumbnail_url: "https://placehold.co/600x400.png",
    ...def.overrides,
  };
}

/** 親施策を先に並べる（同じ INSERT 文の中で子から親を参照するため） */
export const themePolicySeeds: PolicyInsert[] = [
  {
    id: YOUTH_PARENT_ID,
    name: YOUTH_PARENT_NAME,
    slug: "wakamono-shien",
    department: "企画調整部 企画政策課",
    contact: "企画政策課（代表電話の内線 1111）",
    publish_status: "published",
    published_at: THEME_PUBLISHED_AT,
    is_featured: true,
    sort_order: 0,
    thumbnail_url: "/img/top/theme-youth.jpg",
    enable_ai_chat: true,
    knowledge_source:
      "若者支援は、奨学金返還支援・進学や留学の支援・交流の機会づくりの3つの柱で構成されています。",
  },
  {
    id: ELDERLY_PARENT_ID,
    name: ELDERLY_PARENT_NAME,
    slug: "koureisha-shien",
    department: "保健福祉部 高齢福祉課",
    contact: "高齢福祉課（代表電話の内線 2222）",
    publish_status: "published",
    published_at: THEME_PUBLISHED_AT,
    is_featured: true,
    sort_order: 1,
    thumbnail_url: "/img/top/theme-elderly.jpg",
  },
  ...childPolicyDefs.map(toChildPolicySeed),
];

/** 子施策のタグ（関連施策カードの「施策紹介 · 奨学金返済」に出る） */
export const themeTags = [
  {
    label: "奨学金返済",
    description: "奨学金の返還を支援する施策",
    featured_priority: null,
  },
  {
    label: "進学・留学",
    description: "進学や留学への挑戦を後押しする施策",
    featured_priority: null,
  },
  {
    label: "交流",
    description: "同世代や地域の人との出会いをつくる施策",
    featured_priority: null,
  },
];

export const themePolicyTagMap: { [policyName: string]: string[] } =
  Object.fromEntries(
    childPolicyDefs.flatMap((def) => (def.tag ? [[def.name, [def.tag]]] : []))
  );

/** 親施策とテーマの紐付け（テーマのきかせて・トピック・まとめは親施策側に集約する） */
export const themePolicyConfigSlugMap: { [policyName: string]: string[] } = {
  [YOUTH_PARENT_NAME]: [YOUTH_CONFIG_SLUG],
  [ELDERLY_PARENT_NAME]: [ELDERLY_CONFIG_SLUG],
};

export const themeInterviewConfigs: InterviewConfigInsert[] = [
  {
    name: "若者支援",
    slug: YOUTH_CONFIG_SLUG,
    description:
      "奨学金返済・進学／留学・交流など、若者支援の施策全体についてうかがいます。",
    status: "open",
    chat_model: "",
    estimated_duration: 10,
    starts_at: "2026-09-01T00:00:00+09:00",
    purpose_type: "discover",
  },
  {
    name: "高齢者支援",
    slug: ELDERLY_CONFIG_SLUG,
    description: "高齢期の暮らしを支える取組についてうかがいます（仮）。",
    status: "open",
    chat_model: "",
    estimated_duration: 10,
    starts_at: "2026-09-01T00:00:00+09:00",
    purpose_type: "understand",
  },
];

type ThemePolicyContent = {
  policy_name: string;
  difficulty_level: "normal" | "hard";
  title: string;
  summary: string;
  content: string;
};

const youthContent = `## どんなテーマ？

20代から30代は、就職や転職、結婚、子育て、住まい選びなど、人生の大きな選択が重なる時期です。佐賀市では、この時期を迎える若い世代が「どちらかをあきらめる」のではなく、望む生き方を選べるよう、学び・働き・つながりの面から支援を進めています。

## どんな支援がある？

若者支援には、大きく3つの柱があります。奨学金の返還を助ける「奨学金返済」、進学や留学への挑戦を後押しする「進学・留学」、同世代や地域の人との出会いをつくる「交流」です。それぞれの施策の詳しい内容は、下の関連施策から確認できます。

## 佐賀市はなにをめざしている？

佐賀市は、若い世代が市内で学び、働き、暮らし続けたいと思えるまちをめざしています。経済的な負担を軽くすることに加えて、挑戦の機会や人とのつながりを増やすことで、一人ひとりが自分らしい未来を描ける環境づくりに取り組んでいます。`;

function bothLevels(
  content: Omit<ThemePolicyContent, "difficulty_level">
): ThemePolicyContent[] {
  return [
    { ...content, difficulty_level: "normal" },
    { ...content, difficulty_level: "hard" },
  ];
}

export const themePolicyContents: ThemePolicyContent[] = [
  ...bothLevels({
    policy_name: YOUTH_PARENT_NAME,
    title: "若い世代が、自分らしい未来を描けるまちへ",
    summary:
      "20代から30代は、仕事、結婚、子育て、暮らし方など、さまざまな選択や出来事が重なる時期です。佐賀市では、一人ひとりが望む生き方を選びやすい環境をつくりたいと考えています。",
    content: youthContent,
  }),
  ...bothLevels({
    policy_name: ELDERLY_PARENT_NAME,
    title: "年齢を重ねても、安心して自分らしく暮らせるまち",
    summary:
      "健康や介護、移動、地域とのつながりなど、高齢期の暮らしにはさまざまな支えが必要です。佐賀市では、住み慣れた地域で安心して暮らし続けられる環境づくりを進めています。",
    content: placeholderContent(ELDERLY_PARENT_NAME),
  }),
  ...childPolicyDefs.flatMap((def) =>
    bothLevels({
      policy_name: def.name,
      title: def.name,
      summary: def.summary,
      content: def.content,
    })
  ),
];
