// Guards for contributed characters and maps: every catalog entry must have its art registered.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS, CHARACTER_GROUPS, ITEMS, MAPS, allowedAnimals, characterGroups, findMap, groupOf, withCast } from '../shared/catalog.js';
import { HEAD_TOP, PAINTERS, drawAnimal, drawScenery } from '../public/js/draw.js';
import { SCENERY } from '../public/js/scenery.js';

const PALETTE_KEYS = ['skyTop', 'skyBottom', 'ground', 'laneA', 'laneB', 'line'];
const FINISH_STYLES = ['palace-gate', 'temple-drum', 'ribbon', 'flag-raise'];
const HEX_COLOR = /^#[0-9a-f]{6}$/i;
const ID = /^[a-z][a-zA-Z0-9]*$/;

/** A canvas context that accepts every call and property, so painters can run headless. */
function stubContext() {
  const handler = {
    get: (_target, prop) => (prop === Symbol.toPrimitive ? () => 0 : stub),
    set: () => true,
    apply: () => stub,
  };
  const stub = new Proxy(function noop() {}, handler);
  return stub;
}

const duplicates = (list) => list.map((x) => x.id).filter((id, i, ids) => ids.indexOf(id) !== i);

test('catalog ids are unique and well-formed', () => {
  for (const list of [ANIMALS, MAPS, ITEMS]) {
    assert.deepEqual(duplicates(list), []);
    for (const { id } of list) assert.match(id, ID, `id "${id}" should be camelCase ASCII`);
  }
});

test('every character has a painter, a head anchor and a valid colour', () => {
  for (const animal of ANIMALS) {
    assert.equal(typeof PAINTERS[animal.id], 'function', `painter missing for "${animal.id}"`);
    assert.ok(HEAD_TOP[animal.id], `HEAD_TOP missing for "${animal.id}"`);
    assert.match(animal.color, HEX_COLOR, `color of "${animal.id}"`);
    assert.ok(animal.name?.trim(), `name of "${animal.id}"`);
  }
});

test('every character draws without throwing, standing and running', () => {
  const face = { initials: 'AB', color: '#ff5a36' };
  for (const animal of ANIMALS) {
    for (const moving of [false, true]) {
      assert.doesNotThrow(
        () => drawAnimal(stubContext(), animal, { x: 50, y: 90, size: 80, phase: 1.3, moving, face, items: ['👑'] }),
        `drawing "${animal.id}"`,
      );
    }
  }
});

test('every map has scenery, a full palette and a sane track length', () => {
  for (const map of MAPS) {
    assert.ok(SCENERY[map.id], `scenery missing for map "${map.id}"`);
    for (const key of PALETTE_KEYS) assert.match(map.palette?.[key] ?? '', HEX_COLOR, `palette.${key} of "${map.id}"`);
    assert.ok(Number.isInteger(map.trackLength) && map.trackLength >= 300 && map.trackLength <= 1200, `trackLength of "${map.id}"`);
    if (map.finish) assert.ok(FINISH_STYLES.includes(map.finish), `unknown finish "${map.finish}" on "${map.id}"`);
    // Soundtracks are files the host drops in: an offset tuned for one file cuts the intro of any other.
    assert.equal(map.musicStart, undefined, `map "${map.id}" must play its soundtrack from 0:00`);
    assert.doesNotThrow(() => drawScenery(stubContext(), map, 800, 300, 1234, 56), `drawing scenery "${map.id}"`);
  }
});

test('map-exclusive characters and allowed lists point at real entries', () => {
  const animalIds = new Set(ANIMALS.map((a) => a.id));
  const mapIds = new Set(MAPS.map((m) => m.id));
  for (const map of MAPS) {
    for (const id of map.allowedAnimals ?? []) assert.ok(animalIds.has(id), `map "${map.id}" allows unknown "${id}"`);
  }
  for (const animal of ANIMALS) {
    for (const id of animal.maps ?? []) assert.ok(mapIds.has(id), `"${animal.id}" is tied to unknown map "${id}"`);
  }
});

test('withCast opens a map to every character without touching the catalog', () => {
  const denhung = findMap('denhung');
  assert.equal(allowedAnimals(withCast(denhung, true)).length, ANIMALS.length);
  assert.equal(allowedAnimals(denhung).length, 4, 'the catalog entry is unchanged');
  assert.equal(withCast(denhung, false), denhung);
  assert.equal(characterGroups(withCast(denhung, true))[0].id, 'denhung', "the map's own tab first");
});

test('the Tết map lets everyone race with any character, its own tab first', () => {
  const tet = findMap('tet');
  assert.equal(allowedAnimals(tet).length, ANIMALS.length);
  assert.equal(characterGroups(tet)[0].id, 'tet');
  assert.equal(characterGroups(tet).reduce((n, g) => n + g.animals.length, 0), ANIMALS.length);
});

test('every character belongs to a known group, and the picker shows the groups a map allows', () => {
  const groupIds = new Set(CHARACTER_GROUPS.map((g) => g.id));
  for (const animal of ANIMALS) assert.ok(groupIds.has(groupOf(animal)), `group of "${animal.id}"`);
  const ids = (mapId) => characterGroups(findMap(mapId)).map((g) => g.id);
  assert.deepEqual(ids('meadow'), ['animals', 'people', 'saigon'], 'ordinary maps: animals first, then people and the 30/4 cast');
  assert.deepEqual(ids('denhung'), ['denhung'], 'a map with its own cast shows only that group');
  assert.deepEqual(ids('saigon'), ['saigon']);
  for (const map of MAPS) {
    const listed = characterGroups(map).flatMap((g) => g.animals.map((a) => a.id)).sort();
    assert.deepEqual(listed, allowedAnimals(map).map((a) => a.id).sort(), `groups cover exactly what "${map.id}" allows`);
  }
});
