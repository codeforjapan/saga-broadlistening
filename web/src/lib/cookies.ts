/**
 * 利用者の設定・識別子を長期間保持する first-party Cookie の共通設定。
 * httpOnly で JS から読めず、本番では Secure、通常の遷移で送られる SameSite=Lax、有効期限は1年。
 */
export const PERSISTENT_HTTP_ONLY_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
  path: "/",
};
