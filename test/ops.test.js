// Operator API for the peti.vn admin dashboard, daily counters and site-wide switches.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { openDatabase } from '../src/db.js';
import { DailyStats, dayOf } from '../src/stats.js';
import { Settings } from '../src/settings.js';
import { startServer } from '../src/server.js';

const TOKEN = 'x'.repeat(40);
const DAY = 24 * 60 * 60 * 1000;

test('daily counters add up per Vietnam calendar day and fill empty days with zeros', () => {
  const stats = new DailyStats(openDatabase(':memory:'));
  const now = Date.UTC(2026, 9, 27, 3); // 10:00 in Hồ Chí Minh City
  stats.add('roomRaces', 1, now);
  stats.add('roomRaces', 2, now);
  stats.peak('peakPlayers', 40, now);
  stats.peak('peakPlayers', 25, now);
  stats.add('roomsCreated', 1, now - DAY);
  const days = stats.recent(3, now);
  assert.deepEqual(days.map((d) => d.day), ['2026-10-25', '2026-10-26', '2026-10-27']);
  assert.equal(days[2].roomRaces, 3);
  assert.equal(days[2].peakPlayers, 40, 'peak keeps the maximum');
  assert.equal(days[1].roomsCreated, 1);
  assert.equal(days[0].quickRaces, 0);
  assert.equal(dayOf(Date.UTC(2026, 9, 26, 18), 'Asia/Ho_Chi_Minh'), '2026-10-27', 'midnight in Vietnam, not UTC');
  assert.throws(() => stats.add('names', 1, now), /unknown metric/);
});

test('settings persist, validate and sanitise the announcement', () => {
  const db = openDatabase(':memory:');
  const settings = new Settings(db);
  assert.deepEqual(settings.get(), { maintenance: false, announcement: null });
  assert.ok(settings.update({ maintenance: true, announcement: '  Bảo trì\nlúc 22h  ' }).settings);
  assert.deepEqual(new Settings(db).get(), { maintenance: true, announcement: 'Bảo trì lúc 22h' }, 'survives a restart');
  assert.ok(settings.update({ maintenance: 'yes' }).error);
  assert.ok(settings.update({ announcement: 'x'.repeat(201) }).error);
  assert.equal(settings.update({ announcement: '' }).settings.announcement, null);
});

let server;
let base;
before(async () => {
  server = await startServer({ port: 0, opsToken: TOKEN, roomLimits: { maxRoomsPerIp: 50 }, createPerMinute: 100 });
  base = `http://127.0.0.1:${server.port}`;
});
after(() => server.close());

const ops = (path, init = {}) => fetch(`${base}/api/ops${path}`, { ...init, headers: { Authorization: `Bearer ${TOKEN}`, 'Content-Type': 'application/json', ...init.headers } });
const createRoom = () => fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: base } });

test('the operator API needs the token, and is absent without OPS_TOKEN', async () => {
  assert.equal((await fetch(`${base}/api/ops/overview`)).status, 401);
  assert.equal((await ops('/overview', { headers: { Authorization: 'Bearer wrong' } })).status, 401);
  const bare = await startServer({ port: 0 });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${bare.port}/api/ops/overview`, { headers: { Authorization: `Bearer ${TOKEN}` } })).status, 404);
  } finally {
    await bare.close();
  }
  const short = await startServer({ port: 0, opsToken: 'short' });
  try {
    assert.equal((await fetch(`http://127.0.0.1:${short.port}/api/ops/overview`, { headers: { Authorization: 'Bearer short' } })).status, 404, 'tokens under 32 characters never enable it');
  } finally {
    await short.close();
  }
});

test('overview lists live rooms (no secrets) and counts rooms and races per day', async () => {
  const { code } = await (await createRoom()).json();
  const host = connect(base, { transports: ['websocket'], forceNew: true, query: { room: code } });
  await new Promise((r) => host.on('connect', r));
  const ask = (event, data) => host.timeout(2000).emitWithAck(event, data);
  assert.ok((await ask('host:auth', { key: server.rooms.get(code).hostKey })).ok);
  assert.ok((await ask('host:mode', { mode: 'random' })).ok);
  assert.ok((await ask('host:addPlayer', { name: 'An', animal: 'cat' })).ok);
  assert.ok((await ask('host:addPlayer', { name: 'Bình', animal: 'dog' })).ok);
  assert.ok((await ask('host:start', {})).ok);
  host.disconnect();

  const body = await (await ops('/overview')).json();
  assert.equal(body.game.id, 'duavit');
  const room = body.rooms.find((r) => r.code === code);
  assert.equal(room.mapName, 'Đồng cỏ');
  assert.equal(room.ownerId, undefined);
  assert.ok(!JSON.stringify(body).includes(server.rooms.get(code).hostKey), 'no host keys');
  const today = body.daily.at(-1);
  assert.equal(body.daily.length, 30);
  assert.ok(today.roomsCreated >= 1);
  assert.equal(today.roomRaces, 1);
  assert.equal(today.roomRacers, 2);
});

test('quick races are counted from the page, same-origin and within limits', async () => {
  const report = (racers, origin = base) => fetch(`${base}/api/stats/quick-race`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' }, body: JSON.stringify({ racers }) });
  assert.equal((await report(70)).status, 204);
  assert.equal((await report(1)).status, 400);
  assert.equal((await report(501)).status, 400);
  assert.equal((await report(5, 'https://evil.example')).status, 403);
  const today = (await (await ops('/overview')).json()).daily.at(-1);
  assert.equal(today.quickRaces, 1);
  assert.equal(today.quickRacers, 70);
});

test('maintenance blocks new rooms; the announcement reaches every page and open room', async () => {
  const { code } = await (await createRoom()).json();
  const player = connect(base, { transports: ['websocket'], forceNew: true, query: { room: code } });
  await new Promise((r) => player.on('connect', r));
  const pushed = new Promise((resolve) => player.once('status', resolve));

  const res = await ops('/settings', { method: 'POST', body: JSON.stringify({ maintenance: true, announcement: 'Bảo trì lúc 22h' }) });
  assert.equal(res.status, 200);
  assert.deepEqual(await pushed, { maintenance: true, announcement: 'Bảo trì lúc 22h' });
  assert.deepEqual(await (await fetch(`${base}/api/status`)).json(), { maintenance: true, announcement: 'Bảo trì lúc 22h' });
  const blocked = await createRoom();
  assert.equal(blocked.status, 503);
  assert.match((await blocked.json()).error, /bảo trì/i);
  assert.ok(server.rooms.get(code), 'rooms already open keep going');
  player.disconnect();

  assert.equal((await ops('/settings', { method: 'POST', body: JSON.stringify({ maintenance: 'maybe' }) })).status, 400);
  await ops('/settings', { method: 'POST', body: JSON.stringify({ maintenance: false, announcement: null }) });
  assert.equal((await createRoom()).status, 201);
});

test('the operator can close a room', async () => {
  const { code } = await (await createRoom()).json();
  assert.equal((await ops(`/rooms/${code}/close`, { method: 'POST' })).status, 200);
  assert.equal(server.rooms.get(code), null);
  assert.equal((await ops(`/rooms/${code}/close`, { method: 'POST' })).status, 404);
});
