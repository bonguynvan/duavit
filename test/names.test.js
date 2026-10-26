import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNames, QUICK_MAX_RACERS, QUICK_NAME_MAX } from '../shared/names.js';

test('one name per line; blank lines and spaces are cleaned up', () => {
  assert.deepEqual(parseNames('  An  \n\n Bình   Minh \r\nChi').names, ['An', 'Bình Minh', 'Chi']);
});

test('CSV / TSV: first column only, quotes handled, header skipped', () => {
  const csv = 'Tên,Ghi chú\n"Nguyễn Văn A",vip\nTrần B;x\nLê C\t123';
  assert.deepEqual(parseNames(csv).names, ['Nguyễn Văn A', 'Trần B', 'Lê C']);
});

test('duplicates are numbered so every racer is distinguishable', () => {
  assert.deepEqual(parseNames('Lan\nlan\nLan\nMai').names, ['Lan', 'lan (2)', 'Lan (3)', 'Mai']);
});

test('invisible / control characters are stripped and names are capped', () => {
  const long = 'x'.repeat(QUICK_NAME_MAX + 10);
  const { names } = parseNames(`A\u202eB\n${long}\n\u200b`);
  assert.deepEqual(names, ['AB', 'x'.repeat(QUICK_NAME_MAX)]);
});

test('the racer limit is enforced and reported', () => {
  const text = Array.from({ length: QUICK_MAX_RACERS + 7 }, (_, i) => `P${i}`).join('\n');
  const { names, dropped } = parseNames(text);
  assert.equal(names.length, QUICK_MAX_RACERS);
  assert.equal(dropped, 7);
  assert.deepEqual(parseNames(null), { names: [], dropped: 0 });
});
