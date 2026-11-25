"use server";

import { getAuthenticatedUser } from "@/features/interview-session/server/utils/verify-session-ownership";
import {
  AGE_GROUP_OPTIONS,
  AREA_OPTIONS,
} from "../../shared/constants/user-profile-options";
import type { UserProfile } from "../../shared/types/user-profile";
import { parseUserProfileInput } from "../../shared/utils/parse-user-profile-input";
import {
  findUserProfileByUserId,
  upsertUserProfile,
} from "../repositories/user-profile-repository";

/** 自分の属性を取得する。未ログイン・未保存なら null */
export async function getMyUserProfile(): Promise<UserProfile | null> {
  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) return null;
  return await findUserProfileByUserId(auth.userId);
}

/** 自分の属性を保存する。未選択の項目は null で上書きする */
export async function saveMyUserProfile(input: {
  ageGroup?: unknown;
  area?: unknown;
}): Promise<{ success: boolean; error?: string }> {
  const profile = parseUserProfileInput(input, {
    ageGroups: AGE_GROUP_OPTIONS,
    areas: AREA_OPTIONS,
  });
  if (!profile) {
    return { success: false, error: "選択肢にない値です" };
  }

  const auth = await getAuthenticatedUser();
  if (!auth.authenticated) {
    return { success: false, error: auth.error };
  }

  try {
    await upsertUserProfile(auth.userId, profile);
  } catch (error) {
    console.error("Failed to save user profile:", error);
    return { success: false, error: "属性の保存に失敗しました" };
  }

  return { success: true };
}
