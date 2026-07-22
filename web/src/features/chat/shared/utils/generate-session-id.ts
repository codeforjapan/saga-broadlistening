/**
 * チャットセッション用のUUIDを生成する。
 *
 * `crypto.randomUUID` はセキュアコンテキスト（HTTPS / localhost）でのみ
 * 公開されるため、HTTP経由のLAN IPアクセス等では `undefined` になり
 * `crypto.randomUUID is not a function` エラーになる。
 * ここでは利用可能なAPIを段階的にフォールバックしてUUID v4を生成する。
 */
export function generateSessionId(): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.getRandomValues === "function"
  ) {
    crypto.getRandomValues(bytes);
  } else {
    for (let i = 0; i < bytes.length; i++) {
      bytes[i] = Math.floor(Math.random() * 256);
    }
  }

  // UUID v4 のバージョン・バリアントビットを設定
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0"));
  return `${hex[0]}${hex[1]}${hex[2]}${hex[3]}-${hex[4]}${hex[5]}-${hex[6]}${hex[7]}-${hex[8]}${hex[9]}-${hex[10]}${hex[11]}${hex[12]}${hex[13]}${hex[14]}${hex[15]}`;
}
