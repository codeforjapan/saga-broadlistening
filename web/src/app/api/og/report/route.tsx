import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { OG_COLORS } from "@mirai-gikai/branding/brand-meta";
import { SITE_NAME } from "@mirai-gikai/branding/site";
import { ImageResponse } from "next/og";
import { getReportOgData } from "@/features/interview-report/server/loaders/get-report-og-data";
import { truncateText } from "@/features/interview-report/shared/utils/truncate-text";
import { logoImageProps } from "@/lib/logo";

/**
 * OGP画像のテキスト制限
 */
const OG_SUMMARY_MAX_LENGTH = 100;
const OG_BILL_NAME_MAX_LENGTH = 40;
const OG_BILL_NAME_WIDTH = 820;
const OG_BILL_NAME_MAX_HEIGHT = 96;

/** OGP右下に配置するロゴの表示高さと、カード端からのオフセット(px) */
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
        backgroundImage: `linear-gradient(177deg, ${OG_COLORS.canvasFrom} 0%, ${OG_COLORS.canvasTo} 100%)`,
      }}
    >
      {/* グラデーションborder用ラッパー */}
      <div
        style={{
          display: "flex",
          width: 1140,
          height: 560,
          borderRadius: 30,
          backgroundImage: `linear-gradient(-30deg, ${OG_COLORS.frameFrom} 1%, ${OG_COLORS.frameTo} 99%)`,
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
            backgroundColor: OG_COLORS.background,
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

          {/* 施策名 */}
          <div
            style={{
              display: "flex",
              width: OG_BILL_NAME_WIDTH,
              maxHeight: OG_BILL_NAME_MAX_HEIGHT,
              fontSize: 32,
              fontWeight: 800,
              color: OG_COLORS.accent,
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
            alt={`${SITE_NAME}ロゴ`}
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
