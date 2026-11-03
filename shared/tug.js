// "Kéo co" (tug of war): two teams pull one rope. Each team's pull is the AVERAGE tap rate of its members (taps
// capped per member as in shared/tap.js, via the boat crews of shared/boat.js), so everyone has to pull and a
// big team gains nothing for its size. The rope's mark moves toward the team pulling harder; past a team's line
// that team wins. No hidden randomness.
import { RULES } from './catalog.js';

export const TUG = Object.freeze({
  winAt: 1, // the mark's distance from the middle (in rope units) at which a team has won
  pullPerSec: 0.12, // rope units a second when one team pulls flat out and the other not at all (~8 s to win)
  settle: 3, // how fast the rope's speed follows the pull (per second)
  drawWithin: 0.02, // at the time limit, a mark this close to the middle is a draw
  maxMs: 45000, // a pull lasts at most this long
});

/** The rope at rest in the middle. pos < 0: toward team 1 (left); pos > 0: toward team 2 (right). */
export const restingRope = () => ({ pos: 0, vel: 0 });

/** One fixed step: the mark drifts toward the stronger pull. Rates are taps a second (team averages). */
export function stepRope(rope, leftRate, rightRate, dtSec) {
  const left = Math.min(1, leftRate / RULES.tapFullRate);
  const right = Math.min(1, rightRate / RULES.tapFullRate);
  const target = (right - left) * TUG.pullPerSec;
  const vel = rope.vel + (target - rope.vel) * Math.min(1, TUG.settle * dtSec);
  const pos = Math.max(-TUG.winAt, Math.min(TUG.winAt, rope.pos + vel * dtSec));
  return { pos, vel };
}

/** 0 = left team (team 1) won, 1 = right team won, null = nobody yet (or a draw at the time limit). */
export function ropeWinner(rope, timedOut = false) {
  if (rope.pos <= -TUG.winAt) return 0;
  if (rope.pos >= TUG.winAt) return 1;
  if (!timedOut || Math.abs(rope.pos) < TUG.drawWithin) return null;
  return rope.pos < 0 ? 0 : 1;
}
