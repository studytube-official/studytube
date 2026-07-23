# ManaCue 新PC・Codex引き継ぎ資料

最終更新: 2026-07-23

このファイルは、ManaCueの開発を別のPC・別のCodexタスクで続けるための正式な引き継ぎ資料です。
古い名称のStudyTubeがパス・リポジトリ名・一部の変数名に残っていますが、現在のサービス名は **ManaCue** です。

## 0. 最初にやること

新しいPCで次を実行します。

```powershell
git clone https://github.com/studytube-official/studytube.git
cd studytube
git checkout main
git pull --ff-only origin main
```

その後、新しいCodexへこのように依頼します。

```text
ManaCueの開発を引き継いでください。
まずリポジトリ内の CODEX_HANDOFF.md を全文読み、git status、git log -5、
本番 https://manacue.com/ の状態を確認してください。
既存の設計とユーザーデータを壊さず、未完了タスクから続けてください。
```

GitHubへのpushには `studytube-official` リポジトリへの書き込み権限があるGitHubアカウントでの認証が必要です。
Firebase Console、TikTok、Epidemic Soundなども、新PCでは各サービスへ本人がログインしてください。
パスワード、秘密鍵、ブラウザのCookie、セッションデータはこの資料にも移行ZIPにも含めていません。

## 1. 現在地

- サービス名: ManaCue
- 対象: 高校生・大学受験生
- 本番URL: https://manacue.com/
- GitHub: https://github.com/studytube-official/studytube
- 公開方法: GitHub Pages、`main` ブランチ、リポジトリ直下
- 独自ドメイン: `CNAME` に `manacue.com`
- FirebaseプロジェクトID: `studytube-official`
- 基準コミット: `859805e` (`Create CNAME`)
- 2026-07-23時点で `https://manacue.com/` は HTTP 200
- フレームワーク、バンドラー、npmビルドなし。HTML/CSS/JavaScriptだけのSPA

主要ファイル:

```text
studytube/
├── index.html          # SPAの画面、モーダル、ナビ
├── style.css           # 全スタイル、PC/スマホ対応
├── app.js              # UI、検索、保存、認証、同期、AI、フィードバック
├── data.js             # 13教科と単元・トピック
├── auth-config.js      # Firebase Web設定とApp Check公開サイトキー
├── firestore.rules     # 同期、AI復習、フィードバックの権限
├── FIREBASE_SETUP.md   # Firebase設定手順
├── manifest.json       # PWA情報
├── icons/              # PWAアイコン
├── assets/             # 近未来の学校背景
├── ads/tiktok/         # 初期の広告用デモページ
├── CNAME               # manacue.com
└── CODEX_HANDOFF.md    # この資料
```

## 2. プロダクトの意図

ManaCueは「YouTubeの勉強動画を、探して終わり・保存して終わりにしない」ための学習整理サービスです。

中心となる体験:

1. 教科を選ぶ
2. 単元・トピックまで絞る
3. YouTubeの授業動画を探す
4. 動画をマイリストへ整理する
5. 復習したい内容をメモする
6. 動画タイトル、教科、単元、ユーザーのメモからAI復習セットを作る

デザイン方針:

- 近未来の学校・教室を視覚的に表現する
- 「近未来」などの説明文でコンセプトを言わない
- ミント、シアン、白を中心とした明るいガラス調
- 背景を暗い膜で覆わない
- 教科は枠の中ではなく、背景上にバブルとして浮かせる
- PCとスマホの両方で見やすくする
- 操作説明を増やすより、触れば分かるUIにする

## 3. 実装済み機能

### 教科・単元・動画検索

- 13教科:
  国語、数学、英語、物理、化学、生物、地学、理科基礎、地理探究、日本史探究、世界史探究、公共・政治経済、情報I
- 教科バブルはApple Watch風に浮遊
- 各バブルを個別にドラッグ可能。他のバブルは一緒に動かない
- PC用とスマホ用で初期配置を分離
- ドラッグ後の位置は端末保存し、ログイン時はクラウド同期
- 教科選択時に全ノードが中央へ収束して単元画面へ遷移
- 単元、トピック、並び順を指定してYouTube Data API v3で検索

主要関数:

```text
renderSubjectList
startNodeDrag / dragNodeTo / endNodeDrag
saveSubjectPositions
collapseSubjectNodes
selectSubject / selectUnit / selectTopic
fetchVideos / renderVideos
```

### 履歴、マイリスト、メモ

- 視聴履歴
- 複数マイリスト
- マイリスト内の動画をドラッグして並べ替え
- 動画ごとのメモ
- メモをカード本文とサムネイル上に表示
- 未ログインでもLocalStorageへ保存
- ログイン後は端末データとクラウドデータをマージ

主要LocalStorageキー:

```text
studytube_apikey
st_history
st_lists
st_notes
st_subject_positions
st_subject_positions_mobile
mc_ai_reviews
mc_a2hs_dismissed
```

### ログインと端末間同期

- Firebase Authentication
- Googleログイン
- メールアドレス + パスワードの登録・ログイン
- パスワード再設定メール
- `browserLocalPersistence`
- スマホとPCで以下を同期:
  - 履歴
  - マイリストと順番
  - メモ
  - PCの教科配置
  - スマホの教科配置
- 未ログインのローカルデータを、初回ログイン時にFirestoreとマージ

Firestore保存先:

```text
users/{uid}/studyTube/state
users/{uid}/aiReviews/{videoId_signature}
```

Googleログインはポップアップ優先です。
リダイレクトはiOS Safariの追跡防止で状態を失うことがあるため、ポップアップが使えない時だけフォールバックします。

### AI復習

実装済みの考え方:

- 動画、字幕、説明欄を直接解析しない
- 入力に使うのは動画タイトル、教科、単元、トピック、ユーザーのメモ
- AI画面にも「動画内容を直接解析していない」と表示
- AI利用はログイン必須
- メモは8文字以上、1500文字以下
- 難易度は基礎、標準、発展
- 出力:
  - まず押さえる3点
  - 確認問題3問
  - 関連問題1問
  - つまずき注意
  - 一緒に覚える知識
- 問題の答えは`details`で開く
- 同じ動画、メモ、難易度の結果は端末とFirestoreから再利用
- 端末キャッシュは新しいものから最大100件
- 不要な再生成を避けてAI利用料を抑える

技術:

```text
Firebase SDK: 12.16.0
Firebase AI Logic
Backend: GoogleAIBackend
Model: gemini-3.1-flash-lite
Prompt version: review-v1
App Check: reCAPTCHA Enterprise
```

AI実装の中心:

```text
openAiReview
buildAiReviewPrompt
generateAiReview
normalizeAiReview
renderAiReview
loadAiReviewFromCloud / saveAiReviewEntry
```

本番確認では、ログインしてメモを8文字以上入力し、実際にAI復習を1回生成してください。
コードは実装・公開済みですが、Firebase側のモデル提供状況、App Check、利用上限は環境に依存するため、引き継ぎ後にE2E確認が必要です。

### ご意見と開発者受信箱

- 未ログインのユーザーも意見を送信可能
- Firestoreの `feedback/{feedbackId}` に保存
- 閲覧と削除はFirebaseルールで設定された開発者本人の認証済みアカウントだけ
- UI側でも開発者メールのSHA-256ハッシュを照合し、本人以外には受信箱ボタンを表示しない
- 権限の最終防衛線は `firestore.rules`

### PWA

- `manifest.json`
- iOS/Android向け「ホーム画面に追加」案内
- スタンドアロン表示
- インストール案内を閉じた記録はLocalStorageへ保存

## 4. Firebase設定

詳細は `FIREBASE_SETUP.md` を読むこと。

必要なFirebase製品:

- Authentication
  - Google
  - Email/Password
- Cloud Firestore
- Firebase AI Logic
- App Check
  - reCAPTCHA Enterprise

Authenticationの承認済みドメイン候補:

```text
manacue.com
www.manacue.com
studytube-official.github.io
localhost
127.0.0.1
```

Firestoreルール反映:

```powershell
npm install -g firebase-tools
firebase login
firebase use studytube-official
firebase deploy --only firestore:rules
```

注意:

- `auth-config.js` のFirebase Web設定とreCAPTCHAサイトキーはクライアント公開用
- サービスアカウント秘密鍵、GeminiのサーバーAPIキー、Firebase CLIトークンはGitへ入れない
- App CheckのローカルデバッグトークンもGitへ入れない
- `app.js` のYouTube APIキーはブラウザ用なので、Google Cloud側でHTTPリファラーとAPIを制限する
- この資料にはAPIキー値やログイン情報を転記しない

## 5. ローカル起動

新PCでは、リポジトリ直下で次のどちらかを使います。

```powershell
python -m http.server 8080
```

または `serve.ps1` 内の `$dir` を新PCの絶対パスへ変更して:

```powershell
powershell -ExecutionPolicy Bypass -File .\serve.ps1
```

確認URL:

```text
http://localhost:8080/
```

同じWi-Fiのスマホから確認する時は、Windows Firewallでポート8080を許可し、PCのIPv4アドレスへ接続します。

## 6. デプロイ

GitHub Pagesは `main` のリポジトリ直下を公開します。

```powershell
git status
git add <変更したファイル>
git commit -m "変更内容"
git push origin main
```

反映確認:

```text
https://manacue.com/
https://github.com/studytube-official/studytube/actions
https://github.com/studytube-official/studytube/settings/pages
```

独自ドメインで問題が出た時:

1. `CNAME` が `manacue.com` か確認
2. GitHub PagesのCustom domainでDNS check successfulか確認
3. Enforce HTTPSを確認
4. DNSのAレコードがGitHub Pages向けか確認
5. Firebase AuthenticationとApp Checkの許可ドメインを確認

`manacue.com` のAレコードは2026-07-23時点でGitHub Pagesの4アドレスへ解決しています。

## 7. テスト方針

自動テストはまだありません。変更後は最低限、次をPC幅とスマホ幅で確認します。

1. 教科バブルを1つだけドラッグできる
2. 再読み込み後も位置が残る
3. 教科選択で単元画面へ遷移
4. YouTube検索が成功
5. 履歴が残る
6. マイリスト作成、追加、削除、ドラッグ並べ替え
7. メモ保存とサムネイル上の表示
8. メールログイン、Googleログイン、ログアウト、パスワード再設定
9. 別端末で同期
10. AI復習の生成、答えの展開、保存済み結果の再表示
11. ご意見送信
12. 開発者アカウントだけが受信箱を閲覧・削除可能
13. PWAのホーム画面追加

## 8. 既知の注意点

- `serve.ps1` は旧PCの絶対パスを含むため、新PCでは変更が必要
- GitHub Pagesのリポジトリ名は`studytube`、Firebaseプロジェクトも`studytube-official`のまま
- 画面上の名称だけManaCueへ変更済み。内部キーを一括改名すると既存ユーザーデータが消えるため、安易に変更しない
- `mockexams.js` は以前検討した模試範囲機能の名残。模試範囲が不確かなため、機能追加は中止している
- YouTube APIクォータ超過時の案内は改善余地あり
- AI復習は、動画の中身を見たと誤認させない表現を維持する
- AIモデル名やFirebase SDKは将来変更される可能性がある。更新時は公式Firebaseドキュメントで確認する
- `www.manacue.com` はFirebase側の許可候補だが、DNSの有無を別途確認する
- Git作業前に必ず `git status` を確認し、ユーザーや別のエージェントの変更を消さない

## 9. 広告制作の引き継ぎ

広告制作物はサイトのGitHubリポジトリには入れていません。
旧PC上の主な場所:

```text
C:\Users\ssasu\Documents\study tube\manacue-tiktok-ai-v2-20260720
```

主な既存出力:

```text
ManaCue_AI_Review_Ad_15s_1080x1920.mp4
ManaCue_AI_Review_Ad_Stronger_Hook_15s_1080x1920.mp4
ManaCue_AI_Review_Ad_0.999_Hook_15s_1080x1920.mp4
```

制作方式:

- 1080x1920
- 30fps
- 15秒
- Python + Pillowでシーン画像
- FFmpegでH.264動画と音声を合成
- 実際のManaCue画面キャプチャを使用
- Epidemic Soundの日本語音声AlexandraとUI効果音を使用
- TikTok内の楽曲を後付けするため、MP4には音楽を埋め込まない

TikTok:

- 投稿先: `@study_smartly`
- 前回確認できた投稿:
  `https://www.tiktok.com/@study_smartly/video/7665250952454196501`
- 指定楽曲:
  `New Look - Wii U Mii Maker Nostalgiacore Lofi Slowed`
- アーティスト表示:
  `Secret Potion & Lofi Beats To Chill Study Sleep & Nostalgiacore`
- 楽曲音量の目安: `-18 dB`

現在の未完了広告タスク:

- 数学クイズなど、サービスと無関係なつかみは使わない
- 最初からManaCueの広告として成立させる
- ターゲットに強みがすぐ伝わる15秒動画
- 実際のサイト画面を使う
- 完成後、TikTokへ指定音源付きで投稿

合意済みの新構成案:

```text
0.0-1.8秒  「勉強動画、保存しただけになってない？」
1.8-4.4秒  教科と単元から授業動画を探す
4.4-7.2秒  動画に自分のメモを残す
7.2-11.8秒 タイトルとメモからAIが要点・確認問題・関連問題を作る
11.8-15秒  「探す・残す・解くを、ひとつに。」+ ManaCue + manacue.com
```

ナレーション案:

```text
勉強動画、保存しただけになってない？
ManaCueなら、教科と単元からすぐ探せる。
動画タイトルと自分のメモから、AIが要点と復習問題まで作成。
見るだけを、解けるに。ManaCue。
```

この新作はまだレンダリングしていません。
広告素材の移行ZIPを新PCへ持っていき、その中の `README_V4.md`、`render_v2.py`、`render_v4_hook.py`、
`source-v4/`、`audio/` を確認してV5を作ります。

ブラウザプロファイル、TikTokのCookie、ログインセッションは移行ZIPに含めていません。
新PCではTikTokとEpidemic Soundへ本人がログインしてください。

## 10. 次のCodexに守ってほしいこと

- まずコードを読み、既存の実装を尊重する
- 本番ユーザーデータを消す変更をしない
- LocalStorageキーとFirestoreパスを安易に変えない
- Firebaseルールを緩めない
- APIキー、秘密鍵、Cookie、トークンをチャットやGitへ出さない
- AIが字幕や動画内容を解析したと誤認させない
- PCとスマホの両方を確認する
- 実装したらテストし、GitHub Pages反映まで確認する
- TikTok投稿時はアカウント名と楽曲名を投稿直前に再確認する

