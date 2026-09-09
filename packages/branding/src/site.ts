/**
 * サイト共通のブランド定数（web / admin 共用）
 *
 * このブランチ（vanilla）は特定の自治体に依存しないデモ用の構成です。
 * 導入先が決まったら、このファイルの定数を差し替えれば
 * 画面文言・メタデータ・PWA manifest・プロンプトに反映されます。
 *
 * ただし定数を参照できない箇所が残っているので、あわせて手直しが必要です
 * （一覧は FORK_GUIDELINES.md の「変更が必要なファイル一覧」を参照）:
 * - `web/public/openapi/open-data-api.json` — 静的なOpenAPI定義
 * - 「市政」「市民」「市の施策」など、自治体の種別に依存する語
 *   （{@link MUNICIPALITY_NAME} は「市」を前提にしている）
 */
export const SITE_NAME = "サービス名";

/**
 * シェア文言などに使うハッシュタグ（先頭の # は含めない）。
 * 空白や記号を含むサービス名を使う場合だけ、別の文字列で上書きする。
 */
export const SITE_HASHTAG = SITE_NAME;

/** 運営主体となる自治体名。本文中の「〇〇市が〜」といった表記に使う */
export const MUNICIPALITY_NAME = "〇〇市";

/** サービスの一文説明。メタデータとトップの紹介文で共用する */
export const SITE_DESCRIPTION = `${MUNICIPALITY_NAME}で今どんな施策が検討されているか、わかりやすく伝える公聴プラットフォーム`;

/** ロゴのワードマークに添えるタグライン */
export const SITE_TAGLINE = `${MUNICIPALITY_NAME}の施策をわかりやすく`;

/** コピーライト表記（フッター等で共通利用） */
export const COPYRIGHT_TEXT = `Copyright (c) ${MUNICIPALITY_NAME}. All Rights Reserved.`;
