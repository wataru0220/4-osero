# 大工Connect 本番運用

## 本番情報

| 項目 | 内容 |
|---|---|
| 本番URL | https://shokunin-prod-45145.web.app/ |
| 本番Firebase | `shokunin-prod-45145`（`.firebaserc` の default） |
| 本番Rules | `shokunin/database.rules.json`（`firebase.json` の database.rules が参照） |
| 旧Firebase | `osero-77308`（オセロ・勤怠など他アプリ用。**大工Connectはもう使わない**） |

## 正式なソースコードの扱い

- 正式版は Git の最新（統合済みブランチ／`main`）です。ローカルのコピーではありません。
- 今後編集するときは**必ず最新の Git から開始**してください。
- **古いローカルコピーから deploy しない**でください（Googleログイン・会員申請・強化済みRulesが失われます）。
- 変更は Git に commit / push してから本番 deploy します。

## 絶対にやらないこと

- 旧Firebase `osero-77308` へ deploy しない。
- リポジトリ直下の `firebase-rules.json` を大工Connect新本番へ deploy／貼り付けしない。
  これは旧共有プロジェクト用で、強化前の旧ルール（admins の自己登録が通る等）を含みます。
- `shokunin/config.js` を `osero-77308` 向けに戻さない（`projectId` は `shokunin-prod-45145`）。
- 旧Firebase時代の `main` を、そのまま本番へ deploy しない。

## deploy 前チェック（毎回）

1. `git status`（未コミットの変更がないこと）
2. `git pull`（最新を取り込む）
3. Firebase project の確認（`firebase use` / `.firebaserc` が `shokunin-prod-45145`）
4. `shokunin/config.js` の `projectId` が `shokunin-prod-45145`
5. Rules を変えた場合は `shokunin/database.rules.json` のみを対象にする

## 移管済みデータ

旧 `osero-77308` から新本番へ移管済みです（companyKey は旧のまま維持）。

- companies：4件
- craftsmen：18件
- approvals/craftsman：18件

移管していないもの：旧 members、旧 admins、旧 Authentication、contracts、deals、companyChats、announcements、孤立した approvals。

## 既存利用者の切り替え手順

旧Authentication（UID・パスワード）は移管していません。

1. 既存利用者は新本番でGoogleログインする（原則、旧環境と同じメールアドレス）。
2. 会員申請が届く（新UIDが発行される）。
3. admin が承認する。
4. admin が、対応する既存 companyKey を割り当てる（`members/{uid}/companyKey`）。
5. 以後、その利用者は自社の company / craftsmen を操作できる。

## 機能（統合済み）

- Googleログイン、メール新規登録、会員申請（`memberApplications`）
- `members/{uid}/companyKey` による会社の紐付け
- 資格確認欄の「登録状況」（グリーンサイト／グリーンファイル／キャリアアップシステム）
- 説明動画（mp4 3本）の最新版
