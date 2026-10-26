import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RULES } from '../shared/catalog.js';
import { catchUpFactor, createRacer, nextTarget, packPosition, rankRacers, stepRacer } from '../shared/race.js';
import { fixedRng, seededRng } from './helpers.js';

test('createRacer starts at the line, standing still', () => {
  const r = createRacer('a', 1, 1000);
  assert.deepEqual({ pos: r.pos, speed: r.speed, finishedAt: r.finishedAt, nextChangeAt: r.nextChangeAt }, { pos: 0, speed: 0, finishedAt: null, nextChangeAt: 1000 });
});

test('nextTarget picks a burst when the roll is below burstChance', () => {
  const r = nextTarget(createRacer('a', 1, 0), 0, fixedRng(0, 0.5, 0));
  assert.equal(r.event, 'burst');
  assert.equal(r.target, RULES.baseSpeed * RULES.burstFactor);
  assert.equal(r.nextChangeAt, RULES.changeMinMs);
});

test('nextTarget picks a stumble right above burstChance', () => {
  const r = nextTarget(createRacer('a', 1, 0), 0, fixedRng(RULES.burstChance + 0.001, 0.5, 1));
  assert.equal(r.event, 'stumble');
  assert.equal(r.target, RULES.baseSpeed * RULES.stumbleFactor);
  assert.equal(r.nextChangeAt, RULES.changeMaxMs);
});

test('nextTarget normal roll stays within base +/- spread, scaled by form', () => {
  const low = nextTarget(createRacer('a', 1.1, 0), 0, fixedRng(0.9, 0, 0.5));
  const high = nextTarget(createRacer('a', 1, 0), 0, fixedRng(0.9, 0.999999, 0.5));
  assert.equal(low.event, null);
  assert.ok(Math.abs(low.target - (RULES.baseSpeed - RULES.speedSpread) * 1.1) < 1e-9);
  assert.ok(high.target <= RULES.baseSpeed + RULES.speedSpread);
});

test('stepRacer does not mutate its input', () => {
  const r = createRacer('a', 1, 0);
  const snapshot = { ...r };
  stepRacer(r, 0.05, 100, 50, seededRng());
  assert.deepEqual(r, snapshot);
});

test('stepRacer only re-rolls the target once the change time is reached', () => {
  const rng = seededRng(1);
  const first = stepRacer(createRacer('a', 1, 0), 0.05, 100, 50, rng);
  const target = first.target;
  const second = stepRacer(first, 0.05, 100, 100, () => { throw new Error('rng should not be used'); });
  assert.equal(second.target, target);
  assert.ok(second.speed > first.speed);
});

test('stepRacer finishes with an interpolated crossing time', () => {
  const racer = { ...createRacer('a', 1, 0), pos: 99, speed: 10, target: 10, nextChangeAt: 1e9 };
  const done = stepRacer(racer, 0.2, 100, 1000, seededRng());
  assert.equal(done.pos, 100);
  // 1 unit left at 10 u/s = 100ms into a 200ms step -> crossed 100ms before `now`.
  assert.ok(Math.abs(done.finishedAt - 900) < 1e-6);
  assert.equal(stepRacer(done, 0.2, 100, 1200, seededRng()), done);
});

test('a full random race finishes everyone in a sensible time', () => {
  const rng = seededRng(7);
  let racers = Array.from({ length: 12 }, (_, i) => createRacer(String(i), 1, 0));
  let now = 0;
  while (racers.some((r) => r.finishedAt === null) && now < RULES.maxRaceMs) {
    now += 50;
    racers = racers.map((r) => stepRacer(r, 0.05, 100, now, rng));
  }
  const times = racers.map((r) => r.finishedAt);
  assert.ok(times.every((t) => t !== null), 'everyone finished');
  assert.ok(Math.min(...times) > 6000 && Math.max(...times) < 25000, `times ${Math.min(...times)}..${Math.max(...times)}`);
  assert.ok(new Set(times.map((t) => Math.round(t))).size > 6, 'races are not decided identically');
});

test('rankRacers orders finishers by time, then the rest by distance', () => {
  const ranked = rankRacers([
    { id: 'slow', pos: 40, finishedAt: null },
    { id: 'second', pos: 100, finishedAt: 2000 },
    { id: 'far', pos: 80, finishedAt: null },
    { id: 'first', pos: 100, finishedAt: 1500 },
  ]);
  assert.deepEqual(ranked.map((r) => r.id), ['first', 'second', 'far', 'slow']);
});

test('hidden form can shift mid-race so the order changes', () => {
  const shifted = nextTarget(createRacer('a', 1.15, 0), 0, fixedRng(0.9, 0.5, 0.5, 0, 0));
  assert.equal(shifted.multiplier, 1 - RULES.formSpread);
  const kept = nextTarget(createRacer('a', 1.15, 0), 0, fixedRng(0.9, 0.5, 0.5, 0.99));
  assert.equal(kept.multiplier, 1.15);

  // Over many seeded races, the leader at the 1/3 mark should not always win.
  let comebacks = 0;
  for (let seed = 1; seed <= 40; seed += 1) {
    const rng = seededRng(seed);
    let racers = Array.from({ length: 6 }, (_, i) => createRacer(String(i), 1, 0));
    let now = 0;
    let earlyLeader = null;
    while (racers.some((r) => r.finishedAt === null)) {
      now += 50;
      racers = racers.map((r) => stepRacer(r, 0.05, 300, now, rng));
      if (!earlyLeader && racers.some((r) => r.pos >= 100)) earlyLeader = rankRacers(racers)[0].id;
    }
    if (rankRacers(racers)[0].id !== earlyLeader) comebacks += 1;
  }
  assert.ok(comebacks >= 10, `only ${comebacks}/40 comebacks`);
});

test('catchUpFactor nudges stragglers up, leaders down, and stays out of the final sprint', () => {
  const len = 600;
  assert.equal(catchUpFactor(100, null, len), 1);
  assert.equal(catchUpFactor(100, 100, len), 1);
  assert.equal(catchUpFactor(100, 100 + RULES.catchUpRangeM, len), 1 + RULES.catchUpStrength);
  assert.equal(catchUpFactor(100 + RULES.catchUpRangeM * 5, 100, len), 1 - RULES.catchUpStrength, 'clamped');
  assert.equal(catchUpFactor(len * (1 - RULES.finalSprintShare), 0, len), 1, 'final sprint is pure luck');
});

test('packPosition is the median of racers still running', () => {
  const r = (pos, finishedAt = null) => ({ pos, finishedAt });
  assert.equal(packPosition([r(10), r(50), r(30)]), 30);
  assert.equal(packPosition([r(600, 1), r(20), r(40)]), 40);
  assert.equal(packPosition([r(600, 1)]), null);
});

test('races stay close and every starting slot wins about equally often', () => {
  const N = 6;
  const RUNS = 300;
  const wins = new Array(N).fill(0);
  let spreadTotal = 0;
  const rng = seededRng(2026);
  for (let run = 0; run < RUNS; run += 1) {
    let racers = Array.from({ length: N }, (_, i) => createRacer(String(i), 1, 0));
    let now = 0;
    while (racers.some((r) => r.finishedAt === null)) {
      now += 50;
      const pack = packPosition(racers);
      racers = racers.map((r) => stepRacer(r, 0.05, 300, now, rng, pack));
    }
    wins[Number(rankRacers(racers)[0].id)] += 1;
    const times = racers.map((r) => r.finishedAt);
    spreadTotal += Math.max(...times) - Math.min(...times);
  }
  assert.ok(spreadTotal / RUNS < 6000, `avg finish spread ${Math.round(spreadTotal / RUNS)}ms`);
  wins.forEach((w, i) => assert.ok(w > RUNS / N / 2 && w < (RUNS / N) * 1.6, `slot ${i} won ${w}/${RUNS}`));
});
