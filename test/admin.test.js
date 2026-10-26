import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { startServer } from '../src/server.js';

let server;
let base;
let boss;
let lan;

const devLogin = async (name) => {
  const res = await fetch(`${base}/auth/dev?name=${encodeURIComponent(name)}`, { redirect: 'manual' });
  return res.headers.getSetCookie().find((c) => c.startsWith('peti_sid=')).split(';')[0];
};
const get = (path, cookie) => fetch(`${base}${path}`, { headers: cookie ? { cookie } : {} });
const post = (path, cookie, body, origin = base) => fetch(`${base}${path}`, {
  method: 'POST',
  headers: { cookie, Origin: origin, 'Content-Type': 'application/json' },
  body: JSON.stringify(body ?? {}),
});
const createRoom = async (cookie) => (await (await post('/api/rooms', cookie)).json()).code;

before(async () => {
  server = await startServer({ port: 0, auth: { devLogin: true, adminEmails: ['boss@dev.local'] }, roomLimits: { maxRoomsPerUser: 10 } });
  base = `http://127.0.0.1:${server.port}`;
  boss = await devLogin('Boss');
  lan = await devLogin('Lan');
});

after(() => server.close());

test('the admin page and API are invisible to everyone but admins', async () => {
  for (const cookie of [undefined, lan]) {
    assert.equal((await get('/admin', cookie)).status, 404);
    assert.equal((await get('/api/admin/overview', cookie)).status, 404);
  }
  assert.equal((await get('/admin', boss)).status, 200);
  const me = await (await get('/api/me', boss)).json();
  assert.equal(me.user.role, 'admin');
});

test('overview lists live rooms with their owners and the users', async () => {
  const code = await createRoom(lan);
  const data = await (await get('/api/admin/overview', boss)).json();
  const room = data.rooms.find((r) => r.code === code);
  assert.equal(room.ownerEmail, 'lan@dev.local');
  assert.ok(data.stats.rooms >= 1);
  assert.ok(data.stats.users >= 2);
  assert.ok(data.users.some((u) => u.email === 'lan@dev.local' && u.liveRooms >= 1));
  assert.ok(!JSON.stringify(data).includes(server.rooms.get(code).hostKey), 'no host keys in the admin API');
  const search = await (await get('/api/admin/overview?q=lan', boss)).json();
  assert.deepEqual(search.users.map((u) => u.email), ['lan@dev.local']);
});

test('admins can close a room; everyone in it is told and disconnected', async () => {
  const code = await createRoom(lan);
  const player = connect(base, { transports: ['websocket'], forceNew: true, query: { room: code } });
  await new Promise((r) => player.on('connect', r));
  const closed = new Promise((resolve) => player.once('room:closed', resolve));

  assert.equal((await post(`/api/admin/rooms/${code}/close`, boss, {}, 'http://evil.example')).status, 403, 'cross-site refused');
  assert.equal((await post(`/api/admin/rooms/${code}/close`, lan)).status, 404, 'not an admin');
  assert.equal((await post(`/api/admin/rooms/${code}/close`, boss)).status, 200);
  await closed;
  assert.equal(server.rooms.get(code), null);
  assert.equal((await post(`/api/admin/rooms/${code}/close`, boss)).status, 404);
  player.disconnect();
});

test('admins can moderate any room as host', async () => {
  const code = await createRoom(lan);
  const admin = connect(base, { transports: ['websocket'], forceNew: true, query: { room: code }, extraHeaders: { cookie: boss } });
  await new Promise((r) => admin.on('connect', r));
  assert.ok((await admin.timeout(2000).emitWithAck('host:auth', {})).ok);
  admin.disconnect();
});

test('banning logs the user out everywhere and closes their rooms; unban restores access', async () => {
  const victim = await devLogin('Spam');
  const code = await createRoom(victim);
  const res = await post((await (await get('/api/admin/overview?q=spam', boss)).json()).users.map((u) => `/api/admin/users/${u.id}/ban`)[0], boss, { banned: true });
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(body.closedRooms, [code]);
  assert.equal((await (await get('/api/me', victim)).json()).user, null, 'session revoked');
  assert.equal(server.rooms.get(code), null);

  const relog = await fetch(`${base}/auth/dev?name=Spam`, { redirect: 'manual' });
  const relogCookie = relog.headers.getSetCookie().find((c) => c.startsWith('peti_sid=')).split(';')[0];
  assert.equal((await (await get('/api/me', relogCookie)).json()).user, null, 'a banned account cannot sign back in');

  const id = (await (await get('/api/admin/overview?q=spam', boss)).json()).users[0].id;
  assert.equal((await post(`/api/admin/users/${id}/ban`, boss, { banned: false })).status, 200);
  const again = await devLogin('Spam');
  assert.equal((await (await get('/api/me', again)).json()).user.name, 'Spam');
});

test('admins cannot ban themselves; unknown users are 404', async () => {
  const me = await (await get('/api/me', boss)).json();
  assert.equal((await post(`/api/admin/users/${me.user.id}/ban`, boss, { banned: true })).status, 400);
  assert.equal((await post('/api/admin/users/999999/ban', boss, { banned: true })).status, 404);
  assert.equal((await post('/api/admin/users/abc/ban', boss, { banned: true })).status, 404);
});

test('banning drops the user\'s live connections in every room, not just their own rooms', async () => {
  const troll = await devLogin('Troll');
  const code = await createRoom(lan); // someone else's room
  const socket = connect(base, { transports: ['websocket'], forceNew: true, query: { room: code }, extraHeaders: { cookie: troll } });
  await new Promise((r) => socket.on('connect', r));
  const dropped = new Promise((resolve) => socket.once('disconnect', resolve));
  const id = (await (await get('/api/admin/overview?q=troll', boss)).json()).users[0].id;
  assert.equal((await post(`/api/admin/users/${id}/ban`, boss, { banned: true })).status, 200);
  await dropped;
  assert.ok(server.rooms.get(code), 'the other room stays open');
});

test('non-admins never get their request body parsed by admin routes', async () => {
  const res = await post('/api/admin/users/1/ban', lan, { banned: true });
  assert.equal(res.status, 404);
  const bad = await fetch(`${base}/api/admin/users/1/ban`, { method: 'POST', headers: { cookie: lan, Origin: base, 'Content-Type': 'application/json' }, body: '{not json' });
  assert.equal(bad.status, 404, 'a malformed body is not even looked at');
});
