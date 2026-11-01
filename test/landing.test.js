import { test, after, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { OTHER_PAGES, TOOL_PAGES, escapeHtml, headTags, sitemapXml } from '../src/landing.js';
import { splitTeams } from '../shared/teams.js';
import { startServer } from '../src/server.js';

// CLAUDE.md "Wording": nothing that sounds like gambling, anywhere user-facing.
const BANNED = ['may rủi', 'may mắn', 'cầu may', 'giải thưởng', 'tiền thưởng', 'trúng thưởng', 'cược', 'bốc thăm', 'quay số'];

let server;
let url;
before(async () => {
  server = await startServer({ port: 0 });
  url = `http://127.0.0.1:${server.port}`;
});
after(() => server.close());

test('every use has its own address with the tool, a unique title, an h1 and a canonical', async () => {
  const titles = new Set();
  for (const page of TOOL_PAGES) {
    const res = await fetch(`${url}${page.path}`);
    assert.equal(res.status, 200, page.path);
    const html = await res.text();
    assert.match(html, /id="names"/, `${page.path} has the tool`);
    assert.ok(html.includes(`<h1>${escapeHtml(page.h1)}</h1>`), `${page.path} h1`);
    assert.ok(html.includes(`<link rel="canonical" href="${url}${page.path}">`), `${page.path} canonical`);
    assert.ok(html.includes('application/ld+json'), `${page.path} structured data`);
    assert.doesNotMatch(html, /<!--seo:/, `${page.path} has no markers left`);
    assert.ok(page.description.length >= 70 && page.description.length <= 170, `${page.path} description length ${page.description.length}`);
    titles.add(page.title);
  }
  assert.equal(titles.size, TOOL_PAGES.length, 'titles are unique');
  const teams = await (await fetch(`${url}/chia-doi-ngau-nhien`)).text();
  assert.match(teams, /id="teams"/, 'the team page asks how many teams');
  assert.doesNotMatch(await (await fetch(`${url}/dua-nhanh`)).text(), /id="teams"/);
});

test('the other public pages carry their own head tags; rooms are kept out of search', async () => {
  for (const page of OTHER_PAGES) {
    const html = await (await fetch(`${url}${page.path}`)).text();
    assert.ok(html.includes(`<title>${escapeHtml(page.title)}</title>`), page.path);
    assert.doesNotMatch(html, /<!--seo:/);
  }
  const robots = await (await fetch(`${url}/robots.txt`)).text();
  assert.match(robots, /Disallow: \/r\//);
  assert.match(robots, new RegExp(`Sitemap: ${url}/sitemap.xml`));
  const sitemap = await (await fetch(`${url}/sitemap.xml`)).text();
  for (const page of [...OTHER_PAGES, ...TOOL_PAGES]) assert.ok(sitemap.includes(`<loc>${url}${page.path}</loc>`), page.path);
  assert.equal((await fetch(`${url}/og.png`)).headers.get('content-type'), 'image/png');
});

test('structured data cannot break out of its tag', () => {
  const html = headTags('https://x.test', { path: '/', title: 't', description: '</script><script>alert(1)</script>' });
  assert.equal(html.match(/<\/script>/g).length, 1);
  assert.ok(sitemapXml('https://x.test').startsWith('<?xml'));
});

test('no gambling words in the pages or the landing copy', () => {
  const pages = readdirSync(new URL('../public/', import.meta.url))
    .filter((f) => f.endsWith('.html') && f !== 'terms.html'); // the terms forbid gambling by name
  const sources = [readFileSync(new URL('../src/landing.js', import.meta.url), 'utf8'),
    ...pages.map((f) => readFileSync(new URL(`../public/${f}`, import.meta.url), 'utf8'))];
  for (const text of sources) for (const word of BANNED) {
    const lower = text.toLowerCase().replace(/\/\/.*$/gm, '');
    assert.ok(!lower.includes(word), `found "${word}"`);
  }
});

test('teams: round and round, sizes differ by at most one', () => {
  assert.deepEqual(splitTeams(['a', 'b', 'c', 'd', 'e'], 2), [['a', 'c', 'e'], ['b', 'd']]);
  assert.equal(splitTeams(['a', 'b'], 5).length, 2);
  const sizes = splitTeams(Array.from({ length: 23 }, (_, i) => String(i)), 4).map((t) => t.length);
  assert.ok(Math.max(...sizes) - Math.min(...sizes) <= 1);
});
