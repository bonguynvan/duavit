import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isSeed, newSeed, rngFromSeed, sha256Hex } from '../shared/fair.js';
import { createSimulation, simulateRace, stepSimulation, SIM_STEP_MS } from '../shared/simulate.js';
import { rankRacers } from '../shared/race.js';

const SEED_A = 'a'.repeat(64);
const SEED_B = '0123456789abcdef'.repeat(4);

test('seeds are 64 lowercase hex chars; newSeed makes fresh ones', () => {
  assert.ok(isSeed(SEED_A));
  assert.ok(!isSeed('A'.repeat(64)));
  assert.ok(!isSeed('a'.repeat(63)));
  const a = newSeed();
  const b = newSeed();
  assert.ok(isSeed(a) && isSeed(b));
  assert.notEqual(a, b);
});

test('rngFromSeed is deterministic, seed-sensitive and roughly uniform', () => {
  const take = (seed) => Array.from({ length: 5 }, rngFromSeed(seed));
  assert.deepEqual(take(SEED_A), take(SEED_A));
  assert.notDeepEqual(take(SEED_A), take(SEED_B));
  const rng = rngFromSeed(SEED_B);
  const buckets = new Array(10).fill(0);
  for (let i = 0; i < 20000; i += 1) buckets[Math.floor(rng() * 10)] += 1;
  buckets.forEach((n) => assert.ok(n > 1800 && n < 2200, `bucket ${n}`));
  assert.throws(() => rngFromSeed('nope'));
});

test('sha256Hex matches Node crypto (what the browser verifier computes)', async () => {
  assert.equal(await sha256Hex(SEED_A), createHash('sha256').update(SEED_A).digest('hex'));
});

test('the same seed replays the exact same race', () => {
  const ids = Array.from({ length: 30 }, (_, i) => `r${i}`);
  const a = simulateRace({ seed: SEED_A, ids, trackLength: 300 });
  const b = simulateRace({ seed: SEED_A, ids, trackLength: 300 });
  assert.deepEqual(a.racers.map((r) => r.finishedAt), b.racers.map((r) => r.finishedAt));
  const c = simulateRace({ seed: SEED_B, ids, trackLength: 300 });
  assert.notDeepEqual(rankRacers(a.racers).map((r) => r.id), rankRacers(c.racers).map((r) => r.id));
});

test('step-by-step simulation equals the one-shot run (server vs verifier)', () => {
  const ids = ['x', 'y', 'z'];
  let sim = createSimulation({ seed: SEED_B, ids, trackLength: 120 });
  while (sim.racers.some((r) => r.finishedAt === null)) sim = stepSimulation(sim);
  const oneShot = simulateRace({ seed: SEED_B, ids, trackLength: 120 });
  assert.deepEqual(sim.racers.map((r) => r.finishedAt), oneShot.racers.map((r) => r.finishedAt));
  assert.equal(sim.simTime % SIM_STEP_MS, 0);
});

test('hundreds of racers finish and the order is not fixed by entry position', () => {
  const ids = Array.from({ length: 300 }, (_, i) => String(i));
  const { racers } = simulateRace({ seed: SEED_A, ids, trackLength: 240 });
  assert.ok(racers.every((r) => r.finishedAt !== null));
  const winners = new Set();
  for (let s = 0; s < 20; s += 1) {
    const seed = s.toString(16).padStart(2, '0').repeat(32);
    winners.add(rankRacers(simulateRace({ seed, ids: ids.slice(0, 10), trackLength: 160 }).racers)[0].id);
  }
  assert.ok(winners.size >= 5, `only ${winners.size} distinct winners over 20 seeds`);
});
