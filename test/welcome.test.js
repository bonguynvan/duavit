import { test } from 'node:test';
import assert from 'node:assert/strict';
import { MAPS, findMap, isAnimalAllowed } from '../shared/catalog.js';
import { MIN_RUNNERS, paradeFor } from '../public/js/welcome.js';

test('each map parades its own cast, never characters it does not allow', () => {
  for (const map of MAPS) {
    const parade = paradeFor(map);
    assert.ok(parade.length >= MIN_RUNNERS, `${map.id}: a full track`);
    for (const r of parade) assert.ok(isAnimalAllowed(map, r.animal.id), `${r.animal.id} on ${map.id}`);
    assert.deepEqual(new Set(parade.map((r) => r.lane)).size, 3, `${map.id}: every lane has runners`);
  }
});

test('a themed map shows its whole small cast, repeated to fill the track', () => {
  const parade = paradeFor(findMap('chodem'));
  const ids = new Set(parade.map((r) => r.animal.id));
  assert.deepEqual([...ids].sort(), [...findMap('chodem').allowedAnimals].sort());
  assert.equal(parade.length, MIN_RUNNERS);
});
