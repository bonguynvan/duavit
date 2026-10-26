import { RULES, randomForm } from './catalog.js';

/** @typedef {() => number} Rng  returns a float in [0, 1) */

/**
 * @param {string} id
 * @param {number} multiplier hidden per-race random form
 * @param {number} now ms
 */
export function createRacer(id, multiplier, now) {
  return { id, multiplier, pos: 0, speed: 0, target: 0, event: null, nextChangeAt: now, finishedAt: null };
}

/** Pick the next random target speed (with rare bursts / stumbles). */
export function nextTarget(racer, now, rng) {
  const roll = rng();
  let event = null;
  let target = RULES.baseSpeed + (rng() * 2 - 1) * RULES.speedSpread;
  if (roll < RULES.burstChance) {
    event = 'burst';
    target *= RULES.burstFactor;
  } else if (roll < RULES.burstChance + RULES.stumbleChance) {
    event = 'stumble';
    target *= RULES.stumbleFactor;
  }
  const wait = RULES.changeMinMs + rng() * (RULES.changeMaxMs - RULES.changeMinMs);
  // Form drifts mid-race (second wind / running out of steam), so slow starters can come back.
  const multiplier = rng() < RULES.formShiftChance ? randomForm(rng) : racer.multiplier;
  return { ...racer, target: target * racer.multiplier, multiplier, event, nextChangeAt: now + wait };
}

/**
 * Speed factor that nudges stragglers up and runaway leaders down, so the race stays close.
 * Returns 1 (no effect) in the final sprint or when no pack position is known.
 */
export function catchUpFactor(pos, packPos, trackLength) {
  if (packPos === null || packPos === undefined) return 1;
  if (pos >= trackLength * (1 - RULES.finalSprintShare)) return 1;
  const gap = Math.max(-1, Math.min(1, (packPos - pos) / RULES.catchUpRangeM));
  return 1 + gap * RULES.catchUpStrength;
}

/** Median position of everyone still running (the "pack"). */
export function packPosition(racers) {
  const running = racers.filter((r) => r.finishedAt === null).map((r) => r.pos).sort((a, b) => a - b);
  return running.length === 0 ? null : running[Math.floor(running.length / 2)];
}

/**
 * Advance one physics step. `now` is the time at the end of the step (ms).
 * @param {Rng} rng
 * @param {number | null} [packPos] median position of the field (see packPosition)
 */
export function stepRacer(racer, dtSec, trackLength, now, rng, packPos = null) {
  if (racer.finishedAt !== null) return racer;
  const steered = now >= racer.nextChangeAt ? nextTarget(racer, now, rng) : racer;
  const blend = Math.min(1, RULES.accel * dtSec);
  const target = steered.target * catchUpFactor(steered.pos, packPos, trackLength);
  const speed = steered.speed + (target - steered.speed) * blend;
  const pos = steered.pos + speed * dtSec;
  if (pos < trackLength) return { ...steered, speed, pos };
  // Interpolate the exact crossing moment inside the step for fair timing.
  const overshootSec = speed > 0 ? (pos - trackLength) / speed : 0;
  return { ...steered, speed, pos: trackLength, event: null, finishedAt: now - overshootSec * 1000 };
}

/** Finished racers first (earliest time), then by distance covered. */
export function rankRacers(racers) {
  return [...racers].sort((a, b) => {
    if (a.finishedAt !== null && b.finishedAt !== null) return a.finishedAt - b.finishedAt;
    if (a.finishedAt !== null) return -1;
    if (b.finishedAt !== null) return 1;
    return b.pos - a.pos;
  });
}
