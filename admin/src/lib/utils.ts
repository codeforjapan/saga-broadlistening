import { TAILWIND_MERGE_CONFIG } from "@mirai-gikai/branding/typography";
import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const twMerge = extendTailwindMerge(TAILWIND_MERGE_CONFIG);

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
