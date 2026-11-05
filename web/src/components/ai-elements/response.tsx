"use client";

import { cn } from "@/lib/utils";
import { type ComponentProps, memo } from "react";
import rehypeSanitize from "rehype-sanitize";
import { Streamdown } from "streamdown";

type ResponseProps = ComponentProps<typeof Streamdown>;

export const Response = memo(
  ({ className, rehypePlugins, ...props }: ResponseProps) => (
    <Streamdown
      defaultOrigin={
        typeof window !== "undefined" ? window.location.origin : undefined
      }
      className={cn(
        "size-full [&>*:first-child]:mt-0 [&>*:last-child]:mb-0",
        // streamdown は強調・表の見出し・h5/h6 に font-semibold を付ける。
        // 本文の書体（Noto Sans JP）は可変フォントで 600 が細く出るため、太字（700）にそろえる
        "[&_[data-streamdown=strong]]:font-bold [&_[data-streamdown=table-header-cell]]:font-bold [&_[data-streamdown=heading-5]]:font-bold [&_[data-streamdown=heading-6]]:font-bold",
        className
      )}
      rehypePlugins={[rehypeSanitize, ...(rehypePlugins ?? [])]}
      {...props}
    />
  ),
  (prevProps, nextProps) => prevProps.children === nextProps.children
);

Response.displayName = "Response";
