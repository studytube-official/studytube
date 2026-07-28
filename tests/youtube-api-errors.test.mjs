import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const instrumentedSource = appSource.replace(
  /\ninit\(\);\s*$/,
  `
globalThis.__getYouTubeApiErrorMessage = getYouTubeApiErrorMessage;
globalThis.__decodeYouTubeText = decodeYouTubeText;
globalThis.__videoCard = videoCard;
`,
);
const sandbox = {
  console,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
};
vm.runInNewContext(instrumentedSource, sandbox);
const getMessage = sandbox.__getYouTubeApiErrorMessage;
const decodeYouTubeText = sandbox.__decodeYouTubeText;
const videoCard = sandbox.__videoCard;

test('日次クォータ超過を利用上限として案内する', () => {
  const result = getMessage({
    errors: [{ reason: 'quotaExceeded' }],
    message: 'The request cannot be completed because you have exceeded your quota.',
  }, 403);

  assert.equal(result.kind, 'quota');
  assert.match(result.title, /利用上限/);
  assert.match(result.detail, /履歴・マイリスト・メモはそのまま利用できます/);
});

test('短時間のレート制限を混雑として案内する', () => {
  const result = getMessage({ errors: [{ reason: 'rateLimitExceeded' }] }, 429);

  assert.equal(result.kind, 'temporary');
  assert.match(result.title, /混み合っています/);
});

test('API設定エラーで利用者にキー文字列を露出しない', () => {
  const result = getMessage({ errors: [{ reason: 'keyInvalid' }] }, 400);

  assert.equal(result.kind, 'configuration');
  assert.doesNotMatch(result.detail, /APIキー/);
});

test('通信失敗を接続エラーとして案内する', () => {
  const result = getMessage({ reason: 'networkError' });

  assert.equal(result.kind, 'network');
  assert.match(result.title, /接続できません/);
});

test('YouTube側の5xxを一時障害として案内する', () => {
  const result = getMessage({}, 503);

  assert.equal(result.kind, 'temporary');
  assert.match(result.detail, /YouTube側/);
});

test('未知のエラーでも内部メッセージをそのまま表示しない', () => {
  const result = getMessage({ message: 'sensitive upstream detail' }, 400);

  assert.equal(result.kind, 'unknown');
  assert.doesNotMatch(`${result.title} ${result.detail}`, /sensitive upstream detail/);
});

test('YouTubeタイトルのHTMLエンティティを安全な文字列へ戻す', () => {
  assert.equal(
    decodeYouTubeText('&quot;二次関数&quot; &amp; &#x52C9;&#24375;'),
    '"二次関数" & 勉強',
  );
});

test('引用符を含む動画でもメモ操作のonclickが壊れない', () => {
  const title = decodeYouTubeText('&quot;二次関数&quot;がすらすら解ける');
  const html = videoCard({
    id: 'video-id',
    title,
    channel: 'テスト講師',
    thumb: 'https://example.com/thumb.jpg',
    subjectId: 'math',
    unitId: 'math1',
    topic: '二次関数',
  }, 'search');
  const handlerMatch = html.match(/btn-memo" onclick="([^"]+)"/);

  assert.ok(handlerMatch);
  assert.doesNotMatch(html, /&amp;quot;/);

  const handler = handlerMatch[1].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  let received;
  vm.runInNewContext(handler, { openMemo: value => { received = value; } });
  assert.equal(received.title, title);
});
