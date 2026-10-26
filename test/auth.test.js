import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { io as connect } from 'socket.io-client';
import { startServer } from '../src/server.js';
import { openDatabase } from '../src/db.js';
import { AuthStore } from '../src/auth/store.js';
import { identityFromIdToken, pkcePair } from '../src/auth/google.js';
import { parseCookies, serializeCookie } from '../src/auth/cookies.js';
import { safeReturnTo } from '../src/auth/routes.js';

const CLIENT_ID = 'test-client.apps.googleusercontent.com';
const b64 = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
const idToken = (claims) => `${b64({ alg: 'RS256' })}.${b64(claims)}.sig`;
const goodClaims = (over = {}) => ({
  iss: 'https://accounts.google.com', aud: CLIENT_ID, sub: 'google-123', email: 'Lan@Example.com',
  email_verified: true, name: 'Chị Lan', exp: Math.floor(Date.now() / 1000) + 600, ...over,
});

// ---------------- units ----------------

test('identityFromIdToken checks issuer, audience, expiry and verified email', () => {
  assert.deepEqual(identityFromIdToken(idToken(goodClaims()), { clientId: CLIENT_ID }), { sub: 'google-123', email: 'lan@example.com', name: 'Chị Lan' });
  for (const [bad, reason] of [
    [{ iss: 'https://evil.example' }, /issuer/],
    [{ aud: 'someone-else' }, /audience/],
    [{ exp: Math.floor(Date.now() / 1000) - 3600 }, /expired/],
    [{ email_verified: false }, /verified/],
    [{ sub: '' }, /subject/],
  ]) assert.throws(() => identityFromIdToken(idToken(goodClaims(bad)), { clientId: CLIENT_ID }), reason);
  assert.throws(() => identityFromIdToken('not-a-jwt', { clientId: CLIENT_ID }), /malformed/);
});

test('PKCE verifier/challenge are base64url and differ each time', () => {
  const a = pkcePair();
  const b = pkcePair();
  assert.match(a.verifier, /^[A-Za-z0-9_-]{43}$/);
  assert.match(a.challenge, /^[A-Za-z0-9_-]{43}$/);
  assert.notEqual(a.verifier, b.verifier);
});

test('safeReturnTo only allows same-site relative paths', () => {
  assert.equal(safeReturnTo('/r/ABCDEF/host'), '/r/ABCDEF/host');
  assert.equal(safeReturnTo('/?create=1'), '/?create=1');
  for (const bad of ['//evil.example', 'https://evil.example', '/\\evil', 'javascript:alert(1)', undefined, 42]) assert.equal(safeReturnTo(bad), '/');
});

test('cookies: parse and serialize with safe defaults', () => {
  assert.deepEqual(parseCookies('a=1; b=x%20y; a=2; junk'), { a: '1', b: 'x y' });
  assert.equal(serializeCookie('sid', 'v', { maxAgeSec: 60, secure: true }), 'sid=v; Path=/; SameSite=Lax; Max-Age=60; HttpOnly; Secure');
});

test('AuthStore: sessions are stored hashed, expire, and die when a user is banned', () => {
  const store = new AuthStore(openDatabase(':memory:'), { sessionDays: 1, adminEmails: ['boss@example.com'] });
  const user = store.upsertGoogleUser({ sub: 's1', email: 'boss@example.com', name: 'Sếp' }, 0);
  assert.equal(user.role, 'admin');
  const token = store.createSession(user.id, 0);
  assert.equal(store.userForToken(token, 1000).id, user.id);
  const raw = store.db.prepare('SELECT token_hash FROM sessions').get().token_hash;
  assert.notEqual(raw, token, 'only the hash is stored');
  assert.equal(store.userForToken(token, 2 * 24 * 3600 * 1000), null, 'expired');
  const fresh = store.createSession(user.id, 0);
  store.setBanned(user.id, true);
  assert.equal(store.userForToken(fresh, 1000), null, 'banned users are logged out');
  assert.equal(store.userForToken('nope', 0), null);
  assert.equal(store.upsertGoogleUser({ sub: 's1', email: 'boss@example.com', name: 'Sếp mới' }, 5).name, 'Sếp mới', 'same Google account, same user');
});

// ---------------- full sign-in flow against a fake Google ----------------

let server;
let base;
let googleCalls;
let nextClaims;

before(async () => {
  googleCalls = [];
  const fakeGoogle = async (url, init) => {
    googleCalls.push({ url, body: Object.fromEntries(new URLSearchParams(init.body)) });
    return new Response(JSON.stringify({ id_token: idToken(nextClaims) }), { status: 200, headers: { 'content-type': 'application/json' } });
  };
  server = await startServer({ port: 0, requireLogin: true, auth: { clientId: CLIENT_ID, clientSecret: 'shh', fetchImpl: fakeGoogle } });
  base = `http://127.0.0.1:${server.port}`;
});

after(() => server.close());

/** Walk the OAuth dance; returns the session cookie value. */
async function signIn(claims = goodClaims(), returnTo = '/?create=1') {
  nextClaims = claims;
  const start = await fetch(`${base}/auth/google?returnTo=${encodeURIComponent(returnTo)}`, { redirect: 'manual' });
  assert.equal(start.status, 302);
  const google = new URL(start.headers.get('location'));
  assert.equal(google.origin + google.pathname, 'https://accounts.google.com/o/oauth2/v2/auth');
  assert.equal(google.searchParams.get('code_challenge_method'), 'S256');
  assert.equal(google.searchParams.get('redirect_uri'), `${base}/auth/google/callback`);
  const state = google.searchParams.get('state');
  const stateCookie = start.headers.getSetCookie().find((c) => c.startsWith('peti_oauth='));
  const back = await fetch(`${base}/auth/google/callback?code=auth-code&state=${state}`, {
    redirect: 'manual',
    headers: { cookie: stateCookie.split(';')[0] },
  });
  return { back, sid: back.headers.getSetCookie().find((c) => c.startsWith('peti_sid='))?.split(';')[0] };
}

test('sign in with Google, create a room, own it, sign out', async () => {
  const anonymous = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { Origin: base } });
  assert.equal(anonymous.status, 401, 'with ROOMS_REQUIRE_LOGIN, creating a room needs an account');

  const { back, sid } = await signIn();
  assert.equal(back.status, 302);
  assert.equal(back.headers.get('location'), '/?create=1');
  assert.ok(sid, 'session cookie set');
  const cookieLine = back.headers.getSetCookie().find((c) => c.startsWith('peti_sid='));
  assert.match(cookieLine, /HttpOnly/);
  assert.match(cookieLine, /SameSite=Lax/);
  const exchange = googleCalls.at(-1);
  assert.equal(exchange.body.code, 'auth-code');
  assert.ok(exchange.body.code_verifier, 'PKCE verifier sent to Google');

  const me = await (await fetch(`${base}/api/me`, { headers: { cookie: sid } })).json();
  assert.equal(me.user.name, 'Chị Lan');
  assert.equal(me.user.email, 'lan@example.com');

  const crossSite = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { cookie: sid, Origin: 'http://evil.example' } });
  assert.equal(crossSite.status, 403, 'cross-site POST refused even with the cookie');

  const created = await fetch(`${base}/api/rooms`, { method: 'POST', headers: { cookie: sid, Origin: base } });
  assert.equal(created.status, 201);
  const { code } = await created.json();
  const mine = await (await fetch(`${base}/api/my-rooms`, { headers: { cookie: sid } })).json();
  assert.deepEqual(mine.rooms.map((r) => r.code), [code]);
  assert.ok(!JSON.stringify(mine).includes('key='), 'owner links carry no host key');

  // The owner gets host rights from the session alone; a stranger does not.
  const owner = connect(base, { transports: ['websocket'], forceNew: true, query: { room: code }, extraHeaders: { cookie: sid } });
  const stranger = connect(base, { transports: ['websocket'], forceNew: true, query: { room: code } });
  await Promise.all([owner, stranger].map((s) => new Promise((r) => s.on('connect', r))));
  assert.ok((await owner.timeout(2000).emitWithAck('host:auth', {})).ok);
  assert.ok((await stranger.timeout(2000).emitWithAck('host:auth', {})).error);
  owner.disconnect();
  stranger.disconnect();

  const out = await fetch(`${base}/auth/logout`, { method: 'POST', headers: { cookie: sid, Origin: base } });
  assert.equal(out.status, 200);
  assert.equal((await (await fetch(`${base}/api/me`, { headers: { cookie: sid } })).json()).user, null, 'session revoked');
});

test('the callback rejects a missing/forged state and bad tokens', async () => {
  const forged = await fetch(`${base}/auth/google/callback?code=x&state=made-up`, { redirect: 'manual' });
  assert.equal(forged.status, 400);
  const { back } = await signIn(goodClaims({ aud: 'another-app' }));
  assert.equal(back.status, 400, 'token for another app');
  const unverified = await signIn(goodClaims({ sub: 'other', email_verified: false }));
  assert.equal(unverified.back.status, 400);
  const cancelled = await fetch(`${base}/auth/google/callback?error=access_denied&state=x`, { redirect: 'manual' });
  assert.equal(cancelled.headers.get('location'), '/?login=cancelled');
});

test('open redirects are impossible after sign-in', async () => {
  const { back } = await signIn(goodClaims(), 'https://evil.example/steal');
  assert.equal(back.headers.get('location'), '/');
});

test('per-account room limit applies to signed-in creators', async () => {
  const { sid } = await signIn(goodClaims({ sub: 'busy-host', email: 'busy@example.com' }), '/');
  const statuses = [];
  for (let i = 0; i < 4; i += 1) {
    statuses.push((await fetch(`${base}/api/rooms`, { method: 'POST', headers: { cookie: sid, Origin: base } })).status);
  }
  assert.deepEqual(statuses, [201, 201, 201, 429]);
});

test('without Google credentials sign-in is disabled cleanly', async () => {
  const bare = await startServer({ port: 0 });
  try {
    const res = await fetch(`http://127.0.0.1:${bare.port}/auth/google`, { redirect: 'manual' });
    assert.equal(res.status, 503);
    const me = await (await fetch(`http://127.0.0.1:${bare.port}/api/me`)).json();
    assert.deepEqual(me, { user: null, loginEnabled: false, devLogin: false });
    assert.equal((await fetch(`http://127.0.0.1:${bare.port}/auth/dev`, { redirect: 'manual' })).status, 404, 'dev login off by default');
  } finally {
    await bare.close();
  }
});

test('AuthStore: the admin role follows the current ADMIN_EMAILS, not the one at login time', () => {
  const db = openDatabase(':memory:');
  const before = new AuthStore(db, { adminEmails: ['boss@example.com'] });
  const boss = before.upsertGoogleUser({ sub: 's1', email: 'Boss@example.com', name: 'Sếp' }, 0);
  const token = before.createSession(boss.id, 0);
  assert.equal(before.userForToken(token, 1).role, 'admin');
  const after = new AuthStore(db, { adminEmails: [] }); // admin list changed + restart
  assert.equal(after.userForToken(token, 1).role, 'user');
  assert.equal(after.getUser(boss.id).role, 'user');
  assert.equal(after.listUsers()[0].role, 'user');
});

test('one browser cannot fill the pending sign-in table and lock everyone out', async () => {
  const statuses = [];
  for (let i = 0; i < 25; i += 1) statuses.push((await fetch(`${base}/auth/google`, { redirect: 'manual' })).status);
  assert.ok(statuses.slice(0, 20).every((s) => s === 302));
  assert.equal(statuses.at(-1), 429);
});
