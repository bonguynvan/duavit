import { createHash, randomBytes } from 'node:crypto';
import { ANIMALS, FACE_COLORS, MAPS, REACTIONS, RULES, allowedAnimals, animalForMap, findAnimal, findItem, findMap, initialsOf, isAnimalAllowed as isAnimalAllowedHere, isEverydayPick, maxRaceMsFor, trackLengthFor, withCast } from '../../shared/catalog.js';
import { rankRacers } from '../../shared/race.js';
import { newSeed } from '../../shared/fair.js';
import { SIM_STEP_MS, createSimulation, stepSimulation } from '../../shared/simulate.js';
import { sanitizeText } from '../text.js';

const BOT_NAMES = ['Bông', 'Mít', 'Su Su', 'Bắp', 'Tôm', 'Kem', 'Na', 'Cốm', 'Xoài', 'Mochi'];

export const PHASES = Object.freeze({ LOBBY: 'lobby', COUNTDOWN: 'countdown', RACING: 'racing', FINISHED: 'finished' });

/** Returns a cleaned name or null when invalid. */
const RESERVED_NAME = /^\W*(host|admin|mc)\W*$/iu;

export const sanitizeName = (raw) => {
  const name = sanitizeText(raw, { maxLength: RULES.nameMaxLength, requireLetter: true });
  return name && !name.startsWith('📢') && !RESERVED_NAME.test(name) ? name : null;
};

const newId = () => randomBytes(6).toString('hex');
const newToken = () => randomBytes(16).toString('hex');

export class Room {
  /** @param {{ rng?: () => number }} [opts] */
  /**
   * @param {{ rng?: () => number, seedSource?: () => string }} [opts]
   *   rng: lobby randomness (bots, stand-in characters); seedSource: one secret seed per race.
   */
  constructor({ rng = Math.random, seedSource = newSeed } = {}) {
    this.rng = rng;
    this.seedSource = seedSource;
    this.phase = PHASES.LOBBY;
    this.mapId = MAPS[0].id;
    /** @type {Map<string, object>} */
    this.players = new Map();
    this.race = null;
    this.results = null;
    this.colorCursor = 0;
    this.botCursor = 0;
    this.joinSeq = 0;
    this.title = '';
    this.durationSec = null; // null = the map's default length
    this.allowSpecialMaps = false; // 30/4-themed maps stay hidden unless the host opts in
    this.allCharacters = false; // host switch: every character of every map may race on this room's maps
    /** name -> lastRacedAt of players who left, so leave+rejoin can't jump the queue */
    this.recentRacers = new Map();
    this.lastTickAt = null;
  }

  get playerCount() {
    return this.players.size;
  }

  #nextColor() {
    const color = FACE_COLORS[this.colorCursor % FACE_COLORS.length];
    this.colorCursor += 1;
    return color;
  }

  #addPlayer(fields) {
    const player = {
      id: newId(),
      token: newToken(),
      color: this.#nextColor(),
      connected: true,
      disconnectedAt: null,
      isBot: false,
      items: [],
      joinSeq: this.joinSeq++,
      lastRacedAt: null, // drives fair rotation when more people wait than there are slots
      lastThrowAt: -Infinity,
      lastReactAt: -Infinity,
      spectator: false, // watches + chats, never takes a race slot
      ...fields,
    };
    this.players.set(player.id, player);
    return player;
  }

  #update(id, fields) {
    const player = this.players.get(id);
    if (!player) return null;
    const next = { ...player, ...fields };
    this.players.set(id, next);
    return next;
  }

  join(rawName, animalId, { spectator = false } = {}) {
    const name = sanitizeName(rawName);
    if (!name) return { error: `Tên phải từ 1 đến ${RULES.nameMaxLength} ký tự` };
    if (!findAnimal(animalId)) return { error: 'Nhân vật không hợp lệ' };
    const humans = [...this.players.values()].filter((p) => !p.isBot).length;
    if (humans >= RULES.maxPlayers) return { error: 'Phòng đã đầy' };
    const lastRacedAt = this.recentRacers.get(name.toLowerCase()) ?? null;
    // homeAnimal = their own pick; animal = what they ride on the current map (vehicle-only maps swap it).
    const animal = animalForMap(this.#map(), animalId, this.joinSeq);
    return { player: this.#addPlayer({ name, animal, homeAnimal: animalId, spectator: Boolean(spectator), lastRacedAt }) };
  }

  resume(token) {
    if (typeof token !== 'string') return null;
    const player = [...this.players.values()].find((p) => !p.isBot && p.token === token);
    if (!player) return null;
    return this.#update(player.id, { connected: true, disconnectedAt: null });
  }

  disconnect(id, now) {
    return this.#update(id, { connected: false, disconnectedAt: now });
  }

  setAnimal(id, animalId) {
    if (!findAnimal(animalId)) return { error: 'Nhân vật không hợp lệ' };
    if (this.#isRacing(id)) return { error: 'Đang đua, đổi sau nhé' };
    const map = this.#map();
    if (animalForMap(map, animalId) !== animalId) {
      const names = allowedAnimals(map).map((a) => a.name.toLowerCase());
      return { error: `Map ${map.name} chỉ cho chọn ${names.slice(0, -1).join(', ')} hoặc ${names.at(-1)}` };
    }
    // A themed pick (Ông Lân on the Tết map) never replaces the character other maps give back.
    // `chosen` marks a themed pick the player made themselves (vs. a stand-in the map handed out).
    const player = this.#update(id, isEverydayPick(map, animalId) ? { animal: animalId, homeAnimal: animalId, chosen: false } : { animal: animalId, chosen: true });
    return player ? { player } : { error: 'Không tìm thấy người chơi' };
  }

  setSpectator(id, spectator) {
    const target = this.players.get(id);
    if (target?.isBot || target?.isManual) return { error: 'Người do host thêm không làm khán giả được' };
    if (this.#isRacing(id)) return { error: 'Đang đua, đổi sau nhé' };
    const player = this.#update(id, { spectator: Boolean(spectator) });
    return player ? { player } : { error: 'Không tìm thấy người chơi' };
  }

  /** Replace a player's cosmetic accessories (free, max RULES.maxItems, purely visual). */
  setItems(id, itemIds) {
    if (!Array.isArray(itemIds)) return { error: 'Danh sách đồ không hợp lệ' };
    const unique = [...new Set(itemIds)];
    if (unique.length > RULES.maxItems) return { error: `Tối đa ${RULES.maxItems} món` };
    if (!unique.every((itemId) => findItem(itemId))) return { error: 'Món đồ không tồn tại' };
    const player = this.#update(id, { items: unique });
    return player ? { player } : { error: 'Không tìm thấy người chơi' };
  }

  /**
   * Visual-only projectile: picks the racer just ahead (or behind, for the leader).
   * @returns {{ fx: { type: 'throw', item: string, from: string, to: string, at: number } } | { error: string }}
   */
  throwItem(id, itemId, now) {
    if (this.phase !== PHASES.RACING || this.race.paused) return { error: 'Chỉ ném được khi đang đua' };
    const player = this.players.get(id);
    const me = this.race.racers.find((r) => r.id === id);
    if (!player || !me) return { error: 'Bạn không ở trong cuộc đua này' };
    if (!findItem(itemId)?.throwable || !player.items.includes(itemId)) return { error: 'Bạn không có món này để ném' };
    if (now - player.lastThrowAt < RULES.throwCooldownMs) return { error: 'Đợi chút rồi ném tiếp' };
    const others = this.race.racers.filter((r) => r.id !== id);
    if (others.length === 0) return { error: 'Không có ai để ném' };
    const ahead = others.filter((r) => r.pos >= me.pos).sort((a, b) => a.pos - b.pos);
    const behind = others.filter((r) => r.pos < me.pos).sort((a, b) => b.pos - a.pos);
    const target = ahead[0] ?? behind[0];
    this.#update(id, { lastThrowAt: now });
    return { fx: { type: 'throw', item: itemId, from: id, to: target.id, at: now } };
  }

  /** Emoji reaction floated over the race by any player or spectator (visual only). */
  react(id, emoji, now) {
    if (this.phase === PHASES.LOBBY) return { error: 'Chỉ thả emoji khi đang đua' };
    const player = this.players.get(id);
    if (!player) return { error: 'Vào phòng rồi mới thả emoji được' };
    if (!REACTIONS.includes(emoji)) return { error: 'Emoji không hợp lệ' };
    if (now - player.lastReactAt < RULES.reactCooldownMs) return { error: 'Chậm lại chút nhé' };
    this.#update(id, { lastReactAt: now });
    return { fx: { type: 'react', emoji, from: id, at: now } };
  }

  /** Connected players in the order they get a race slot: humans first, longest-waiting first. */
  #queue() {
    const waitKey = (p) => (p.lastRacedAt === null ? -Infinity : p.lastRacedAt);
    return [...this.players.values()]
      .filter((p) => p.connected && !p.spectator)
      .sort((a, b) => Number(a.isBot) - Number(b.isBot) || waitKey(a) - waitKey(b) || a.joinSeq - b.joinSeq);
  }

  /** Removes a player; if they are mid-race their lane is dropped too (no ghost racers). */
  remove(id) {
    const player = this.players.get(id);
    if (player && !player.isBot && player.lastRacedAt !== null) this.recentRacers.set(player.name.toLowerCase(), player.lastRacedAt);
    if (this.#raceInProgress()) {
      const racers = this.race.racers.filter((r) => r.id !== id);
      this.race = { ...this.race, racers, modified: this.race.modified || racers.length !== this.race.racers.length };
      if (this.phase === PHASES.COUNTDOWN && this.race.racers.length === 0) {
        // Everyone left before the start: nothing to show, go back to the lobby.
        this.phase = PHASES.LOBBY;
        this.race = null;
      }
    }
    return this.players.delete(id);
  }

  /**
   * Host adds a racer by hand (someone without a phone, or a name from a list).
   * They count as a real player: same rotation priority, slot limits and map rules.
   */
  addManual(rawName, animalId) {
    const name = sanitizeName(rawName);
    if (!name) return { error: `Tên phải từ 1 đến ${RULES.nameMaxLength} ký tự` };
    if (!findAnimal(animalId)) return { error: 'Nhân vật không hợp lệ' };
    const humans = [...this.players.values()].filter((p) => !p.isBot).length;
    if (humans >= RULES.maxPlayers) return { error: 'Phòng đã đầy' };
    const animal = animalForMap(this.#map(), animalId, this.joinSeq);
    return { player: this.#addPlayer({ name, animal, homeAnimal: animalId, isManual: true }) };
  }

  addBot() {
    const bots = [...this.players.values()].filter((p) => p.isBot).length;
    if (bots >= RULES.maxBots) return { error: `Tối đa ${RULES.maxBots} bot` };
    const name = `Bot ${BOT_NAMES[this.botCursor % BOT_NAMES.length]}`;
    const options = allowedAnimals(this.#map());
    const animal = options[Math.floor(this.rng() * options.length)].id;
    this.botCursor += 1;
    return { player: this.#addPlayer({ name, animal, homeAnimal: animal, isBot: true }) };
  }

  setTitle(raw) {
    if (raw === '' || raw === null || raw === undefined) {
      this.title = '';
      return { ok: true };
    }
    const title = sanitizeText(raw, { maxLength: RULES.titleMaxLength });
    if (!title) return { error: `Tên cuộc đua tối đa ${RULES.titleMaxLength} ký tự` };
    this.title = title;
    return { ok: true };
  }

  /** Host picks how long races last (one of RULES.durationChoices), or null for the map default. */
  setDuration(seconds) {
    if (this.#raceInProgress()) return { error: 'Đang đua, đổi thời lượng sau nhé' };
    if (seconds !== null && !RULES.durationChoices.includes(seconds)) return { error: 'Thời lượng không hợp lệ' };
    this.durationSec = seconds;
    return { ok: true };
  }

  /** Host opt-in for special (30/4) maps; turning it off moves the room back to a regular map. */
  setSpecialMaps(allowed) {
    if (this.#raceInProgress()) return { error: 'Đang đua, đổi sau nhé' };
    this.allowSpecialMaps = Boolean(allowed);
    if (!this.allowSpecialMaps && findMap(this.mapId)?.special) this.setMap(MAPS.find((m) => !m.special).id);
    return { ok: true };
  }

  /** The current map with this room's character rule applied. */
  #map(mapId = this.mapId) {
    return withCast(findMap(mapId), this.allCharacters);
  }

  /** Host switch: the map's own characters, or every character. Turning it off sends strays back. */
  setAllCharacters(on) {
    if (this.#raceInProgress()) return { error: 'Đang đua, đổi sau nhé' };
    this.allCharacters = Boolean(on);
    this.#applyCast();
    return { ok: true };
  }

  setMap(mapId) {
    if (!findMap(mapId)) return { error: 'Map không hợp lệ' };
    if (findMap(mapId).special && !this.allowSpecialMaps) return { error: 'Bật "map đặc biệt" trong cài đặt phòng trước' };
    if (this.#raceInProgress()) return { error: 'Đang đua, không đổi map được' };
    this.mapId = mapId;
    this.#applyCast();
    return { ok: true };
  }

  /** Vehicle-only maps swap everyone onto an allowed ride; other maps give back their own pick. */
  #applyCast() {
    const map = this.#map();
    for (const p of this.players.values()) {
      // A map-exclusive character the player chose (e.g. Ông Lân) stays while the cast still allows it;
      // everything else goes back to their usual character, or the map's stand-in.
      const keep = p.chosen && findAnimal(p.animal)?.maps && isAnimalAllowedHere(map, p.animal);
      const animal = animalForMap(map, keep ? p.animal : p.homeAnimal ?? p.animal, p.joinSeq);
      if (animal !== p.animal) this.#update(p.id, { animal, chosen: keep && animal === p.animal });
    }
  }

  start(now) {
    if (this.#raceInProgress()) return { error: 'Cuộc đua đang diễn ra' };
    const entrants = this.#queue().slice(0, RULES.raceSlots);
    if (entrants.length < 2) return { error: 'Cần ít nhất 2 người (có thể thêm bot)' };
    entrants.forEach((p) => this.#update(p.id, { lastRacedAt: now }));
    this.#launch(entrants.map((p) => p.id), findMap(this.mapId), now);
    return { ok: true };
  }

  #launch(ids, map, now) {
    const trackLength = trackLengthFor(map, this.durationSec);
    const maxMs = maxRaceMsFor(trackLength);
    const startsAt = now + RULES.countdownMs;
    // Provably fair: the whole race follows from this seed. Its hash is public from the
    // start, the seed itself only once the race is over (see snapshot()).
    const seed = this.seedSource();
    const sim = createSimulation({ seed, ids, trackLength, startsAt });
    this.race = {
      mapId: map.id,
      trackLength,
      startsAt,
      endsAt: startsAt + maxMs,
      maxMs,
      paused: false,
      pausedAt: null,
      seed,
      seedHash: createHash('sha256').update(seed).digest('hex'),
      entrants: ids.map((id) => this.players.get(id)?.name ?? '???'),
      modified: false, // set if racers are removed mid-race (replay would differ)
      rng: sim.rng,
      simTime: sim.simTime,
      racers: sim.racers,
    };
    this.results = null;
    this.phase = PHASES.COUNTDOWN;
    this.lastTickAt = now;
  }

  /** Freeze the race (countdown or running). Nothing moves until resume(). */
  pauseRace(now) {
    if (!this.#raceInProgress()) return { error: 'Không có cuộc đua nào đang chạy' };
    if (this.race.paused) return { error: 'Cuộc đua đang tạm dừng rồi' };
    this.race = { ...this.race, paused: true, pausedAt: now };
    return { ok: true };
  }

  /** Continue after a pause; every timestamp shifts so the pause never counts toward race times. */
  resumeRace(now) {
    if (!this.#raceInProgress() || !this.race.paused) return { error: 'Cuộc đua không bị tạm dừng' };
    const shift = Math.max(0, now - this.race.pausedAt);
    const later = (ms) => (ms === null ? null : ms + shift);
    this.race = {
      ...this.race,
      paused: false,
      pausedAt: null,
      startsAt: this.race.startsAt + shift,
      endsAt: this.race.endsAt + shift,
      simTime: this.race.simTime + shift,
      racers: this.race.racers.map((r) => ({ ...r, nextChangeAt: r.nextChangeAt + shift, finishedAt: later(r.finishedAt) })),
    };
    this.lastTickAt = now;
    return { ok: true };
  }

  /** Run the current (or just finished) race again from the start line with the same racers. */
  restartRace(now) {
    if (!this.race) return { error: 'Chưa có cuộc đua nào để bắt đầu lại' };
    const ids = this.race.racers.map((r) => r.id).filter((id) => this.players.get(id)?.connected);
    if (ids.length < 2) return { error: 'Cần ít nhất 2 tay đua còn kết nối' };
    this.#launch(ids, findMap(this.race.mapId) ?? findMap(this.mapId), now);
    return { ok: true };
  }

  /** Cancel the race in progress and go back to the lobby (no results). */
  abortRace() {
    if (!this.#raceInProgress()) return { error: 'Không có cuộc đua nào đang chạy' };
    this.phase = PHASES.LOBBY;
    this.race = null;
    this.results = null;
    return { ok: true };
  }

  backToLobby() {
    if (this.#raceInProgress()) return { error: 'Cuộc đua đang diễn ra' };
    this.phase = PHASES.LOBBY;
    this.race = null;
    this.results = null;
    return { ok: true };
  }

  /** Advance timers and physics. Returns true when state changed. */
  tick(now) {
    this.lastTickAt = now;
    const removed = this.#dropStaleDisconnects(now);
    if (this.race?.paused) return removed;

    if (this.phase === PHASES.COUNTDOWN && now >= this.race.startsAt) {
      this.phase = PHASES.RACING;
      return true;
    }
    if (this.phase !== PHASES.RACING) return removed;

    // Fixed 50 ms steps on the race's own clock: identical to what the verifier replays,
    // no matter how irregular the server's timer is.
    let sim = { rng: this.race.rng, trackLength: this.race.trackLength, simTime: this.race.simTime, racers: this.race.racers };
    while (sim.simTime + SIM_STEP_MS <= now && sim.racers.some((r) => r.finishedAt === null)) sim = stepSimulation(sim);
    this.race = { ...this.race, simTime: sim.simTime, racers: sim.racers };
    const { racers } = this.race;
    const done = racers.length === 0 || racers.every((r) => r.finishedAt !== null);
    if (done || now >= this.race.endsAt) this.#finish();
    return true;
  }

  #finish() {
    const startsAt = this.race.startsAt;
    this.results = rankRacers(this.race.racers).map((r, i) => {
      const p = this.players.get(r.id);
      return {
        id: r.id,
        rank: i + 1,
        name: p?.name ?? '???',
        animal: p?.animal ?? ANIMALS[0].id,
        color: p?.color ?? FACE_COLORS[0],
        timeMs: r.finishedAt === null ? null : Math.round(r.finishedAt - startsAt),
      };
    });
    this.phase = PHASES.FINISHED;
  }

  #dropStaleDisconnects(now) {
    let removed = false;
    for (const p of this.players.values()) {
      const stale = !p.connected && now - p.disconnectedAt >= RULES.lobbyDisconnectGraceMs;
      if (stale && !this.#isRacing(p.id)) removed = this.players.delete(p.id) || removed;
    }
    return removed;
  }

  #raceInProgress() {
    return this.phase === PHASES.COUNTDOWN || this.phase === PHASES.RACING;
  }

  #isRacing(id) {
    return this.#raceInProgress() && this.race.racers.some((r) => r.id === id);
  }

  /** Public state sent to every client. Never includes tokens. */
  snapshot(now) {
    const racingIds = new Set(this.race?.racers.map((r) => r.id) ?? []);
    const queuePos = new Map(this.#queue().map((p, i) => [p.id, i + 1]));
    const players = [...this.players.values()].map((p) => ({
      id: p.id,
      name: p.name,
      initials: initialsOf(p.name),
      animal: p.animal,
      color: p.color,
      isBot: p.isBot,
      isManual: Boolean(p.isManual),
      connected: p.connected,
      inRace: racingIds.has(p.id),
      items: p.items,
      spectator: p.spectator,
      queuePos: queuePos.get(p.id) ?? null, // 1..raceSlots = in the next race
    }));
    const race = this.race && {
      mapId: this.race.mapId,
      trackLength: this.race.trackLength,
      startsAt: this.race.startsAt,
      paused: Boolean(this.race.paused),
      pausedAt: this.race.pausedAt ?? null,
      // Commit before / reveal after: the seed is only published once the race is over.
      fairness: {
        seedHash: this.race.seedHash,
        seed: this.phase === PHASES.FINISHED ? this.race.seed : null,
        entrants: this.race.entrants,
        trackLength: this.race.trackLength,
        maxMs: this.race.maxMs,
        modified: this.race.modified,
      },
      racers: this.race.racers.map((r) => ({
        id: r.id,
        pos: Math.round(r.pos * 100) / 100,
        speed: Math.round(r.speed * 100) / 100,
        event: r.event,
        finishedAt: r.finishedAt,
      })),
    };
    return { phase: this.phase, mapId: this.mapId, serverNow: now, title: this.title, durationSec: this.durationSec, allowSpecialMaps: this.allowSpecialMaps, allCharacters: this.allCharacters, raceSlots: RULES.raceSlots, players, race, results: this.results };
  }
}
