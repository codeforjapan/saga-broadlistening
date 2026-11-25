"use client";

import { useEffect, useState } from "react";
import {
  getMyUserProfile,
  saveMyUserProfile,
} from "../../server/actions/user-profile-actions";

export interface UserProfileForm {
  /** 未選択は空文字 */
  ageGroup: string;
  setAgeGroup: (value: string) => void;
  area: string;
  setArea: (value: string) => void;
  /** 前に保存した値を読み終えたか。読み終える前に保存すると、その値を空で上書きしてしまう */
  isLoaded: boolean;
  isSaving: boolean;
  save: () => Promise<void>;
}

/**
 * 属性の質問（年代・エリア）の入力状態。前に保存した値があれば初期値にする。
 * 未選択は空文字で持つ（Select のプレースホルダーを出すため）
 */
export function useUserProfileForm(): UserProfileForm {
  const [ageGroup, setAgeGroup] = useState("");
  const [area, setArea] = useState("");
  const [isLoaded, setIsLoaded] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getMyUserProfile()
      .then((profile) => {
        if (cancelled || !profile) return;
        // 読み込み中にもう選んでいたら、その選択を優先する
        setAgeGroup((current) => current || profile.ageGroup || "");
        setArea((current) => current || profile.area || "");
      })
      .catch((error) => {
        console.error("Failed to load user profile:", error);
      })
      .finally(() => {
        if (!cancelled) setIsLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  /** 保存に失敗しても提出は止めない（属性は任意の回答なので） */
  const save = async () => {
    setIsSaving(true);
    try {
      const result = await saveMyUserProfile({ ageGroup, area });
      if (!result.success) {
        console.error("Failed to save user profile:", result.error);
      }
    } catch (error) {
      console.error("Failed to save user profile:", error);
    } finally {
      setIsSaving(false);
    }
  };

  return { ageGroup, setAgeGroup, area, setArea, isLoaded, isSaving, save };
}
