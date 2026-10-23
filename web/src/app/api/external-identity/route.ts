import {
  findExternalIdentityProvider,
  parseExternalUid,
} from "@mirai-gikai/shared/external-identity/providers";
import { cookies } from "next/headers";
import { z } from "zod";
import { getExternalUidCookieName } from "@/features/external-identity/shared/constants";
import { jsonNoStore } from "@/lib/api/response";
import { PERSISTENT_HTTP_ONLY_COOKIE_OPTIONS } from "@/lib/cookies";

const bodySchema = z.object({
  providerKey: z.string(),
  externalUid: z.string(),
});

/**
 * URL フラグメント（#uid=...）から読み取った外部 UID を httpOnly Cookie に移す。
 *
 * フラグメントはサーバーに届かないため、クライアントが読み取ってここへ送る。
 * レスポンスには UID を含めず、「未登録」と「既知」も区別しない。`changed` は
 * 自分の Cookie が書き換わったかだけを表し、クライアントが再描画の要否に使う。
 * 外部IDの確定と Supabase ユーザーへの紐付けは、匿名セッション確立後に
 * サーバー側（resolveCurrentExternalIdentities）で行う。
 */
export async function POST(req: Request) {
  const parsed = bodySchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return jsonNoStore({ error: "Invalid body" }, 400);
  }

  const provider = findExternalIdentityProvider(parsed.data.providerKey);
  if (!provider) {
    return jsonNoStore({ error: "Unknown provider" }, 400);
  }
  const uid = parseExternalUid(provider, parsed.data.externalUid);
  if (!uid) {
    return jsonNoStore({ error: "Invalid uid" }, 400);
  }

  const cookieStore = await cookies();
  const name = getExternalUidCookieName(provider.key);
  const changed = cookieStore.get(name)?.value !== uid;
  if (changed) {
    cookieStore.set(name, uid, PERSISTENT_HTTP_ONLY_COOKIE_OPTIONS);
  }

  return jsonNoStore({ ok: true, changed });
}
