import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { getReportOgData } from "@/features/interview-report/server/loaders/get-report-og-data";
import { truncateText } from "@/features/interview-report/shared/utils/truncate-text";
import { logoImageProps } from "@/lib/logo";
import { SERVICE_NAME } from "@/lib/site";

/**
 * OGP画像のテキスト制限
 */
const OG_SUMMARY_MAX_LENGTH = 100;
const OG_BILL_NAME_MAX_LENGTH = 40;
const OG_BILL_NAME_WIDTH = 820;
const OG_BILL_NAME_MAX_HEIGHT = 96;

/**
 * OGP画像の配色
 *
 * Satori(next/og)はCSS変数を解決できないため、`globals.css` のカラートークンと
 * 手で同期させる必要がある。frame は `--color-mirai-gradient-start/end`
 * (#3b82f6 / #93c5fd) と同じ青系グラデーション。
 */
export const OG_COLORS = {
  /** 1200x630 の地 */
  canvas: "linear-gradient(177deg, #e8f1fd 0%, #f4f8fe 100%)",
  /** カードのグラデ枠 / 右上バッジ */
  frame: "linear-gradient(-30deg, #93c5fd 1%, #3b82f6 99%)",
  /** カード本体 */
  card: "#ffffff",
  /** 本文テキスト。--color-mirai-text (#1f2937) */
  text: "#1f2937",
  /** 施策名の強調テキスト。--primary-accent (#1e40af) */
  textAccent: "#1e40af",
} as const;

/** OGP右下に配置するロゴの表示サイズと、カード端からのオフセット(px) */
const OG_LOGO = { height: 88, bottom: 26, right: 34 } as const;

const FONT_FETCH_TIMEOUT_MS = 3000;

/** タイムアウト付きfetch */
async function fetchWithTimeout(
  url: string,
  init?: RequestInit,
  timeoutMs = FONT_FETCH_TIMEOUT_MS
) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timeoutId);
  }
}

/** フォントデータをモジュールレベルでキャッシュ */
let cachedFontData: ArrayBuffer | null = null;

/** ロゴ画像のBase64データをモジュールレベルでキャッシュ */
let cachedLogoDataUrl: string | null = null;

async function loadLogo(): Promise<string | null> {
  if (cachedLogoDataUrl) return cachedLogoDataUrl;
  try {
    const logoPath = join(process.cwd(), "public/img/ogp-logo.png");
    const buf = await readFile(logoPath);
    cachedLogoDataUrl = `data:image/png;base64,${buf.toString("base64")}`;
    return cachedLogoDataUrl;
  } catch {
    return null;
  }
}

/**
 * Google Fontsからフォントデータを取得する。
 * User-Agentを送らないことでTTF形式を取得する（Satoriはwoff2非対応）。
 */
async function loadFont(): Promise<ArrayBuffer | null> {
  if (cachedFontData) return cachedFontData;

  try {
    const url =
      "https://fonts.googleapis.com/css2?family=Noto+Sans+JP:wght@800&display=swap";
    const cssRes = await fetchWithTimeout(url);
    if (!cssRes.ok) return null;
    const css = await cssRes.text();
    const fontUrl = css
      .match(/src:\s*url\(([^)]+)\)\s*format\('(opentype|truetype)'\)/)?.[1]
      ?.replace(/^["']|["']$/g, "");
    if (!fontUrl) return null;
    const fontRes = await fetchWithTimeout(fontUrl);
    if (!fontRes.ok) return null;
    cachedFontData = await fontRes.arrayBuffer();
    return cachedFontData;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const reportId = searchParams.get("id");

  if (!reportId) {
    return new Response("Missing id parameter", { status: 400 });
  }

  let data: Awaited<ReturnType<typeof getReportOgData>>;
  try {
    data = await getReportOgData(reportId);
  } catch {
    return new Response("Internal server error", { status: 500 });
  }
  if (!data) {
    return new Response("Report not found", { status: 404 });
  }

  const truncatedSummary = truncateText(data.summary, OG_SUMMARY_MAX_LENGTH);
  const truncatedBillName = truncateText(
    data.billName,
    OG_BILL_NAME_MAX_LENGTH
  );

  const [fontData, logoDataUrl] = await Promise.all([loadFont(), loadLogo()]);

  // ロゴはラスター版(ogp-logo.png)を埋め込むのでsrcは使わず、寸法だけフル版の比率から引く
  const { width: logoWidth, height: logoHeight } = logoImageProps(
    "full",
    OG_LOGO.height
  );
  // フォント取得失敗時はプロパティ自体を省略し、デフォルトフォントにフォールバック
  const fontOptions = fontData
    ? {
        fonts: [
          {
            name: "Noto Sans JP",
            data: fontData,
            style: "normal" as const,
            weight: 800 as const,
          },
        ],
      }
    : {};

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        backgroundImage: OG_COLORS.canvas,
      }}
    >
      {/* グラデーションborder用ラッパー */}
      <div
        style={{
          display: "flex",
          width: 1140,
          height: 560,
          borderRadius: 30,
          backgroundImage: OG_COLORS.frame,
          padding: 6,
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            height: "100%",
            backgroundColor: OG_COLORS.card,
            borderRadius: 24,
            padding: "48px 56px",
          }}
        >
          {/* サマリーテキスト */}
          <div
            style={{
              display: "flex",
              fontSize: 38,
              fontWeight: 800,
              color: OG_COLORS.text,
              lineHeight: 1.8,
              flex: 1,
              width: 740,
              overflow: "hidden",
            }}
          >
            {truncatedSummary}
          </div>

          {/* 法案名 */}
          <div
            style={{
              display: "flex",
              width: OG_BILL_NAME_WIDTH,
              maxHeight: OG_BILL_NAME_MAX_HEIGHT,
              fontSize: 32,
              fontWeight: 800,
              color: OG_COLORS.textAccent,
              lineHeight: 1.5,
              overflow: "hidden",
              wordBreak: "break-all",
            }}
          >
            {truncatedBillName}
          </div>
        </div>

        {/* ロゴ画像 */}
        {logoDataUrl && (
          // biome-ignore lint/performance/noImgElement: ignore
          <img
            alt={SERVICE_NAME}
            src={logoDataUrl}
            width={logoWidth}
            height={logoHeight}
            style={{
              position: "absolute",
              bottom: OG_LOGO.bottom,
              right: OG_LOGO.right,
            }}
          />
        )}
      </div>
    </div>,
    {
      width: 1200,
      height: 630,
      ...fontOptions,
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    }
  );
}
