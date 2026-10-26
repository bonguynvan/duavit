import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAX_SAVED_ROOMS, parseSavedRooms, rememberRoom } from '../public/js/myRooms.js';

test('a new room goes first, without its secret key, and the same code is not listed twice', () => {
  const one = rememberRoom([], { code: 'ABCDEF', hostUrl: 'https://x/r/ABCDEF/host?key=secret', playerUrl: 'https://x/r/ABCDEF' }, 1);
  assert.deepEqual(one, [{ code: 'ABCDEF', createdAt: 1 }]);
  const two = rememberRoom(one, { code: 'GHJKMN' }, 2);
  assert.deepEqual(two.map((r) => r.code), ['GHJKMN', 'ABCDEF']);
  assert.deepEqual(rememberRoom(two, { code: 'ABCDEF' }, 3).map((r) => r.code), ['ABCDEF', 'GHJKMN']);
  assert.deepEqual(one, [{ code: 'ABCDEF', createdAt: 1 }], 'the input list is not mutated');
});

test('the saved list is capped', () => {
  let list = [];
  for (let i = 0; i < MAX_SAVED_ROOMS + 5; i += 1) list = rememberRoom(list, { code: `ROOM${String(i).padStart(2, '0')}` }, i);
  assert.equal(list.length, MAX_SAVED_ROOMS);
  assert.equal(list[0].code, `ROOM${MAX_SAVED_ROOMS + 4}`);
});

test('stored data from the browser is validated, never trusted', () => {
  assert.deepEqual(parseSavedRooms(null), []);
  assert.deepEqual(parseSavedRooms('not json'), []);
  assert.deepEqual(parseSavedRooms('{"code":"ABCDEF"}'), []);
  const raw = JSON.stringify([{ code: 'ABCDEF', createdAt: 5 }, { code: '<img src=x>', createdAt: 1 }, { code: 'abcdef' }, 'x']);
  assert.deepEqual(parseSavedRooms(raw), [{ code: 'ABCDEF', createdAt: 5 }]);
});
