import { CHAT_AVATAR_SRC } from "@mirai-gikai/branding/assets";
import Image from "next/image";

/** インタビューのAIの聞き手のアイコン。チャット・開始画面・会話ログで同じものを出す */
export function ChatAiAvatar() {
  return (
    <Image
      src={CHAT_AVATAR_SRC}
      alt="AI"
      width={36}
      height={36}
      className="rounded-full"
    />
  );
}
