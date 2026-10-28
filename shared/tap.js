// "Bấm để chạy" races: each racer's speed follows how fast its player taps (taps counted over the last
// second, at most RULES.tapMaxRate a second so an auto-clicker gains nothing over a quick thumb).
// No hidden randomness: the result is the players' own doing, so these races carry no seed/fairness proof.
import { RULES } from './catalog.js';

/** Top speed (units/s), reached at RULES.tapFullRate taps a second. */
export const TAP_TOP_SPEED = RULES.baseSpeed * RULES.tapSpeedFactor;

/** Track length for a tap race: a full-speed tapper needs about RULES.tapRaceSec seconds. */
export const tapTrackLength = () => Math.round(TAP_TOP_SPEED * RULES.tapRaceSec);

/** Nobody tapping? The race still ends after this long (ranked by distance). */
export const tapMaxRaceMs = () => RULES.tapRaceSec * 1000 * 3;

export function createTapRacer(id, now, botRate = null) {
  return { id, pos: 0, speed: 0, event: null, finishedAt: null, taps: [], botRate, startedAt: now };
}

/**
 * A tap from the racer's player. At most RULES.tapMaxRate count per second: the cap is on the count over the
 * window, not on the gap between two taps, because taps from a phone often arrive bunched up by the network.
 * @returns the racer (unchanged when the tap didn't count)
 */
export function addTap(racer, now) {
  if (racer.finishedAt !== null) return racer;
  const recent = racer.taps.filter((t) => now - t < RULES.tapWindowMs);
  if (recent.length >= RULES.tapMaxRate * (RULES.tapWindowMs / 1000)) return racer;
  return { ...racer, taps: [...recent, now] };
}

/** Taps per second around time `now` (a bot taps at its own rate, wobbling a little). */
export function tapRate(racer, now) {
  if (racer.botRate !== null) return Math.max(0, racer.botRate + Math.sin((now - racer.startedAt) / 900 + racer.botRate) * 1.2);
  return racer.taps.filter((t) => t <= now && now - t < RULES.tapWindowMs).length * (1000 / RULES.tapWindowMs);
}

/** One fixed physics step; `now` is the time at the end of the step (ms). */
export function stepTapRacer(racer, dtSec, trackLength, now) {
  if (racer.finishedAt !== null) return racer;
  const rate = tapRate(racer, now);
  const target = TAP_TOP_SPEED * Math.min(1, rate / RULES.tapFullRate);
  const speed = racer.speed + (target - racer.speed) * Math.min(1, RULES.tapAccel * dtSec);
  const event = rate >= RULES.tapFullRate ? 'burst' : null; // flat out: the same flames as a random burst
  const taps = racer.taps.length > 0 && now - racer.taps[0] >= RULES.tapWindowMs ? racer.taps.filter((t) => now - t < RULES.tapWindowMs) : racer.taps;
  const pos = racer.pos + speed * dtSec;
  if (pos < trackLength) return { ...racer, speed, pos, event, taps };
  const overshootSec = speed > 0 ? (pos - trackLength) / speed : 0;
  return { ...racer, speed, pos: trackLength, event: null, taps, finishedAt: now - overshootSec * 1000 };
}

/** Shift every timestamp after a pause, so the pause doesn't count. */
export const shiftTapRacer = (racer, ms) => ({
  ...racer,
  taps: racer.taps.map((t) => t + ms),
  startedAt: racer.startedAt + ms,
  finishedAt: racer.finishedAt === null ? null : racer.finishedAt + ms,
});
