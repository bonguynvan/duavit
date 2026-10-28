// "Bấm để chạy" rooms: tapping drives the racer, the server caps the tap rate, bots tap on their own.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { Room } from '../src/game/room.js';
import { RULES } from '../shared/catalog.js';
import { TAP_TOP_SPEED, addTap, createTapRacer, stepTapRacer, tapRate, tapTrackLength } from '../shared/tap.js';
import { SIM_STEP_MS } from '../shared/simulate.js';
import { seededRng } from './helpers.js';

const STEP = SIM_STEP_MS;

/** Tap `rate` times a second for `ms`, stepping the physics as we go. */
function mash(racer, from, ms, rate, trackLength = 10000) {
  let r = racer;
  let nextTap = from;
  for (let t = from + STEP; t <= from + ms; t += STEP) {
    while (rate > 0 && nextTap <= t) {
      r = addTap(r, nextTap);
      nextTap += 1000 / rate;
    }
    r = stepTapRacer(r, STEP / 1000, trackLength, t);
  }
  return r;
}

test('tapping faster runs faster, up to top speed; no taps, no running', () => {
  const idle = mash(createTapRacer('a', 0), 0, 3000, 0);
  assert.equal(idle.pos, 0);
  const slow = mash(createTapRacer('a', 0), 0, 3000, 3);
  const quick = mash(createTapRacer('a', 0), 0, 3000, RULES.tapFullRate);
  assert.ok(quick.pos > slow.pos * 2, 'a quick thumb beats a lazy one');
  assert.ok(Math.abs(quick.speed - TAP_TOP_SPEED) < 1, 'flat out = top speed');
  assert.equal(quick.event, 'burst', 'flames when flat out');
  // Stop tapping: the racer slows down.
  const stopped = mash(quick, 3000, 2000, 0);
  assert.ok(stopped.speed < 1);
});

test('an auto-clicker gains next to nothing over a quick thumb', () => {
  const ms = RULES.tapRaceSec * 1000;
  const capped = mash(createTapRacer('a', 0), 0, ms, RULES.tapMaxRate);
  const bot = mash(createTapRacer('a', 0), 0, ms, 60);
  // Only a quicker first second (it fills the 1 s window sooner); top speed is the same.
  assert.ok(bot.pos - capped.pos < capped.pos * 0.02, `${bot.pos} vs ${capped.pos}`);
  assert.ok(tapRate(bot, ms) <= RULES.tapMaxRate);
  assert.equal(bot.speed, capped.speed);
});

test('rooms tap by default; the host can pick random, only in the lobby', () => {
  const room = new Room({ rng: seededRng(2) });
  assert.equal(room.snapshot(0).mode, 'tap');
  assert.ok(room.setMode('dice').error);
  assert.ok(room.setMode('random').ok);
  assert.ok(room.setMode('tap').ok);
  room.join('An', 'duck');
  room.join('Bình', 'cat');
  room.start(0);
  assert.ok(room.setMode('random').error, 'not mid-race');
});

test('a tap race: the phone that taps wins, taps only count while racing, no fairness proof', () => {
  const room = new Room({ rng: seededRng(4) });
  const a = room.join('An', 'duck').player;
  const b = room.join('Bình', 'cat').player;
  assert.ok(room.start(0).ok);
  assert.equal(room.snapshot(0).race.fairness, null, 'nothing to verify: the players decide it');
  assert.equal(room.tap(a.id, 100), false, 'no tapping during the countdown');
  let now = RULES.countdownMs;
  room.tick(now);
  assert.equal(room.phase, 'racing');
  // A taps flat out, B taps slowly.
  while (room.phase === 'racing' && now < RULES.countdownMs + 60000) {
    now += STEP;
    if (now % 100 === 0) room.tap(a.id, now); // 10 a second: flat out
    if (now % 500 === 0) room.tap(b.id, now);
    room.tick(now);
  }
  assert.equal(room.phase, 'finished');
  assert.equal(room.results[0].id, a.id);
  assert.ok(room.results[0].timeMs < RULES.tapRaceSec * 1000 * 1.3, `about ${RULES.tapRaceSec}s flat out, got ${room.results[0].timeMs}`);
  assert.equal(room.race.trackLength, tapTrackLength());
  assert.equal(room.tap('nobody', now), false);
});

test('bots tap on their own; names the host typed in only race in random mode', () => {
  const room = new Room({ rng: seededRng(7) });
  room.addBot();
  room.addBot();
  room.addManual('Không điện thoại', 'dog');
  room.start(0);
  assert.equal(room.race.racers.length, 2, 'the typed-in name waits for a random race');
  let now = 0;
  while (room.phase !== 'finished' && now < 120000) room.tick((now += STEP));
  assert.equal(room.phase, 'finished');
  assert.ok(room.results.every((r) => r.timeMs !== null), 'bots reach the line');
  room.backToLobby();
  room.setMode('random');
  room.start(now);
  assert.equal(room.race.racers.length, 3);
});

test('pausing a tap race freezes it and the pause never counts', () => {
  const room = new Room({ rng: seededRng(3) });
  room.addBot();
  room.addBot();
  room.start(0);
  let now = RULES.countdownMs + 2000;
  room.tick(now);
  const before = room.race.racers.map((r) => r.pos);
  room.pauseRace(now);
  room.tick(now + 5000);
  assert.deepEqual(room.race.racers.map((r) => r.pos), before);
  room.resumeRace(now + 5000);
  now += 5000;
  room.tick(now + 1000);
  assert.ok(room.race.racers.every((r, i) => r.pos > before[i]));
});

test('taps that arrive bunched up (network jitter) still count, up to the cap', () => {
  // Eight taps a second, delivered two at a time 5 ms apart.
  let r = createTapRacer('a', 0);
  for (let t = 0; t < 1000; t += 250) {
    r = addTap(r, t);
    r = addTap(r, t + 5);
  }
  assert.equal(r.taps.length, 8);
  // Twenty in the same second: only the cap counts.
  let flood = createTapRacer('b', 0);
  for (let i = 0; i < 20; i += 1) flood = addTap(flood, i * 10);
  assert.equal(flood.taps.length, RULES.tapMaxRate);
});

test('restarting after a switch to tap mode leaves out names the host typed in', () => {
  const room = new Room({ rng: seededRng(5), mode: 'random' });
  room.addBot();
  room.addBot();
  room.addManual('Không điện thoại', 'dog');
  room.start(0);
  assert.equal(room.race.racers.length, 3);
  let now = 0;
  while (room.phase !== 'finished' && now < 600000) room.tick((now += STEP));
  assert.equal(room.phase, 'finished');
  assert.ok(room.setMode('tap').ok, 'between races');
  assert.ok(room.restartRace(now).ok);
  assert.equal(room.race.mode, 'tap');
  assert.equal(room.race.racers.length, 2, 'the typed-in name waits for a random race');
});
