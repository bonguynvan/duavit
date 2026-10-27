// The racer sprite cache: one set of poses per character type, a badge per player, inside a memory budget.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ANIMALS, findAnimal } from '../shared/catalog.js';
import { SpriteCache, frameOf } from '../public/js/spriteCache.js';

/** Anything-goes stub: every property is a callable that returns another stub. */
function stub() {
  const s = new Proxy(function noop() {}, {
    get: (_t, prop) => (prop === Symbol.toPrimitive ? () => 0 : s),
    set: () => true,
    apply: () => s,
  });
  return s;
}

/** Headless 2D context that tracks the transform (what the face capture reads) and ignores drawing. */
function fakeContext() {
  let m = [1, 0, 0, 1, 0, 0];
  const saved = [];
  const mul = ([a, b, c, d, e, f], [A, B, C, D, E, F]) => [a * A + c * B, b * A + d * B, a * C + c * D, b * C + d * D, a * E + c * F + e, b * E + d * F + f];
  const props = {};
  const own = {
    getTransform: () => ({ a: m[0], b: m[1], c: m[2], d: m[3], e: m[4], f: m[5] }),
    setTransform: (...args) => { const [t] = args; m = typeof t === 'object' ? [t.a, t.b, t.c, t.d, t.e, t.f] : args; },
    translate: (x, y) => { m = mul(m, [1, 0, 0, 1, x, y]); },
    scale: (x, y) => { m = mul(m, [x, 0, 0, y, 0, 0]); },
    rotate: (a) => { m = mul(m, [Math.cos(a), Math.sin(a), -Math.sin(a), Math.cos(a), 0, 0]); },
    save: () => { saved.push(m); },
    restore: () => { m = saved.pop() ?? m; },
  };
  return new Proxy(props, {
    get: (_t, prop) => own[prop] ?? (prop in props ? props[prop] : stub()),
    set: (_t, prop, value) => { props[prop] = value; return true; },
  });
}

const fakeCanvas = (width, height) => ({ width, height, getContext: () => fakeContext() });

/** The on-screen context: records blits. */
function screen(dpr = 1) {
  const blits = [];
  const own = {
    blits,
    getTransform: () => ({ a: dpr }),
    drawImage: (img, x, y, w, h) => blits.push({ img, x, y, w, h }),
  };
  return new Proxy(own, { get: (_t, prop) => (prop in own ? own[prop] : () => {}), set: () => true });
}

const duck = findAnimal('duck');
const face = (initials) => ({ initials, color: '#ff5a36' });
const opts = (over = {}) => ({ x: 100, y: 200, size: 60, phase: 0.1, moving: true, face: face('AB'), items: [], ...over });

test('racers of the same character share poses; each gets its own badge', () => {
  const cache = new SpriteCache({ createCanvas: fakeCanvas });
  const ctx = screen();
  ['AB', 'CD', 'EF'].forEach((initials) => cache.draw(ctx, duck, opts({ face: face(initials) })));
  cache.draw(ctx, duck, opts({ face: face('AB') }));
  assert.equal(cache.painted, 1, 'one pose painted for four draws');
  assert.equal(cache.faces.map.size, 3);
});

test('standing racers share a single pose whatever their phase', () => {
  const cache = new SpriteCache({ createCanvas: fakeCanvas });
  const ctx = screen();
  [0, 1, 2, 3].forEach((phase) => cache.draw(ctx, duck, opts({ phase, moving: false })));
  assert.equal(cache.painted, 1);
});

test('over the frame budget, a racer borrows a cached pose instead of painting', () => {
  const cache = new SpriteCache({ createCanvas: fakeCanvas });
  const ctx = screen();
  cache.draw(ctx, duck, opts({ phase: 0.1 }));
  cache.beginFrame(-1); // budget already spent
  cache.draw(ctx, duck, opts({ phase: 2 }));
  assert.equal(cache.painted, 1, 'borrowed the cached pose');
  cache.draw(ctx, findAnimal('cat'), opts());
  assert.equal(cache.painted, 2, 'nothing to borrow for a new character: paint it anyway');
});

test('warm() pre-paints every running pose of the cast while the budget lasts', () => {
  const cache = new SpriteCache({ createCanvas: fakeCanvas });
  cache.beginFrame(1000);
  cache.warm([duck, findAnimal('cat')], { size: 60 });
  assert.equal(cache.painted, 32);
  cache.beginFrame(-1);
  cache.warm([findAnimal('dog')], { size: 60 });
  assert.equal(cache.painted, 32, 'no budget left: nothing painted');
});

test('every character paints its face badge exactly once per pose, inside the sprite', () => {
  for (const animal of ANIMALS) {
    const cache = new SpriteCache({ createCanvas: fakeCanvas });
    const ctx = screen();
    cache.draw(ctx, animal, opts());
    const [pose] = cache.poses.map.values();
    assert.ok(pose.face, `"${animal.id}" never drew its badge`);
    assert.ok(pose.face.x > 0 && pose.face.x < pose.below.width && pose.face.y > 0 && pose.face.y < pose.below.height, `badge of "${animal.id}" outside its sprite`);
    assert.ok(pose.face.r > 2, `badge of "${animal.id}" too small`);
  }
});

test('hats drawn after the badge go to a second layer above it', () => {
  const cache = new SpriteCache({ createCanvas: fakeCanvas });
  const ctx = screen();
  cache.draw(ctx, findAnimal('nongDan'), opts()); // conical hat on top of the badge
  assert.equal(ctx.blits.length, 3, 'body, badge, hat');
  assert.ok([...cache.poses.map.values()][0].above);
});

test('accessories are blitted from cached glyphs', () => {
  const cache = new SpriteCache({ createCanvas: fakeCanvas });
  const ctx = screen();
  cache.draw(ctx, duck, opts({ items: ['👑', '🕶️'] }));
  cache.draw(ctx, duck, opts({ items: ['👑'], face: face('XY') }));
  assert.equal(cache.glyphs.map.size, 2);
});

test('poses wrap around and differ by pose, size and stillness', () => {
  assert.equal(frameOf(0.1), frameOf(0.1 + Math.PI * 4));
  assert.equal(frameOf(-0.1), 15);
  const cache = new SpriteCache({ createCanvas: fakeCanvas });
  const ctx = screen();
  cache.draw(ctx, duck, opts());
  cache.draw(ctx, duck, opts({ phase: 2 }));
  cache.draw(ctx, duck, opts({ size: 90 }));
  cache.draw(ctx, duck, opts({ moving: false }));
  assert.equal(cache.painted, 4);
});

test('sprites are painted in device pixels and drawn at canvas size', () => {
  const cache = new SpriteCache({ createCanvas: fakeCanvas });
  const ctx = screen(2);
  cache.draw(ctx, duck, opts({ size: 50 }));
  const [body] = ctx.blits;
  assert.equal(body.img.width, 160); // 160 units at 100 device px per 100 units
  assert.equal(body.w, 80);
});

test('the pose cache stays within its memory budget, dropping the least recently used', () => {
  const poseBytes = 96 * 84 * 4; // size 60 at 1x: ceil(160 * 0.6) x ceil(139 * 0.6) px, duck has no hat layer
  const cache = new SpriteCache({ createCanvas: fakeCanvas, maxBytes: poseBytes * 3 });
  const ctx = screen();
  const at = (phase) => opts({ phase });
  [0.1, 1, 2].forEach((p) => cache.draw(ctx, duck, at(p)));
  cache.draw(ctx, duck, at(0.1)); // touch: the pose at 1 is now the oldest
  cache.draw(ctx, duck, at(3));
  assert.ok(cache.bytes <= poseBytes * 3);
  cache.draw(ctx, duck, at(0.1));
  assert.equal(cache.painted, 4, 'recently used pose survived');
  cache.draw(ctx, duck, at(1));
  assert.equal(cache.painted, 5, 'oldest pose was evicted and repainted');
});
