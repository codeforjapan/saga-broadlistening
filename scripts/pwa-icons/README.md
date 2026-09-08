# PWAアイコンの生成元

`web/public/icons/pwa/` と `admin/public/icons/pwa/` の PNG は、このディレクトリの SVG から生成しています。

## 中身

| ファイル | 用途 |
|---|---|
| `icon.svg` | 本番 |
| `icon-dev.svg` | 開発環境（DEV バンド付き） |
| `icon-staging.svg` | ステージング（STG バンド付き） |

このディレクトリのSVGがアイコンの唯一の生成元です。**ロゴを差し替えたら、このSVG内のパスも更新して PNG を再生成してください。**

このブランチ（vanilla）のロゴは特定自治体に紐づかない吹き出しマークで、ページ上のワードマークは `web/src/components/brand/site-logo.tsx` が文字で組んでいます（画像ではありません）。

色は案3-1パレットの `sky/500 #2fb0ff` → `sky/700 #0077c8`（`--primary` 系から `--primary-accent` へ）のグラデーションです。`sky/400` 単色は白背景で 2.0:1 しかなく favicon が視認できないため、暗い側に `sky/700`（4.7:1）を置いて輪郭を確保しています。

maskable アイコンとして OS 側で円形・角丸にクロップされるため、図形は中央80%のセーフゾーンに収まるスケールで配置しています。

## 再生成

`rsvg-convert`（librsvg）を使う場合:

```bash
cd scripts/pwa-icons

for f in icon icon-dev icon-staging; do
  rsvg-convert -w 512 -h 512 "$f.svg" -o "/tmp/$f-512.png"
  rsvg-convert -w 192 -h 192 "$f.svg" -o "/tmp/$f-192.png"
done

# web
cp /tmp/icon-192.png         ../../web/public/icons/pwa/icon_android_192.png
cp /tmp/icon-512.png         ../../web/public/icons/pwa/icon_android_512.png
cp /tmp/icon-512.png         ../../web/public/icons/pwa/icon_ios.png
cp /tmp/icon-dev-192.png     ../../web/public/icons/pwa/icon_dev_192_v3.png
cp /tmp/icon-staging-192.png ../../web/public/icons/pwa/icon_staging_192.png
cp /tmp/icon-staging-512.png ../../web/public/icons/pwa/icon_staging_ios.png

# admin
cp /tmp/icon-192.png         ../../admin/public/icons/pwa/icon_android_192.png
cp /tmp/icon-512.png         ../../admin/public/icons/pwa/icon_android_512.png
cp /tmp/icon-512.png         ../../admin/public/icons/pwa/icon_ios.png
cp /tmp/icon-dev-192.png     ../../admin/public/icons/pwa/icon_dev_192_v3.png
cp /tmp/icon-staging-192.png ../../admin/public/icons/pwa/icon_staging_192.png
```

`rsvg-convert` は librsvg に含まれます（Debian/Ubuntu: `apt install librsvg2-bin`、macOS: `brew install librsvg`）。

## favicon

`web/src/app/icon.svg` と `admin/src/app/icon.svg` は `icon.svg` と同じ配色のロゴ単体（余白なし・`viewBox="0 0 42 36"`）です（Next.js のファイル規約）。小サイズで表示されるため、余白付きのアイコン版は使っていません。
