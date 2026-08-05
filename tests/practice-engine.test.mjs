import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const dataSource = await readFile(new URL('../practice-data.js', import.meta.url), 'utf8');
const practiceSource = await readFile(new URL('../practice.js', import.meta.url), 'utf8');
const instrumented = `${dataSource}\n${practiceSource}\n
globalThis.__practiceQuestions = MANACUE_PRACTICE_QUESTIONS;
globalThis.__practiceEngine = ManaCuePracticeEngine;
`;
const sandbox = { console };
vm.runInNewContext(instrumented, sandbox);

const questions = sandbox.__practiceQuestions;
const engine = sandbox.__practiceEngine;

test('β問題バンクの全問題が構造検証を通る', () => {
  assert.ok(questions.length >= 18);
  assert.equal(questions.every(engine.validatePracticeQuestion), true);
  assert.equal(new Set(questions.map(question => question.id)).size, questions.length);
  assert.equal(questions.every(question => question.sourceType === 'manacue_original'), true);
});

test('単元別では指定した単元だけを抽出する', () => {
  const result = engine.filterPracticeQuestions(questions, {
    mode: 'unit',
    subjectId: 'math',
    unitId: 'mathA',
  });
  assert.equal(result.length, 3);
  assert.equal(result.every(question => question.subjectId === 'math' && question.unitId === 'mathA'), true);
});

test('大問型別では単元をまたいで指定した型だけを抽出する', () => {
  const result = engine.filterPracticeQuestions(questions, {
    mode: 'section',
    subjectId: 'joho',
    sectionId: 'joho_program',
  });
  assert.equal(result.length, 2);
  assert.equal(result.every(question => question.sectionId === 'joho_program'), true);
});

test('教科セットは指定教科から重複なしで3問を作る', () => {
  const result = engine.buildPracticeSet(questions, {
    mode: 'subject',
    subjectId: 'english',
    difficulty: 'all',
  }, 3, 20260805);
  assert.equal(result.length, 3);
  assert.equal(new Set(result.map(question => question.id)).size, 3);
  assert.equal(result.every(question => question.subjectId === 'english'), true);
});

test('正答数と正答率を計算する', () => {
  const set = questions.slice(0, 3);
  const answers = {
    [set[0].id]: set[0].correctChoiceId,
    [set[1].id]: 'not-correct',
    [set[2].id]: set[2].correctChoiceId,
  };
  assert.deepEqual(
    { ...engine.scorePracticeAnswers(set, answers) },
    { correct: 2, total: 3, percent: 67 },
  );
});

test('正答が選択肢に存在しない問題は拒否する', () => {
  const invalid = {
    ...questions[0],
    correctChoiceId: 'Z',
  };
  assert.equal(engine.validatePracticeQuestion(invalid), false);
});
