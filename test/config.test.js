import { test } from 'node:test';
import assert from 'node:assert/strict';
import { productionProblems, productionWarnings } from '../src/config.js';

const good = { NODE_ENV: 'production', PUBLIC_URL: 'https://duavit.peti.vn', GOOGLE_CLIENT_ID: 'id', GOOGLE_CLIENT_SECRET: 'secret' };

test('production config is accepted when complete', () => {
  assert.deepEqual(productionProblems(good), []);
  assert.deepEqual(productionWarnings(good), []);
});

test('production refuses to start without an https PUBLIC_URL', () => {
  assert.equal(productionProblems({ ...good, PUBLIC_URL: '' }).length, 1);
  assert.equal(productionProblems({ ...good, PUBLIC_URL: 'http://duavit.peti.vn' }).length, 1);
});

test('production without Google credentials starts, with room creation closed and a warning', () => {
  for (const env of [{ ...good, GOOGLE_CLIENT_SECRET: '' }, { ...good, GOOGLE_CLIENT_ID: '', GOOGLE_CLIENT_SECRET: '' }]) {
    assert.deepEqual(productionProblems(env), [], 'quick race and the public pages still work');
    assert.equal(productionWarnings(env).length, 1);
  }
});

test('development needs nothing', () => {
  assert.deepEqual(productionProblems({}), []);
  assert.deepEqual(productionWarnings({}), []);
});
