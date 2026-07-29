import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import vm from 'node:vm';

const appSource = await readFile(new URL('../app.js', import.meta.url), 'utf8');
const instrumentedSource = appSource.replace(
  /\ninit\(\);\s*$/,
  `
globalThis.__parseAcquisitionParams = parseAcquisitionParams;
globalThis.__cleanAnalyticsText = cleanAnalyticsText;
`,
);
const sandbox = {
  console,
  URL,
  URLSearchParams,
  localStorage: {
    getItem: () => null,
    setItem: () => {},
  },
};
vm.runInNewContext(instrumentedSource, sandbox);

const parseAcquisition = sandbox.__parseAcquisitionParams;
const cleanAnalyticsText = sandbox.__cleanAnalyticsText;

test('UTMパラメータを個人情報を含まない流入属性へ正規化する', () => {
  const result = parseAcquisition(
    '?utm_source=youtube&utm_medium=social&utm_campaign=cuemap_always_on&utm_content=profile',
    '',
  );

  assert.equal(result.source, 'youtube');
  assert.equal(result.medium, 'social');
  assert.equal(result.campaign, 'cuemap_always_on');
  assert.equal(result.content, 'profile');
  assert.equal(result.hasCampaign, true);
});

test('UTMがない場合は参照元のホスト名だけを保持する', () => {
  const result = parseAcquisition('', 'https://www.tiktok.com/@study_smartly/video/123?secret=value');

  assert.equal(result.source, 'tiktok.com');
  assert.equal(result.medium, 'referral');
  assert.equal(result.campaign, 'none');
  assert.equal(result.hasCampaign, false);
});

test('分析用文字列から制御文字を除き長さを制限する', () => {
  const result = cleanAnalyticsText(` youtube\n${'x'.repeat(120)}`, 20);

  assert.equal(result.length, 20);
  assert.equal(result.includes('\n'), false);
});
