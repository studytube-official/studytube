# ManaCue Firebase設定

ManaCueのログイン・同期・AI復習は Firebase Auth、Firestore、Firebase AI Logicを使います。

## 1. Firebaseプロジェクトを作る

1. Firebase Consoleでプロジェクトを作成
2. Webアプリを追加
3. 表示された `firebaseConfig` を `auth-config.js` に貼り付ける

## 2. Authenticationを有効化

Firebase Console > Authentication > Sign-in method で、使いたい方法を有効化します。

- Google
- Email/Password

Googleログインで失敗する場合は、Authentication > Settings > Authorized domains も確認してください。
公開サイトでは少なくとも次を許可します。

```txt
manacue.com
www.manacue.com
```

ローカル確認用には、次も入っていると安心です。

```txt
localhost
127.0.0.1
```

## 3. Firestore Databaseを作る

Firestore Databaseを作成し、最初はテスト目的で次のルールを設定できます。

```txt
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId}/studyTube/{document=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

保存場所:

```txt
users/{uid}/studyTube/state
users/{uid}/aiReviews/{videoId_signature}
```

同期されるデータ:

- マイリスト
- メモ
- 視聴履歴
- PC版の教科配置
- スマホ版の教科配置
- AI復習セット

AI復習セットは容量が増えやすいため、通常の同期データとは別のドキュメントに保存します。

## 4. Firebase AI LogicとApp Checkを有効化

1. Firebase Console > AI サービス > AI Logic を開く
2. 「始める」を押し、Gemini Developer APIを選ぶ
3. WebアプリをApp Checkに登録する
4. reCAPTCHA Enterpriseのスコアベースのサイトキーを作る
5. 許可するドメインに `manacue.com` と `www.manacue.com` を追加する
6. サイトキーを `auth-config.js` の `MANACUE_APP_CHECK_SITE_KEY` に設定する
7. App Check > APIでFirebase AI Logicの適用を有効にする

AIモデルは低コストの `gemini-3.1-flash-lite` を使います。ユーザーがボタンを押した時だけ生成し、同じ動画・メモ・難易度の結果は端末とFirestoreから再利用します。

ローカル確認時はブラウザの開発者コンソールに表示されるApp Checkデバッグトークンを、Firebase Console > App Check > アプリ > デバッグトークンの管理へ登録します。デバッグトークン自体はリポジトリに保存しません。

## 5. GitHub Pagesに反映

`auth-config.js` に設定を入れてコミット/プッシュすると、公開サイトでログインが使えるようになります。

## 6. 動作確認

1. 未ログインのままマイリストやメモを作る
2. Googleまたはメールでログインする
3. 「クラウドとこの端末を同期しました」と表示されることを確認
4. 別端末や別ブラウザで同じアカウントにログインし、マイリスト・メモ・教科配置が復元されることを確認
5. 動画カードの「AI復習」を開き、8文字以上のメモから復習セットを作れることを確認
6. 同じ内容で開き直した時に「保存済み」と表示され、再生成なしで結果が出ることを確認

ManaCue全体はログイン必須ではありません。未ログイン時はその端末だけに保存され、ログイン後にクラウドへマージ保存されます。AI復習だけは費用と不正利用対策のためログイン必須です。
