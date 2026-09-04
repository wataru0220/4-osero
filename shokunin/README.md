# 大工コネクト（工務店間 大工コネクトアプリ）

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

> 管理画面のアクセスは Firebase ログイン＋管理者登録で保護されます。簡易パスコードは廃止しました。本番の厳格ルールでは「最初の1人」の自己登録はできないため、下記「管理者の登録」の手順に従ってください。

### B. 本番運用（複数の工務店で共有）
1. `config.js` の `firebase` に Firebase Realtime Database の設定を入れる
   （既存のオセロ／勤怠アプリのプロジェクトを流用可。データは `shokunin/` パスに保存され混ざりません）
2. **【必須】Firebase で認証を有効化＋セキュリティルールを設定**（下記。コピペするだけ、メール書き換え不要）
3. GitHub Pages などに `shokunin/` を公開
4. **`admin.html` を開いて管理者アカウントを作る**（次項）
5. 各工務店の担当者に **`index.html` のURL** を共有（LINEグループに貼る運用も可）

### 管理者の登録（初回のみ・下記ルール反映の**前に**行う）
1. `admin.html` を開く
2. メールアドレスと**新しく決めたパスワード（6文字以上）**を入れて **「新規登録」** を押す
3. 「このアカウントを管理者にする」ボタンを押す → 完了（以後このアカウントで全件管理）

> ⚠️ 上記の3ステップは **下の「本番反映」でルールを差し替える前**に、まだ緩い初期状態のルール
> （または `"shokunin": { ".read": true, ".write": true }` の簡易ルール）で行ってください。本番用の
> 厳格ルールは「既存の管理者だけが `admins` を追加できる」方式のため、**先に最低1人の管理者を
> 登録してからでないと、誰も admin を追加できなくなります**。2回目以降は「ログイン」を押すだけ。
> 管理者を増やしたい場合は、Firebaseコンソール → Realtime Database の `shokunin/admins` に、
> 追加したい人の `ユーザーUID: true` を足します（UIDは Authentication → Users で確認）。

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

**(2) Realtime Database → ルール**（下記を**まるごとコピペして「公開」**。書き換え不要）

> ⚠️ **この1つのFirebaseプロジェクトを3つのアプリで共有しています**（`rooms`＝オセロ／`kintai`＝勤怠／`shokunin`＝大工コネクト）。ルールは**全体を置き換える**ため、下記には3つすべてを含めてあります。**一部だけを貼ると、抜けたアプリが動かなくなります**（例：`rooms` を消すとオセロが、`kintai` を消すと勤怠アプリが停止）。
> なお `rooms`（オセロの対戦部屋）は、オセロ側が認証を使わない作りのため未認証のまま開いています。ゲームの盤面情報のみで個人情報を含まないため現状は許容していますが、将来オセロにも匿名サインインを入れて閉じるのが望ましい状態です（残課題）。
```json
{
  "rules": {
    "rooms": { "$room": { ".read": true, ".write": true } },
    "kintai": {
      ".read": "auth != null",
      ".write": "auth != null",
      "records": { ".indexOn": ["workerName", "date"] },
      "workers": { ".indexOn": ["name"] },
      "sites":   { ".indexOn": ["name"] }
    },
    "shokunin": {
      "admins": {
        ".read": "auth != null",
        "$uid": {
          ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
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
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( root.child('shokunin/members').child(auth.uid).exists() && newData.exists() && (!data.exists() || data.child('ownerEmail').val() === auth.token.email) && newData.child('ownerEmail').val() === auth.token.email && (!data.exists() || newData.child('name').val() === data.child('name').val()) ) )"
        }
      },
      "craftsmen": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
        "$kid": {
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( root.child('shokunin/members').child(auth.uid).exists() && (!data.exists() || root.child('shokunin/companies').child(data.child('companyKey').val()).child('ownerEmail').val() === auth.token.email) && (!newData.exists() || root.child('shokunin/companies').child(newData.child('companyKey').val()).child('ownerEmail').val() === auth.token.email) ) )"
        }
      },
      "reviews": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
        "$rid": {
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( root.child('shokunin/members').child(auth.uid).exists() && ( (!data.exists() && newData.child('byUid').val() === auth.uid) || (data.exists() && data.child('byUid').val() === auth.uid) ) ) )",
          ".validate": "newData.child('rating').val() >= 1 && newData.child('rating').val() <= 5 && ( newData.child('type').val() === 'company' ? root.child('shokunin/companies').child(newData.child('targetKey').val()).child('ownerEmail').val() !== auth.token.email : root.child('shokunin/companies').child(root.child('shokunin/craftsmen').child(newData.child('targetKey').val()).child('companyKey').val()).child('ownerEmail').val() !== auth.token.email )"
        }
      },
      "approvals": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
        ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
      },
      "reqIndex": {
        "$ck": {
          ".read": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || root.child('shokunin/companies').child($ck).child('ownerEmail').val() === auth.token.email )",
          "$rid": {
            ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( root.child('shokunin/members').child(auth.uid).exists() && ( root.child('shokunin/requests').child($rid).child('fromCompanyKey').val() === $ck || root.child('shokunin/requests').child($rid).child('toCompanyKey').val() === $ck ) && ( root.child('shokunin/requests').child($rid).child('fromEmail').val() === auth.token.email || root.child('shokunin/requests').child($rid).child('toOwnerEmail').val() === auth.token.email ) ) )"
          }
        }
      },
      "requests": {
        ".read": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true",
        "$rid": {
          ".read": "auth != null && ( data.child('fromEmail').val() === auth.token.email || data.child('toOwnerEmail').val() === auth.token.email )",
          ".write": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( root.child('shokunin/members').child(auth.uid).exists() && ( (!data.exists() && newData.child('fromEmail').val() === auth.token.email && newData.child('fromUid').val() === auth.uid) || (data.exists() && (data.child('fromEmail').val() === auth.token.email || data.child('toOwnerEmail').val() === auth.token.email)) ) ) ) && ( !data.exists() || !newData.exists() || ( newData.child('fromEmail').val() === data.child('fromEmail').val() && newData.child('toOwnerEmail').val() === data.child('toOwnerEmail').val() && newData.child('fromCompanyKey').val() === data.child('fromCompanyKey').val() && newData.child('toCompanyKey').val() === data.child('toCompanyKey').val() && newData.child('fromUid').val() === data.child('fromUid').val() ) )"
        }
      },
      "deals": {
        "$rid": {
          ".read": "auth != null && ( root.child('shokunin/requests').child($rid).child('fromEmail').val() === auth.token.email || root.child('shokunin/requests').child($rid).child('toOwnerEmail').val() === auth.token.email )",
          "$mid": {
            ".write": "auth != null && root.child('shokunin/members').child(auth.uid).exists() && ( root.child('shokunin/requests').child($rid).child('fromEmail').val() === auth.token.email || root.child('shokunin/requests').child($rid).child('toOwnerEmail').val() === auth.token.email ) && ( (!data.exists() && newData.child('byUid').val() === auth.uid) || (data.exists() && data.child('byUid').val() === auth.uid) )"
          }
        }
      },
      "companyChats": {
        "$ck": {
          ".read": "auth != null && ( root.child('shokunin/admins').child(auth.uid).val() === true || root.child('shokunin/companies').child($ck).child('ownerEmail').val() === auth.token.email )",
          "$mid": {
            ".write": "auth != null && ( ( root.child('shokunin/admins').child(auth.uid).val() === true && !data.exists() && newData.exists() && newData.child('byUid').val() === auth.uid && newData.child('byAdmin').val() === true && newData.child('byName').val() === '管理者' ) || ( root.child('shokunin/members').child(auth.uid).exists() && root.child('shokunin/members').child(auth.uid).child('companyKey').val() === $ck && root.child('shokunin/companies').child($ck).child('ownerEmail').val() === auth.token.email && !data.exists() && newData.exists() && newData.child('byUid').val() === auth.uid && newData.child('byAdmin').val() === false && newData.child('byName').val() === root.child('shokunin/companies').child($ck).child('name').val() ) || ( data.exists() && newData.exists() && data.child('byUid').val() === auth.uid && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( root.child('shokunin/members').child(auth.uid).exists() && root.child('shokunin/members').child(auth.uid).child('companyKey').val() === $ck ) ) && newData.child('byUid').val() === data.child('byUid').val() && newData.child('byAdmin').val() === data.child('byAdmin').val() && newData.child('byName').val() === data.child('byName').val() ) || ( data.exists() && !newData.exists() && ( root.child('shokunin/admins').child(auth.uid).val() === true || ( data.child('byUid').val() === auth.uid && root.child('shokunin/members').child(auth.uid).exists() && root.child('shokunin/members').child(auth.uid).child('companyKey').val() === $ck ) ) ) )"
          }
        }
      },
      "deletedCompanies": {
        ".read": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true",
        ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
      },
      "announcements": {
        ".read": "auth != null && ( root.child('shokunin/members').child(auth.uid).exists() || root.child('shokunin/admins').child(auth.uid).val() === true )",
        ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
      },
      "contracts": {
        "$rid": {
          ".read": "auth != null && ( data.child('fromEmail').val() === auth.token.email || data.child('toOwnerEmail').val() === auth.token.email )",
          ".write": "auth != null && root.child('shokunin/members').child(auth.uid).exists() && newData.exists() && ( ( !data.exists() && newData.child('fromEmail').val() === root.child('shokunin/requests').child($rid).child('fromEmail').val() && newData.child('toOwnerEmail').val() === root.child('shokunin/requests').child($rid).child('toOwnerEmail').val() && newData.child('fromUid').val() === root.child('shokunin/requests').child($rid).child('fromUid').val() && ( newData.child('fromEmail').val() === auth.token.email || newData.child('toOwnerEmail').val() === auth.token.email ) ) || ( data.exists() && ( data.child('fromEmail').val() === auth.token.email || data.child('toOwnerEmail').val() === auth.token.email ) && !(data.child('fromSign').exists() && data.child('toSign').exists()) ) )",
          ".validate": "( !data.exists() || ( newData.child('fromEmail').val() === data.child('fromEmail').val() && newData.child('toOwnerEmail').val() === data.child('toOwnerEmail').val() && newData.child('fromUid').val() === data.child('fromUid').val() ) ) && ( !data.exists() || !( data.child('fromSign').exists() || data.child('toSign').exists() ) || ( newData.child('rid').val() === data.child('rid').val() && newData.child('fromCompanyKey').val() === data.child('fromCompanyKey').val() && newData.child('fromCompanyName').val() === data.child('fromCompanyName').val() && newData.child('toCompanyKey').val() === data.child('toCompanyKey').val() && newData.child('toCompanyName').val() === data.child('toCompanyName').val() && newData.child('craftsmanKey').val() === data.child('craftsmanKey').val() && newData.child('craftsmanName').val() === data.child('craftsmanName').val() && newData.child('site').val() === data.child('site').val() && newData.child('dateText').val() === data.child('dateText').val() && newData.child('projectName').val() === data.child('projectName').val() && newData.child('siteDetail').val() === data.child('siteDetail').val() && newData.child('work').val() === data.child('work').val() && newData.child('amount').val() === data.child('amount').val() && newData.child('payTerm').val() === data.child('payTerm').val() && newData.child('foreman').val() === data.child('foreman').val() && newData.child('notes').val() === data.child('notes').val() ) ) && ( data.child('fromSign').exists() ? ( newData.child('fromSign/at').val() === data.child('fromSign/at').val() && newData.child('fromSign/byUid').val() === data.child('fromSign/byUid').val() && newData.child('fromSign/role').val() === data.child('fromSign/role').val() && newData.child('fromSign/name').val() === data.child('fromSign/name').val() && newData.child('fromSign/companyName').val() === data.child('fromSign/companyName').val() ) : ( !newData.child('fromSign').exists() || ( (data.exists() ? data.child('fromEmail').val() : root.child('shokunin/requests').child($rid).child('fromEmail').val()) === auth.token.email && newData.child('fromSign/byUid').val() === auth.uid ) ) ) && ( data.child('toSign').exists() ? ( newData.child('toSign/at').val() === data.child('toSign/at').val() && newData.child('toSign/byUid').val() === data.child('toSign/byUid').val() && newData.child('toSign/role').val() === data.child('toSign/role').val() && newData.child('toSign/name').val() === data.child('toSign/name').val() && newData.child('toSign/companyName').val() === data.child('toSign/companyName').val() ) : ( !newData.child('toSign').exists() || ( (data.exists() ? data.child('toOwnerEmail').val() : root.child('shokunin/requests').child($rid).child('toOwnerEmail').val()) === auth.token.email && newData.child('toSign/byUid').val() === auth.uid ) ) )"
        }
      },
      "adminMeta": {
        ".read": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true",
        ".write": "auth != null && root.child('shokunin/admins').child(auth.uid).val() === true"
      }
    }
  }
}
```
- **電子請負契約**：`contracts` は各応援要請（`requests/$rid`）の当事者2社だけが読み書きできます（`deals` と同じ考え方。管理者は対象外＝契約内容は見られません）。承認済みの要請カードの「📝請負契約」から、工事名・詳細な現場住所（発注者側のみ入力可）、請負内容・請負代金・支払方法・作業指示者（受注者側のみ入力可。職人へ指揮命令を行う担当者）などを入力し、発注者・受注者の双方が電子署名すると締結されます。相手方専用の項目が未入力の間は署名できません。署名には氏名・会社名に加えて **署名者のUID（`byUid`）・役割（`role`：`from`/`to`）・日時（`at`）** を記録します。
  - **電子署名の偽造防止（`.validate`）**：上のルールの `contracts/$rid` には `.validate` を追加しています。**発注者（fromEmail）は相手の署名 `toSign` を、受注者（toOwnerEmail）は相手の署名 `fromSign` を、勝手に作成・改変できません**（各当事者は自分の署名だけを書け、相手の署名欄は「未入力のまま」か「既存の値を維持」しかできない）。これにより、一方の当事者が相手になりすまして両者署名済みに見せかける偽造を防ぎます。自分の署名を新規作成・変更する際は `byUid` が実際のログインUIDと一致することも `.validate` で強制します。
  - **成立後の不変化（`.write`）**：`fromSign`・`toSign` の両方が既に存在する（＝契約成立済み）契約は、`.write` ルールにより **本文・金額・当事者・工事内容・支払条件・両署名を含め、以後一切の書き込みができません**（署名リセットも不可）。また `newData.exists()` を要求しているため **契約全体の削除も成立前後を問わず常に禁止**です。**契約成立後は応援要請の日程変更自体ができません**（`applyChange` が成立済み契約を検知した時点で、requests側の日程も含め一切更新しません。日程を変えたい場合は新しい応援要請を作成して契約を結び直してください＝β運用の安全策。requestsとcontractsの日程が食い違う状態を作らないための措置です）。応援要請の削除（`deleteRequest`）や180日後の自動整理（`cleanupOldRequests`）からも `contracts` の削除は行いません（そもそもルール上できません）。
  - **requestsに依存しない権限判定**：`contracts/$rid` の read/write/validate は、当事者情報（`fromEmail`/`toOwnerEmail`/`fromUid`）を**契約自身にも複製・不変フィールドとして保持**しており、`requests/$rid` が将来削除されても契約の閲覧・（成立前なら）書き込みができなくなることはありません。新規作成の瞬間だけは `root.child('shokunin/requests').child($rid)` と突き合わせて真正性（本当にその要請の当事者かどうか）を検証し、以後は契約自身に保存された値のみを参照します。
    - **検収**：本番反映後、当事者Aでログインし、ブラウザのコンソールから相手（B）の署名だけを書き込もうとする操作（例：`DB.set('contracts/<rid>', {... , toSign:{name:'X',companyName:'X',at:Date.now()}})` を A=from 側で実行）が **`permission_denied`（`.validate` 違反）で失敗**することを確認してください。通常の「自分の署名→相手の署名→取引成立」の流れは成功します。両者署名済みの契約に対する追加の `DB.update`/`DB.remove` も `permission_denied` になることを確認してください。
- **一斉配信（お知らせ）**：`announcements` は全会員が閲覧でき、書き込みは管理者のみ（上記ルールに含まれています）。管理アプリの「📢一斉配信」タブから、内容確認→最終確認の2段階を経て配信します。利用規約（`TERMS_VERSION`）またはアプリの版（`APP_VERSION`）が更新されると、管理アプリが自動でお知らせ文の下書きを生成して表示します。管理者はその内容を確認し、「配信する」か「配信しない（削除）」かを判断します（自動送信はされません）。判断済みの版は `adminMeta/versionTracker`（管理者のみ読み書き可。上記ルールに含まれています）に記録され、同じ版で再度表示されることはありません。それ以外のお知らせは、これまでどおり管理者が自由入力して配信できます。★index.html の `APP_VERSION` / `TERMS_VERSION` を更新した際は、admin.html 側の `CURRENT_APP_VERSION` / `CURRENT_TERMS_VERSION` も必ず同じ値に更新してください。
- **退会した工務店の呼び戻し**：`deletedCompanies` は管理者のみ読み書きできます（上記ルールに含まれています。別途追加は不要）。管理者が工務店を削除すると、まずここに元データが退避され、退避の保存が確認できてから実データが削除されます。1か月以内なら管理アプリの「🗑退会した工務店」から**管理者の操作だけで元データのまま復元**できます。もし退会・呼び戻しが失敗する場合は、上記ルールに `deletedCompanies` が含まれているか（特に以前このルールを個別に追加していた場合、上記の統合版に更新されているか）をご確認ください。
- **会員制**：`companies`/`craftsmen`/`reviews`/`approvals` の閲覧は「**`members` に登録された会員**または管理者」だけに限定されます。会員でないログインユーザーはマッチング画面を一切読めません（アプリ側でも門番が表示されます）。**業務データの書き込み**（`companies`/`craftsmen`/`requests`/`reqIndex`/`deals`/`contracts`/`reviews`/`companyChats`）も同様に、管理者を除き **`members/{uid}` が存在する承認済み会員でなければ**できません。Authenticationアカウントを作れても、`members` に登録される（＝管理者に承認される）までは業務データを一切書き込めません。管理者が `revokeMember()` で会員を外す（利用停止）と、その時点から即座にこれらの書き込みができなくなります（既存データの閲覧は当事者判定のみに依存するため、必要な範囲で引き続き可能です）。
- `members`（利用者＝会員）と `memberApplications`（入会申請）を追加。会員登録は**管理者のみ**が書き込めます。入会申請は本人が作成でき、管理者が承認（`members` に登録＝入会審査）または却下します。**利用者＝会員**として扱うため独立した「会員」タブは設けず、入会申請の審査・アカウント発行・利用者（会員）一覧は **admin.html の「🏢工務店」タブ**に統合しています。`memberApplications` は承認前ユーザーが唯一書き込める例外パスです。
- **認証プロバイダ**：Firebaseコンソールで「**メール/パスワード**」を有効化。会員制のため「**匿名**」は不要（無効のままでOK。有効でも会員以外は読めません）。
- `admins` は **既存の管理者だけが admin.html を通じて admin を追加できる**ルールです（最初の1人だけ自分を登録できる bootstrap は本番では廃止済み）。そのため、このルールを本番に反映する**前に**、少なくとも1人の正規管理者UIDが `shokunin/admins` に登録済みである必要があります（未登録のままこのルールを公開すると、誰も二度と admin を追加できなくなります）。運営が最初の管理者を登録する手順は次のいずれか：
  1. 上記の会員制限ルールがまだ無い/緩い段階で `admin.html` を開き、メール/パスワードで新規登録 → 「このアカウントを管理者にする」を押す。
  2. Firebaseコンソール → Authentication → Users でUIDを確認 → Realtime Database → `shokunin/admins` に `<UID>: true` を手動追加する。
- `deals`（条件のやり取り）は当事者2社だけが読み書き可。**管理者は対象外**＝取引内容は見られません。
- `reqIndex` は各社の索引（自社の応援要請を引くための一覧）です。書き込みは「自社が索引先に含まれる応援要請の当事者（発注者・受注者いずれか）」のみに限定しており、無関係な会社が他社の索引を書き換えたり消したりすることはできません。
- `reviews` は `rating` を1〜5の数値に、また評価対象（会社／その大工が所属する会社）の `ownerEmail` が自分自身と一致しないことをサーバー側 `.validate` で強制します（自己評価の禁止）。「実際の取引当事者だけに評価を限定する」判定はクライアント側の `canEvaluate()`（取引実績チェック）にとどまり、Rules側では横断的な取引履歴参照ができないため未実装です（今後の課題）。
- `companyChats` はメッセージ単位（`companyChats/$ck/$mid`）で権限を判定します。新規投稿は自分の `byUid` を記録した本人（工務店担当者または管理者）のみ、既存メッセージの**編集は投稿した本人のみ**（管理者も他人の発言は編集不可）、**削除は投稿本人または管理者**（モデレーション目的の例外）に限定されます。
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
- `admins/{uid}: true` … 管理者（既存の管理者だけが追加可能。最初の1人は本番反映前に登録が必要）
- `members/{uid}` … 承認済み会員。`companies`/`craftsmen`/`requests`/`reqIndex`/`deals`/`contracts`/`reviews`/`companyChats` への書き込みはこれが存在することが前提
- `approvals/craftsman/{kid}: true` … 管理者が認証した大工（管理者のみ書込）
- `requests/{rid}` … 応援要請の概要（from/to 会社・大工・現場・希望日・連絡先・メッセージ・status・**fromUid**）。当事者2社＋管理者が閲覧。`fromEmail`/`toOwnerEmail`/`fromCompanyKey`/`toCompanyKey`/`fromUid` は作成後変更不可
- `reqIndex/{companyKey}/{rid}: true` … 各社が自社関連の要請を引くための索引。書き込みはその要請の当事者のみ
- `deals/{rid}/{mid}` … **労働条件・支払い条件のやり取り（当事者2社のみ閲覧、管理者は不可）**
- `contracts/{rid}` … 電子請負契約。当事者情報（`fromEmail`/`toOwnerEmail`/`fromUid`。作成後不変・requestsとは独立に保持）と署名 `{name, companyName, byUid, role, at}` を持つ。両者署名済みになると以後すべて変更・削除不可

> ★平均は集計値を持たず `reviews` から都度計算（改ざん防止）。`ownerEmail` がその工務店の編集権限を持つログインメール。大工は `approvals` に載るまで検索に出ません。

## セキュリティの注意
- `config.js` の値はクライアントに公開される前提の識別子です。**機密保護は Firebase のセキュリティルールで担保**してください。
- 工務店ごとの編集制限・管理者権限・応援要請の当事者限定・条件のやり取りの非公開は、すべて上記ルールで強制されます。
- 単価・評価・連絡先など取り扱いに配慮が必要な情報を含みます。公開範囲（URLの配布先）に注意してください。

## 法人サービスとして提供する前のセキュリティ確認事項

無料の社内利用から「法人向け有料サービス」へ移行する場合、下記を**必ず**実施してください。上のコピペ用ルールは動作重視の最小構成で、以下の観点が不足しています。

### 🔴 最優先（データ流出・乗っ取りに直結）
1. **`kintai` パスの全開放を閉じる（✅ コード側は対応済み。本番ルールの差し替えが必要）**
   以前の `"kintai": { ".read": true, ".write": true }` は、**データベースURLを知る誰でも勤怠・給与データを読み書きできる**状態でした（`databaseURL` は `config.js` に公開）。上のコピペ用ルールを**認証必須版（`".read"/".write"` に `"auth != null"`）に差し替え済み**で、あわせて勤怠アプリ（`kintai/index.html`・`kintai/admin.html`）が起動時に**匿名サインイン**してから読み書きするよう修正済みです。これにより、Firebase Auth のトークンを持たない第三者の直接アクセスを遮断します。大工コネクトと Firebase プロジェクトを共有している以上、片方の穴は全体の穴になります。

   **⚠️ 本番反映の順序（必ずこの順で／逆順にすると勤怠アプリが即停止します）**
   1. まず **kintai アプリ（`kintai/`）の更新を本番へデプロイ**（匿名サインインを追加した版）。GitHub Pages なら `git push` 後に反映を待つ。
   2. Firebase コンソール → Authentication → Sign-in method で **「匿名（Anonymous）」を有効化**（大工コネクトの会員制では未使用だが、勤怠アプリのために必要）。
   3. 反映後、Firebase コンソール → Realtime Database → ルールに、上のコピペ用ルール（`kintai` が認証必須になった版）を**まるごと貼り付けて「公開」**。
   4. 逆順（先にルールだけ差し替え）で公開すると、まだ匿名サインインを持たない旧 kintai アプリが `permission_denied` で動かなくなります。必ず 1→2→3 の順で。

   **検収手順（未認証で kintai に読み書きできないことの確認）**
   - 手順3の公開後、ブラウザのシークレットウィンドウで **開発者ツール → コンソール**を開き、以下を実行（`<databaseURL>` は `config.js` の値）：
     ```js
     fetch('<databaseURL>/kintai/records.json').then(r=>r.json()).then(d=>console.log('read result:', d))
     ```
     → **`Permission denied` 相当（`null` またはエラー）**になれば、未認証読み取りが遮断されています。以前は勤怠データがそのまま返っていました。
   - 書き込みの確認：
     ```js
     fetch('<databaseURL>/kintai/_pentest.json',{method:'PUT',body:'"x"'}).then(r=>console.log('write status:', r.status))
     ```
     → **`401`/`403` 相当**で書き込めなければOK（`200` なら未対応）。
   - 正常系：勤怠アプリ（`kintai/index.html`・`admin.html`）を通常どおり開き、氏名・現場の読込／勤怠の保存・記録一覧が**これまでどおり動く**ことを確認（＝匿名サインイン経由で読み書きできている）。
2. **匿名ユーザーへの個人情報の全開放を見直す**
   現在は `companies`/`craftsmen` が `".read": "auth != null"` で、**匿名サインインした誰でも全工務店の電話番号・担当者名・メール（`ownerEmail`）・単価・大工名簿を丸ごと取得**できます。同業者や無関係の第三者による名簿・連絡先・価格の一括スクレイピングが可能です。法人提供では次のいずれかを推奨：
   - 閲覧も**本登録アカウント（匿名不可）**に限定する（`auth.token.firebase.sign_in_provider != 'anonymous'` を条件に加える）。
   - 電話・メール等の連絡先は当事者間（応援要請成立後）でのみ開示し、一覧では非表示にする。
3. **メール確認（本人性）を必須化する**
   メール/パスワード登録は所有権を確認しないため、他人のメールを `ownerEmail` として先取り登録できます。`sendEmailVerification()` を導入し、ルールで `auth.token.email_verified === true` を書き込み条件に加えてください。

### 🟡 重要（不正・改ざん・濫用対策）
4. **`.validate` によるデータ検証を追加**（✅ `reviews` の `rating`（1〜5・数値）と自己評価防止は上記ルールに追加済み。氏名・メモ・メッセージ等その他の文字列フィールドへの `.val().length < 2000` 等の長さ上限や型検証は未対応で、引き続き課題です）。
5. **`reqIndex` の書き込みを当事者に限定**（✅ 対応済み。`$ck/$rid` 単位に細分化し、書き込み者がその応援要請の当事者（発注者・受注者いずれか）である場合のみ許可するよう変更しました。無関係な会社が他社索引を書き込む・消すことはできません）。
6. **Firebase App Check を有効化**（reCAPTCHA / App Attest）。正規アプリ以外からの API 直叩き（自動スクレイピング・書き込み濫用）を大幅に抑止できます。法人提供では実質必須。
7. **添付ファイルの取り扱い**：チャットの `fileUrl` は相手クライアントが直接書ける値のため、表示側で許可スキーム（`http(s)` / `data:image` / `data:application`）のみ通すよう対策済み（`common.js` の `H.safeUrl`）。Storage を使う場合はサイズ・拡張子・Content-Type をルールで制限してください。

### 🟢 運用・コンプライアンス
8. **利用規約・プライバシーポリシー・特定商取引法表記**（有料サービスなら必須）。個人情報（氏名・連絡先）を取り扱うため、個人情報保護法に基づく取得目的の明示・第三者提供の同意を規約に反映。
9. **バックアップと復旧**：Realtime Database の定期エクスポート（自動バックアップ）を設定。
10. **監査ログ・不正検知**：Firebase の使用量アラート、認証の異常（大量登録・大量読み取り）の監視。
11. **管理者アカウントの保護**：管理者は必ず強固なパスワード＋可能なら多要素認証（MFA）。`admins` に載る UID の棚卸しを定期実施。
12. **コード側の対策状況**（このリポジトリで対応済み）：チャット添付の格納型XSS、`data-*` 属性へのキー埋め込みによる属性ブレイクアウト、管理画面の `onclick` インジェクション、評価★の範囲外描画クラッシュを修正済み。今後 `innerHTML` に外部データを差し込む際は必ず `H.esc()`（本文は `H.linkify()`、URL属性は `H.safeUrl()`）を通すこと。

> クライアント側の権限判定（`H.isAdmin` / `canEditCompany` / `canEvaluate` 等）は**UIの利便性のためのガードにすぎず**、実効的な保護にはなりません。上記 Realtime Database ルールでのサーバー側強制が唯一の防御線です。

