/** `web/public/` 配下の画像と、その実寸（next/image・OGPに渡す縦横比） */
export type BrandImage = {
  /** `/` 始まりのローカルパス（`web/public/` からの相対） */
  src: string;
  width: number;
  height: number;
};

/**
 * 自治体ごとに変えるブランド設定の形。値は brand.config.ts に書く。
 *
 * 環境（本番・staging・ローカル）では変わらず、自治体ごとに変わる値だけを置く。
 * 環境ごとに変わる値（URL・分析ID）や秘密情報は環境変数で渡す。
 */
export type BrandConfig = {
  /** サービス名（ヘッダー・タイトル・シェア文言・PWAの名前など） */
  siteName: string;
  /** シェア文言などに使うハッシュタグ（先頭の # は含めない） */
  hashtag: string;
  /** コピーライト表記（フッター等） */
  copyright: string;
  /** 検索エンジン・SNS・PWA（manifest）向けのサイトの説明文 */
  siteDescription: string;
  /** メタデータの keywords（サービス名は自動で先頭に付く） */
  keywords: string[];
  assets: {
    /**
     * インタビューのAIの聞き手のアイコン（`/` 始まりのローカルパス）。
     * null なら汎用のデフォルトアイコンを出す
     */
    chatAvatarSrc: string | null;
    /** にっこりマーク + ワードマーク + タグライン。大きく見せる箇所用 */
    logo: BrandImage;
    /** タグラインを外した版。ヘッダーなど小さく見せる箇所用 */
    logoCompact: BrandImage;
    /** 動的OGP画像（Satori）に埋め込むラスター版ロゴ（PNG） */
    ogpLogoSrc: string;
    /** サイト共通のOGP画像（施策・テーマに画像がないときにも使う） */
    ogpImage: BrandImage;
  };
  links: {
    /** 不具合・問題の報告フォーム */
    report: string;
    /** ソースコードのリポジトリ（AGPL-3.0 によるソースの公開先） */
    sourceRepository: string;
    /** fork ガイドライン */
    forkGuidelines: string;
  };
};
