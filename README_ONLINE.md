# オンライン対戦のセットアップ（リアルタイム・無料）

このゲームは **GitHub Pages（無料ホスティング）＋ Firebase Realtime Database（無料のリアルタイムDB）** でオンライン対戦できます。
あなたの作業は **(A) Firebase設定** と **(B) GitHubで公開** の2つだけです。所要 約10分。

> ローカル対戦（同じ端末で4人）はセットアップ不要でそのまま遊べます。

---

## A. Firebase の設定（約4分）

1. https://console.firebase.google.com/ にGoogleアカウントでアクセス → **「プロジェクトを追加」**。
   - 名前は何でもOK（例: `othello-4p`）。Googleアナリティクスは「無効」でOK。
2. 左メニュー **構築 → Realtime Database** → **「データベースを作成」**。
   - ロケーションは任意（例: `asia-southeast1`）。
   - セキュリティルールは **「テストモードで開始」** を選択（後で下記ルールに変更）。
3. ルールを設定（**構築 → Realtime Database → ルール** タブ）。casualな対戦用に、rooms以下のみ読み書き許可：
   ```json
   {
     "rules": {
       "rooms": {
         "$room": {
           ".read": true,
           ".write": true
         }
       }
     }
   }
   ```
   「公開」を押す。
   > ※ 認証なしの簡易ルールです。誰でも部屋データを読み書きできるので、機密用途には使わないこと。
4. **プロジェクトの設定（歯車アイコン）→ 全般 → マイアプリ** で **`</>`（ウェブ）** を選び、アプリを登録。
   表示される `firebaseConfig` の値をコピー。
5. このフォルダの **`config.js`** を開き、コピーした値で各項目を置き換えて保存。
   - 特に `apiKey` と `databaseURL` は必須。`databaseURL` は `https://〜.firebaseio.com` の形。

これで設定完了です。`index.html` をブラウザで開き「オンライン対戦」を押してエラーが出なければOK。

---

## B. GitHub Pages で公開してURLを発行（約5分）

### 方法1: ブラウザだけで（おすすめ・gh不要）

1. https://github.com/ で **New repository** → 名前 `othello`（Publicのまま）→ Create。
2. 作成後の画面 **「uploading an existing file」** をクリック。
3. このフォルダの **`index.html` / `config.js` / `README_ONLINE.md`** をドラッグ＆ドロップ → **Commit changes**。
4. リポジトリの **Settings → Pages** → Branch を **`main` / `(root)`** にして **Save**。
5. 数十秒後、ページ上部に公開URL（例: `https://あなたのID.github.io/othello/`）が出ます。これが招待URLの土台です。

### 方法2: git コマンドで（このフォルダから）

```powershell
cd "C:\Users\z2000\OneDrive\Desktop\オセロ"
git init
git add index.html config.js README_ONLINE.md
git commit -m "4-player othello: realtime online"
git branch -M main
git remote add origin https://github.com/<あなたのID>/othello.git
git push -u origin main
```
その後、GitHubの **Settings → Pages** で `main / (root)` を選んで Save。

> push時にGitHubのログイン（ブラウザ認証）を求められます。あなたの操作で完了してください。

---

## 遊び方

1. ホストが公開URLを開く → **オンライン対戦 → 部屋を作る**。
2. 表示された **招待URL** を友達に送る（LINEなどで）。
3. 友達はURLを開いて **空席に座る**。空席はホストが「CPUにする」ことも可能。
4. ホストが **ゲーム開始**。全員の画面がリアルタイムに同期します。

### 注意・制限
- **ホストがタブを閉じると進行が止まります**（ホスト権威型のため）。最後まで開いたままに。
- ページを**リロードすると座席情報が外れます**（観戦扱いになることがあります）。
- 無料枠（同時接続100・転送1GB/月）はカジュアル対戦には十分です。

困ったら、Firebaseの `databaseURL` が正しいか、Pagesが有効か、ブラウザのコンソール（F12）にエラーが出ていないかを確認してください。
