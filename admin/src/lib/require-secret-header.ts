import "server-only";
import { timingSafeEqual } from "node:crypto";
import { env } from "@/lib/env";

const HEADER_NAME = "x-aws-test-token";

/**
 * 管理者ログイン不要でcurl等から直接叩けるようにするための共有シークレットチェック。
 * `X-Aws-Test-Token` ヘッダーの値が環境変数 `AWS_TEST_TOKEN` と一致しない場合は
 * 例外を投げる。requireAdmin()の代わりに、本番相当の副作用を伴うテスト専用
 * エンドポイント（/api/aws-test/*）でのみ使うことを想定している。
 *
 * タイミング攻撃を避けるため、単純な文字列比較ではなく timingSafeEqual を使う。
 */
export function requireSecretHeader(request: Request): void {
  const expected = env.awsTestToken;
  if (!expected) {
    throw new Error("AWS_TEST_TOKEN が設定されていません");
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
