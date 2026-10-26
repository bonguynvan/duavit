import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { RULES } from '../shared/catalog.js';
import { startServer } from '../src/server.js';
import { clientIp, publicBaseUrl } from '../src/sockets.js';

let server;
let url;
let main; // { code, hostKey, entry } of the room most tests use
const sockets = [];

async function createRoom(base = url) {
  const res = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: base } });
  const body = await res.json();
  return { res, body };
}

before(async () => {
  server = await startServer({ port: 0, requireLogin: false, roomLimits: { maxRoomsPerIp: 50 }, createPerMinute: 100, maxSocketsPerIp: 500 });
  url = `http://127.0.0.1:${server.port}`;
  const { body } = await createRoom();
  const hostKey = new URL(body.hostUrl).searchParams.get('key');
  main = { code: body.code, hostKey, entry: server.rooms.get(body.code) };
});

after(async () => {
  sockets.forEach((s) => s.disconnect());
  await server.close();
});

function client(code = main.code) {
  const socket = connect(url, { transports: ['websocket'], forceNew: true, query: { room: code } });
  sockets.push(socket);
  return new Promise((resolve, reject) => {
    socket.on('connect', () => resolve(socket));
    socket.on('connect_error', reject);
  });
}

const ask = (socket, event, data) => socket.timeout(2000).emitWithAck(event, data);
const hostOf = async (room = main) => {
  const host = await client(room.code);
  assert.ok((await ask(host, 'host:auth', { key: room.hostKey })).ok);
  return host;
};

/** Tracks full 'state' + merged 'race' frames, like the browser clients do. */
const nextState = (socket, predicate) =>
  new Promise((resolve) => {
    let current = null;
    const check = () => {
      if (!current || !predicate(current)) return;
      socket.off('state', onState);
      socket.off('race', onRace);
      resolve(current);
    };
    const onState = (s) => {
      current = s;
      check();
    };
    const onRace = (frame) => {
      if (current) current = { ...current, ...frame };
      check();
    };
    socket.on('state', onState);
    socket.on('race', onRace);
  });

// ---------------- HTTP ----------------

test('POST /api/rooms creates a room with player, host and live links', async () => {
  const { res, body } = await createRoom();
  assert.equal(res.status, 201);
  assert.match(body.code, /^[A-Z2-9]{6}$/);
  assert.equal(body.playerUrl, `${url}/r/${body.code}`);
  assert.match(body.hostUrl, new RegExp(`/r/${body.code}/host\\?key=[0-9a-f]{32}$`));
  assert.equal(body.liveUrl, `${url}/r/${body.code}/live`);
});

test('room pages exist only for live rooms; codes are case-insensitive', async () => {
  const page = await fetch(`${url}/r/${main.code}`);
  assert.equal(page.status, 200);
  assert.match(page.headers.get('content-security-policy'), /default-src 'self'/);
  assert.equal(page.headers.get('x-content-type-options'), 'nosniff');
  assert.equal((await fetch(`${url}/r/${main.code}/host`)).status, 200);
  const lower = await fetch(`${url}/r/${main.code.toLowerCase()}`, { redirect: 'manual' });
  assert.equal(lower.status, 301);
  assert.equal(lower.headers.get('location'), `/r/${main.code}`);
  assert.equal((await fetch(`${url}/r/ZZZZZZ`)).status, 404);
  assert.equal((await fetch(`${url}/host`)).status, 404, 'no room-less host page any more');
  assert.equal((await fetch(`${url}/host.html`)).status, 404, 'pages are not served by path');
  assert.equal((await fetch(`${url}/`)).status, 200);
  assert.deepEqual(await (await fetch(`${url}/healthz`)).json(), { ok: true }, "no internal numbers in public health checks");
  assert.equal((await fetch(`${url}/shared/catalog.js`)).status, 200);
});

test('room creation is rate-limited per IP and capped per IP', async () => {
  const small = await startServer({ port: 0, requireLogin: false, roomLimits: { maxRoomsPerIp: 2 }, createPerMinute: 3 });
  const base = `http://127.0.0.1:${small.port}`;
  try {
    assert.equal((await createRoom(base)).res.status, 201);
    assert.equal((await createRoom(base)).res.status, 201);
    const capped = await createRoom(base);
    assert.equal(capped.res.status, 429);
    assert.match(capped.body.error, /tối đa 2 phòng/);
    const rated = await createRoom(base);
    assert.equal(rated.res.status, 429, 'fourth attempt within a minute is rate-limited');
  } finally {
    await small.close();
  }
});

test('clientIp trusts X-Forwarded-For only behind our proxy; links follow PUBLIC_URL', () => {
  const headers = { 'x-forwarded-for': '203.0.113.9, 10.0.0.1', host: 'peti.vn', 'x-forwarded-proto': 'https' };
  assert.equal(clientIp(headers, '127.0.0.1', true), '203.0.113.9');
  assert.equal(clientIp(headers, '127.0.0.1', false), '127.0.0.1', 'spoofable header ignored when not proxied');
  assert.equal(publicBaseUrl(headers, { publicUrl: 'https://peti.vn/', trustProxy: false }), 'https://peti.vn');
  assert.equal(publicBaseUrl(headers, { publicUrl: '', trustProxy: true }), 'https://peti.vn');
  assert.equal(publicBaseUrl(headers, { publicUrl: '', trustProxy: false }), 'http://peti.vn');
});

test('static files are always revalidated; soundtracks 404 when absent', async () => {
  const res = await fetch(`${url}/js/player.js`);
  assert.equal(res.headers.get('cache-control'), 'no-cache');
  assert.equal((await fetch(`${url}/music/no-such-map.mp3`, { method: 'HEAD' })).status, 404);
});

test('cross-origin socket connections are refused', async () => {
  const path = `/socket.io/?EIO=4&transport=polling&room=${main.code}`;
  assert.equal((await fetch(`${url}${path}`, { headers: { Origin: 'http://evil.example' } })).status, 403);
  assert.equal((await fetch(`${url}${path}`, { headers: { Origin: url } })).status, 200);
});

// ---------------- sockets ----------------

test('sockets must name an existing room', async () => {
  await assert.rejects(client('ZZZZZZ'), /ROOM_NOT_FOUND/);
  await assert.rejects(client(''), /ROOM_NOT_FOUND/);
  const socket = await client(main.code.toLowerCase());
  const hello = await new Promise((resolve) => {
    const s = connect(url, { transports: ['websocket'], forceNew: true, query: { room: main.code } });
    sockets.push(s);
    s.once('hello', resolve);
  });
  assert.match(hello.build, /^[0-9a-f]{8}$/);
  assert.equal(hello.code, main.code);
  assert.ok(socket.connected);
});

test('host access needs that room\'s key; wrong keys are locked out', async () => {
  const other = (await createRoom()).body;
  const socket = await client(main.code);
  assert.ok((await ask(socket, 'host:auth', {})).error);
  assert.ok((await ask(socket, 'host:auth', { key: new URL(other.hostUrl).searchParams.get('key') })).error, 'another room\'s key');
  const auth = await ask(socket, 'host:auth', { key: main.hostKey });
  assert.ok(auth.ok);
  assert.equal(auth.code, main.code);
  assert.equal(auth.joinUrl, `${url}/r/${main.code}`);
  assert.match(auth.qr, /^data:image\/png;base64,/);
});

test('non-host sockets cannot control the room', async () => {
  const player = await client();
  for (const event of ['host:start', 'host:addPlayer', 'host:duration', 'host:specialMaps', 'host:lobby', 'host:map', 'host:kick', 'host:pause', 'host:resume', 'host:restart', 'host:abort', 'host:title', 'host:spectator']) {
    const reply = await ask(player, event, {});
    assert.ok(reply.error, `${event} should be rejected`);
  }
});

test('rooms are isolated: players, chat and state never leak between rooms', async () => {
  const otherBody = (await createRoom()).body;
  const other = { code: otherBody.code, hostKey: new URL(otherBody.hostUrl).searchParams.get('key') };
  const inMain = await client(main.code);
  const inOther = await client(other.code);
  let leaked = false;
  inOther.on('chat:message', () => { leaked = true; });
  inOther.on('state', (s) => { if (s.players.some((p) => p.name === 'Chỉ ở phòng A')) leaked = true; });

  await ask(inMain, 'player:join', { name: 'Chỉ ở phòng A', animal: 'cat' });
  await ask(inMain, 'chat:send', { text: 'bí mật phòng A' });
  await new Promise((r) => setTimeout(r, 200));
  assert.equal(leaked, false);
  assert.equal(server.rooms.get(other.code).room.players.size, 0);
  assert.equal(server.rooms.get(other.code).chat.history().length, 0);
});

test('join, resume, kick and a full race over sockets', { timeout: 90000 }, async () => {
  const room = main.entry.room;
  const host = await hostOf();
  const player = await client();
  assert.ok((await ask(player, 'player:join', { name: '<b>Lan</b>', animal: 'nope' })).error);
  const joined = await ask(player, 'player:join', { name: '  Lan  ', animal: 'cat' });
  assert.ok(joined.ok);
  const again = await ask(player, 'player:join', { name: 'Again', animal: 'cat' });
  assert.equal(again.playerId, joined.playerId, 'a retried join returns the same identity');
  assert.ok((await ask(player, 'player:animal', { animal: 'penguin' })).ok);

  const phone2 = await client();
  assert.equal((await ask(phone2, 'player:resume', { token: joined.token })).playerId, joined.playerId);
  assert.ok((await ask(phone2, 'player:resume', { token: 'bad' })).error);

  assert.ok((await ask(host, 'host:map', { mapId: 'beach' })).ok);
  // Other tests share this room; keep just our racer + one host-added rival.
  for (const p of [...room.players.values()]) if (p.id !== joined.playerId) room.remove(p.id);
  assert.ok((await ask(host, 'host:start')).error, 'needs two racers');
  assert.ok((await ask(host, 'host:addPlayer', { name: 'Đối thủ', animal: 'dog' })).ok);
  const rival = [...room.players.values()].find((p) => p.name === 'Đối thủ');
  assert.ok((await ask(host, 'host:kick', { id: 'missing' })).error);

  const finished = nextState(player, (s) => s.phase === 'finished');
  const frames = [];
  player.on('race', (f) => frames.push(f));
  assert.ok((await ask(host, 'host:start')).ok);
  room.race = { ...room.race, trackLength: 60 }; // real maps take ~90 s; keep the test quick
  const state = await finished;
  assert.ok(frames.length > 20, 'positions stream as small race frames');
  assert.ok(frames.every((f) => !('players' in f)), 'race frames never carry the roster');
  assert.equal(state.mapId, 'beach');
  assert.deepEqual(new Set(state.results.map((r) => r.id)), new Set([joined.playerId, rival.id]));
  const me = state.players.find((p) => p.id === joined.playerId);
  assert.equal(me.name, 'Lan');
  assert.equal(me.animal, 'penguin');
  assert.ok(state.results.every((r) => r.timeMs < RULES.maxRaceMs));

  assert.ok((await ask(host, 'host:lobby')).ok);
  const kicked = new Promise((resolve) => player.once('kicked', resolve));
  assert.ok((await ask(host, 'host:kick', { id: joined.playerId })).ok);
  await kicked;
  assert.ok(!room.players.has(joined.playerId));
});

test('player:leave acknowledges and removes the player', async () => {
  const phone = await client();
  const joined = await ask(phone, 'player:join', { name: 'Hoa', animal: 'dog' });
  assert.ok(main.entry.room.players.has(joined.playerId));
  assert.deepEqual(await ask(phone, 'player:leave'), { ok: true });
  assert.ok(!main.entry.room.players.has(joined.playerId));
});

test('event floods from one socket are dropped', async () => {
  const phone = await client();
  const replies = await Promise.allSettled(Array.from({ length: 40 }, () => phone.timeout(500).emitWithAck('player:animal', { animal: 'cat' })));
  const accepted = replies.filter((r) => r.status === 'fulfilled' && r.value.ok).length;
  const throttled = replies.filter((r) => r.status === 'fulfilled' && r.value.error).length;
  assert.ok(accepted <= 20, `accepted ${accepted}`);
  assert.ok(throttled >= 20, 'dropped events are acknowledged with an error right away');
});

test('chat: players and host can post, strangers cannot, everyone in the room receives it', async () => {
  const host = await hostOf();
  const phone = await client();
  const stranger = await client();

  assert.ok((await ask(stranger, 'chat:send', { text: 'hi' })).error, 'must join first');

  await ask(phone, 'player:join', { name: 'Chi', animal: 'cat' });
  const received = new Promise((resolve) => stranger.once('chat:message', resolve));
  assert.ok((await ask(phone, 'chat:send', { text: '  Chào cả nhà  ' })).ok);
  const message = await received;
  assert.equal(message.text, 'Chào cả nhà');
  assert.equal(message.author.name, 'Chi');
  assert.equal(message.author.initials, 'C');
  assert.ok(!JSON.stringify(message).includes('token'));

  assert.ok((await ask(host, 'chat:send', { text: 'Sắp đua rồi!' })).ok);
  assert.equal(main.entry.chat.history().at(-1).author.isHost, true);

  const late = connect(url, { transports: ['websocket'], forceNew: true, query: { room: main.code } });
  sockets.push(late);
  const history = await new Promise((resolve) => late.once('chat:history', resolve));
  assert.deepEqual(history.map((m) => m.text).slice(-2), ['Chào cả nhà', 'Sắp đua rồi!']);
});

test('host can rename the race and move a player to the audience', async () => {
  const host = await hostOf();
  const phone = await client();
  const joined = await ask(phone, 'player:join', { name: 'Dũng', animal: 'fox' });

  assert.ok((await ask(host, 'host:title', { title: 'Cúp Peti' })).ok);
  assert.ok((await ask(phone, 'host:title', { title: 'hack' })).error, 'players cannot rename');
  assert.equal(main.entry.room.title, 'Cúp Peti');

  const moved = new Promise((resolve) => phone.once('moved', resolve));
  assert.ok((await ask(host, 'host:spectator', { id: joined.playerId, spectator: true })).ok);
  assert.deepEqual(await moved, { spectator: true });
  assert.equal(main.entry.room.players.get(joined.playerId).spectator, true);
  assert.ok((await ask(phone, 'host:spectator', { id: joined.playerId, spectator: false })).error);
});

test('host:addPlayer adds a named racer; players cannot', async () => {
  const host = await hostOf();
  const phone = await client();
  assert.ok((await ask(phone, 'host:addPlayer', { name: 'Hack', animal: 'cat' })).error);
  assert.ok((await ask(host, 'host:addPlayer', { name: 'Bác bảo vệ', animal: 'turtle' })).ok);
  const added = [...main.entry.room.players.values()].find((p) => p.name === 'Bác bảo vệ');
  assert.equal(added.isManual, true);
  assert.equal(added.homeAnimal, 'turtle');
});

test('idle rooms are swept and their sockets disconnected', async () => {
  const quick = await startServer({ port: 0, requireLogin: false, roomLimits: { idleMs: 0 } });
  const base = `http://127.0.0.1:${quick.port}`;
  try {
    const { body } = await createRoom(base);
    assert.ok(quick.rooms.get(body.code));
    const { sweepRooms } = await import('../src/sockets.js');
    assert.deepEqual(sweepRooms(quick.io, quick.rooms, Date.now()), [body.code]);
    assert.equal((await fetch(`${base}/r/${body.code}`)).status, 404);
  } finally {
    await quick.close();
  }
});

test('quick race, verification and fairness pages are public (no room, no login)', async () => {
  for (const path of ['/dua-nhanh', '/kiem-chung', '/cong-bang']) {
    const res = await fetch(`${url}${path}`);
    assert.equal(res.status, 200, path);
    assert.match(await res.text(), /<script type="module" src="\/js\/(quick|verify|fair)\.js">/);
  }
  for (const asset of ['/shared/fair.js', '/shared/simulate.js', '/shared/names.js', '/js/quick/playback.js']) {
    assert.equal((await fetch(`${url}${asset}`)).status, 200, asset);
  }
});

test('terms and privacy pages are public and linked from every public page', async () => {
  const terms = await fetch(`${url}/dieu-khoan`);
  assert.equal(terms.status, 200);
  assert.match(await terms.text(), /Không thu tiền/);
  const privacy = await fetch(`${url}/quyen-rieng-tu`);
  assert.equal(privacy.status, 200);
  assert.match(await privacy.text(), /peti_sid/, 'privacy policy names the session cookie');
  for (const path of ['/', '/dua-nhanh', '/kiem-chung', '/cong-bang', '/dieu-khoan', '/quyen-rieng-tu']) {
    const html = await (await fetch(`${url}${path}`)).text();
    assert.match(html, /href="\/dieu-khoan"/, `${path} links the terms`);
    assert.match(html, /href="\/quyen-rieng-tu"/, `${path} links the privacy policy`);
  }
});

test('OBS live page and the player-link QR exist per room', async () => {
  assert.equal((await fetch(`${url}/r/${main.code}/live`)).status, 200);
  const qr = await fetch(`${url}/r/${main.code}/qr.svg`);
  assert.equal(qr.status, 200);
  assert.match(qr.headers.get('content-type'), /image\/svg\+xml/);
  assert.match(await qr.text(), /<svg/);
  assert.equal((await fetch(`${url}/r/ZZZZZZ/qr.svg`)).status, 404);
});

test('one socket cannot churn join/leave to force full snapshots forever', async () => {
  const socket = await client();
  const results = [];
  for (let i = 0; i < 11; i += 1) {
    if (i === 10) await new Promise((r) => setTimeout(r, 1100)); // past the 20 events/s limit, still within the minute
    results.push(await ask(socket, 'player:join', { name: `Churn ${i}`, animal: 'duck' }));
    await ask(socket, 'player:leave');
  }
  assert.ok(results.slice(0, 10).every((r) => r.ok), 'normal use is untouched');
  assert.match(results[10].error, /nhiều quá/);
  socket.disconnect();
});
