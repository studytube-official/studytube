# Measurement

## Campaign links

プロフィールや説明欄へ貼るリンクは、流入元ごとに分ける。

```text
YouTube profile
https://manacue.com/?utm_source=youtube&utm_medium=social&utm_campaign=cuemap_always_on&utm_content=profile

YouTube long-form description
https://manacue.com/?utm_source=youtube&utm_medium=video_description&utm_campaign=cuemap_always_on&utm_content=long_form

TikTok profile
https://manacue.com/?utm_source=tiktok&utm_medium=social&utm_campaign=cuemap_always_on&utm_content=profile

Instagram profile
https://manacue.com/?utm_source=instagram&utm_medium=social&utm_campaign=cuemap_always_on&utm_content=profile
```

キャンペーンごとに `utm_campaign`、投稿ごとに `utm_content` を変更する。個人名、メールアドレス、検索文、ユーザー入力はUTMへ入れない。

## Stored attribution

初回流入時に次の非個人情報だけを `mc_acquisition` へ保存する。

- source
- medium
- campaign
- content
- firstSeenAt

マイリスト、メモ、既存ユーザーデータの保存形式やFirestoreには追加しない。

## GA4 events

| Stage | Event |
| --- | --- |
| Entry | `marketing_entry` |
| Browse | `subject_selected`, `unit_selected`, `topic_selected` |
| Search | `video_search_started`, `video_search_completed`, `video_search_failed` |
| First value | `video_played`, `first_video_played`, `video_saved_to_list`, `first_video_saved` |
| Organize | `study_list_created`, `study_memo_saved` |
| AI intent | `teachback_opened`, `teachback_login_required`, `ai_review_opened` |
| Activation | `ai_teachback_generated`, `first_teachback_completed`, `ai_review_generated` |
| Retention | `review_card_completed`, `first_review_card_completed` |
| Account | `auth_opened`, `sign_up`, `login` |

全イベントへ次の属性を付ける。

- acquisition_source
- acquisition_medium
- acquisition_campaign
- acquisition_content
- user_state

## GA4 setup

GA4管理画面で、必要に応じて次のイベントスコープのカスタムディメンションを登録する。

- acquisition_source
- acquisition_medium
- acquisition_campaign
- acquisition_content
- subject_id
- unit_id

主要イベント候補:

- `first_teachback_completed`
- `first_review_card_completed`
- `sign_up`

最初のレポートは `acquisition_source × first_teachback_completed` で作る。再生数ではなく、学習行動を生んだ流入元を比較する。
