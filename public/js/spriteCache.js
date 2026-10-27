// Racer sprites, built to keep 500-racer races smooth.
// Each pose of each character type is painted once with the vector painters, split in two layers around the
// face badge (body below, hats above), and turned into an ImageBitmap shared by every racer of that type.
// Per frame a racer costs a few drawImage calls: body, its own face badge, hats, accessories.
import { EMOJI_FONT, ITEM_SIZE, drawAnimal, drawFace, itemLayout, tiltPivot } from './draw.js';

const PHASE_PERIOD = Math.PI * 4; // legs cycle every 2π; a few painters bob at half that speed
const FRAMES = 16; // poses per period: 8 per stride
const STEP = PHASE_PERIOD / FRAMES;
// Sprite box in animal units (origin on the ground under the body).
const BOX = { left: -75, right: 85, top: -125, bottom: 14 };
const MAX_POSE_BYTES = 48 * 1024 * 1024;
const WARM_FILL = 0.8; // pre-painting stops at 80% of the budget, so it never evicts poses in use
const now = () => globalThis.performance?.now() ?? Date.now();
const MAX_SMALL = 3000; // face badges + accessory glyphs: tiny, so a plain entry cap is enough
const STYLE_KEYS = ['fillStyle', 'strokeStyle', 'lineWidth', 'lineCap', 'lineJoin', 'font', 'textAlign', 'textBaseline', 'globalAlpha'];
const DRAW_CALLS = new Set(['fill', 'stroke', 'fillRect', 'strokeRect', 'fillText', 'strokeText', 'drawImage']);

const defaultCanvas = (w, h) =>
  typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : Object.assign(document.createElement('canvas'), { width: w, height: h });
// ImageBitmaps blit about twice as fast as canvases (measured: 500 sprites 6 ms vs 12 ms per frame).
const toBitmap = (canvas) => (canvas.transferToImageBitmap ? canvas.transferToImageBitmap() : canvas);

const poseKey = (id, moving, frame, px) => `${id}|${moving ? 1 : 0}|${frame}|${px}`;

/** Pose index for a running phase (stable for negative phases too). */
export const frameOf = (phase) => ((Math.floor(phase / STEP) % FRAMES) + FRAMES) % FRAMES;

/**
 * A context that draws into `below` until the painter draws its face badge, then into `above`.
 * Transform, styles and the save() stack carry over, so the painter never notices the switch.
 */
function layeredContext(below, above) {
  const layers = { target: below, face: null, aboveUsed: false };
  const stack = [];
  const snapshot = () => ({ t: below.getTransform(), style: Object.fromEntries(STYLE_KEYS.map((key) => [key, below[key]])) });
  layers.ctx = new Proxy({}, {
    get(_, prop) {
      const { target } = layers;
      if (prop === 'save') return () => { if (target === below) stack.push(snapshot()); target.save(); };
      if (prop === 'restore') return () => { if (target === below) stack.pop(); target.restore(); };
      const value = target[prop];
      if (typeof value !== 'function') return value;
      return (...args) => {
        if (target === above && DRAW_CALLS.has(prop)) layers.aboveUsed = true;
        return value.apply(target, args);
      };
    },
    set(_, prop, value) {
      layers.target[prop] = value;
      return true;
    },
  });
  /** drawFace() hook: remember where the badge goes (sprite pixels), then switch layers. */
  layers.capture = (_ctx, x, y, r, ring) => {
    if (layers.face) return;
    const m = below.getTransform();
    layers.face = { x: m.a * x + m.c * y + m.e, y: m.b * x + m.d * y + m.f, r: r * Math.hypot(m.a, m.b), ring };
    stack.forEach((s) => {
      above.setTransform(s.t);
      Object.assign(above, s.style);
      above.save();
    });
    above.setTransform(m);
    STYLE_KEYS.forEach((key) => { above[key] = below[key]; });
    layers.target = above;
  };
  return layers;
}

class Lru {
  constructor(limit, sizeOf = () => 1) {
    this.limit = limit;
    this.sizeOf = sizeOf;
    this.map = new Map();
    this.used = 0;
  }

  has(key) {
    return this.map.has(key);
  }

  /** Value for `key` (marked as recently used), or undefined. */
  get(key) {
    const value = this.map.get(key);
    if (value !== undefined) {
      this.map.delete(key); // touch: move to the most-recently-used end
      this.map.set(key, value);
    }
    return value;
  }

  set(key, value) {
    this.map.set(key, value);
    this.used += this.sizeOf(value);
    for (const [old, v] of this.map) {
      if (this.used <= this.limit || old === key) break;
      this.map.delete(old);
      this.used -= this.sizeOf(v);
    }
    return value;
  }

  clear() {
    this.map.clear();
    this.used = 0;
  }
}

export class SpriteCache {
  /** @param {{ createCanvas?: (w: number, h: number) => object, maxBytes?: number }} [opts] */
  constructor({ createCanvas = defaultCanvas, maxBytes = MAX_POSE_BYTES } = {}) {
    this.createCanvas = createCanvas;
    this.poses = new Lru(maxBytes, (p) => p.bytes);
    this.faces = new Lru(MAX_SMALL);
    this.glyphs = new Lru(MAX_SMALL);
    this.painted = 0;
    this.deadline = Infinity; // painting budget for the current frame (see beginFrame)
    // Sprites painted before the web fonts arrived would keep the fallback font forever.
    globalThis.document?.fonts?.addEventListener?.('loadingdone', () => this.clear());
  }

  get bytes() {
    return this.poses.used;
  }

  clear() {
    this.poses.clear();
    this.faces.clear();
    this.glyphs.clear();
  }

  /**
   * Cap how long this frame may spend painting new sprites. Past it, a racer borrows the nearest pose
   * already cached: a 500-racer start would otherwise freeze the first frame for seconds.
   */
  beginFrame(budgetMs = 6) {
    this.deadline = now() + budgetMs;
  }

  /** Pre-paint the running poses of `animals` with whatever budget this frame has left (e.g. during the countdown). */
  warm(animals, { size, scale = 1 }) {
    const px = Math.max(1, Math.round(size * scale));
    for (const animal of animals) {
      for (let frame = 0; frame < FRAMES; frame += 1) {
        if (now() > this.deadline || this.poses.used > this.poses.limit * WARM_FILL) return;
        const key = poseKey(animal.id, true, frame, px);
        if (!this.poses.has(key)) this.poses.set(key, this.#paintPose(animal, { px, phase: frame * STEP, moving: true }));
      }
    }
  }

  /** Same picture as drawAnimal(), from cached bitmaps. */
  draw(ctx, animal, { x, y, size, phase = 0, moving = false, face, items = [], tilt = 0 }) {
    const scale = ctx.getTransform?.().a || 1; // device pixels per canvas unit (devicePixelRatio)
    const px = Math.max(1, Math.round(size * scale));
    const frame = moving ? frameOf(phase) : 0; // standing still: one pose is enough
    const pose = this.#pose(animal, moving, frame, px);

    const k = size / 100;
    const ox = BOX.left * k;
    const oy = BOX.top * k;
    ctx.save();
    ctx.translate(x, y);
    if (tilt !== 0) {
      const pivot = tiltPivot(tilt) * k;
      ctx.translate(pivot, 0);
      ctx.rotate(tilt);
      ctx.translate(-pivot, 0);
    }
    ctx.drawImage(pose.below, ox, oy, pose.below.width / scale, pose.below.height / scale);
    if (pose.face) {
      const faceKey = `${face.initials}|${face.color}|${pose.face.ring}|${Math.round(pose.face.r * 4)}`;
      let badge = this.faces.get(faceKey);
      if (!badge && now() <= this.deadline) badge = this.faces.set(faceKey, this.#paintFace(face, pose.face));
      if (badge) ctx.drawImage(badge, ox + (pose.face.x - badge.width / 2) / scale, oy + (pose.face.y - badge.height / 2) / scale, badge.width / scale, badge.height / scale);
      else drawFace(ctx, ox + pose.face.x / scale, oy + pose.face.y / scale, pose.face.r / scale, face, pose.face.ring); // cached on a later frame
    }
    if (pose.above) ctx.drawImage(pose.above, ox, oy, pose.above.width / scale, pose.above.height / scale);
    if (items.length > 0) this.#items(ctx, animal, items, { k, scale, frame, moving });
    ctx.restore();
  }

  #pose(animal, moving, frame, px) {
    const key = poseKey(animal.id, moving, frame, px);
    const cached = this.poses.get(key);
    if (cached) return cached;
    if (now() > this.deadline) {
      for (let d = 1; d < FRAMES; d += 1) {
        const near = this.poses.get(poseKey(animal.id, moving, (frame + FRAMES - d) % FRAMES, px));
        if (near) return near;
      }
    }
    return this.poses.set(key, this.#paintPose(animal, { px, phase: frame * STEP, moving }));
  }

  #paintPose(animal, { px, phase, moving }) {
    const k = px / 100;
    const w = Math.ceil((BOX.right - BOX.left) * k);
    const h = Math.ceil((BOX.bottom - BOX.top) * k);
    const below = this.createCanvas(w, h);
    const above = this.createCanvas(w, h);
    const layers = layeredContext(below.getContext('2d'), above.getContext('2d'));
    drawAnimal(layers.ctx, animal, { x: -BOX.left * k, y: -BOX.top * k, size: px, phase, moving, face: { capture: layers.capture } });
    this.painted += 1;
    return {
      below: toBitmap(below),
      above: layers.aboveUsed ? toBitmap(above) : null,
      face: layers.face,
      bytes: w * h * 4 * (layers.aboveUsed ? 2 : 1),
    };
  }

  /** One player's badge at the size a pose needs (device pixels). */
  #paintFace(face, { r, ring }) {
    const side = Math.ceil(r * 2.6 + 6);
    const canvas = this.createCanvas(side, side);
    drawFace(canvas.getContext('2d'), side / 2, side / 2, r, face, ring);
    return toBitmap(canvas);
  }

  /** Accessories float above the head like drawAnimal() draws them, from cached emoji bitmaps. */
  #items(ctx, animal, items, { k, scale, frame, moving }) {
    const phase = frame * STEP;
    const bob = moving ? Math.abs(Math.sin(phase)) * 3 : 0;
    const glyphPx = Math.max(1, Math.round(ITEM_SIZE * k * scale));
    itemLayout(animal.id, items.length, phase).forEach((spot, i) => {
      const glyphKey = `${items[i]}|${glyphPx}`;
      const glyph = this.glyphs.get(glyphKey) ?? this.glyphs.set(glyphKey, this.#paintGlyph(items[i], glyphPx));
      // Text baseline 'bottom' at spot.y: the glyph sits just above that line.
      ctx.drawImage(glyph, spot.x * k - glyph.width / 2 / scale, (spot.y - bob) * k - glyph.height / scale, glyph.width / scale, glyph.height / scale);
    });
  }

  #paintGlyph(icon, px) {
    const side = Math.ceil(px * 1.3);
    const canvas = this.createCanvas(side, side);
    const g = canvas.getContext('2d');
    g.font = `${px}px ${EMOJI_FONT}`;
    g.textAlign = 'center';
    g.textBaseline = 'bottom';
    g.fillText(icon, side / 2, side);
    return toBitmap(canvas);
  }
}
