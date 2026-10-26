// Everyday people, offered on every regular map: farmers with conical hats, an ox cart, a flag-shirt bro.
// Same conventions as painters.js: facing right, origin on the ground under the body, ~100 units long.
import { circle, drawFace, ellipse, leg, poly, roundedPath, shade, shape, stroke, swing } from './paint.js';
import { nonLa } from './painters-holiday.js';
import { star } from './painters-world.js';

const SKIN = '#f5d0a9';

function nongDan(ctx, c, p, m, face) {
  // Farmer in a conical hat, trotting with a shoulder pole and two baskets of rice.
  const bounce = m ? Math.sin(p * 2) * 2 : 0;
  leg(ctx, -4, -34, 32, swing(p, Math.PI, m, 0.6), shade('#2b2d42', 0.1), 7);
  leg(ctx, 4, -34, 32, swing(p, 0, m, 0.6), '#2b2d42', 7);
  stroke(ctx, '#c08a4b', 3, () => {
    ctx.moveTo(-40, -64 + bounce);
    ctx.lineTo(40, -64 - bounce);
  });
  [[-36, bounce], [36, -bounce]].forEach(([x, dy]) => {
    stroke(ctx, '#8d5a2b', 1.2, () => {
      ctx.moveTo(x - 7, -40 + dy);
      ctx.lineTo(x, -64 + dy);
      ctx.lineTo(x + 7, -40 + dy);
    });
    shape(ctx, '#d9a441', () => {
      ctx.moveTo(x - 9, -40 + dy);
      ctx.lineTo(x + 9, -40 + dy);
      ctx.lineTo(x + 7, -26 + dy);
      ctx.lineTo(x - 7, -26 + dy);
      ctx.closePath();
    }, 2);
    ellipse(ctx, x, -41 + dy, 8, 3, '#fff6d6');
  });
  shape(ctx, c, () => roundedPath(ctx, -11, -66, 22, 34, 7));
  stroke(ctx, SKIN, 4, () => {
    ctx.moveTo(6, -60);
    ctx.lineTo(16, -64);
  });
  drawFace(ctx, 0, -78, 12, face, '#e9d18c');
  nonLa(ctx, 0, -78, 12);
}

function xeBo(ctx, c, p, m, face) {
  // Farmer riding a wooden ox cart; the ox plods along in front.
  const ox = '#8d5a2b';
  const dark = shade(ox, -0.2);
  [[18, Math.PI], [42, 0]].forEach(([x, o]) => leg(ctx, x, -24, 22, swing(p, o, m, 0.5), dark, 6));
  ellipse(ctx, 30, -32, 18, 10, ox);
  [[22, 0], [38, Math.PI]].forEach(([x, o]) => leg(ctx, x, -24, 22, swing(p, o, m, 0.5), ox, 6));
  ellipse(ctx, 50, -38, 7, 6, ox, 0.3);
  stroke(ctx, '#fff6e5', 2, () => {
    ctx.moveTo(48, -43);
    ctx.quadraticCurveTo(44, -52, 50, -54);
    ctx.moveTo(53, -43);
    ctx.quadraticCurveTo(58, -50, 54, -54);
  });
  circle(ctx, 53, -39, 1.4, '#1d1a2f');
  // Yoke + shafts tying the ox to the cart.
  stroke(ctx, '#c08a4b', 2.5, () => {
    ctx.moveTo(-6, -30);
    ctx.lineTo(24, -40);
  });
  // The cart: big spoked wheel, plank bed, woven roof.
  const spin = m ? p * 1.5 : 0;
  circle(ctx, -24, -14, 14, '#c08a4b');
  stroke(ctx, '#6b4226', 1.5, () => {
    for (let k = 0; k < 4; k += 1) {
      const a = spin + (k * Math.PI) / 4;
      ctx.moveTo(-24 + Math.cos(a) * 12, -14 + Math.sin(a) * 12);
      ctx.lineTo(-24 - Math.cos(a) * 12, -14 - Math.sin(a) * 12);
    }
  });
  circle(ctx, -24, -14, 3, '#6b4226');
  shape(ctx, '#a8743f', () => roundedPath(ctx, -48, -34, 46, 9, 2), 2);
  shape(ctx, '#d9b56b', () => {
    ctx.moveTo(-48, -36);
    ctx.quadraticCurveTo(-25, -58, -2, -36);
    ctx.closePath();
  }, 2);
  shape(ctx, c, () => roundedPath(ctx, -12, -58, 16, 22, 5), 2);
  stroke(ctx, SKIN, 3, () => {
    ctx.moveTo(-2, -52);
    ctx.lineTo(12, -44);
  });
  drawFace(ctx, -4, -66, 10, face, '#e9d18c');
  nonLa(ctx, -4, -66, 10);
}

function flagBro(ctx, c, p, m, face) {
  // Stars-and-stripes outfit, waving a small flag. A generic look, not any particular hero.
  const navy = '#1f3a7a';
  leg(ctx, -4, -36, 34, swing(p, Math.PI, m, 0.7), shade(navy, 0.15), 8);
  leg(ctx, 4, -36, 34, swing(p, 0, m, 0.7), navy, 8);
  [[-1, -24], [4, -14]].forEach(([x, y]) => star(ctx, x, y, 2.6, '#ffffff'));
  shape(ctx, '#ffffff', () => roundedPath(ctx, -11, -68, 22, 34, 7));
  ctx.save();
  ctx.beginPath();
  roundedPath(ctx, -11, -68, 22, 34, 7);
  ctx.clip();
  ctx.fillStyle = c;
  for (let y = -68; y < -34; y += 8) ctx.fillRect(-11, y, 22, 4);
  ctx.restore();
  shape(ctx, 'transparent', () => roundedPath(ctx, -11, -68, 22, 34, 7));
  stroke(ctx, SKIN, 4, () => {
    ctx.moveTo(6, -62);
    ctx.lineTo(14, -84);
  });
  const flap = swing(p * 2, 0, m, 2);
  stroke(ctx, '#6b4226', 1.5, () => {
    ctx.moveTo(14, -80);
    ctx.lineTo(14, -104);
  });
  poly(ctx, [[14, -104], [32, -102 + flap], [32, -90 + flap], [14, -92]], '#ffffff');
  ctx.fillStyle = c;
  [-101, -97, -93].forEach((y) => ctx.fillRect(15, y + flap * 0.5, 16, 1.6));
  ctx.fillStyle = navy;
  ctx.fillRect(15, -103 + flap * 0.3, 7, 5);
  drawFace(ctx, 0, -78, 12, face, navy);
  shape(ctx, navy, () => {
    ctx.arc(0, -84, 13, Math.PI * 1.08, Math.PI * 1.92);
    ctx.closePath();
  }, 2);
  shape(ctx, navy, () => roundedPath(ctx, 8, -88, 12, 4, 2), 1.5);
}

export const PEOPLE_PAINTERS = { nongDan, xeBo, flagBro };

/** Where accessories float above each character (animal units). */
export const PEOPLE_HEAD_TOP = { nongDan: [0, -104], xeBo: [-4, -90], flagBro: [-6, -100] };
