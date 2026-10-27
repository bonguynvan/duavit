// Procedural cartoon drawing shared by host + player screens.
// Primitives live in paint.js, characters in painters*.js, backgrounds in scenery*.js.
import { ANIMAL_PAINTERS } from './painters.js';
import { HOLIDAY_HEAD_TOP, HOLIDAY_PAINTERS } from './painters-holiday.js';
import { FOOD_HEAD_TOP, FOOD_PAINTERS } from './painters-food.js';
import { PEOPLE_HEAD_TOP, PEOPLE_PAINTERS } from './painters-people.js';
import { SAIGON_HEAD_TOP, SAIGON_PAINTERS } from './painters-saigon.js';
import { WORLD_HEAD_TOP, WORLD_PAINTERS } from './painters-world.js';
import { TET_HEAD_TOP, TET_PAINTERS } from './painters-tet.js';
import { SCENERY } from './scenery.js';
import { HOLIDAY_SCENERY } from './scenery-holiday.js';
import { WORLD_SCENERY } from './scenery-world.js';
import { TET_SCENERY } from './scenery-tet.js';

export const PAINTERS = {
  ...ANIMAL_PAINTERS, ...HOLIDAY_PAINTERS, ...SAIGON_PAINTERS, ...PEOPLE_PAINTERS, ...WORLD_PAINTERS, ...FOOD_PAINTERS, ...TET_PAINTERS,
};

// Where accessories float: above the head/ears of each animal (animal units).
export const HEAD_TOP = {
  horse: [38, -104], rabbit: [22, -80], turtle: [40, -42], cat: [32, -74], dog: [34, -74], pig: [34, -62],
  penguin: [4, -79], camel: [42, -100], tiger: [36, -74], fox: [33, -80], cow: [36, -80], chicken: [16, -78],
  duck: [22, -62], elephant: [42, -83], frog: [26, -57], mouse: [30, -64], tank: [6, -72], tank843: [6, -72], helicopter: [12, -92], palace: [24, -64],
  ...HOLIDAY_HEAD_TOP, ...SAIGON_HEAD_TOP, ...PEOPLE_HEAD_TOP, ...WORLD_HEAD_TOP, ...FOOD_HEAD_TOP, ...TET_HEAD_TOP,
};
export const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
export const ITEM_SIZE = 22;

/** Falls pivot over the front feet (forward) or the hind feet (backward), in animal units. */
export const tiltPivot = (tilt) => (tilt > 0 ? 30 : -30);

/** Head anchor in canvas coordinates, for effects that target an animal. */
export function headPoint(animalId, x, y, size) {
  const [hx, top] = HEAD_TOP[animalId] ?? HEAD_TOP.horse;
  return { x: x + (hx * size) / 100, y: y + (top * size) / 100 };
}

/** Where each accessory floats above the head (animal units; text baseline 'bottom'). */
export function itemLayout(animalId, count, phase) {
  const [hx, top] = HEAD_TOP[animalId] ?? HEAD_TOP.horse;
  const startX = hx - ((count - 1) * ITEM_SIZE * 1.05) / 2;
  return Array.from({ length: count }, (_, i) => ({ x: startX + i * ITEM_SIZE * 1.05, y: top - 2 + Math.sin(phase * 0.5 + i * 1.7) * 2.5 }));
}

function drawItems(ctx, animalId, icons, phase) {
  ctx.font = `${ITEM_SIZE}px ${EMOJI_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'bottom';
  itemLayout(animalId, icons.length, phase).forEach(({ x, y }, i) => ctx.fillText(icons[i], x, y));
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ id: string, color: string }} animal
 * @param {{ x: number, y: number, size: number, phase?: number, moving?: boolean, face: { initials: string, color: string }, items?: string[], tilt?: number }} o
 *   items: accessory emoji shown above the head (purely cosmetic)
 *   tilt: radians; > 0 tips forward over the front feet (face-plant), < 0 falls back over the hind feet (slip)
 */
export function drawAnimal(ctx, animal, { x, y, size, phase = 0, moving = false, face, items = [], tilt = 0 }) {
  const painter = PAINTERS[animal.id] ?? PAINTERS.horse;
  const bob = moving ? Math.abs(Math.sin(phase)) * 3 : 0;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 100, size / 100);
  ctx.fillStyle = 'rgba(29, 26, 47, 0.18)';
  ctx.beginPath();
  ctx.ellipse(4, 2, 36, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  if (tilt !== 0) {
    const pivot = tiltPivot(tilt);
    ctx.translate(pivot, 0);
    ctx.rotate(tilt);
    ctx.translate(-pivot, 0);
  }
  ctx.translate(0, -bob);
  painter(ctx, animal.color, phase, moving, face);
  if (items.length > 0) drawItems(ctx, animal.id, items, phase);
  ctx.restore();
}

/** Draw a standalone animal centered in a small canvas (pickers, lobby lists). */
export function paintAnimalCard(canvas, animal, face, items = []) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, w, h);
  // Tallest animals (horse ears, camel head) reach ~105 units above the ground.
  const size = Math.min(w * 0.78, h * (items.length > 0 ? 0.68 : 0.8));
  drawAnimal(ctx, animal, { x: w * 0.44, y: h * 0.92, size, face, items });
}

export { drawScenery, paintMapCard } from './scenery.js';

// Holiday map backgrounds plug into the same table drawScenery() reads.
Object.assign(SCENERY, HOLIDAY_SCENERY, WORLD_SCENERY, TET_SCENERY);
export { drawFace, partyFlag, starFlag, INK, FONT } from './paint.js';
