interface TopicQuoteProps {
  quote: string;
  /** 肩書ラベル（例: 育休経験者）。括弧と下線は本コンポーネントで付与する。 */
  attribution: string;
}

/**
 * トピックカードの引用文。本文は3行までで「…」で切り、肩書を次の行に添える。
 * 切り詰めは CSS（line-clamp）だけで行う。以前は収まる文字数を JS の二分探索で測っており、カードごとに強制リフローが起きて一覧の表示が重くなっていた。
 */
export function TopicQuote({ quote, attribution }: TopicQuoteProps) {
  return (
    <span className="block font-quote text-[14px] font-semibold leading-[22px] text-foreground">
      <span className="line-clamp-3 hover:underline">
        <span className="mr-1 align-[-0.1em] text-[18px] text-primary-accent">
          “
        </span>
        {quote}
      </span>
      <span className="block text-[11px] text-primary-accent">
        （<span className="underline">{attribution}</span>）
      </span>
    </span>
  );
}
