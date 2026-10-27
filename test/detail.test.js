import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DETAIL_LEVELS, detailFor } from '../public/js/detail.js';

test('small races get every effect; big fields keep only the leaders decorated', () => {
  assert.equal(detailFor(2).effects, Infinity);
  assert.equal(detailFor(12).effects, Infinity);
  assert.equal(detailFor(13).effects, 20);
  assert.equal(detailFor(100).effects, 20);
  assert.equal(detailFor(101).effects, 0);
  assert.equal(detailFor(500).items, 30);
});

test('levels cover every field size and only ever get leaner', () => {
  assert.equal(DETAIL_LEVELS.at(-1).upTo, Infinity);
  for (let i = 1; i < DETAIL_LEVELS.length; i += 1) {
    const [prev, next] = [DETAIL_LEVELS[i - 1], DETAIL_LEVELS[i]];
    assert.ok(next.upTo > prev.upTo && next.effects <= prev.effects && next.items <= prev.items && next.reactions <= prev.reactions);
  }
});
