// One-time admin sign-in links made on the server (src/tools/admin-link.js): no Google sign-in needed.
import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { promisify } from 'node:util';
import { startServer } from '../src/server.js';
import { openDatabase } from '../src/db.js';

const MINUTE = 60 * 1000;
let server;
let base;

before(async () => {
  server = await startServer({ port: 0, auth: { adminEmails: ['boss@peti.vn'] } });
  base = `http://127.0.0.1:${server.port}`;
});
after(() => server.close());

const open = (token) => fetch(`${base}/auth/link?token=${token}`, { redirect: 'manual' });
const linkFor = (email, ttl = 10 * MINUTE, now = Date.now()) => server.store.createLoginLink(server.store.upsertLocalAdmin(email, now).id, now, ttl);

test('a fresh link signs the admin in and lands on /admin', async () => {
  const res = await open(linkFor('Boss@peti.vn'));
  assert.equal(res.status, 302);
  assert.equal(res.headers.get('location'), '/admin');
  const sid = res.headers.getSetCookie().find((c) => c.startsWith('peti_sid=')).split(';')[0];
  assert.equal((await fetch(`${base}/admin`, { headers: { cookie: sid } })).status, 200);
  const me = await (await fetch(`${base}/api/me`, { headers: { cookie: sid } })).json();
  assert.equal(me.user.role, 'admin');
});

test('links work once, expire, and only for admins', async () => {
  const token = linkFor('boss@peti.vn');
  assert.equal((await open(token)).status, 302);
  assert.equal((await open(token)).status, 400, 'single use');
  assert.equal((await open(linkFor('boss@peti.vn', MINUTE, Date.now() - 2 * MINUTE))).status, 400, 'expired');
  assert.equal((await open(linkFor('stranger@example.com'))).status, 403, 'not in ADMIN_EMAILS');
  assert.equal((await open('nope')).status, 400);
  assert.equal((await open('a'.repeat(64))).status, 400);
});

test('a banned admin cannot use a link', async () => {
  const user = server.store.upsertLocalAdmin('boss@peti.vn', Date.now());
  const token = server.store.createLoginLink(user.id, Date.now(), MINUTE);
  server.store.setBanned(user.id, true);
  assert.equal((await open(token)).status, 400);
  server.store.setBanned(user.id, false);
});

test('the command-line tool prints a link for an admin and refuses anyone else', async () => {
  const dir = mkdtempSync(path.join(tmpdir(), 'duavit-'));
  const env = { ...process.env, DB_PATH: path.join(dir, 'db.sqlite'), ADMIN_EMAILS: 'boss@peti.vn', PUBLIC_URL: 'https://duavit.peti.vn' };
  const run = (args) => promisify(execFile)(process.execPath, ['src/tools/admin-link.js', ...args], { env });
  try {
    const { stdout } = await run([]);
    const token = stdout.match(/https:\/\/duavit\.peti\.vn\/auth\/link\?token=([0-9a-f]{64})/)?.[1];
    assert.ok(token, stdout);
    const db = openDatabase(env.DB_PATH);
    assert.equal(db.prepare('SELECT COUNT(*) AS n FROM login_links').get().n, 1);
    assert.ok(!JSON.stringify(db.prepare('SELECT * FROM login_links').all()).includes(token), 'only the hash is stored');
    db.close();
    await assert.rejects(run(['stranger@example.com']), /không có trong ADMIN_EMAILS/);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
