import "server-only";

import { createAdminClient } from "@mirai-gikai/supabase";
import type { UserProfile } from "../../shared/types/user-profile";

/** ユーザーの属性を取得する。まだ保存していなければ null */
export async function findUserProfileByUserId(
  userId: string
): Promise<UserProfile | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("age_group, area")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch user profile: ${error.message}`);
  }

  return data ? { ageGroup: data.age_group, area: data.area } : null;
}

/** ユーザーの属性を保存する（なければ作り、あれば上書きする） */
export async function upsertUserProfile(
  userId: string,
  profile: UserProfile
): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("user_profiles").upsert(
    {
      user_id: userId,
      age_group: profile.ageGroup,
      area: profile.area,
    },
    { onConflict: "user_id" }
  );

  if (error) {
    throw new Error(`Failed to save user profile: ${error.message}`);
  }
}
