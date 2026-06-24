# 大工シェア ネットワーク（工務店間 大工シェアアプリ）

工務店どうしで大工をシェアし、空き状況をリアルタイムに共有するためのWebアプリです。
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
- ① **大工をさがす**：得意作業・資格・空き状況・キーワードで絞り込み検索
- ② **空き状況ボード**：各社が更新した空き／一部空き／稼働中をリアルタイム表示
- ③ 大工ごとの **資格・年齢・性別・得意作業・NG作業** を表示
- ④ 大工の **単価**（日給／時給）を表示
- ⑤ **登録工務店の情報**（対応エリア・担当・連絡先・**評価の数値**）を表示
- 「自社の大工」タブで、**自社の大工を登録・編集・削除**（年齢/性別/単価/得意・NG作業/資格）
- 「自社の大工」タブで、**自社の大工の空き状況をその場で切り替え**（リアルタイム共有の要）
- 大工・工務店への **評価（★1〜5＋コメント）を送信**（活用した工務店からの入力）
- **LINEで共有**（公式アカウント不要）
  - ヘッダー「📲 LINEで招待」… アプリのURLをLINEで送って参加工務店を招待
  - 大工カード「📲 LINEで共有」… その大工の情報（空き状況・単価・得意/NG・資格・メモ＋アプリURL）をLINEで紹介
  - 空き状況ボード「📲 今すぐ空いている大工をLINEで共有」… 空き／一部空きの大工一覧をまとめてLINEへ
  - 管理画面ヘッダーにも「📲 利用者用URLを共有」… 運営が利用者アプリのURLをLINEで配布

### 管理者側（admin.html）※パスコードで保護
- ① **工務店の登録／編集／削除**
- ② **大工の登録／編集／削除**（資格・得意・NG・単価などをまとめて入力）
- ③ **大工の技術力評価**（★＋特記事項）を入力 → 大工カルテに反映
- ④ **工務店の評価**（★＋特記事項）を入力
- ⑤ **評価履歴**を新しい順に一覧

## 使い始め方

### A. すぐ試す（お試しモード）
`config.js` の Firebase を未設定のまま `index.html` を開くと、**この端末内だけで動くお試しモード**で起動します（サンプルデータ入り）。同じ端末の別タブとは同期しますが、他端末とは共有されません。操作感の確認用です。

> 管理画面のパスコード初期値は **`1234`**（`config.js` の `adminPasscode` で変更）。

### B. 本番運用（複数の工務店で共有）
1. `config.js` の `firebase` に Firebase Realtime Database の設定を入れる
   （既存のオセロ／勤怠アプリのプロジェクトを流用可。データは `shokunin/` パスに保存され混ざりません）
2. **【必須】Firebase で認証を有効化＋セキュリティルールを設定**（下記。コピペするだけ、メール書き換え不要）
3. GitHub Pages などに `shokunin/` を公開
4. **`admin.html` を開いて管理者アカウントを作る**（次項）
5. 各工務店の担当者に **`index.html` のURL** を共有（LINEグループに貼る運用も可）

### 管理者の登録（とても簡単・3ステップ）
1. `admin.html` を開く
2. メールアドレスと**新しく決めたパスワード（6文字以上）**を入れて **「新規登録」** を押す
3. 「このアカウントを管理者にする」ボタンを押す → 完了（以後このアカウントで全件管理）

> **最初に登録した人が管理者**になります。`config.js` やルールにメールを書き込む必要はありません。2回目以降は「ログイン」を押すだけ。管理者を増やしたい場合は、Firebaseコンソール → Realtime Database の `shokunin/admins` に、追加したい人の `ユーザーUID: true` を足します（UIDは Authentication → Users で確認）。

### 権限モデル（だれが何をできるか）
- **工務店アカウント**：`index.html`でメール/パスワードでログイン。各工務店の `ownerEmail` ＝ 自分のメールの場合だけ、**自社の大工を登録・編集・削除**できます（ルールで強制）。
- **大工の認証（承認制）**：利用者が登録した大工は**認証されるまで検索・空き状況に出ません**。管理者が `admin.html` で「✓認証する」と公開されます（認証情報は管理者だけが書ける `approvals` パス）。管理者が登録した大工は自動で認証済み。
- **管理者**：`admin.html` で登録したアカウント。大工の認証、全件編集ができます。
- **評価**：**★のみ**（トラブル防止のためコメントなし）。ログイン不要（匿名でも投稿可）。**1対象につき1件**で、投稿した本人（同じ端末/アカウント）と管理者がいつでも変更・削除できます。平均は `reviews` から自動計算。
- **応援要請**：他社の大工を借りる依頼。概要は「依頼元・相手工務店・管理者」が閲覧可。**入力した本人（依頼元）と管理者が編集・削除**できます。**労働条件・支払い条件のやり取り（`deals`）は当事者2社だけ**が閲覧・編集でき、**管理者は見られません**（書いた本人が自分の発言を編集・削除可。運営は取引・紹介料に関与しない設計）。

### 【必須】Firebase コンソールでの設定
**(1) 認証を有効化**：Authentication → Sign-in method（ログイン方法）で
- **「メール/パスワード」** を有効化
- **「匿名（Anonymous）」** を有効化

**(2) Realtime Database → ルール**（既存ルールと**マージ**。下記は**そのままコピペでOK**、書き換え不要）
```json
{
  "rules": {
    "kintai": { ".read": true, ".write": true },
    "shokunin": {
      "admins": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && auth.uid === $uid && (!root.child('shokunin/admins').exists() || root.child('shokunin/admins').child(auth.uid).val() === true)"
        }
      },
      "companies": {
        ".read": "auth != null",
        "$cid": {
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( (!data.exists() || data.child('ownerEmail').val() === auth.token.email) && (!newData.exists() || newData.child('ownerEmail').val() === auth.token.email) ) )"
        }
      },
      "craftsmen": {
        ".read": "auth != null",
        "$kid": {
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( (!data.exists() || root.child('shokunin/companies').child(data.child('companyKey').val()).child('ownerEmail').val() === auth.token.email) && (!newData.exists() || root.child('shokunin/companies').child(newData.child('companyKey').val()).child('ownerEmail').val() === auth.token.email) ) )"
        }
      },
      "reviews": {
        ".read": "auth != null",
        "$rid": { ".write": "auth != null && ( (!data.exists() && newData.child('byUid').val() === auth.uid) || (data.exists() && (data.child('byUid').val() === auth.uid || root.child('shokunin/admins').child(auth.uid).val() === true)) )" }
      },
      "approvals": {
        ".read": "auth != null",
        ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
      },
      "reqIndex": {
        "$ck": {
          ".read": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || root.child('shokunin/companies').child($ck).child('ownerEmail').val() === auth.token.email )",
          ".write": "auth != null"
        }
      },
      "requests": {
        ".read": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true",
        "$rid": {
          ".read": "auth != null && ( data.child('fromEmail').val() === auth.token.email || data.child('toOwnerEmail').val() === auth.token.email )",
          ".write": "auth != null && ( (!data.exists() && newData.child('fromEmail').val() === auth.token.email) || (data.exists() && (data.child('fromEmail').val() === auth.token.email || data.child('toOwnerEmail').val() === auth.token.email)) || root.child('shokunin/admins').child(auth.uid).val() === true )"
        }
      },
      "deals": {
        "$rid": {
          ".read": "auth != null && ( root.child('shokunin/requests').child($rid).child('fromEmail').val() === auth.token.email || root.child('shokunin/requests').child($rid).child('toOwnerEmail').val() === auth.token.email )",
          "$mid": {
            ".write": "auth != null && ( root.child('shokunin/requests').child($rid).child('fromEmail').val() === auth.token.email || root.child('shokunin/requests').child($rid).child('toOwnerEmail').val() === auth.token.email ) && ( (!data.exists() && newData.child('byUid').val() === auth.uid) || (data.exists() && data.child('byUid').val() === auth.uid) )"
          }
        }
      },
      "companyChats": {
        "$ck": {
          ".read": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || root.child('shokunin/companies').child($ck).child('ownerEmail').val() === auth.token.email )",
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || root.child('shokunin/companies').child($ck).child('ownerEmail').val() === auth.token.email )"
        }
      }
    }
  }
}
```
- `admins` は「最初の1人だけ自分を登録でき、その後は既存管理者しか追加できない」ルール。**運営が最初に admin.html で登録**してください。
- `deals`（条件のやり取り）は当事者2社だけが読み書き可。**管理者は対象外**＝取引内容は見られません。
- 旧バージョンから更新する場合は、`shokunin` 直下の `".read": "auth != null"` を**消して**上記の各コレクションごとの `.read` に置き換えてください（応援要請を当事者限定にするため）。
- ルール公開後、反映まで数十秒かかることがあります。

> 段階的に始めたい場合は、まず `"shokunin": { ".read": true, ".write": true }` で動作確認してから上記の厳格ルールへ移行すると安全です。

## 運用の流れ（例）
1. 運営が `admin.html` で**管理者アカウントを登録**（上記3ステップ）。続けて参加工務店を登録し、**「ログイン用メール」に各工務店のメールを設定**
2. 各工務店は `index.html`「自社の大工」タブで、その**メール/パスワードでログイン（初回は新規登録）**し、自社の大工を登録・空き状況を更新
   - ※工務店が自分で `index.html` から会社ごと新規登録することもできます（その場合オーナーは登録した本人のメール）
3. 他社は「大工をさがす／空き状況ボード」で空いている大工を確認
4. 実際に手伝ってもらった後、`index.html` または `admin.html` から大工・工務店を評価（匿名可）
5. 評価は数値（★平均）として全員に共有され、次回のマッチングに活用

## プッシュ通知（段階導入）

### フェーズ1：クライアント通知（実装済み・無料・設定不要）
- `index.html` のヘッダー「🔔お知らせ」または受信箱の「通知をオンにする」で許可すると、**アプリを開いている間（バックグラウンドのタブを含む）** に、応援要請・日程変更・条件のやり取りの新着・活用後の必須評価・管理者連絡を **OS通知** でお知らせします。
- サービスワーカー `sw.js` が通知の表示とクリック時のアプリ前面化を担当します。
- 過去分の一斉通知を避けるため、許可した時点の未対応はシード（既読扱い）し、以後の新着のみ通知します（端末内 `localStorage: shokunin_notified`）。

### フェーズ2：完全プッシュ（アプリを閉じている間も届く｜要：Blaze＋作業）
本物のプッシュには「送信するサーバー（Cloud Functions）」が必要で、Firebase の **Blaze プラン（従量課金・カード登録要。無料枠内で収まることが多い）** が前提です。手順：
1. **Cloud Messaging を有効化＋VAPIDキー生成**：Firebaseコンソール → プロジェクトの設定 → Cloud Messaging → 「ウェブ構成」で鍵ペアを生成。公開鍵を `config.js` の `fcmVapidKey` に貼り付け。
2. **`sw.js` のFCM背景受信ブロックを有効化**（ファイル下部のコメントを外し、`firebase.initializeApp({...})` に `config.js` の `firebase` と同じ値を設定）。
3. **トークン登録**：各端末で通知許可時に `firebase.messaging().getToken({vapidKey})` を取得し、`shokunin/fcmTokens/{companyKey}/{token}: true` に保存（フェーズ2のクライアント追記。VAPIDキー設定後に有効化）。
4. **Cloud Functions を導入**：Blazeへアップグレード → `firebase init functions` → `requests`/`deals`/`companyChats` への新規書き込みをトリガに、相手工務店の `fcmTokens` 宛に `admin.messaging().sendEachForMulticast(...)` で送信する関数を作成 → `firebase deploy --only functions`。
5. ルールに `fcmTokens/{companyKey}`（当事者＝オーナーメール＋管理者のみ書込）を追加。

> フェーズ1だけでも「開いている間の通知」は機能します。フェーズ2は閉じている間の到達のための拡張です。コード雛形が必要なときは依頼してください。

## LINE共有のしくみ
公式アカウントやBotは不要です。共有ボタンを押すと、スマホでは**共有シート**が開くので「LINE（グループ）」を選んで送るだけ。共有APIに対応していないPC等では、内容を**クリップボードにコピー**したうえでLINEの共有画面を開きます。送られる文面にはアプリのURLが含まれ、受け取った人がタップしてそのまま開けます。

## データ構造（Firebase: `shokunin/`）
- `companies/{id}` … 工務店（name, tel, area, contact, **ownerEmail**, notes, createdAt）
- `craftsmen/{id}` … 大工（name, companyKey, age, gender, quals[], good[], ng[], price, unit, status, availMemo, createdAt）
- `reviews/{id}` … 評価（type, targetKey, targetName, rating, note, byCompany, at）
- `admins/{uid}: true` … 管理者（最初に登録した人）
- `approvals/craftsman/{kid}: true` … 管理者が認証した大工（管理者のみ書込）
- `requests/{rid}` … 応援要請の概要（from/to 会社・大工・現場・希望日・連絡先・メッセージ・status）。当事者2社＋管理者が閲覧
- `reqIndex/{companyKey}/{rid}: true` … 各社が自社関連の要請を引くための索引
- `deals/{rid}/{mid}` … **労働条件・支払い条件のやり取り（当事者2社のみ閲覧、管理者は不可）**

> ★平均は集計値を持たず `reviews` から都度計算（改ざん防止）。`ownerEmail` がその工務店の編集権限を持つログインメール。大工は `approvals` に載るまで検索に出ません。

## セキュリティの注意
- `config.js` の値はクライアントに公開される前提の識別子です。**機密保護は Firebase のセキュリティルールで担保**してください。
- 工務店ごとの編集制限・管理者権限・応援要請の当事者限定・条件のやり取りの非公開は、すべて上記ルールで強制されます。
- 単価・評価・連絡先など取り扱いに配慮が必要な情報を含みます。公開範囲（URLの配布先）に注意してください。
