import { BRAND_CONFIG } from "@mirai-gikai/branding/config";

export interface UserProfileOption {
  /** DB（user_profiles）に保存するコード */
  value: string;
  label: string;
}

/** 年代の選択肢。value は user_profiles.age_group に保存する */
export const AGE_GROUP_OPTIONS: readonly UserProfileOption[] = [
  { value: "10s", label: "10代" },
  { value: "20s", label: "20代" },
  { value: "30s", label: "30代" },
  { value: "40s", label: "40代" },
  { value: "50s", label: "50代" },
  { value: "60s_over", label: "60代以上" },
];

/** 住んでいるエリアの選択肢。区分は自治体ごとに違うのでブランド設定から取る */
export const AREA_OPTIONS: readonly UserProfileOption[] =
  BRAND_CONFIG.respondentAreaOptions;
