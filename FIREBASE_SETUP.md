# StudyTube ログイン設定

StudyTubeのログイン/同期は Firebase Auth + Firestore を使う想定です。

## 1. Firebaseプロジェクトを作る

1. Firebase Consoleでプロジェクトを作成
2. Webアプリを追加
3. 表示された `firebaseConfig` を `auth-config.js` に貼り付ける

## 2. Authenticationを有効化

Firebase Console > Authentication > Sign-in method で、使いたい方法を有効化します。

- Google
- Email/Password

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
```

同期されるデータ:

- マイリスト
- メモ
- 視聴履歴
- PC版の教科配置
- スマホ版の教科配置

## 4. GitHub Pagesに反映

`auth-config.js` に設定を入れてコミット/プッシュすると、公開サイトでログインが使えるようになります。
