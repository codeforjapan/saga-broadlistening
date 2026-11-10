"use client";

import { X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import type { UidLaunchDescription } from "../../shared/utils/describe-uid-launch";

function formatKeys(keys: string[]): string {
  return keys.length > 0 ? keys.join(", ") : "なし";
}

/**
 * 【一時的な診断用（#146）】開いたときの UID の形を画面上部に出す。
 * 固定ヘッダーより手前に重ね、確認後は閉じられるようにする。
 */
export function UidLaunchDebugBanner({
  description,
}: {
  description: UidLaunchDescription;
}) {
  const [open, setOpen] = useState(true);
  if (!open) return null;

  const { hashKeys, searchKeys, uid } = description;
  return (
    <div className="fixed inset-x-0 top-0 z-200 flex items-start gap-2 break-all border-b border-border bg-muted px-4 py-2 font-mono text-xs text-foreground shadow-md">
      <div className="flex-1">
        <p className="font-bold">UID診断（develop のみ・一時表示）</p>
        <p>
          # のパラメータ: {formatKeys(hashKeys)} / ? のパラメータ:{" "}
          {formatKeys(searchKeys)}
        </p>
        <p>
          {uid
            ? `uid: 長さ ${uid.length} / 形 ${uid.shape} / 判定 ${uid.valid ? "OK" : "NG"}`
            : "uid: なし"}
        </p>
      </div>
      <Button
        variant="ghost"
        size="icon"
        aria-label="UID診断を閉じる"
        onClick={() => setOpen(false)}
      >
        <X />
      </Button>
    </div>
  );
}
