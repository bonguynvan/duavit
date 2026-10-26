// Quick race: the whole race is simulated up-front from a seed (instant results, provably
// fair), then played back in real time for the RaceView. Pause just stops the clock.
import { FACE_COLORS, allowedAnimals, findMap, initialsOf, maxRaceMsFor, trackLengthFor } from '/shared/catalog.js';
import { rankRacers } from '/shared/race.js';
import { SIM_STEP_MS, simulateRace } from '/shared/simulate.js';
import { randomItems } from './fun.js';

const COUNTDOWN_MS = 3000;
const EVENTS = [null, 'burst', 'stumble'];
const eventCode = (event) => Math.max(0, EVENTS.indexOf(event));

/**
 * @param {{ names: string[], mapId: string, durationSec: number | null, character: string, seed: string, fun?: boolean }} config
 *   character: an animal id, or 'random' (cosmetic only: never affects the result)
 *   fun: random accessories (cosmetic only, Math.random, never the seed)
 */
export function prepareRace({ names, mapId, durationSec, character, seed, fun = false }) {
  const map = findMap(mapId);
  const trackLength = trackLengthFor(map, durationSec);
  const maxMs = maxRaceMsFor(trackLength);
  const ids = names.map((_, i) => `r${i}`);
  const options = allowedAnimals(map);
  const pick = () => options[Math.floor(Math.random() * options.length)].id;
  const players = names.map((name, i) => ({
    id: ids[i],
    name,
    initials: initialsOf(name),
    color: FACE_COLORS[i % FACE_COLORS.length],
    animal: character === 'random' || !options.some((a) => a.id === character) ? pick() : character,
    items: fun ? randomItems(Math.random) : [], // cosmetic, never from the seed
    spectator: false,
  }));

  const frames = [];
  const { racers } = simulateRace({
    seed,
    ids,
    trackLength,
    maxMs,
    onFrame: (sim) => frames.push({
      pos: Float32Array.from(sim.racers, (r) => r.pos),
      speed: Float32Array.from(sim.racers, (r) => r.speed),
      event: Uint8Array.from(sim.racers, (r) => eventCode(r.event)),
    }),
  });
  const finishMs = racers.map((r) => r.finishedAt); // relative to the start (sim starts at 0)
  const byId = new Map(players.map((p) => [p.id, p]));
  const results = rankRacers(racers).map((r, i) => ({
    id: r.id,
    rank: i + 1,
    name: byId.get(r.id).name,
    animal: byId.get(r.id).animal,
    color: byId.get(r.id).color,
    timeMs: r.finishedAt === null ? null : Math.round(r.finishedAt),
  }));
  return { mapId, trackLength, maxMs, ids, players, frames, finishMs, results, durationMs: frames.length * SIM_STEP_MS };
}

/** Real-time playback of a prepared race, producing RaceView-compatible state. */
export class Playback {
  constructor(race, { title = '' } = {}) {
    this.race = race;
    this.title = title;
    // Wall-clock start line. Stays fixed (RaceView treats a new startsAt as a new race);
    // only resuming from a pause pushes it back by the paused time.
    this.startsAt = Date.now() + COUNTDOWN_MS;
    this.pausedAt = null;
  }

  get paused() {
    return this.pausedAt !== null;
  }

  pause() {
    if (!this.paused) this.pausedAt = Date.now();
  }

  resume() {
    if (!this.paused) return;
    this.startsAt += Date.now() - this.pausedAt;
    this.pausedAt = null;
  }

  /** Milliseconds since the start line, excluding pauses (negative during the countdown). */
  elapsed() {
    return (this.paused ? this.pausedAt : Date.now()) - this.startsAt;
  }

  /** @returns {object} state shaped like the server's snapshot */
  state() {
    const { race } = this;
    const elapsed = this.elapsed();
    const finished = elapsed >= race.durationMs;
    const phase = elapsed < 0 ? 'countdown' : finished ? 'finished' : 'racing';
    const now = Date.now();
    const frame = race.frames[Math.min(race.frames.length - 1, Math.max(0, Math.floor(elapsed / SIM_STEP_MS)))];
    const racers = race.ids.map((id, i) => {
      const done = race.finishMs[i] !== null && race.finishMs[i] <= elapsed;
      return {
        id,
        pos: elapsed < 0 ? 0 : frame.pos[i],
        speed: elapsed < 0 || this.paused ? 0 : frame.speed[i],
        event: EVENTS[frame.event[i]],
        finishedAt: done ? this.startsAt + race.finishMs[i] : null,
      };
    });
    return {
      phase,
      mapId: race.mapId,
      serverNow: now,
      title: this.title,
      players: race.players,
      results: finished ? race.results : null,
      race: { mapId: race.mapId, trackLength: race.trackLength, startsAt: this.startsAt, paused: this.paused, pausedAt: this.pausedAt, racers },
    };
  }
}
