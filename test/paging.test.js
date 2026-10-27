import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pageContaining, paginate } from '../public/js/paging.js';

const list = Array.from({ length: 20 }, (_, i) => i);

test('splits a list into pages of the given size', () => {
  assert.deepEqual(paginate(list, 8, 0), { page: 0, pages: 3, items: [0, 1, 2, 3, 4, 5, 6, 7] });
  assert.deepEqual(paginate(list, 8, 2).items, [16, 17, 18, 19]);
});

test('out-of-range pages are clamped; an empty list still has one page', () => {
  assert.equal(paginate(list, 8, 9).page, 2);
  assert.equal(paginate(list, 8, -3).page, 0);
  assert.equal(paginate(list, 8, Number.NaN).page, 0);
  assert.deepEqual(paginate([], 8, 0), { page: 0, pages: 1, items: [] });
});

test('finds the page that holds a given item', () => {
  assert.equal(pageContaining(list, 8, (x) => x === 17), 2);
  assert.equal(pageContaining(list, 8, (x) => x === 99), 0);
});
