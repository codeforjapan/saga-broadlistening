# deploy.yml 必要な GitHub Secrets 取得・設定ガイド

`.github/workflows/deploy.yml` の解析結果と、本ワークフローの実行に必要な GitHub Secrets の値の取得方法・設定手順をまとめたドキュメントです。

---

## 1. ワークフロー概要と Secrets の分類

`.github/workflows/deploy.yml` は、`main`（本番環境）または `develop`（Staging環境）ブランチへの push 時に起動し、以下の処理を行います。

1. **Supabase CLI による DB マイグレーション & 設定反映**:
   - `supabase link` で Supabase プロジェクトに接続
   - `supabase db push --include-all --yes` でマイグレーションを適用
   - `supabase config push --yes` で Supabase Auth などの設定を反映
2. **Vercel デプロイの起動**:
   - Deploy Hook URL に HTTP POST を送信し、Web および Admin アプリのデプロイを呼び出し

本ワークフローは **GitHub Environments** を利用しており、実行ブランチに応じて `production` または `staging` の Environment Secrets を参照します。

```yaml
environment: ${{ github.ref_name == 'main' && 'production' || 'staging' }}
```

---

## 2. 必要な GitHub Secrets 一覧

`deploy.yml` で参照されている Secret は合計 **8種類** です。

| Secret 名 | 関連サービス | 役割概要 |
|---|---|---|
| `SUPABASE_ACCESS_TOKEN` | Supabase | Supabase API 操作用パーソナルアクセストークン |
| `SUPABASE_PROJECT_REF` | Supabase | 対象環境の Supabase プロジェクト参照 ID |
| `SUPABASE_DB_PASSWORD` | Supabase | DBマイグレーション適用用のデータベース接続パスワード |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` | GCP / Supabase | Adminログイン用 Google OAuth Client ID |
| `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET` | GCP / Supabase | Adminログイン用 Google OAuth Client Secret |
| `ADMIN_AUTH_CALLBACK_URL` | Admin / Supabase | Adminアプリの OAuth ログイン後コールバック URL |
| `WEB_VERCEL_DEPLOY_HOOK_URL` | Vercel | Web アプリの自動デプロイを起動するフック URL |
| `ADMIN_VERCEL_DEPLOY_HOOK_URL` | Vercel | Admin アプリの自動デプロイを起動するフック URL |

---

## 3. 各 Secret の詳細な取得手順

### 3.1. Supabase 関連 Secrets

#### ① `SUPABASE_ACCESS_TOKEN`
- **概要**: Supabase CLI が API 経由でリンクや設定変更を行うための Personal Access Token。
- **取得手順**:
  1. [Supabase Dashboard](https://supabase.com/dashboard) にログイン。
  2. 右上のユーザーアイコン > **Account Settings** を選択。
  3. 左メニューの **Access Tokens** を選択。
  4. **Generate new token** をクリック。
  5. Name に識別しやすい名前（例: `GitHub Actions Deploy Token`）を入力し、Token を生成してコピー。

#### ② `SUPABASE_PROJECT_REF`
- **概要**: 対象環境（production / staging）の Supabase プロジェクト識別子 (Reference ID)。
- **取得手順**:
  1. Supabase Dashboard で対象プロジェクト（Production 用または Staging 用）を選択。
  2. 左メニュー最下部の **Project Settings** (歯車アイコン) > **General** を選択。
  3. **Reference ID** の項目に表示されている文字列（例: `abcdefghijklmnopqrst`）をコピー。
     *(またはプロジェクト URL `https://supabase.com/dashboard/project/<PROJECT_REF>` の末尾から取得可能)*

#### ③ `SUPABASE_DB_PASSWORD`
- **概要**: DBマイグレーション（`supabase db push`）時に直接データベースへ接続するためのパスワード。
- **取得手順**:
  1. Supabase プロジェクト作成時に設定したパスワードを使用。
  2. **パスワードを忘れた場合**:
     - Supabase Dashboard > **Project Settings** > **Database** に移動。
     - **Database Password** セクションの **Reset database password** をクリックして再設定し、設定したパスワードをコピー。

---

### 3.2. Google Auth / Supabase Auth 関連 Secrets

#### ④ `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_ID` & ⑤ `SUPABASE_AUTH_EXTERNAL_GOOGLE_SECRET`
- **概要**: Admin アプリの Google ログイン（Supabase Auth 連携）に必要な OAuth クライアント情報。`supabase config push` 実行時に Supabase の設定へ反映されます。
- **取得手順**:
  1. [Google Cloud Console](https://console.cloud.google.com/) にログイン。
  2. 対象プロジェクトを選択し、**APIs & Services** > **Credentials** を開く。
  3. **Create Credentials** > **OAuth client ID** をクリック。
  4. 設定内容:
     - **Application type**: `Web application`
     - **Name**: `みらい議会 Admin (<環境名>)`
     - **Authorized redirect URIs**: `https://<SUPABASE_PROJECT_REF>.supabase.co/auth/v1/callback`
  5. 作成後に表示される **Client ID** と **Client Secret** を控える。
  *(詳細は `docs/20260407_1800_adminGoogleログイン設定手順.md` を参照)*

#### ⑥ `ADMIN_AUTH_CALLBACK_URL`
- **概要**: Admin アプリが Supabase Auth で認証を終えた後にリダイレクトされるアプリケーション側のコールバック URL。
- **設定値の決定方法**:
  - **staging 環境**: `https://<staging-admin-domain>/api/auth/callback`
    *(例: `https://mirai-gikai-admin-staging.vercel.app/api/auth/callback`)*
  - **production 環境**: `https://<production-admin-domain>/api/auth/callback`
    *(例: `https://admin.mirai-gikai.org/api/auth/callback`)*

---

### 3.3. Vercel デプロイフック Secrets

#### ⑦ `WEB_VERCEL_DEPLOY_HOOK_URL`
- **概要**: Web アプリ (公開用 Next.js) のデプロイを無停止でトリガーするための Vercel Deploy Hook URL。
- **取得手順**:
  1. [Vercel Dashboard](https://vercel.com/) にログインし、`web` プロジェクトを選択。
  2. **Settings** > **Git** を開く。
  3. **Deploy Hooks** セクションまでスクロールし、**Create Hook** をクリック。
  4. 設定内容:
     - **Hook Name**: `GitHub Actions Deploy Hook`
     - **Target Branch**: `production` の場合は `main`、`staging` の場合は `develop`
  5. 生成された Deploy Hook URL（`https://api.vercel.com/v1/integrations/deploy/Qm...`）をコピー。

#### ⑧ `ADMIN_VERCEL_DEPLOY_HOOK_URL`
- **概要**: Admin アプリ (管理用 Next.js) のデプロイを無停止でトリガーするための Vercel Deploy Hook URL。
- **取得手順**:
  1. Vercel Dashboard で `admin` プロジェクトを選択。
  2. **Settings** > **Git** > **Deploy Hooks** で **Create Hook** をクリック。
  3. 設定内容:
     - **Hook Name**: `GitHub Actions Deploy Hook`
     - **Target Branch**: `production` の場合は `main`、`staging` の場合は `develop`
  4. 生成された Deploy Hook URL をコピー。

---

## 4. GitHub リポジトリへの設定手順

取得した Secrets は、GitHub リポジトリの **Environments** 単位で登録します。

### 設定ステップ:
1. GitHub リポジトリの **Settings** タブを開く。
2. 左メニューの **Environments** を選択。
3. 以下の2つの環境を作成（存在しない場合）:
   - `production`
   - `staging`
4. 各 Environment の **Environment secrets** セクションで **Add secret** をクリックし、上記 8 つの Secret を環境ごとにそれぞれ登録する。

> [!IMPORTANT]
> `SUPABASE_PROJECT_REF` や `WEB_VERCEL_DEPLOY_HOOK_URL` などは、`production` 環境と `staging` 環境で参照先プロジェクト・ブランチが異なるため、必ずそれぞれの環境に適した値を設定してください。

---

## 関連ドキュメント
- [Vercel デプロイ & セットアップガイド](file:///Users/shugo/Develops/code4japan/mirai-gikai/docs/20260730_1844_vercel_deploy_guide.md)
- [admin Google ログイン設定手順](file:///Users/shugo/Develops/code4japan/mirai-gikai/docs/20260407_1800_adminGoogleログイン設定手順.md)

