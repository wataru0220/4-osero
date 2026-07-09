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
`config.js` の Firebase を未設定のまま `index.html` を開くと、**この端末内だけで動くお試しモード**で起動します。同じ端末の別タブとは同期しますが、他端末とは共有されません。操作感の確認用です。

> 管理画面のアクセスは Firebase ログイン＋管理者登録（最初に登録した人が管理者）で保護されます。簡易パスコードは廃止しました。

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
      "members": {
        ".read": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true",
        "$uid": {
          ".read": "auth != null && ( auth.uid === $uid || root.child('shokunin/admins').child(auth.uid).val() === true )",
          ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
        }
      },
      "memberApplications": {
        ".read": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true",
        "$uid": {
          ".read": "auth != null && ( auth.uid === $uid || root.child('shokunin/admins').child(auth.uid).val() === true )",
          ".write": "auth != null && ( auth.uid === $uid || root.child('shokunin/admins').child(auth.uid).val() === true )"
        }
      },
      "companies": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
        "$cid": {
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( ( root.child('shokunin/members').child(auth.uid).exists() ) && (!data.exists() || data.child('ownerEmail').val() === auth.token.email) && (!newData.exists() || newData.child('ownerEmail').val() === auth.token.email) ) )"
        }
      },
      "craftsmen": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
        "$kid": {
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( (!data.exists() || root.child('shokunin/companies').child(data.child('companyKey').val()).child('ownerEmail').val() === auth.token.email) && (!newData.exists() || root.child('shokunin/companies').child(newData.child('companyKey').val()).child('ownerEmail').val() === auth.token.email) ) )"
        }
      },
      "reviews": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
        "$rid": { ".write": "auth != null && ( (!data.exists() && newData.child('byUid').val() === auth.uid) || (data.exists() && (data.child('byUid').val() === auth.uid || root.child('shokunin/admins').child(auth.uid).val() === true)) )" }
      },
      "approvals": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
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
      },
      "deletedCompanies": {
        ".read": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true",
        ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
      },
      "announcements": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
        ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
      }
    }
  }
}
```
- **一斉配信（お知らせ）**：`announcements` は全会員が閲覧でき、書き込みは管理者のみ（上記ルールに含まれています）。管理アプリの「📢一斉配信」タブから、内容確認→最終確認の2段階を経て配信します。
- **退会した工務店の呼び戻し**：`deletedCompanies` は管理者のみ読み書きできます（上記ルールに含まれています。別途追加は不要）。管理者が工務店を削除すると、まずここに元データが退避され、退避の保存が確認できてから実データが削除されます。1か月以内なら管理アプリの「🗑退会した工務店」から**管理者の操作だけで元データのまま復元**できます。もし退会・呼び戻しが失敗する場合は、上記ルールに `deletedCompanies` が含まれているか（特に以前このルールを個別に追加していた場合、上記の統合版に更新されているか）をご確認ください。
- **会員制**：`companies`/`craftsmen`/`reviews`/`approvals` の閲覧は「**`members` に登録された会員**または管理者」だけに限定されます。会員でないログインユーザーはマッチング画面を一切読めません（アプリ側でも門番が表示されます）。
- `members`（会員）と `memberApplications`（入会申請）を追加。会員登録は**管理者のみ**が書き込めます。入会申請は本人が作成でき、管理者が承認（`members` に登録）または却下します。会員アカウントの発行・審査は **admin.html の「🎫会員」タブ**から行います。
- **認証プロバイダ**：Firebaseコンソールで「**メール/パスワード**」を有効化。会員制のため「**匿名**」は不要（無効のままでOK。有効でも会員以外は読めません）。
- `admins` は「最初の1人だけ自分を登録でき、その後は既存管理者しか追加できない」ルール。**運営が最初に admin.html で登録**してください。
- `deals`（条件のやり取り）は当事者2社だけが読み書き可。**管理者は対象外**＝取引内容は見られません。
- 旧バージョンから更新する場合は、`shokunin` 直下の `".read": "auth != null"` を**消して**上記の各コレクションごとの `.read` に置き換えてください（会員制・当事者限定にするため）。
- ルール公開後、反映まで数十秒かかることがあります。

> 段階的に始めたい場合は、まず `"shokunin": { ".read": true, ".write": true }` で動作確認してから上記の厳格ルールへ移行すると安全です（この簡易ルールなら `deletedCompanies` を含め追加設定は不要です）。

**(3) 写真・小さいPDFは設定不要**
連絡・条件のやり取りの📎で、**写真は自動で圧縮**してそのまま送れます（Storage設定は不要）。小さいPDF（約800KBまで）も送れます。
**大きいPDFも送りたい場合のみ**、下記の Firebase Storage を有効化してください（任意）。
1. コンソール左メニュー **Storage → 始める**（ロケーションは asia-northeast1 等を選択）。
2. **Storage → Rules** に以下を公開（ログイン中のユーザーのみ読み書き可）：
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /shokunin/chat/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 10 * 1024 * 1024;
    }
  }
}
```
> 送信できる1ファイルの上限はアプリ側でも10MBに制限しています。Storage未設定のままだと「お試しモード」以外では送信に失敗します（その場合は上記を設定してください）。

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

## 法人サービスとして提供する前のセキュリティ確認事項

無料の社内利用から「法人向け有料サービス」へ移行する場合、下記を**必ず**実施してください。上のコピペ用ルールは動作重視の最小構成で、以下の観点が不足しています。

### 🔴 最優先（データ流出・乗っ取りに直結）
1. **`kintai` パスの全開放を閉じる**
   上のマージ用ルールに含まれる `"kintai": { ".read": true, ".write": true }` は、**データベースURLを知る誰でも勤怠・給与データを読み書きできる**状態です（`databaseURL` は `config.js` に公開されています）。勤怠アプリ側の適切なルール（認証必須・会社単位の制限）へ必ず差し替えてください。大工シェアと Firebase プロジェクトを共有している以上、片方の穴は全体の穴になります。
2. **匿名ユーザーへの個人情報の全開放を見直す**
   現在は `companies`/`craftsmen` が `".read": "auth != null"` で、**匿名サインインした誰でも全工務店の電話番号・担当者名・メール（`ownerEmail`）・単価・大工名簿を丸ごと取得**できます。同業者や無関係の第三者による名簿・連絡先・価格の一括スクレイピングが可能です。法人提供では次のいずれかを推奨：
   - 閲覧も**本登録アカウント（匿名不可）**に限定する（`auth.token.firebase.sign_in_provider != 'anonymous'` を条件に加える）。
   - 電話・メール等の連絡先は当事者間（応援要請成立後）でのみ開示し、一覧では非表示にする。
3. **メール確認（本人性）を必須化する**
   メール/パスワード登録は所有権を確認しないため、他人のメールを `ownerEmail` として先取り登録できます。`sendEmailVerification()` を導入し、ルールで `auth.token.email_verified === true` を書き込み条件に加えてください。

### 🟡 重要（不正・改ざん・濫用対策）
4. **`.validate` によるデータ検証を追加**（現在は型・長さ・値域の検証がなく、任意の巨大データ・不正な型を書き込める）。例：
   ```json
   "reviews": {
     "$rid": {
       ".validate": "newData.hasChildren(['type','targetKey','rating','byUid']) && newData.child('rating').isNumber() && newData.child('rating').val() >= 1 && newData.child('rating').val() <= 5 && newData.child('byUid').val() === auth.uid"
     }
   }
   ```
   氏名・メモ・メッセージ等の文字列にも `.val().length < 2000` 等の上限を付けてください。
5. **`reqIndex` の書き込みを当事者に限定**（現在 `".write": "auth != null"` で誰でも任意社の索引に書き込め、スパム・汚染が可能）。索引先の要請の当事者メールと一致する場合のみ許可する条件に変更。
6. **Firebase App Check を有効化**（reCAPTCHA / App Attest）。正規アプリ以外からの API 直叩き（自動スクレイピング・書き込み濫用）を大幅に抑止できます。法人提供では実質必須。
7. **添付ファイルの取り扱い**：チャットの `fileUrl` は相手クライアントが直接書ける値のため、表示側で許可スキーム（`http(s)` / `data:image` / `data:application`）のみ通すよう対策済み（`common.js` の `H.safeUrl`）。Storage を使う場合はサイズ・拡張子・Content-Type をルールで制限してください。

### 🟢 運用・コンプライアンス
8. **利用規約・プライバシーポリシー・特定商取引法表記**（有料サービスなら必須）。個人情報（氏名・連絡先）を取り扱うため、個人情報保護法に基づく取得目的の明示・第三者提供の同意を規約に反映。
9. **バックアップと復旧**：Realtime Database の定期エクスポート（自動バックアップ）を設定。
10. **監査ログ・不正検知**：Firebase の使用量アラート、認証の異常（大量登録・大量読み取り）の監視。
11. **管理者アカウントの保護**：管理者は必ず強固なパスワード＋可能なら多要素認証（MFA）。`admins` に載る UID の棚卸しを定期実施。
12. **コード側の対策状況**（このリポジトリで対応済み）：チャット添付の格納型XSS、`data-*` 属性へのキー埋め込みによる属性ブレイクアウト、管理画面の `onclick` インジェクション、評価★の範囲外描画クラッシュを修正済み。今後 `innerHTML` に外部データを差し込む際は必ず `H.esc()`（本文は `H.linkify()`、URL属性は `H.safeUrl()`）を通すこと。

> クライアント側の権限判定（`H.isAdmin` / `canEditCompany` / `canEvaluate` 等）は**UIの利便性のためのガードにすぎず**、実効的な保護にはなりません。上記 Realtime Database ルールでのサーバー側強制が唯一の防御線です。

