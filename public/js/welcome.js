import { ANIMALS, FACE_COLORS, MAPS, findMap } from '/shared/catalog.js';
import { drawAnimal, drawScenery } from './draw.js';

const LANES = 3;
const SCROLL_PX_PER_SEC = 90;

/** Deterministic per-animal personality so the parade looks like a chaotic race. */
const runners = ANIMALS.map((animal, i) => ({
  animal,
  lane: i % LANES,
  offset: (i * 137) % 1000,
  speed: 70 + ((i * 53) % 60),
  wobble: 0.6 + ((i * 29) % 10) / 10,
  face: { initials: animal.name[0].toUpperCase(), color: FACE_COLORS[i % FACE_COLORS.length] },
}));

/** Looping hero animation for the welcome screen. */
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
    [...runners]
      .sort((a, b) => a.lane - b.lane)
      .forEach((r) => {
        const travel = (r.offset + sec * r.speed + Math.sin(sec * r.wobble) * 40) % loopW;
        const x = travel - size;
        const y = sceneH + laneH * (r.lane + 0.88);
        drawAnimal(ctx, r.animal, { x, y, size, phase: sec * (8 + r.wobble * 3), moving: !this.reduceMotion, face: r.face });
      });
  }
}
