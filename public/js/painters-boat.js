// The dragon boat of boat races (one per team; also a pick of its own on the river map).
// Same conventions as painters.js: facing right, origin on the water line under the hull, ~100 units.
// The team shows on the drummer's badge (face), drawn in the team colour.
import { INK, circle, drawFace, ellipse, poly, shade, shape, stroke, thinLine } from './paint.js';

const WOOD = '#8d5a2b';
const GOLD = '#f2b705';
const ROWERS = [-34, -10, 14];

function oar(ctx, x, p, m, i) {
  const pull = m ? Math.sin(p * 2 + i * 0.5) : 0.4; // everyone in time, a touch of lag down the boat
  const blade = { x: x - 10 - pull * 14, y: 12 + Math.max(0, -pull) * 3 };
  thinLine(ctx, '#5c3a1e', 3, () => { ctx.moveTo(x + 6, -30); ctx.lineTo(blade.x, blade.y); });
  ellipse(ctx, blade.x, blade.y, 6, 2.5, '#c08a4b', -0.5);
  if (m && pull < -0.6) for (let k = 0; k < 3; k += 1) circle(ctx, blade.x - 6 - k * 5, blade.y - 2 - k, 1.6, '#e8f6ff'); // splash
}

function rower(ctx, x, c, p, m, i) {
  const lean = m ? Math.sin(p * 2 + i * 0.5) * 3 : 0;
  shape(ctx, c, () => { ctx.moveTo(x - 8, -12); ctx.lineTo(x - 6 + lean, -34); ctx.lineTo(x + 6 + lean, -34); ctx.lineTo(x + 8, -12); ctx.closePath(); }, 2);
  circle(ctx, x + lean + 1, -42, 8, '#e9b98f');
  ellipse(ctx, x + lean, -48, 9, 4, '#2b2d42'); // hair
  shape(ctx, '#da251d', () => ctx.rect(x + lean - 8, -47, 17, 3), 1); // headband
  oar(ctx, x, p, m, i);
}

function thuyen(ctx, c, p, m, face) {
  const bob = m ? Math.sin(p * 2) * 1.2 : 0;
  ctx.translate(0, bob);
  // the tail curling up at the stern
  shape(ctx, GOLD, () => { ctx.moveTo(-70, -4); ctx.quadraticCurveTo(-86, -10, -80, -30); ctx.quadraticCurveTo(-74, -18, -62, -10); ctx.closePath(); }, 2);
  ROWERS.forEach((x, i) => rower(ctx, x, shade(c, -0.05), p, m, i));
  // the hull: long and low, scales painted along the side
  shape(ctx, WOOD, () => {
    ctx.moveTo(-72, -12);
    ctx.lineTo(64, -12);
    ctx.quadraticCurveTo(60, 4, 40, 6);
    ctx.lineTo(-56, 6);
    ctx.quadraticCurveTo(-70, 2, -72, -12);
    ctx.closePath();
  }, 2.5);
  shape(ctx, c, () => ctx.rect(-62, -10, 118, 6), 1.5);
  for (let x = -54; x < 52; x += 12) thinLine(ctx, shade(c, -0.3), 1.2, () => { ctx.arc(x, -7, 4, Math.PI * 0.1, Math.PI * 0.9); });
  // the dragon head at the bow
  shape(ctx, GOLD, () => { ctx.moveTo(58, -12); ctx.quadraticCurveTo(70, -30, 66, -48); ctx.lineTo(76, -46); ctx.quadraticCurveTo(80, -28, 66, -10); ctx.closePath(); }, 2);
  ellipse(ctx, 74, -52, 11, 8, GOLD);
  poly(ctx, [[80, -50], [94, -48], [82, -44]], '#da251d'); // tongue
  poly(ctx, [[68, -60], [64, -72], [74, -60]], '#da251d'); // horn
  circle(ctx, 76, -55, 2.2, INK);
  stroke(ctx, '#da251d', 1.5, () => { ctx.moveTo(84, -56); ctx.quadraticCurveTo(94, -64, 98, -58); });
  // the drummer at the front keeps time (his badge is the team's)
  const beat = m ? Math.max(0, Math.sin(p * 2)) * 5 : 0;
  ellipse(ctx, 44, -18, 9, 6, '#c1121f');
  thinLine(ctx, INK, 2, () => { ctx.moveTo(38, -40); ctx.lineTo(44, -24 - beat); });
  drawFace(ctx, 34, -44, 10, face, shade(c, -0.3));
}

export const BOAT_PAINTERS = { thuyen };

/** Where accessories float above the boat (animal units): over the drummer. */
export const BOAT_HEAD_TOP = { thuyen: [34, -60] };
