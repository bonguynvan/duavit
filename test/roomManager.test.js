import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RoomManager, normalizeCode } from '../src/rooms/roomManager.js';

test('normalizeCode accepts typed codes and rejects anything else', () => {
  assert.equal(normalizeCode(' k7qx2a '), 'K7QX2A');
  assert.equal(normalizeCode('K7QX2'), null, 'too short');
  assert.equal(normalizeCode('K7QX2O'), null, 'O is not in the alphabet');
  assert.equal(normalizeCode('../etc'), null);
  assert.equal(normalizeCode(42), null);
});

test('create issues unique readable codes and secret host keys', () => {
  const rooms = new RoomManager({ maxRoomsPerIp: 100 });
  const codes = new Set();
  for (let i = 0; i < 50; i += 1) {
    const { entry } = rooms.create({ ip: '1.1.1.1', now: 0 });
    assert.ok(normalizeCode(entry.code), entry.code);
    assert.match(entry.hostKey, /^[0-9a-f]{32}$/);
    codes.add(entry.code);
  }
  assert.equal(codes.size, 50);
  assert.equal(rooms.size, 50);
});

test('each room has its own game and chat', () => {
  const rooms = new RoomManager();
  const a = rooms.create({ ip: 'a', now: 0 }).entry;
  const b = rooms.create({ ip: 'b', now: 0 }).entry;
  a.room.join('An', 'cat');
  assert.equal(a.room.players.size, 1);
  assert.equal(b.room.players.size, 0);
  assert.notEqual(a.chat, b.chat);
});

test('get looks rooms up by (case-insensitive) code', () => {
  const rooms = new RoomManager();
  const { entry } = rooms.create({ ip: 'a', now: 0 });
  assert.equal(rooms.get(entry.code.toLowerCase()), entry);
  assert.equal(rooms.get('ZZZZZZ'), null);
  assert.equal(rooms.get(undefined), null);
});

test('host keys are checked in constant time and must match exactly', () => {
  const rooms = new RoomManager();
  const { entry } = rooms.create({ ip: 'a', now: 0 });
  assert.ok(rooms.isHostKey(entry, entry.hostKey));
  assert.ok(!rooms.isHostKey(entry, entry.hostKey.slice(1)));
  assert.ok(!rooms.isHostKey(entry, 'x'.repeat(32)));
  assert.ok(!rooms.isHostKey(entry, null));
});

test('per-IP and global room limits', () => {
  const rooms = new RoomManager({ maxRoomsPerIp: 2, maxRooms: 3 });
  assert.ok(rooms.create({ ip: 'a', now: 0 }).entry);
  assert.ok(rooms.create({ ip: 'a', now: 0 }).entry);
  const perIp = rooms.create({ ip: 'a', now: 0 });
  assert.equal(perIp.status, 429);
  assert.ok(rooms.create({ ip: 'b', now: 0 }).entry);
  assert.equal(rooms.create({ ip: 'c', now: 0 }).status, 503);
});

test('signed-in creators are capped per IP too, not only per account', () => {
  const rooms = new RoomManager({ maxRoomsPerIp: 2, maxRoomsPerUser: 5 });
  assert.ok(rooms.create({ ip: 'x', now: 0, ownerId: 1 }).entry);
  assert.ok(rooms.create({ ip: 'x', now: 0, ownerId: 2 }).entry);
  assert.equal(rooms.create({ ip: 'x', now: 0, ownerId: 3 }).status, 429, 'a farm of accounts on one IP is still capped');
  assert.equal(rooms.create({ ip: 'x', now: 0 }).status, 429);
});

test('sweep closes rooms no host ever opened, even with sockets holding them', () => {
  const rooms = new RoomManager({ unclaimedMs: 10, idleMs: 1000, maxAgeMs: 10_000 });
  const ghost = rooms.create({ ip: 'a', now: 0 }).entry;
  const real = rooms.create({ ip: 'b', now: 0 }).entry;
  rooms.connect(ghost, 0);
  rooms.connect(real, 0);
  rooms.claim(real, 5);
  assert.deepEqual(rooms.sweep(9), []);
  assert.deepEqual(rooms.sweep(10), [ghost.code]);
  assert.equal(rooms.get(real.code), real, 'a room its host opened stays');
});

test('sweep closes any room past its maximum age', () => {
  const rooms = new RoomManager({ maxAgeMs: 100 });
  const busy = rooms.create({ ip: 'a', now: 0 }).entry;
  rooms.connect(busy, 0);
  rooms.claim(busy, 1);
  assert.deepEqual(rooms.sweep(99), []);
  assert.deepEqual(rooms.sweep(100), [busy.code]);
});

test('sweep closes rooms that stayed empty for idleMs, never busy ones', () => {
  const rooms = new RoomManager({ idleMs: 1000, maxRoomsPerIp: 10 });
  const empty = rooms.create({ ip: 'a', now: 0 }).entry;
  const busy = rooms.create({ ip: 'a', now: 0 }).entry;
  const recent = rooms.create({ ip: 'a', now: 0 }).entry;
  rooms.connect(busy, 0);
  rooms.connect(recent, 0);
  rooms.disconnect(recent, 900);
  assert.deepEqual(rooms.sweep(999), []);
  assert.deepEqual(rooms.sweep(1000), [empty.code]);
  assert.deepEqual(rooms.sweep(1900), [recent.code]);
  assert.equal(rooms.get(busy.code), busy, 'a room with people in it is never swept');
});

test('list gives an admin overview without secrets', () => {
  const rooms = new RoomManager();
  const { entry } = rooms.create({ ip: 'a', now: 0 });
  entry.room.setTitle('Cúp Peti');
  const [row] = rooms.list(120000);
  assert.deepEqual(row, { code: entry.code, ownerId: null, title: 'Cúp Peti', phase: 'lobby', players: 0, connections: 0, ageMin: 2, idleMin: 2 });
  assert.ok(!JSON.stringify(rooms.list(0)).includes(entry.hostKey));
});
