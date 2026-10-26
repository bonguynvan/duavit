import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ITEMS, RULES, findItem } from '../shared/catalog.js';
import { pickThrow, randomItems } from '../public/js/quick/fun.js';

/** Deterministic stand-in for Math.random: cycles through the given values. */
const seq = (...values) => {
  let i = 0;
  return () => values[i++ % values.length];
};

test('random accessories are real items, unique, within the limit', () => {
  for (let i = 0; i < 200; i += 1) {
    const items = randomItems(Math.random);
    assert.ok(items.length >= 1 && items.length <= RULES.maxItems);
    assert.equal(new Set(items).size, items.length);
    for (const id of items) assert.ok(findItem(id), id);
  }
  const share = Array.from({ length: 2000 }, () => randomItems(Math.random)).filter((items) => items.some((id) => findItem(id).throwable)).length / 2000;
  assert.ok(share > 0.4 && share < 0.8, `about 60% carry something to throw (got ${share})`);
});

const players = [
  { id: 'a', items: ['brick'] },
  { id: 'b', items: ['crown'] },
  { id: 'c', items: ['banana', 'shades'] },
];
const racer = (id, pos, finishedAt = null) => ({ id, pos, finishedAt });

test('a thrower aims at the nearest racer ahead', () => {
  const fx = pickThrow([racer('a', 10), racer('b', 30), racer('c', 60)], players, seq(0));
  assert.deepEqual(fx, { type: 'throw', item: 'brick', from: 'a', to: 'b' });
});

test('the leader throws back at someone, and finished racers neither throw nor get hit', () => {
  const fx = pickThrow([racer('a', 10, 5), racer('b', 30), racer('c', 60)], players, seq(0, 0));
  assert.equal(fx.from, 'c', 'only c still runs with a throwable');
  assert.equal(fx.to, 'b', 'a has finished, so b is the only target');
  assert.equal(fx.item, 'banana');
});

test('no throw when nobody can throw or nobody is left to hit', () => {
  assert.equal(pickThrow([racer('b', 1), racer('c', 2, 9)], players, Math.random), null);
  assert.equal(pickThrow([racer('a', 1)], players, Math.random), null);
  assert.ok(ITEMS.some((i) => i.throwable));
});
