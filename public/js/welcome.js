// Looping hero parade (home page, player welcome screen): the map's own cast runs across its scenery,
// and a new map is revealed by a checkered flag sweeping across the track.
// (Relative catalog import so the Node tests resolve it; in the browser it is /shared/catalog.js.)
import { FACE_COLORS, MAPS, allowedAnimals, findMap } from '../../shared/catalog.js';
import { INK, drawAnimal, drawScenery } from './draw.js';

const LANES = 3;
const SCROLL_PX_PER_SEC = 90;
export const MIN_RUNNERS = 12; // small casts (4-5 characters) are repeated so the track never looks empty
const WIPE_MS = 900;
const FLAG_W = 28;

/** The parade for a map: its own cast, each runner with a fixed personality (no flicker). */
export function paradeFor(map) {
  const cast = allowedAnimals(map);
  return Array.from({ length: Math.max(MIN_RUNNERS, cast.length) }, (_, i) => {
    const animal = cast[i % cast.length];
    return {
      animal,
      lane: i % LANES,
      offset: (i * 137) % 1000,
      speed: 70 + ((i * 53) % 60),
      wobble: 0.6 + ((i * 29) % 10) / 10,
      face: { initials: animal.name[0].toUpperCase(), color: FACE_COLORS[i % FACE_COLORS.length] },
    };
  });
}

const parades = new Map();
const paradeOf = (map) => {
  if (!parades.has(map.id)) parades.set(map.id, paradeFor(map));
  return parades.get(map.id);
};
const easeInOut = (k) => (k < 0.5 ? 2 * k * k : 1 - (-2 * k + 2) ** 2 / 2);

export class WelcomeParade {
  /** @param {HTMLCanvasElement} canvas @param {() => string | undefined} getMapId */
  constructor(canvas, getMapId) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.getMapId = getMapId;
    this.running = false;
    this.reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  }

  start() {
    if (this.running) return;
    this.running = true;
    const loop = (t) => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      try {
        this.#frame(this.reduceMotion ? 0 : t);
      } catch (error) {
        console.error('[WelcomeParade]', error);
      }
    };
    requestAnimationFrame(loop);
  }

  stop() {
    this.running = false;
  }

  #frame(t) {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth;
    const h = this.canvas.clientHeight;
    if (w === 0) return;
    if (this.canvas.width !== Math.round(w * dpr)) {
      this.canvas.width = Math.round(w * dpr);
      this.canvas.height = Math.round(h * dpr);
    }
    const ctx = this.ctx;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const map = findMap(this.getMapId()) ?? MAPS[0];
    if (map.id !== this.mapId) {
      // The old scene stays on screen until the flag has swept past (not on the very first frame).
      this.previous = this.mapId && !this.reduceMotion ? findMap(this.mapId) : null;
      this.mapId = map.id;
      this.switchedAt = t;
    }
    this.#scene(ctx, map, w, h, t);
    const k = this.previous ? (t - this.switchedAt) / WIPE_MS : 1;
    if (k >= 1) {
      this.previous = null;
      return;
    }
    const edge = easeInOut(Math.max(0, k)) * (w + FLAG_W);
    ctx.save();
    ctx.beginPath();
    ctx.rect(edge, 0, w - edge, h);
    ctx.clip();
    this.#scene(ctx, this.previous, w, h, t);
    ctx.restore();
    this.#flag(ctx, edge - FLAG_W, h);
  }

  #scene(ctx, map, w, h, t) {
    const sec = t / 1000;
    const sceneH = h * 0.42;
    drawScenery(ctx, map, w, sceneH, t, sec * SCROLL_PX_PER_SEC);

    const laneH = (h - sceneH) / LANES;
    for (let i = 0; i < LANES; i += 1) {
      ctx.fillStyle = i % 2 ? map.palette.laneB : map.palette.laneA;
      ctx.fillRect(0, sceneH + laneH * i, w, laneH);
    }
    // Ground marks scroll with the camera so the whole scene feels like it's moving.
    ctx.fillStyle = 'rgba(29, 26, 47, 0.12)';
    const gap = 46;
    const shift = (sec * SCROLL_PX_PER_SEC * 1.2) % gap;
    for (let lane = 0; lane < LANES; lane += 1) {
      for (let x = -shift + (lane * 17) % gap; x < w; x += gap) {
        ctx.fillRect(x, sceneH + laneH * (lane + 0.55), 10, 2);
      }
    }

    const size = Math.min(laneH * 1.1, 96);
    const loopW = w + size * 2;
    [...paradeOf(map)]
      .sort((a, b) => a.lane - b.lane)
      .forEach((r) => {
        const travel = (r.offset + sec * r.speed + Math.sin(sec * r.wobble) * 40) % loopW;
        const x = travel - size;
        const y = sceneH + laneH * (r.lane + 0.88);
        drawAnimal(ctx, r.animal, { x, y, size, phase: sec * (8 + r.wobble * 3), moving: !this.reduceMotion, face: r.face });
      });
  }

  /** The checkered finish-line band that wipes one map into the next. */
  #flag(ctx, x, h) {
    const cell = FLAG_W / 2;
    ctx.fillStyle = '#fff';
    ctx.fillRect(x, 0, FLAG_W, h);
    ctx.fillStyle = INK;
    for (let row = 0; row * cell < h; row += 1) ctx.fillRect(x + (row % 2) * cell, row * cell, cell, cell);
    ctx.fillRect(x - 3, 0, 3, h);
    ctx.fillRect(x + FLAG_W, 0, 3, h);
  }
}
