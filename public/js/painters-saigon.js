// More Saigon characters for the Dinh Độc Lập map: a tangled power pole and a mini Notre-Dame cathedral.
// Same conventions as painters.js: facing right, origin on the ground under the body, ~100 units long.
import { drawFace, leg, poly, roundedPath, shade, shape, stroke, swing, thinLine } from './paint.js';

const LEG = '#3b2416';

function cotDien(ctx, c, p, m, face) {
  // Concrete pole hopping on two feet, wearing Saigon's famous ball of tangled cables.
  const hop = m ? Math.abs(Math.sin(p)) * 5 : 0;
  ctx.translate(0, -hop);
  [[-6, Math.PI], [6, 0]].forEach(([x, o]) => leg(ctx, x, -14, 14, swing(p, o, m, 0.7), LEG, 5));
  shape(ctx, c, () => {
    ctx.moveTo(-7, -14);
    ctx.lineTo(7, -14);
    ctx.lineTo(4, -100);
    ctx.lineTo(-4, -100);
    ctx.closePath();
  });
  shape(ctx, shade(c, -0.2), () => ctx.rect(-26, -94, 52, 4), 1.5);
  // Transformer can + loose cables swinging off both sides.
  shape(ctx, '#6b6f78', () => roundedPath(ctx, 6, -86, 12, 16, 3), 1.5);
  const sway = swing(p, 0, m, 4);
  thinLine(ctx, '#2b2d42', 1.3, () => {
    for (let k = 0; k < 5; k += 1) {
      const y = -92 + k * 2;
      ctx.moveTo(-26, y);
      ctx.quadraticCurveTo(-44, y + 14 + sway + k * 2, -54, y + 6 + k);
      ctx.moveTo(26, y);
      ctx.quadraticCurveTo(42, y + 12 - sway + k * 2, 52, y + 4 + k);
    }
  });
  // The cable knot: a scribble ball of wire.
  ctx.save();
  ctx.translate(-2, -70);
  thinLine(ctx, '#2b2d42', 1.4, () => {
    for (let k = 0; k < 9; k += 1) {
      const a = k * 0.7 + (m ? p * 0.3 : 0);
      ctx.moveTo(Math.cos(a) * 15, Math.sin(a) * 8);
      ctx.quadraticCurveTo(Math.cos(a + 2) * 4, Math.sin(a + 2) * 12, Math.cos(a + 3.5) * 15, Math.sin(a + 3.5) * 9);
    }
  });
  ctx.restore();
  drawFace(ctx, 0, -42, 10, face, shade(c, -0.25));
}

function nhaTho(ctx, c, p, m, face) {
  // Mini Notre-Dame cathedral: red-brick front, rose window, two spires, toddling on little legs.
  const dark = shade(c, -0.2);
  [[-18, Math.PI], [18, 0]].forEach(([x, o]) => leg(ctx, x, -16, 16, swing(p, o, m, 0.7), LEG, 5));
  shape(ctx, c, () => ctx.rect(-36, -60, 72, 44));
  [-28, 28].forEach((x) => {
    shape(ctx, c, () => ctx.rect(x - 9, -82, 18, 66));
    poly(ctx, [[x - 10, -82], [x, -104], [x + 10, -82]], '#6b6f78');
    stroke(ctx, '#2b2d42', 1.2, () => {
      ctx.moveTo(x, -104);
      ctx.lineTo(x, -112);
      ctx.moveTo(x - 3, -109);
      ctx.lineTo(x + 3, -109);
    });
    shape(ctx, '#3b2a2a', () => {
      ctx.moveTo(x - 4, -60);
      ctx.lineTo(x - 4, -70);
      ctx.arc(x, -70, 4, Math.PI, 0);
      ctx.lineTo(x + 4, -60);
      ctx.closePath();
    }, 1.2);
  });
  poly(ctx, [[-20, -60], [0, -74], [20, -60]], dark);
  shape(ctx, '#3b2a2a', () => {
    ctx.moveTo(-8, -16);
    ctx.lineTo(-8, -28);
    ctx.arc(0, -28, 8, Math.PI, 0);
    ctx.lineTo(8, -16);
    ctx.closePath();
  }, 1.5);
  drawFace(ctx, 0, -44, 10, face, dark); // the rose window is the player's badge
}

export const SAIGON_PAINTERS = { cotDien, nhaTho };

/** Where accessories float above each character (animal units). */
export const SAIGON_HEAD_TOP = { cotDien: [0, -112], nhaTho: [0, -116] };
