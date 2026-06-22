# 職人シェア ネットワーク（工務店間 職人シェアアプリ）

工務店どうしで職人をシェアし、空き状況をリアルタイムに共有するためのWebアプリです。
インストール不要・HTMLファイルを開くだけで動きます（スマホ／PC両対応）。

## 構成

| ファイル | 役割 |
|---|---|
| `index.html` | **利用者側アプリ**（工務店の担当者が使う画面） |
| `admin.html` | **管理者側アプリ**（運営・評価入力） |
| `config.js`  | 設定（Firebase 接続情報・パスコード・選択肢マスタ） |
| `data.js`    | データ層（Firebase / お試しモードを自動切替） |
| `common.js`  | 共通ヘルパー（評価の星表示・サンプルデータ 等） |

## できること

### 利用者側（index.html）
- ① **職人をさがす**：得意作業・資格・空き状況・キーワードで絞り込み検索
- ② **空き状況ボード**：各社が更新した空き／一部空き／稼働中をリアルタイム表示
- ③ 職人ごとの **資格・年齢・性別・得意作業・NG作業** を表示
- ④ 職人の **単価**（日給／時給）を表示
- ⑤ **登録工務店の情報**（対応エリア・担当・連絡先・**評価の数値**）を表示
- 「自社の職人」タブで、**自社の職人を登録・編集・削除**（年齢/性別/単価/得意・NG作業/資格）
- 「自社の職人」タブで、**自社の職人の空き状況をその場で切り替え**（リアルタイム共有の要）
- 職人・工務店への **評価（★1〜5＋コメント）を送信**（活用した工務店からの入力）
- **LINEで共有**（公式アカウント不要）
  - ヘッダー「📲 LINEで招待」… アプリのURLをLINEで送って参加工務店を招待
  - 職人カード「📲 LINEで共有」… その職人の情報（空き状況・単価・得意/NG・資格・メモ＋アプリURL）をLINEで紹介
  - 空き状況ボード「📲 今すぐ空いている職人をLINEで共有」… 空き／一部空きの職人一覧をまとめてLINEへ
  - 管理画面ヘッダーにも「📲 利用者用URLを共有」… 運営が利用者アプリのURLをLINEで配布

### 管理者側（admin.html）※パスコードで保護
- ① **工務店の登録／編集／削除**
- ② **職人の登録／編集／削除**（資格・得意・NG・単価などをまとめて入力）
- ③ **職人の技術力評価**（★＋特記事項）を入力 → 職人カルテに反映
- ④ **工務店の評価**（★＋特記事項）を入力
- ⑤ **評価履歴**を新しい順に一覧

## 使い始め方

### A. すぐ試す（お試しモード）
`config.js` の Firebase を未設定のまま `index.html` を開くと、**この端末内だけで動くお試しモード**で起動します（サンプルデータ入り）。同じ端末の別タブとは同期しますが、他端末とは共有されません。操作感の確認用です。

> 管理画面のパスコード初期値は **`1234`**（`config.js` の `adminPasscode` で変更）。

### B. 本番運用（複数の工務店で共有）
1. `config.js` の `firebase` に Firebase Realtime Database の設定を入れる
   （既存のオセロ／勤怠アプリのプロジェクトを流用可。データは `shokunin/` パスに保存され混ざりません）
2. `config.js` の `adminEmails` に**管理者のメール**を入れる（admin.html はこのメールでログイン）
3. **【必須】Firebase で認証を有効化＋セキュリティルールを設定**（下記）
4. GitHub Pages などに `shokunin/` を公開
5. 各工務店の担当者に **`index.html` のURL** を共有（LINEグループに貼る運用も可）

### 権限モデル（だれが何を編集できるか）
- **工務店アカウント**：`index.html`「自社の職人」タブで**メール/パスワードでログイン**。各工務店レコードの `ownerEmail` ＝ 自分のメールの場合だけ、**自社の職人を登録・編集・削除**できます（Firebaseルールで強制）。
- **管理者**：`config.js` の `adminEmails` のメールでログインすると、`admin.html` から**全件編集**できます。
- **評価（職人・工務店）**：ログイン不要（**匿名でも投稿可**）。評価の平均は `reviews` から自動計算して表示します。
- 閲覧・検索・評価は匿名サインインで動くので、見るだけの人にログインは不要です。

### 【必須】Firebase コンソールでの設定
**(1) 認証を有効化**：Authentication → Sign-in method（ログイン方法）で
- **「メール/パスワード」** を有効化
- **「匿名（Anonymous）」** を有効化

**(2) Realtime Database → ルール**（既存ルールと**マージ**。`ADMIN_EMAIL_HERE` は `config.js` の `adminEmails` と同じ管理者メールに置き換え）
```json
{
  "rules": {
    "kintai": { ".read": true, ".write": true },
    "shokunin": {
      ".read": "auth != null",
      "companies": {
        "$cid": {
          ".write": "auth != null && ( auth.token.email === 'ADMIN_EMAIL_HERE' || ( (!data.exists() || data.child('ownerEmail').val() === auth.token.email) && (!newData.exists() || newData.child('ownerEmail').val() === auth.token.email) ) )"
        }
      },
      "craftsmen": {
        "$kid": {
          ".write": "auth != null && ( auth.token.email === 'ADMIN_EMAIL_HERE' || ( (!data.exists() || root.child('shokunin/companies').child(data.child('companyKey').val()).child('ownerEmail').val() === auth.token.email) && (!newData.exists() || root.child('shokunin/companies').child(newData.child('companyKey').val()).child('ownerEmail').val() === auth.token.email) ) )"
        }
      },
      "reviews": {
        "$rid": { ".write": "auth != null" }
      }
    }
  }
}
```
- 管理者を複数にする場合は `auth.token.email === 'a@x.com' || auth.token.email === 'b@x.com'` のように増やします。
- ルール公開後、反映まで数十秒かかることがあります。

> 段階的に始めたい場合は、まず `"shokunin": { ".read": true, ".write": true }` で動作確認してから上記の厳格ルールへ移行すると安全です。

## 運用の流れ（例）
1. 運営が `admin.html`（管理者メールでログイン）で参加工務店を登録。**「ログイン用メール」に各工務店のメールを設定**
2. 各工務店は `index.html`「自社の職人」タブで、その**メール/パスワードでログイン（初回は新規登録）**し、自社の職人を登録・空き状況を更新
   - ※工務店が自分で `index.html` から会社ごと新規登録することもできます（その場合オーナーは登録した本人のメール）
3. 他社は「職人をさがす／空き状況ボード」で空いている職人を確認
4. 実際に手伝ってもらった後、`index.html` または `admin.html` から職人・工務店を評価（匿名可）
5. 評価は数値（★平均）として全員に共有され、次回のマッチングに活用

## LINE共有のしくみ
公式アカウントやBotは不要です。共有ボタンを押すと、スマホでは**共有シート**が開くので「LINE（グループ）」を選んで送るだけ。共有APIに対応していないPC等では、内容を**クリップボードにコピー**したうえでLINEの共有画面を開きます。送られる文面にはアプリのURLが含まれ、受け取った人がタップしてそのまま開けます。

## データ構造（Firebase: `shokunin/`）
- `companies/{id}` … 工務店（name, tel, area, contact, **ownerEmail**, notes, createdAt）
- `craftsmen/{id}` … 職人（name, companyKey, age, gender, quals[], good[], ng[], price, unit, status, availMemo, createdAt）
- `reviews/{id}` … 評価（type, targetKey, targetName, rating, note, byCompany, at）

> ★平均は集計値を持たず、表示時に `reviews` から都度計算します（職人＝type:"craftsman"、工務店＝type:"company" を targetKey で集計）。集計値の改ざんを防げます。
> `ownerEmail` がその工務店の編集権限を持つログインメールです。

## セキュリティの注意
- `config.js` の値はクライアントに公開される前提の識別子です。**機密保護は Firebase のセキュリティルールで担保**してください。
- 工務店ごとの編集制限・管理者権限は上記ルールで強制されます（`config.js` の `adminEmails` はアプリ表示用。実際の許可はルールの管理者メールで決まるので、両者を一致させてください）。
- 単価・評価など取り扱いに配慮が必要な情報を含みます。公開範囲（URLの配布先）に注意してください。
