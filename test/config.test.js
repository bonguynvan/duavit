import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productionProblems } from '../src/config.js';

const good = { NODE_ENV: 'production', PUBLIC_URL: 'https://duavit.peti.vn', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' };

test('production config is accepted when complete', () => {
  assert.deepEqual(productionProblems(good), []);
});

test('production refuses to start without an https PUBLIC_URL or Google credentials', () => {
  assert.equal(productionProblems({ ...good, PUBLIC_URL: '' }).length, 1);
  assert.equal(productionProblems({ ...good, PUBLIC_URL: 'http://duavit.peti.vn' }).length, 1);
  assert.equal(productionProblems({ ...good, GOOGLE_CLIENT_SECRET: '' }).length, 1);
});

test('development needs nothing', () => {
  assert.deepEqual(productionProblems({}), []);
});
