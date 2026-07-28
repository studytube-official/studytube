import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const instrumentedSource = appSource.replace(
  /\ninit\(\);\s*$/,
  `
globalThis.__normalizeTeachbackFeedback = normalizeTeachbackFeedback;
globalThis.__createScheduledReviewCards = createScheduledReviewCards;
globalThis.__scheduleReviewCard = scheduleReviewCard;
globalThis.__normalizeVideoRecord = normalizeVideoRecord;
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

const normalizeFeedback = sandbox.__normalizeTeachbackFeedback;
const createCards = sandbox.__createScheduledReviewCards;
const scheduleCard = sandbox.__scheduleReviewCard;
const normalizeVideo = sandbox.__normalizeVideoRecord;
const videoCard = sandbox.__videoCard;
const DAY = 24 * 60 * 60 * 1000;

test('ティーチバック結果を必要な件数へ正規化する', () => {
  const result = normalizeFeedback({
    understoodPoints: [' 理解1 ', '理解2', '理解3', '余分'],
    missingPoints: ['補足1', '補足2', '余分'],
    followUpQuestions: ['質問1', '質問2', '余分'],
    reviewCards: [
      { question: ' Q1 ', answer: ' A1 ' },
      { question: 'Q2', answer: 'A2' },
      { question: '', answer: '除外' },
    ],
    concepts: ['概念1', '概念2'],
  });

  assert.deepEqual(Array.from(result.understoodPoints), ['理解1', '理解2', '理解3']);
  assert.deepEqual(Array.from(result.missingPoints), ['補足1', '補足2']);
  assert.deepEqual(Array.from(result.followUpQuestions), ['質問1', '質問2']);
  assert.equal(result.reviewCards.length, 2);
  assert.equal(result.reviewCards[0].question, 'Q1');
});

test('AI出力の各文字列をFirestoreの上限内へ収める', () => {
  const result = normalizeFeedback({
    understoodPoints: ['あ'.repeat(700)],
    missingPoints: [],
    followUpQuestions: ['い'.repeat(700)],
    reviewCards: [{
      question: 'う'.repeat(1200),
      answer: 'え'.repeat(2200),
    }],
    concepts: ['お'.repeat(200)],
  });

  assert.equal(result.understoodPoints[0].length, 500);
  assert.equal(result.followUpQuestions[0].length, 500);
  assert.equal(result.reviewCards[0].question.length, 1000);
  assert.equal(result.reviewCards[0].answer.length, 2000);
  assert.equal(result.concepts[0].length, 100);
});

test('質問や復習カードがないAI回答は保存しない', () => {
  assert.throws(
    () => normalizeFeedback({
      understoodPoints: ['理解できている'],
      missingPoints: [],
      followUpQuestions: [],
      reviewCards: [],
      concepts: [],
    }),
    /invalid-teachback-response/,
  );
});

test('生成した復習カードは3日後に設定される', () => {
  const now = 1_000_000;
  const cards = createCards({
    id: 'video_signature',
    userId: 'user-1',
    videoId: 'video',
    videoTitle: '現在完了',
    feedback: {
      reviewCards: [{ question: '現在完了とは？', answer: '過去と現在をつなぐ表現。' }],
    },
  }, now);

  assert.equal(cards.length, 1);
  assert.equal(cards[0].stage, 0);
  assert.equal(cards[0].status, 'active');
  assert.equal(cards[0].dueAt, now + 3 * DAY);
});

test('覚えたカードは7日後、2回目で定着になる', () => {
  const now = 2_000_000;
  const initial = { stage: 0, status: 'active', dueAt: now, updatedAt: now };
  const afterThreeDays = scheduleCard(initial, true, now);
  assert.equal(afterThreeDays.stage, 1);
  assert.equal(afterThreeDays.dueAt, now + 7 * DAY);

  const mastered = scheduleCard(afterThreeDays, true, now + 7 * DAY);
  assert.equal(mastered.stage, 2);
  assert.equal(mastered.status, 'mastered');
  assert.ok(mastered.dueAt > now + 1000 * DAY);
});

test('思い出せなかったカードは翌日に戻す', () => {
  const now = 3_000_000;
  const result = scheduleCard({ stage: 1, status: 'active' }, false, now);
  assert.equal(result.stage, 0);
  assert.equal(result.status, 'active');
  assert.equal(result.dueAt, now + DAY);
});

test('動画説明文を後方互換で追加し、長さを制限する', () => {
  const legacy = normalizeVideo({ id: 'legacy', title: '旧データ' });
  assert.equal(legacy.description, '');

  const current = normalizeVideo({
    id: 'current',
    title: '新データ',
    description: 'あ'.repeat(2500),
  });
  assert.equal(current.description.length, 2000);
});

test('引用符を含む説明文でもティーチバックボタンが壊れない', () => {
  const html = videoCard({
    id: 'video-id',
    title: '"現在完了"を理解する',
    channel: 'テスト講師',
    description: '「経験」と "継続" を説明します。',
    thumb: 'https://example.com/thumb.jpg',
    subjectId: 'english',
    unitId: 'grammar',
    topic: '現在完了',
  }, 'search');
  const handlerMatch = html.match(/btn-teachback" onclick="([^"]+)"/);

  assert.ok(handlerMatch);
  const handler = handlerMatch[1]
    .replace(/&quot;/g, '"')
    .replace(/&gt;/g, '>')
    .replace(/&lt;/g, '<')
    .replace(/&amp;/g, '&');
  let received;
  vm.runInNewContext(handler, { openTeachback: value => { received = value; } });
  assert.equal(received.title, '"現在完了"を理解する');
  assert.match(received.description, /"継続"/);
});
