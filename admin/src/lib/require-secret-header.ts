import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const HEADER_NAME = "x-api-test-secret-token";

/**
 * 管理者ログイン不要でcurl等から直接叩けるようにするための共有シークレットチェック。
 * `X-Api-Test-Secret-Token` ヘッダーの値が環境変数 `API_TEST_SECRET_TOKEN` と
 * 一致しない場合は例外を投げる。requireAdmin()の代わりに、本番相当の副作用を伴う
 * テスト専用エンドポイント（/api/tests/*）でのみ使うことを想定している。
 *
 * タイミング攻撃を避けるため、単純な文字列比較ではなく timingSafeEqual を使う。
 */
export function requireSecretHeader(request: Request): void {
  const expected = env.apiTestSecretToken;
  if (!expected) {
    throw new Error("API_TEST_SECRET_TOKEN が設定されていません");
  }

  const provided = request.headers.get(HEADER_NAME) ?? "";
  const expectedBuf = Buffer.from(expected);
  const providedBuf = Buffer.from(provided);

  if (
    expectedBuf.length !== providedBuf.length ||
    !timingSafeEqual(expectedBuf, providedBuf)
  ) {
    throw new Error("Unauthorized");
  }
}
