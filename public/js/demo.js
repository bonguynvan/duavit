import { ANIMALS, FACE_COLORS, MAPS, allowedAnimals, findMap, initialsOf, randomForm } from '/shared/catalog.js';
import { createRacer, packPosition, stepRacer } from '/shared/race.js';
import { RaceView } from './raceView.js';

const DEMO_NAMES = ['Mít', 'Bơ', 'Cốm', 'Na'];
const DEMO_TRACK = 140; // short track so the preview loops every ~25s
const COUNTDOWN_MS = 2000;
const RESULT_HOLD_MS = 3500;
const TICK_MS = 50;
const ME = 'demo-me';

const pick = (list) => list[Math.floor(Math.random() * list.length)];

/**
 * A purely local, looping practice race for the waiting room.
 * Uses the same physics + renderer as the real race, so players know what to expect.
 */
export class DemoRace {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ getMe: () => object | null, getMapId: () => string }} source
   */
  constructor(canvas, { getMe, getMapId }) {
    this.getMe = getMe;
    this.getMapId = getMapId;
    this.view = new RaceView(canvas, { highlightId: () => ME, focusId: () => ME, showNames: false, viewUnits: 40 });
    this.timer = null;
    this.round = null;
  }

  start() {
    if (this.timer) return;
    this.#newRound(Date.now());
    this.timer = setInterval(() => this.#tick(Date.now()), TICK_MS);
    this.view.start();
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
    this.view.stop();
  }

  #newRound(now) {
    const startsAt = now + COUNTDOWN_MS;
    const options = allowedAnimals(findMap(this.getMapId()));
    const rivals = DEMO_NAMES.map((name, i) => ({
      id: `demo-${i}`,
      name: `Bot ${name}`,
      animal: pick(options).id,
      color: FACE_COLORS[(i + 3) % FACE_COLORS.length],
      items: [],
    }));
    this.round = {
      phase: 'countdown',
      mapId: findMap(this.getMapId())?.id ?? MAPS[0].id,
      rivals,
      finishedAt: null,
      lastTick: now,
      race: {
        trackLength: DEMO_TRACK,
        startsAt,
        racers: [ME, ...rivals.map((r) => r.id)].map((id) => createRacer(id, randomForm(Math.random), startsAt)),
      },
    };
  }

  #players() {
    const me = this.getMe();
    const mine = me
      ? { id: ME, name: me.name, initials: me.initials, color: me.color, animal: me.animal, items: me.items ?? [] }
      : { id: ME, name: 'Bạn', initials: initialsOf('Bạn'), color: FACE_COLORS[0], animal: ANIMALS[0].id, items: [] };
    return [mine, ...this.round.rivals.map((r) => ({ ...r, initials: initialsOf(r.name) }))];
  }

  #tick(now) {
    const round = this.round;
    const dtSec = (now - round.lastTick) / 1000;
    round.lastTick = now;
    if (round.phase === 'countdown' && now >= round.race.startsAt) round.phase = 'racing';
    if (round.phase === 'racing') {
      const pack = packPosition(round.race.racers);
      const racers = round.race.racers.map((r) => stepRacer(r, dtSec, DEMO_TRACK, now, Math.random, pack));
      round.race = { ...round.race, racers };
      if (racers.every((r) => r.finishedAt !== null)) {
        round.phase = 'finished';
        round.finishedAt = now;
      }
    }
    if (round.phase === 'finished' && now - round.finishedAt > RESULT_HOLD_MS) this.#newRound(now);

    this.view.setState({
      phase: this.round.phase,
      mapId: this.round.mapId,
      serverNow: now,
      players: this.#players(),
      race: { ...this.round.race, mapId: this.round.mapId },
      results: null,
    });
  }
}
