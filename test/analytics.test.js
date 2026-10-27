import { after, before, test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanLocation, isGa4Id } from '../shared/analyticsUrl.js';
import { startServer } from '../src/server.js';

test('page views never carry host keys, room codes, queries or hashes', () => {
  assert.equal(cleanLocation('https://duavit.peti.vn/r/K4ATEA/host?key=abc123'), 'https://duavit.peti.vn/r/:code/host');
  assert.equal(cleanLocation('https://duavit.peti.vn/r/K4ATEA'), 'https://duavit.peti.vn/r/:code');
  assert.equal(cleanLocation('https://duavit.peti.vn/dua-nhanh?x=1#top'), 'https://duavit.peti.vn/dua-nhanh');
  assert.equal(cleanLocation('https://duavit.peti.vn/'), 'https://duavit.peti.vn/');
});

test('only well-formed GA4 measurement ids are accepted', () => {
  assert.ok(isGa4Id('G-ABC123XYZ9'));
  for (const bad of ['', 'UA-12345-1', 'G-', 'g-abc123', 'G-ABC"; alert(1)//', undefined, 42]) assert.equal(isGa4Id(bad), false, String(bad));
});

let off;
let on;
before(async () => {
  off = await startServer({ port: 0 });
  on = await startServer({ port: 0, ga4Id: 'G-TEST12345' });
});
after(async () => {
  await off.close();
  await on.close();
});

const get = (server, path) => fetch(`http://127.0.0.1:${server.port}${path}`);

test('without GA4_ID nothing about Google Analytics reaches the browser', async () => {
  const res = await get(off, '/analytics-config.js');
  assert.match(res.headers.get('content-type'), /javascript/);
  assert.equal((await res.text()).trim(), 'export const GA4_ID = null;');
  assert.doesNotMatch(res.headers.get('content-security-policy'), /google-analytics|googletagmanager/);
});

test('with GA4_ID the id is served and the CSP allows exactly Google Analytics', async () => {
  const res = await get(on, '/analytics-config.js');
  assert.equal((await res.text()).trim(), 'export const GA4_ID = "G-TEST12345";');
  const csp = (await get(on, '/')).headers.get('content-security-policy');
  assert.match(csp, /script-src 'self' https:\/\/www\.googletagmanager\.com/);
  assert.match(csp, /connect-src [^;]*https:\/\/\*\.google-analytics\.com/);
  assert.doesNotMatch(csp, /unsafe-inline/);
});

test('a malformed GA4_ID is ignored', async () => {
  const bad = await startServer({ port: 0, ga4Id: 'G-"x' });
  try {
    assert.equal((await get(bad, '/analytics-config.js').then((r) => r.text())).trim(), 'export const GA4_ID = null;');
  } finally {
    await bad.close();
  }
});
