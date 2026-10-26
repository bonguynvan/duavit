// Fixed-step race simulation. The server, the quick-race page and the verifier all use
// this, so a given (seed, racer count, track length) always produces the same race.
import { RULES, randomForm } from './catalog.js';
import { createRacer, packPosition, stepRacer } from './race.js';
import { rngFromSeed } from './fair.js';

export const SIM_STEP_MS = 50;

/**
 * Start a race. Racers draw their hidden form from the seeded rng in entrant order.
 * @param {{ seed: string, ids: string[], trackLength: number, startsAt?: number }} opts
 */
export function createSimulation({ seed, ids, trackLength, startsAt = 0 }) {
  const rng = rngFromSeed(seed);
  return {
    rng,
    trackLength,
    simTime: startsAt,
    racers: ids.map((id) => createRacer(id, randomForm(rng), startsAt)),
  };
}

/** Advance exactly one fixed step (pure: returns a new simulation state). */
export function stepSimulation(sim) {
  const simTime = sim.simTime + SIM_STEP_MS;
  const pack = packPosition(sim.racers);
  const racers = sim.racers.map((r) => stepRacer(r, SIM_STEP_MS / 1000, sim.trackLength, simTime, sim.rng, pack));
  return { ...sim, simTime, racers };
}

export const allFinished = (sim) => sim.racers.every((r) => r.finishedAt !== null);

/**
 * Run a whole race in one go (quick race + verification).
 * `onFrame(sim)` (optional) sees every step, e.g. to record positions for playback.
 * @returns {{ racers: object[], durationMs: number }}
 */
export function simulateRace({ seed, ids, trackLength, maxMs = RULES.maxRaceMs, onFrame }) {
  let sim = createSimulation({ seed, ids, trackLength });
  while (!allFinished(sim) && sim.simTime < maxMs) {
    sim = stepSimulation(sim);
    if (onFrame) onFrame(sim);
  }
  return { racers: sim.racers, durationMs: sim.simTime };
}
