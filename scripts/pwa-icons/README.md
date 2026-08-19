# PWAアイコンの生成元

`web/public/icons/pwa/` と `admin/public/icons/pwa/` の PNG は、このディレクトリの SVG から生成しています。

## 中身

| ファイル | 用途 |
|---|---|
| `icon.svg` | 本番 |
| `icon-dev.svg` | 開発環境（DEV バンド付き） |
| `icon-staging.svg` | ステージング（STG バンド付き） |

図形は `web/public/img/logo.svg` と同一のパスをそのまま使っています（ヘッダーのロゴとアプリアイコンの見た目を揃えるため）。**ロゴを差し替えたら、このSVG内のパスも更新して PNG を再生成してください。**

maskable アイコンとして OS 側で円形・角丸にクロップされるため、図形は中央80%のセーフゾーンに収まるスケールで配置しています。

## 再生成

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

`web/src/app/icon.svg` と `admin/src/app/icon.svg` は `web/public/img/logo.svg` のコピーです（Next.js のファイル規約）。小サイズで表示されるため、余白付きの上記SVGではなくロゴ単体を使っています。
