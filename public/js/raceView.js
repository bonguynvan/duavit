import { MAPS, findItem, findMap } from '/shared/catalog.js';
import { rankRacers } from '/shared/race.js';
import { easeOut, BANNER_EVERY_M, BANNER_SPAN_M, FAN_EVERY_M, KERB_FLAG_EVERY_M, PENNANTS, POLE_EVERY_M, SHIRTS, SIGNS, VN_PENNANTS, animalOf, banner, checkered, fan, flagRaise, flagStyle, gate, hash, palaceGate, pennantString, pill, ribbon, roundedRect, sign, templeDrum } from './track-art.js';
import { EMOJI_FONT, drawFace, drawScenery, FONT, headPoint, INK, starFlag, tiltPivot } from './draw.js';
import { SpriteCache } from './spriteCache.js';
import { detailFor } from './detail.js';

const SMOOTHING = 10; // how fast displayed positions chase server positions (1/s)
const CAMERA_FOLLOW = 2.5; // how fast the camera chases its target (1/s)
const CAMERA_LEAD = 0.62; // focused racer sits at this fraction of the view width
const GO_FLASH_MS = 900;
const MARKER_EVERY = 25; // distance posts (units = metres)
const LABEL_EVERY = 50;
const MEDALS = ['#ffd23f', '#d6dbe4', '#e0a06a'];
const THROW_FLIGHT_MS = 850;
const BONK_MS = 700;
const REACT_MS = 2200;
const FALL_MS = 1700; // knocked over -> lie there -> scramble back up (visual only)
const FALL_ANGLE = 1.25;
const STAR_COUNT = 3;
const DEBRIS = { brick: '#c0392b', rock: '#8a8a8a', banana: '#ffd23f' };


/**
 * Pose of a knocked-over animal `ms` after impact, or null when upright.
 * Position/speed are untouched — the server never hears about falls.
 */
export function fallPose(ms, style) {
  if (ms < 0 || ms > FALL_MS) return null;
  const k = ms / FALL_MS;
  const dir = style === 'slip' ? -1 : 1;
  let angle;
  if (k < 0.16) angle = easeOut(k / 0.16) * FALL_ANGLE;
  else if (k < 0.6) angle = FALL_ANGLE + Math.sin(k * 40) * 0.04; // lying there, twitching
  else {
    const up = (k - 0.6) / 0.4;
    angle = FALL_ANGLE * (1 - easeOut(up)) - Math.sin(up * Math.PI) * 0.12; // little bounce on the way up
  }
  return { tilt: dir * angle, scrambling: k >= 0.6, dizzy: k < 0.85 };
}

function rotateAround(px, py, cx, cy, angle) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: cx + (px - cx) * cos - (py - cy) * sin, y: cy + (px - cx) * sin + (py - cy) * cos };
}
const MAX_REACTIONS = 40;

const IDLE_AFTER_FINISH_MS = 5000; // a finished race stops repainting: the last frame stays on screen

export const itemIcons = (ids = []) => ids.map((id) => findItem(id)?.icon).filter(Boolean);

export class RaceView {
  /**
   * @param {HTMLCanvasElement} canvas
   * @param {{ highlightId?: () => string | null, focusId?: () => string | null, showNames?: boolean, viewUnits?: number, drawResults?: boolean }} [opts]
   *   focusId: racer the camera follows (defaults to the leader); viewUnits: metres visible across the track;
   *   drawResults: paint the final standings onto the canvas (used for recorded videos).
   */
  constructor(canvas, { highlightId = () => null, focusId = () => null, showNames = true, viewUnits = 70, drawResults = false, maxLanes = Infinity } = {}) {
    this.drawResults = drawResults;
    // With more racers than lanes, several share a lane, staggered like a crowd of ducks.
    this.maxLanes = maxLanes;
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.highlightId = highlightId;
    this.focusId = focusId;
    this.showNames = showNames;
    this.viewUnits = viewUnits;
    this.state = null;
    this.clockOffset = 0;
    this.receivedAt = 0;
    this.display = new Map();
    this.camera = null;
    this.lastFrame = performance.now();
    this.running = false;
    this.effects = [];
    this.sprites = new SpriteCache();
  }

  /** Visual-only throw animation from one racer to another. */
  addEffect(fx) {
    const born = performance.now();
    if (fx?.type === 'throw') {
      this.effects = [...this.effects.slice(-20), { ...fx, icon: findItem(fx.item)?.icon ?? '🧱', born }];
      // The target goes down when the projectile lands; banana peels make it slip backwards.
      this.falls = new Map(this.falls ?? []).set(fx.to, { at: born + THROW_FLIGHT_MS, style: fx.item === 'banana' ? 'slip' : 'plant' });
    } else if (fx?.type === 'react') {
      // Spectators' emoji rise from a random spot; racers' from their own animal.
      this.reactions = [...(this.reactions ?? []).slice(-MAX_REACTIONS), { ...fx, born, drift: Math.random() }];
    }
  }

  setState(state) {
    const now = Date.now();
    this.clockOffset = state.serverNow - now;
    this.receivedAt = now;
    if (state.race?.startsAt !== this.state?.race?.startsAt) {
      this.display.clear();
      this.camera = null;
      this.sprites.clear(); // new racers, new looks
    }
    this.state = state;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const generation = (this.generation = (this.generation ?? 0) + 1); // a stop()+start() never leaves two loops
    const loop = (t) => {
      if (!this.running || generation !== this.generation) return;
      requestAnimationFrame(loop); // re-arm first: one bad frame must not freeze the view forever
      try {
        this.#frame(t);
      } catch (error) {
        console.error('[RaceView] frame failed', error);
      }
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  /**
   * While locked the backing canvas keeps its size (a recording must not change resolution mid-way).
   * Locking first sizes the canvas to its on-screen box, so we never freeze the 300x150 default.
   */
  lockSize(locked) {
    if (locked && !this.lockedSize) {
      const { w, h } = this.#resize();
      this.lockedSize = { w, h };
    }
    if (!locked) this.lockedSize = null;
  }

  #resize() {
    const dpr = window.devicePixelRatio || 1;
    if (this.lockedSize) {
      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      return this.lockedSize;
    }
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (this.canvas.width !== Math.round(w * dpr) || this.canvas.height !== Math.round(h * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    return { w, h };
  }

  #targetPos(racer, trackLength) {
    if (racer.finishedAt !== null) return trackLength;
    if (this.state.race?.paused) return racer.pos; // frozen: no extrapolation
    const ahead = ((Date.now() - this.receivedAt) / 1000) * racer.speed;
    return Math.min(trackLength - 0.01, racer.pos + Math.min(ahead, 2));
  }

  /** Smoothly interpolate every racer toward its latest server position. */
  #advance(race, dt) {
    const moving = this.state.phase === 'racing' && !race.paused;
    return race.racers.map((racer, i) => {
      const prev = this.display.get(racer.id) ?? { pos: racer.pos, phase: i };
      const target = this.#targetPos(racer, race.trackLength);
      const pos = prev.pos + (target - prev.pos) * Math.min(1, dt * SMOOTHING);
      const running = moving && racer.finishedAt === null;
      const phase = prev.phase + (running ? dt * (6 + racer.speed * 1.1) : 0);
      const next = { pos, phase, running };
      this.display.set(racer.id, next);
      return { racer, ...next };
    });
  }

  #moveCamera(race, items, dt) {
    const span = this.viewUnits;
    const focus = items.find((it) => it.racer.id === this.focusId()) ?? items.reduce((a, b) => (b.pos > a.pos ? b : a), items[0]);
    const min = -span * 0.18;
    const max = Math.max(min, race.trackLength - span * 0.88);
    const wanted = this.state.phase === 'countdown' || !focus ? min : focus.pos - span * CAMERA_LEAD;
    const target = Math.min(max, Math.max(min, wanted));
    this.camera = this.camera === null ? target : this.camera + (target - this.camera) * Math.min(1, dt * CAMERA_FOLLOW);
    return this.camera;
  }

  #frame(t) {
    // Generous cap so the camera still keeps up on slow phones / throttled tabs.
    const dt = Math.min(0.5, (t - this.lastFrame) / 1000);
    this.lastFrame = t;
    const { w, h } = this.#resize();
    if (this.#resting(w, h)) return;
    const ctx = this.ctx;
    ctx.clearRect(0, 0, w, h);
    const race = this.state?.race;
    if (!race || w === 0 || race.racers.length === 0) return;

    const map = findMap(race.mapId) ?? MAPS[0];
    const players = new Map(this.state.players.map((p) => [p.id, p]));
    const items = this.#advance(race, dt);
    const cam = this.#moveCamera(race, items, dt);

    const sceneH = Math.max(56, h * 0.2);
    const miniH = Math.min(24, Math.max(16, h * 0.045));
    const trackTop = sceneH + miniH;
    const n = Math.min(race.racers.length, this.maxLanes); // lanes drawn
    const stacked = race.racers.length > n;
    const perLane = Math.ceil(race.racers.length / n);
    const laneH = (h - trackTop) / n;
    const labelW = this.showNames && !stacked ? Math.min(190, Math.max(110, w * 0.13)) : 0;
    const viewW = w - labelW;
    const ppu = viewW / this.viewUnits; // pixels per metre
    const size = Math.min(laneH * 1.05, 110, ppu * 12);
    const toX = (pos) => labelW + (pos - cam) * ppu;

    drawScenery(ctx, map, w, sceneH, t, cam * ppu);
    this.#crowd(ctx, race, players, { sceneH, w, labelW, cam, ppu, t });
    if (this.state.title) this.#title(ctx, this.state.title, sceneH);
    this.#track(ctx, map, race, { w, h, trackTop, laneH, n, labelW, cam, ppu, toX });
    // Drawn before the racers so top-lane heads/accessories sit on top of the strip, never under it.
    this.#minimap(ctx, race, items, players, { y: sceneH, h: miniH, w, labelW, cam, me: this.highlightId() });

    const me = this.highlightId();
    const ranking = rankRacers(race.racers);
    const finishRank = new Map(ranking.filter((r) => r.finishedAt !== null).map((r, i) => [r.id, i + 1]));

    const heads = new Map();
    ctx.save();
    ctx.beginPath();
    ctx.rect(labelW, 0, viewW, h); // top lane's hats/accessories may poke into the scenery band
    ctx.clip();
    // Lane + depth per racer; draw back-to-front so nearer racers overlap farther ones.
    const placed = items.map((item, i) => {
      const lane = i % n;
      const depth = Math.floor(i / n);
      const laneTop = trackTop + laneH * lane;
      const groundY = laneTop + laneH * (0.86 - (stacked ? (depth / perLane) * 0.45 : 0));
      return { ...item, laneTop, groundY };
    });
    if (stacked) placed.sort((a, b) => a.groundY - b.groundY);
    const detail = detailFor(race.racers.length);
    const place = new Map(ranking.map((r, i) => [r.id, i]));
    const shows = (id, limit) => id === me || (place.get(id) ?? Infinity) < limit;
    this.sprites.beginFrame();
    placed.forEach(({ racer, pos, phase, running, laneTop, groundY }) => {
      const player = players.get(racer.id);
      const face = { initials: player?.initials ?? '?', color: player?.color ?? '#888' };
      const noseX = toX(pos);
      const x = noseX - size * 0.45;
      // Off-camera racers cost nothing to draw; their heads still anchor throws and reactions.
      const visible = x + size * 0.9 > labelW && x - size * 0.8 < w;

      if (racer.id === me) {
        ctx.fillStyle = 'rgba(255, 210, 63, 0.35)';
        ctx.fillRect(labelW, laneTop, viewW, laneH);
      }
      const effects = visible && shows(racer.id, detail.effects);
      if (running && effects) this.#dust(ctx, x - size * 0.42, groundY, size, phase);
      if (racer.event === 'burst' && running && effects) this.#speedLines(ctx, x - size * 0.4, groundY - size * 0.35, size, t);
      if (player) {
        const fall = this.#fallFor(racer.id);
        const stumble = racer.event === 'stumble' && running ? 0.16 + Math.sin(t / 70) * 0.07 : 0; // trip wobble
        const tilt = fall?.tilt ?? stumble;
        const legs = running && (!fall || fall.scrambling);
        if (visible) {
          const items = shows(racer.id, detail.items) ? itemIcons(player.items) : [];
          this.sprites.draw(ctx, animalOf(player.animal), { x, y: groundY, size, phase, moving: legs, face, items, tilt });
        }
        const head = headPoint(player.animal, x, groundY, size);
        const tilted = tilt === 0 ? head : rotateAround(head.x, head.y, x + (tiltPivot(tilt) * size) / 100, groundY, tilt);
        heads.set(racer.id, tilted);
        if (fall?.dizzy) this.#dizzyStars(ctx, tilted, size, t);
      }
      if (racer.event === 'stumble' && running && effects) pill(ctx, x, groundY - size * 0.95, 'ối!', '#fff', INK, Math.max(10, size * 0.16));

      const rank = finishRank.get(racer.id);
      if (rank && (!stacked || rank <= 3)) pill(ctx, x - size * 0.75, groundY - size * 0.45, `#${rank}`, MEDALS[rank - 1] ?? '#fff', INK, Math.max(11, size * 0.2));
      if (!stacked) this.#offscreen(ctx, { x, size, pos, cam, laneTop, laneH, labelW, w, face, isMe: racer.id === me });
    });
    // Spare frame time (above all during the countdown) pre-paints the running poses still missing.
    this.sprites.warm(this.#castOf(race, players), { size, scale: ctx.getTransform().a });
    this.#effects(ctx, heads, size);
    this.#kerbFlags(ctx, race, { h, cam, ppu, labelW, w, t });
    ctx.restore();
    this.#reactions(ctx, heads, { w, h, labelW, size, max: detail.reactions });

    if (labelW > 0) this.#names(ctx, items, players, { trackTop, laneH, labelW, me });
    this.#countdown(ctx, w, h, race);
    if (this.drawResults && this.state.phase === 'finished' && this.state.results) this.#resultsBoard(ctx, w, h, this.state.results);
  }

  /**
   * True once a finished race has been on screen for a while: skip the frame and keep the picture.
   * A size change (fullscreen, rotation) still gets one fresh frame, since resizing clears the canvas.
   */
  #resting(w, h) {
    if (this.state?.phase !== 'finished') {
      this.finishedSeenAt = null;
      this.restingSize = null;
      return false;
    }
    this.finishedSeenAt ??= performance.now();
    if (performance.now() - this.finishedSeenAt < IDLE_AFTER_FINISH_MS) return false;
    const size = `${this.canvas.width}x${this.canvas.height}`;
    if (this.restingSize === size) return true;
    this.restingSize = size;
    return false;
  }

  /** Distinct characters in this race (cached per race: 500 racers share a few dozen types). */
  #castOf(race, players) {
    if (this.cast?.startsAt !== race.startsAt) {
      const ids = new Set(race.racers.map((r) => players.get(r.id)?.animal).filter(Boolean));
      this.cast = { startsAt: race.startsAt, animals: [...ids].map(animalOf) };
    }
    return this.cast.animals;
  }

  #resultsBoard(ctx, w, h, results) {
    const rows = results.slice(0, 5);
    const rowH = Math.min(46, h * 0.07);
    const boxW = Math.min(520, w * 0.6);
    const boxH = rowH * (rows.length + 1.8);
    const x = (w - boxW) / 2;
    const y = (h - boxH) / 2;
    ctx.save();
    ctx.fillStyle = 'rgba(29,26,47,0.35)';
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fffdf8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 4;
    ctx.beginPath();
    roundedRect(ctx, x, y, boxW, boxH, 18);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `800 ${rowH * 0.7}px ${FONT}`;
    ctx.fillText('🏆 Kết quả', w / 2, y + rowH * 0.8);
    rows.forEach((r, i) => {
      const ry = y + rowH * (i + 1.9);
      pill(ctx, x + rowH * 0.9, ry, `#${r.rank}`, MEDALS[i] ?? '#fff', INK, rowH * 0.36);
      ctx.fillStyle = INK;
      ctx.textAlign = 'left';
      ctx.font = `700 ${rowH * 0.45}px ${FONT}`;
      ctx.fillText(r.name, x + rowH * 1.7, ry, boxW - rowH * 4.2);
      ctx.textAlign = 'right';
      ctx.fillText(r.timeMs === null ? '—' : `${(r.timeMs / 1000).toFixed(2)}s`, x + boxW - rowH * 0.5, ry);
    });
    ctx.restore();
  }

  #track(ctx, map, race, { w, h, trackTop, laneH, n, labelW, cam, ppu, toX }) {
    const { palette } = map;
    for (let i = 0; i < n; i += 1) {
      ctx.fillStyle = i % 2 ? palette.laneB : palette.laneA;
      ctx.fillRect(0, trackTop + laneH * i, w, laneH);
    }
    const from = Math.floor(cam) - 2;
    const to = Math.ceil(cam + (w - labelW) / ppu) + 2;

    // Ground speckles scroll at full speed: the strongest cue that we're moving.
    ctx.fillStyle = 'rgba(29, 26, 47, 0.12)';
    for (let i = 0; i < n; i += 1) {
      for (let u = Math.max(0, from); u <= to; u += 1) {
        if (hash(u * 31 + i * 7) > 0.45) continue;
        const sx = toX(u + hash(u + i) * 0.9);
        const sy = trackTop + laneH * (i + 0.2 + hash(u * 3 + i) * 0.7);
        ctx.fillRect(sx, sy, Math.max(2, ppu * 0.35), Math.max(1.5, laneH * 0.03));
      }
    }

    ctx.strokeStyle = palette.line;
    ctx.globalAlpha = 0.55;
    ctx.setLineDash([12, 10]);
    ctx.lineDashOffset = cam * ppu;
    ctx.lineWidth = 2;
    for (let i = 1; i < n; i += 1) {
      ctx.beginPath();
      ctx.moveTo(labelW, trackTop + laneH * i);
      ctx.lineTo(w, trackTop + laneH * i);
      ctx.stroke();
    }
    ctx.setLineDash([]);
    ctx.lineDashOffset = 0;

    // Distance posts.
    ctx.lineWidth = 2;
    for (let m = Math.max(MARKER_EVERY, Math.ceil(from / MARKER_EVERY) * MARKER_EVERY); m < race.trackLength && m <= to; m += MARKER_EVERY) {
      const x = toX(m);
      ctx.globalAlpha = m % LABEL_EVERY === 0 ? 0.6 : 0.3;
      ctx.beginPath();
      ctx.moveTo(x, trackTop);
      ctx.lineTo(x, h);
      ctx.stroke();
      if (m % LABEL_EVERY === 0) {
        ctx.globalAlpha = 1;
        pill(ctx, x, trackTop + 12, `${m}m`, palette.line, INK, 11);
      }
    }
    ctx.globalAlpha = 1;

    const startX = toX(0);
    if (startX > labelW - 4 && startX < w) {
      ctx.fillStyle = palette.line;
      ctx.fillRect(startX - 2, trackTop, 4, h - trackTop);
    }
    const finishX = toX(race.trackLength);
    if (finishX > labelW - 60 && finishX < w + 60) {
      const sinceFirst = this.#sinceFirstFinish(race);
      if (map.finish === 'palace-gate') palaceGate(ctx, race, finishX, trackTop, h, laneH, sinceFirst);
      else if (map.finish === 'temple-drum') templeDrum(ctx, finishX, trackTop, h, laneH, sinceFirst);
      else if (map.finish === 'ribbon') ribbon(ctx, finishX, trackTop, h, laneH, sinceFirst);
      else if (map.finish === 'flag-raise') flagRaise(ctx, finishX, trackTop, h, laneH, sinceFirst);
      else {
        const cell = Math.max(6, laneH * 0.12);
        checkered(ctx, finishX, trackTop, h - trackTop, cell);
        pill(ctx, finishX + cell, trackTop + 12, 'ĐÍCH', '#ff5a36', '#fff', 11);
      }
    }
  }

  #reactions(ctx, heads, { w, h, labelW, size, max }) {
    const now = performance.now();
    this.reactions = (this.reactions ?? []).filter((r) => now - r.born < REACT_MS).slice(-max);
    const emojiSize = Math.max(26, Math.min(48, size * 0.45));
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = `${emojiSize}px ${EMOJI_FONT}`;
    for (const r of this.reactions) {
      const k = (now - r.born) / REACT_MS;
      const head = heads.get(r.from);
      const startX = head ? head.x : labelW + 30 + r.drift * (w - labelW - 60);
      const startY = head ? head.y : h - 20;
      const rise = head ? h * 0.25 : h * 0.6;
      ctx.globalAlpha = k < 0.75 ? 1 : 1 - (k - 0.75) / 0.25;
      ctx.fillText(r.emoji, startX + Math.sin(k * 6 + r.drift * 6) * 14, startY - k * rise);
    }
    ctx.globalAlpha = 1;
  }

  /**
   * Fans along the roadside, world-anchored so they scroll past at track speed.
   * Real spectators from the room stand in the crowd with their own face badges.
   */
  #crowd(ctx, race, players, { sceneH, w, labelW, cam, ppu, t }) {
    const base = sceneH - Math.max(3, sceneH * 0.04);
    const h = sceneH * 0.36;
    const viewM = (w - labelW) / ppu;
    const audience = [...players.values()].filter((p) => p.spectator);
    const racerNames = race.racers.map((r) => players.get(r.id)?.name).filter(Boolean);
    const title = this.state.title || 'ĐUA VỊT PETI';
    const cheers = findMap(race.mapId)?.cheers ?? ['CHẠY ĐI CHỜ CHI! 🔥'];
    const bannerTexts = [`🏁 ${title}`, ...racerNames.map((n) => `Cố lên ${n}!`), ...cheers];
    const toX = (m) => labelW + (m - cam) * ppu;

    ctx.save();
    ctx.beginPath();
    ctx.rect(labelW, 0, w - labelW, sceneH);
    ctx.clip();
    this.#flagPoles(ctx, race, { base, h, cam, viewM, toX, t });
    const first = Math.floor((cam - 4) / FAN_EVERY_M);
    const last = Math.ceil((cam + viewM + 4) / FAN_EVERY_M);
    for (let i = first; i <= last; i += 1) {
      const m = i * FAN_EVERY_M;
      if (m > race.trackLength + 20) break;
      const inBanner = ((m % BANNER_EVERY_M) + BANNER_EVERY_M) % BANNER_EVERY_M;
      if (inBanner > 2 && inBanner < BANNER_SPAN_M - 2) continue; // gap under each banner
      const seed = Math.abs(i * 7919) % 997;
      const member = audience.length > 0 && seed % 4 === 0 ? audience[seed % audience.length] : null;
      const hands = fan(ctx, toX(m), base, h * (0.85 + (seed % 5) * 0.06), seed, t, member && { initials: member.initials, color: member.color });
      if (!member && seed % 5 === 1) sign(ctx, seed % 2 ? hands.left : hands.right, h, SIGNS[seed % SIGNS.length]);
    }
    // Long banners carried by two fans.
    const firstBanner = Math.floor(cam / BANNER_EVERY_M) - 1;
    for (let b = Math.max(0, firstBanner); b * BANNER_EVERY_M < cam + viewM + BANNER_SPAN_M; b += 1) {
      const m = b * BANNER_EVERY_M + 1;
      if (m + BANNER_SPAN_M > race.trackLength) break;
      const left = fan(ctx, toX(m), base, h, b * 31 + 3, t, null);
      const right = fan(ctx, toX(m + BANNER_SPAN_M - 2), base, h, b * 31 + 5, t, null);
      banner(ctx, left.right, right.left, h, bannerTexts[b % bannerTexts.length], SHIRTS[b % SHIRTS.length], t);
    }
    gate(ctx, toX(0), base, h, 'XUẤT PHÁT', null, '#18a999');
    const finishLabel = { 'palace-gate': '⭐ DINH ĐỘC LẬP', 'temple-drum': '🥁 ĐỀN HÙNG', ribbon: '🎉 KHÁNH THÀNH', 'flag-raise': '⭐ BA ĐÌNH' };
    const label = finishLabel[findMap(race.mapId)?.finish] ?? 'VỀ ĐÍCH 🏁';
    gate(ctx, toX(race.trackLength), base, h, label, title, label === 'VỀ ĐÍCH 🏁' ? '#ff5a36' : '#da251d');
    ctx.restore();
  }

  /** Tall flag poles with bunting strung between them, along the crowd side of the road. */
  #flagPoles(ctx, race, { base, h, cam, viewM, toX, t }) {
    const style = flagStyle(race.mapId);
    const poleH = h * 1.75;
    const first = Math.floor((cam - POLE_EVERY_M) / POLE_EVERY_M);
    const last = Math.ceil((cam + viewM + POLE_EVERY_M) / POLE_EVERY_M);
    let prevTop = null;
    for (let i = first; i <= last; i += 1) {
      const x = toX(i * POLE_EVERY_M + POLE_EVERY_M / 2);
      const top = { x, y: base - poleH };
      if (prevTop) pennantString(ctx, prevTop, top, h * 0.22, style === 'vn' ? VN_PENNANTS : PENNANTS, Math.abs(i));
      prevTop = top;
      ctx.fillStyle = '#d8d8d8';
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.5;
      ctx.fillRect(x - 1.5, top.y, 3, poleH);
      ctx.strokeRect(x - 1.5, top.y, 3, poleH);
      const flutter = Math.sin(t / 220 + i) * h * 0.05;
      const fw = h * 0.62 + flutter;
      const fh = h * 0.4;
      if (style === 'vn') starFlag(ctx, x + 1.5, top.y, fw, fh, ['#da251d']);
      else {
        ctx.fillStyle = PENNANTS[Math.abs(i) % PENNANTS.length];
        ctx.beginPath();
        ctx.moveTo(x + 1.5, top.y);
        ctx.lineTo(x + 1.5 + fw, top.y + fh / 2 + flutter * 0.3);
        ctx.lineTo(x + 1.5, top.y + fh);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  /** Small flags planted along the far kerb (bottom edge of the track). */
  #kerbFlags(ctx, race, { h, cam, ppu, labelW, w, t }) {
    const style = flagStyle(race.mapId);
    const size = Math.max(9, Math.min(18, h * 0.028));
    const base = h - 1;
    const viewM = (w - labelW) / ppu;
    ctx.fillStyle = 'rgba(29, 26, 47, 0.35)';
    ctx.fillRect(labelW, base - 2, w - labelW, 3);
    for (let i = Math.floor(cam / KERB_FLAG_EVERY_M) - 1; i * KERB_FLAG_EVERY_M < cam + viewM + KERB_FLAG_EVERY_M; i += 1) {
      const x = labelW + (i * KERB_FLAG_EVERY_M - cam) * ppu;
      const flutter = Math.sin(t / 200 + i * 1.3) * size * 0.12;
      ctx.strokeStyle = INK;
      ctx.lineWidth = 1.2;
      ctx.beginPath();
      ctx.moveTo(x, base);
      ctx.lineTo(x, base - size * 1.9);
      ctx.stroke();
      if (style === 'vn') {
        const bands = Math.abs(i) % 2 === 0 ? ['#da251d'] : ['#da251d', '#1e6fd9'];
        starFlag(ctx, x, base - size * 1.9, size * 1.35 + flutter, size * 0.9, bands);
      } else {
        ctx.fillStyle = PENNANTS[Math.abs(i) % PENNANTS.length];
        ctx.beginPath();
        ctx.moveTo(x, base - size * 1.9);
        ctx.lineTo(x + size * 1.3 + flutter, base - size * 1.45);
        ctx.lineTo(x, base - size);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      }
    }
  }

  #pausedOverlay(ctx, w, h) {
    ctx.save();
    ctx.fillStyle = 'rgba(29,26,47,0.45)';
    ctx.fillRect(0, 0, w, h);
    const size = Math.min(w, h) * 0.13;
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.08;
    ctx.strokeStyle = INK;
    ctx.strokeText('⏸ TẠM DỪNG', w / 2, h / 2);
    ctx.fillStyle = '#ffd23f';
    ctx.fillText('⏸ TẠM DỪNG', w / 2, h / 2);
    ctx.font = `700 ${size * 0.3}px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.fillText('Host đã tạm dừng cuộc đua', w / 2, h / 2 + size * 0.85);
    ctx.restore();
  }

  #title(ctx, title, sceneH) {
    const size = Math.max(13, Math.min(22, sceneH * 0.15));
    const text = `🏁 ${title}`;
    ctx.font = `800 ${size}px ${FONT}`;
    const width = Math.min(ctx.measureText(text).width + size, this.canvas.clientWidth * 0.6);
    pill(ctx, 12 + width / 2, 10 + size * 0.75, text, '#fffdf8', INK, size, width);
  }

  #fallFor(id) {
    const fall = this.falls?.get(id);
    if (!fall) return null;
    const pose = fallPose(performance.now() - fall.at, fall.style);
    if (!pose && performance.now() > fall.at) this.falls.delete(id);
    return pose;
  }

  #dizzyStars(ctx, head, size, t) {
    const r = size * 0.22;
    ctx.font = `${Math.max(12, size * 0.16)}px ${EMOJI_FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    for (let i = 0; i < STAR_COUNT; i += 1) {
      const a = t / 180 + (i * Math.PI * 2) / STAR_COUNT;
      ctx.fillText('⭐', head.x + Math.cos(a) * r, head.y - size * 0.18 + Math.sin(a) * r * 0.35);
    }
  }

  #debris(ctx, at, item, k, size) {
    ctx.fillStyle = DEBRIS[item] ?? '#c0392b';
    for (let i = 0; i < 7; i += 1) {
      const angle = -Math.PI * (0.15 + (i / 6) * 0.7);
      const speed = size * (0.6 + (i % 3) * 0.25);
      const px = at.x + Math.cos(angle) * speed * k;
      const py = at.y + Math.sin(angle) * speed * k + size * 1.4 * k * k; // gravity
      const s = Math.max(3, size * 0.05) * (1 - k * 0.5);
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(k * 8 + i);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      ctx.restore();
    }
  }

  #effects(ctx, heads, size) {
    const now = performance.now();
    this.effects = this.effects.filter((e) => now - e.born < THROW_FLIGHT_MS + BONK_MS);
    for (const e of this.effects) {
      const from = heads.get(e.from);
      const to = heads.get(e.to);
      if (!from || !to) continue;
      const age = now - e.born;
      if (age < THROW_FLIGHT_MS) {
        const k = age / THROW_FLIGHT_MS;
        const arc = Math.sin(k * Math.PI) * Math.max(40, Math.abs(to.x - from.x) * 0.35);
        ctx.save();
        ctx.translate(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k - arc);
        ctx.rotate(k * Math.PI * 4);
        ctx.font = `${Math.max(18, size * 0.28)}px ${EMOJI_FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(e.icon, 0, 0);
        ctx.restore();
      } else {
        const k = (age - THROW_FLIGHT_MS) / BONK_MS;
        ctx.globalAlpha = 1 - k;
        this.#debris(ctx, to, e.item, k, size);
        const label = e.item === 'banana' ? 'TRƯỢT! 🍌' : 'BỐP! 💥';
        const pop = 1 + Math.sin(Math.min(1, k * 3) * Math.PI) * 0.35; // punchy scale-in
        pill(ctx, to.x, to.y - size * 0.3 - k * 20, label, '#ffd23f', INK, Math.max(12, size * 0.18) * pop);
        ctx.globalAlpha = 1;
      }
    }
  }

  /** ms since the first racer crossed the line (server clock), or -1 if nobody has yet. */
  #sinceFirstFinish(race) {
    const times = race.racers.map((r) => r.finishedAt).filter((v) => v !== null);
    return times.length ? Date.now() + this.clockOffset - Math.min(...times) : -1;
  }

  #dust(ctx, x, groundY, size, phase) {
    for (let k = 0; k < 3; k += 1) {
      const life = (phase * 0.35 + k / 3) % 1;
      ctx.fillStyle = `rgba(255, 255, 255, ${0.55 * (1 - life)})`;
      ctx.beginPath();
      ctx.arc(x - life * size * 0.35, groundY - size * (0.04 + life * 0.12), size * (0.04 + life * 0.07), 0, Math.PI * 2);
      ctx.fill();
    }
  }

  #speedLines(ctx, x, y, size, t) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = Math.max(2, size * 0.03);
    ctx.lineCap = 'round';
    for (let k = 0; k < 3; k += 1) {
      const off = ((t / 60 + k * 7) % 14) * size * 0.02;
      ctx.beginPath();
      ctx.moveTo(x - off, y + k * size * 0.14);
      ctx.lineTo(x - off - size * 0.35, y + k * size * 0.14);
      ctx.stroke();
    }
  }

  /** Arrow + distance for racers outside the camera window. */
  #offscreen(ctx, { x, size, pos, cam, laneTop, laneH, labelW, w, face, isMe }) {
    const mid = laneTop + laneH / 2;
    const r = Math.max(8, Math.min(laneH * 0.3, 15));
    const font = Math.max(10, r * 0.8);
    if (x + size * 0.45 < labelW) {
      const behind = Math.round(cam - pos);
      drawFace(ctx, labelW + r + 6, mid, r, face, isMe ? '#ffd23f' : INK);
      pill(ctx, labelW + r * 2 + 12 + font * 1.6, mid, `◀ ${Math.max(1, behind)}m`, '#fff', INK, font);
    } else if (x - size * 0.45 > w) {
      drawFace(ctx, w - r - 6, mid, r, face, isMe ? '#ffd23f' : INK);
      pill(ctx, w - r * 2 - 12 - font * 1.6, mid, 'phía trước ▶', '#fff', INK, font);
    }
  }

  #names(ctx, items, players, { trackTop, laneH, labelW, me }) {
    ctx.fillStyle = 'rgba(255, 253, 248, 0.92)';
    ctx.fillRect(0, trackTop, labelW, laneH * items.length);
    ctx.fillStyle = INK;
    ctx.fillRect(labelW - 3, trackTop, 3, laneH * items.length);
    items.forEach(({ racer }, i) => {
      const player = players.get(racer.id);
      if (!player) return;
      const laneTop = trackTop + laneH * i;
      const r = Math.min(laneH * 0.3, 16);
      if (racer.id === me) {
        ctx.fillStyle = 'rgba(255, 210, 63, 0.6)';
        ctx.fillRect(0, laneTop, labelW - 3, laneH);
      }
      drawFace(ctx, 10 + r, laneTop + laneH / 2, r, { initials: player.initials, color: player.color });
      ctx.fillStyle = INK;
      ctx.font = `700 ${Math.max(11, Math.min(laneH * 0.36, 20))}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      const nameX = 16 + r * 2;
      ctx.fillText(player.name, nameX, laneTop + laneH / 2, labelW - nameX - 6);
    });
  }

  /** Whole-track overview strip: everyone's position plus the camera window. */
  #minimap(ctx, race, items, players, { y, h, w, labelW, cam, me }) {
    ctx.fillStyle = 'rgba(29, 26, 47, 0.72)';
    ctx.fillRect(0, y, w, h);
    const x0 = Math.max(labelW, 12) + 8;
    const x1 = w - 18;
    const span = x1 - x0;
    const toMini = (pos) => x0 + (Math.max(0, Math.min(race.trackLength, pos)) / race.trackLength) * span;
    const mid = y + h / 2;
    ctx.fillStyle = 'rgba(255,255,255,0.18)';
    const winStart = toMini(cam);
    const winEnd = toMini(cam + this.viewUnits);
    ctx.fillRect(winStart, y + 2, Math.max(4, winEnd - winStart), h - 4);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(x0, mid);
    ctx.lineTo(x1, mid);
    ctx.stroke();
    checkered(ctx, x1, y + 2, h - 4, (h - 4) / 4);
    const dotR = Math.max(3, h * 0.22);
    const ordered = [...items].sort((a, b) => (a.racer.id === me) - (b.racer.id === me)); // draw "me" last, on top
    ordered.forEach(({ racer, pos }) => {
      const player = players.get(racer.id);
      const isMe = racer.id === me;
      ctx.beginPath();
      ctx.arc(toMini(pos), mid, isMe ? dotR * 1.5 : dotR, 0, Math.PI * 2);
      ctx.fillStyle = player?.color ?? '#888';
      ctx.fill();
      ctx.lineWidth = isMe ? 3 : 1.5;
      ctx.strokeStyle = isMe ? '#ffd23f' : '#fff';
      ctx.stroke();
    });
  }

  #countdown(ctx, w, h, race) {
    if (race.paused) return this.#pausedOverlay(ctx, w, h);
    const serverNow = Date.now() + this.clockOffset;
    const left = race.startsAt - serverNow;
    if (left < -GO_FLASH_MS || this.state.phase === 'finished') return;
    const text = left > 0 ? String(Math.ceil(left / 1000)) : 'CHẠY!';
    const size = Math.min(w, h) * (left > 0 ? 0.32 : 0.2);
    ctx.save();
    if (left > 0) {
      ctx.fillStyle = 'rgba(29,26,47,0.35)';
      ctx.fillRect(0, 0, w, h);
    }
    ctx.font = `800 ${size}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = size * 0.08;
    ctx.strokeStyle = INK;
    ctx.strokeText(text, w / 2, h / 2);
    ctx.fillStyle = left > 0 ? '#ffd23f' : '#ff5a36';
    ctx.fillText(text, w / 2, h / 2);
    ctx.restore();
  }
}
