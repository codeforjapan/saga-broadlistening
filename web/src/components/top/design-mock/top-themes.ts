import { routes } from "@/lib/routes";

/**
 * TOPページのデザイン比較モックで並べるテーマカードの固定データ。
 *
 * DBには持たず、ここを書き換えて差し替える。
 */

/**
 * 「若者支援」テーマ型インタビューの slug。
 * 仮の値。admin で登録した slug が決まったらここだけ書き換える。
 */
const YOUTH_INTERVIEW_SLUG = "wakamono-shien";

/**
 * 若者支援の親ページが未実装のあいだ、仮のリンク先にする施策
 * （奨学金返還支援、slug: shougakukin）の bill id。
 */
const YOUTH_PAGE_FALLBACK_BILL_ID = "159bf03f-4138-4dc9-9c3e-0911eafc341f";

export interface TopTheme {
  id: string;
  /** テーマのタグ。ボタンの文言（「〜のページへ」等）にも使う */
  tag: string;
  title: string;
  description: string;
  bannerSrc: string;
  /** テーマページのリンク先。null ならボタンを押せない状態で出す */
  pageHref: string | null;
  interview: {
    title: string;
    duration: string;
    /** 「〜人が参加」の人数部分。実数が決まるまでモックどおり [N] を出す */
    participantCount: string;
    /** 「はじめる」のリンク先。null ならボタンを押せない状態で出す */
    href: string | null;
  };
}

export const TOP_THEMES: TopTheme[] = [
  {
    id: "youth",
    tag: "若者支援",
    title: "若い世代が、自分らしい未来を描けるまちへ",
    description:
      "20代から30代は、仕事、結婚、子育て、暮らし方など、さまざまな選択や出来事が重なる時期です。佐賀市では、一人ひとりが望む生き方を選びやすい環境をつくりたいと考えています。",
    bannerSrc: "/img/top/theme-youth.jpg",
    pageHref: routes.billDetail(YOUTH_PAGE_FALLBACK_BILL_ID),
    interview: {
      title: "若者支援について、あなたの経験や考えを聞かせてください",
      duration: "約10分〜",
      participantCount: "[N]",
      href: routes.interviewThemeLP(YOUTH_INTERVIEW_SLUG),
    },
  },
  {
    // コピーとバナーは仮。リンク先がまだないのでボタンは押せない
    id: "elderly",
    tag: "高齢者支援",
    title: "年齢を重ねても、安心して自分らしく暮らせるまち",
    description:
      "健康や介護、移動、地域とのつながりなど、高齢期の暮らしにはさまざまな支えが必要です。佐賀市では、住み慣れた地域で安心して暮らし続けられる環境づくりを進めています。",
    bannerSrc: "/img/top/theme-elderly.jpg",
    pageHref: null,
    interview: {
      title: "高齢者支援について、あなたの経験や考えを聞かせてください",
      duration: "約10分〜",
      participantCount: "[N]",
      href: null,
    },
  },
];

/** テーマがこの件数以上になったら、縦積みから2カラムのグリッドに切り替える */
const THEME_GRID_THRESHOLD = 4;

export function usesThemeGrid(themeCount: number): boolean {
  return themeCount >= THEME_GRID_THRESHOLD;
}
