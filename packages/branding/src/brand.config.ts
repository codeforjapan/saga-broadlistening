import type { BrandConfig } from "./brand-config-types";

/**
 * 自治体ごとのブランド設定（web / admin 共用）。
 *
 * fork 先の自治体はこのファイルを書き換える。画像は `web/public/` に置き、
 * そのパスを指定する。詳細は FORK_GUIDELINES.md を参照。
 */
export const BRAND_CONFIG = {
  siteName: "CHIKAT",
  hashtag: "CHIKAT",
  copyright: "Copyright (c) Saga city. All Rights Reserved.",
  siteDescription:
    "佐賀市で今どんな施策が検討されているか、わかりやすく伝える公聴プラットフォーム",
  keywords: ["施策", "政治", "佐賀市", "解説", "公聴"],
  assets: {
    chatAvatarSrc: "/img/chat-avatar.svg",
    logo: { src: "/img/logo.svg", width: 546, height: 279 },
    logoCompact: { src: "/img/logo-compact.svg", width: 546, height: 210.4 },
    ogpLogoSrc: "/img/ogp-logo.png",
    ogpImage: { src: "/ogp.jpg", width: 1200, height: 630 },
  },
  links: {
    // TODO(#15): 佐賀市側の報告フォームが用意でき次第差し替える
    report: "https://forms.gle/wJXXMt6cv2ZdiCgg6",
    sourceRepository: "https://github.com/codeforjapan/saga-broadlistening",
    forkGuidelines:
      "https://github.com/codeforjapan/saga-broadlistening/blob/develop/FORK_GUIDELINES.md",
  },
} as const satisfies BrandConfig;
