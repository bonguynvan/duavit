// Characters for the holiday maps: Đền Hùng, Công trường, Ba Đình.
// Same conventions as painters.js: facing right, origin on the ground under the body, ~100 units long.
import { FONT, circle, drawFace, ellipse, leg, poly, roundedPath, shade, shape, stroke, swing } from './paint.js';
import { ANIMAL_PAINTERS } from './painters.js';

const SKIN = '#f5d0a9';
const TYRE = '#2b2d42';

function wheel(ctx, x, y, r, p, rim = '#9aa0aa') {
  circle(ctx, x, y, r, TYRE);
  circle(ctx, x, y, r * 0.5, rim);
  stroke(ctx, TYRE, 1.2, () => {
    ctx.moveTo(x + Math.cos(p) * r * 0.45, y + Math.sin(p) * r * 0.45);
    ctx.lineTo(x - Math.cos(p) * r * 0.45, y - Math.sin(p) * r * 0.45);
  });
}

/** Conical hat (nón lá) sitting on a face badge. */
export function nonLa(ctx, x, y, r) {
  poly(ctx, [[x - r * 1.5, y - r * 0.55], [x, y - r * 1.75], [x + r * 1.5, y - r * 0.55]], '#e9d18c');
}

/** Rider body (torso + arm) under a face badge; the face is drawn by the caller. */
function riderTorso(ctx, x, y, shirt, armTo) {
  shape(ctx, shirt, () => roundedPath(ctx, x - 6, y, 12, 16, 4), 2);
  stroke(ctx, SKIN, 3, () => {
    ctx.moveTo(x + 3, y + 4);
    ctx.lineTo(armTo[0], armTo[1]);
  });
}

// ---------------- Đền Hùng ----------------

function giong(ctx, c, p, m, face) {
  // Thánh Gióng on his iron horse, which breathes fire as it gallops.
  const dark = shade(c, -0.25);
  stroke(ctx, '#3b2416', 5, () => {
    ctx.moveTo(-32, -46);
    ctx.quadraticCurveTo(-48 + swing(p, 0, m, 4), -40, -44, -20);
  });
  [[-22, Math.PI], [24, 0]].forEach(([x, o]) => leg(ctx, x, -34, 30, swing(p, o, m), dark));
  ellipse(ctx, 0, -44, 34, 15, c);
  [[-14, 0], [16, Math.PI]].forEach(([x, o]) => leg(ctx, x, -34, 30, swing(p, o, m), c));
  stroke(ctx, c, 14, () => {
    ctx.moveTo(22, -48);
    ctx.lineTo(36, -66);
  });
  ellipse(ctx, 42, -68, 12, 8, c, 0.4);
  if (m) {
    const flicker = 1 + Math.sin(p * 5) * 0.2;
    ellipse(ctx, 60, -62, 10 * flicker, 5, '#ff9f1c', 0.3);
    ellipse(ctx, 56, -64, 6 * flicker, 3, '#ffd23f', 0.3);
  }
  // The boy-hero, bamboo whip raised.
  riderTorso(ctx, -2, -74, '#c0392b', [16, -86]);
  stroke(ctx, '#7ac74f', 2.5, () => {
    ctx.moveTo(16, -86);
    ctx.lineTo(30, -104 + swing(p, 0, m, 4));
  });
  drawFace(ctx, -2, -82, 11, face, '#c0392b');
}

function dragon(ctx, c, p, m, face) {
  // Lạc Long Quân: a golden-green dragon swimming through the air.
  ctx.translate(0, -18);
  const segments = 9;
  for (let i = segments; i >= 0; i -= 1) {
    const x = -48 + i * 9;
    const y = -26 + Math.sin(p * 1.2 - i * 0.7) * 7;
    circle(ctx, x, y, 9 - i * 0.25 + (i === 0 ? -3 : 0), i % 2 ? c : shade(c, 0.12));
    if (i % 2 === 0) poly(ctx, [[x - 4, y - 8], [x, y - 15], [x + 4, y - 8]], '#ffd23f');
  }
  const hy = -30 + Math.sin(p * 1.2 - 10 * 0.7) * 3;
  stroke(ctx, '#c9a227', 2, () => {
    ctx.moveTo(42, hy - 10);
    ctx.lineTo(38, hy - 24);
    ctx.moveTo(48, hy - 10);
    ctx.lineTo(52, hy - 24);
    ctx.moveTo(56, hy + 2);
    ctx.quadraticCurveTo(68, hy + 6, 66, hy + 16);
  });
  drawFace(ctx, 46, hy, 13, face, '#c9a227');
}

function lacBird(ctx, c, p, m, face) {
  // Âu Cơ's Lạc bird: long beak, crest, flapping wings, flying low.
  ctx.translate(0, -22);
  const flap = m ? Math.sin(p * 2) : 0.3;
  poly(ctx, [[-28, -30], [-52, -22], [-48, -34], [-56, -40], [-34, -36]], shade(c, -0.15));
  ellipse(ctx, -4, -30, 26, 11, c);
  shape(ctx, shade(c, 0.15), () => {
    ctx.moveTo(-14, -32);
    ctx.quadraticCurveTo(-2, -32 - 30 * flap, 14, -34 - 18 * flap);
    ctx.lineTo(8, -30);
    ctx.closePath();
  });
  stroke(ctx, c, 6, () => {
    ctx.moveTo(18, -34);
    ctx.quadraticCurveTo(28, -44, 32, -52);
  });
  poly(ctx, [[42, -56], [72, -52], [42, -48]], '#e3b34c');
  poly(ctx, [[30, -64], [26, -78], [36, -66]], '#ef476f');
  stroke(ctx, '#e3b34c', 2, () => {
    ctx.moveTo(-6, -20);
    ctx.lineTo(-12, -8);
    ctx.moveTo(2, -20);
    ctx.lineTo(-2, -8);
  });
  drawFace(ctx, 34, -55, 11, face, c);
}

function nineTuskElephant(ctx, c, p, m, face) {
  // Sơn Tinh's elephant with nine tusks and a royal saddle cloth.
  ANIMAL_PAINTERS.elephant(ctx, c, p, m, face);
  shape(ctx, '#c0392b', () => roundedPath(ctx, -22, -70, 34, 16, 5), 2);
  ctx.fillStyle = '#ffd23f';
  ctx.fillRect(-22, -57, 34, 3);
  stroke(ctx, '#fffaf0', 1.6, () => {
    for (let i = 0; i < 9; i += 1) {
      const ty = -50 + (i % 3) * 3;
      const tx = 50 + Math.floor(i / 3) * 3;
      ctx.moveTo(tx, ty);
      ctx.quadraticCurveTo(tx + 9, ty + 2, tx + 12, ty - 6);
    }
  });
}

// ---------------- Công trường ----------------

function excavator(ctx, c, p, m, face) {
  shape(ctx, TYRE, () => roundedPath(ctx, -40, -16, 64, 16, 8));
  for (let i = 0; i < 4; i += 1) wheel(ctx, -32 + i * 16, -8, 5.5, p * 2 + i);
  shape(ctx, c, () => ctx.rect(-36, -40, 50, 24));
  shape(ctx, '#bfe3ff', () => ctx.rect(-6, -54, 20, 16));
  shape(ctx, c, () => ctx.rect(-8, -56, 24, 3));
  drawFace(ctx, 4, -46, 9, face, shade(c, -0.2));
  // Arm digs up and down as it moves.
  const dig = m ? Math.sin(p) * 0.25 : 0;
  ctx.save();
  ctx.translate(14, -32);
  ctx.rotate(-0.5 + dig);
  shape(ctx, shade(c, -0.15), () => ctx.rect(0, -4, 36, 8));
  ctx.translate(36, 0);
  ctx.rotate(1.3 - dig);
  shape(ctx, shade(c, -0.15), () => ctx.rect(0, -3, 22, 6));
  poly(ctx, [[20, -6], [32, 0], [26, 10], [16, 6]], '#6b6f78');
  ctx.restore();
}

function roller(ctx, c, p, m, face) {
  circle(ctx, 30, -15, 15, '#9aa0aa');
  stroke(ctx, TYRE, 1.5, () => {
    for (let k = 0; k < 3; k += 1) {
      const a = p * 1.5 + (k * Math.PI * 2) / 3;
      ctx.moveTo(30, -15);
      ctx.lineTo(30 + Math.cos(a) * 13, -15 + Math.sin(a) * 13);
    }
  });
  wheel(ctx, -26, -11, 11, p * 2);
  shape(ctx, c, () => {
    ctx.moveTo(-38, -20);
    ctx.lineTo(16, -20);
    ctx.lineTo(24, -32);
    ctx.lineTo(-30, -38);
    ctx.closePath();
  });
  shape(ctx, shade(c, -0.15), () => ctx.rect(-30, -66, 4, 30));
  shape(ctx, shade(c, -0.15), () => ctx.rect(-4, -66, 4, 30));
  shape(ctx, c, () => ctx.rect(-34, -70, 38, 5));
  drawFace(ctx, -16, -48, 10, face, shade(c, -0.2));
}

function forklift(ctx, c, p, m, face) {
  wheel(ctx, -20, -10, 10, p * 2);
  wheel(ctx, 16, -10, 10, p * 2);
  shape(ctx, c, () => roundedPath(ctx, -34, -34, 56, 22, 5));
  shape(ctx, TYRE, () => ctx.rect(-28, -70, 3, 36));
  shape(ctx, TYRE, () => ctx.rect(0, -70, 3, 36));
  shape(ctx, TYRE, () => ctx.rect(-30, -72, 36, 4));
  drawFace(ctx, -12, -46, 10, face, shade(c, -0.2));
  // Mast + forks carrying a crate that bobs.
  const lift = m ? Math.abs(Math.sin(p * 0.8)) * 6 : 0;
  shape(ctx, '#6b6f78', () => ctx.rect(24, -64, 5, 54));
  shape(ctx, '#6b6f78', () => ctx.rect(29, -16 - lift, 22, 3));
  shape(ctx, '#c08a4b', () => ctx.rect(30, -38 - lift, 20, 22));
  stroke(ctx, '#8d5a2b', 1.2, () => {
    ctx.moveTo(30, -27 - lift);
    ctx.lineTo(50, -27 - lift);
  });
}

function worker(ctx, c, p, m, face) {
  // Worker in overalls pushing a wheelbarrow of bricks.
  wheel(ctx, 40, -8, 8, p * 2.5);
  shape(ctx, '#7f8c8d', () => {
    ctx.moveTo(14, -30);
    ctx.lineTo(48, -30);
    ctx.lineTo(42, -14);
    ctx.lineTo(20, -14);
    ctx.closePath();
  });
  ctx.fillStyle = '#c0392b';
  [[20, -38], [30, -38], [25, -45], [36, -38]].forEach(([x, y]) => ctx.fillRect(x, y, 9, 7));
  stroke(ctx, '#6b4226', 3, () => {
    ctx.moveTo(14, -26);
    ctx.lineTo(-4, -34);
  });
  [[-14, 0], [-6, Math.PI]].forEach(([x, o]) => leg(ctx, x, -30, 30, swing(p, o, m, 0.6), '#2d5aa0', 7));
  shape(ctx, c, () => roundedPath(ctx, -20, -58, 18, 30, 6), 2);
  stroke(ctx, SKIN, 3.5, () => {
    ctx.moveTo(-6, -50);
    ctx.lineTo(-2, -34);
  });
  drawFace(ctx, -11, -68, 11, face, shade(c, -0.2));
  shape(ctx, '#ffd23f', () => {
    ctx.arc(-11, -72, 12, Math.PI, 0);
    ctx.lineTo(3, -72);
    ctx.closePath();
  }, 2);
}

// ---------------- Ba Đình ----------------

function cyclo(ctx, c, p, m, face) {
  // Hanoi cyclo: passenger seat up front, the driver pedalling behind.
  wheel(ctx, 34, -9, 9, p * 2.5);
  wheel(ctx, 18, -9, 9, p * 2.5);
  wheel(ctx, -32, -11, 11, p * 2.5);
  shape(ctx, c, () => {
    ctx.moveTo(10, -18);
    ctx.lineTo(44, -18);
    ctx.lineTo(44, -40);
    ctx.quadraticCurveTo(30, -48, 12, -40);
    ctx.closePath();
  });
  shape(ctx, '#2f6b4f', () => {
    ctx.moveTo(8, -40);
    ctx.quadraticCurveTo(22, -66, 46, -42);
    ctx.lineTo(42, -40);
    ctx.quadraticCurveTo(24, -58, 12, -38);
    ctx.closePath();
  }, 1.5);
  stroke(ctx, '#3b3b3b', 2.5, () => {
    ctx.moveTo(10, -20);
    ctx.lineTo(-32, -11);
    ctx.lineTo(-22, -46);
  });
  const pedal = m ? Math.sin(p * 2) * 5 : 0;
  leg(ctx, -24, -40, 26, 0.3 + pedal * 0.04, '#2d5aa0', 5);
  riderTorso(ctx, -24, -62, '#f7f3ea', [0, -50]);
  drawFace(ctx, -24, -70, 10, face, '#e9d18c');
  nonLa(ctx, -24, -70, 10);
}

function flowerBike(ctx, c, p, m, face) {
  wheel(ctx, 26, -11, 11, p * 2.5);
  wheel(ctx, -24, -11, 11, p * 2.5);
  stroke(ctx, c, 2.5, () => {
    ctx.moveTo(-24, -11);
    ctx.lineTo(-4, -30);
    ctx.lineTo(18, -30);
    ctx.lineTo(26, -11);
    ctx.moveTo(-4, -30);
    ctx.lineTo(2, -11);
    ctx.moveTo(18, -30);
    ctx.lineTo(20, -40);
  });
  // Basket overflowing with flowers on the back.
  shape(ctx, '#c08a4b', () => ctx.rect(-44, -34, 26, 14), 1.5);
  const colors = ['#ef476f', '#ffd23f', '#ff9f1c', '#c840e9', '#fff'];
  for (let i = 0; i < 9; i += 1) circle(ctx, -42 + (i % 5) * 6, -38 - Math.floor(i / 5) * 6, 3.4, colors[i % colors.length]);
  leg(ctx, 0, -40, 26, m ? Math.sin(p * 2) * 0.4 : 0.2, '#2d5aa0', 5);
  riderTorso(ctx, 0, -62, '#fffaf0', [20, -42]);
  drawFace(ctx, 0, -70, 10, face, '#e9d18c');
  nonLa(ctx, 0, -70, 10);
}

function tram(ctx, c, p, m, face) {
  // Old Hanoi tram, pantograph sparking on the wire.
  wheel(ctx, -24, -7, 7, p * 2);
  wheel(ctx, 24, -7, 7, p * 2);
  shape(ctx, c, () => roundedPath(ctx, -44, -48, 88, 38, 6));
  shape(ctx, '#f7f3ea', () => ctx.rect(-44, -34, 88, 10), 1.5);
  for (let i = 0; i < 4; i += 1) shape(ctx, '#bfe3ff', () => ctx.rect(-38 + i * 16, -46, 12, 10), 1.5);
  shape(ctx, shade(c, -0.2), () => ctx.rect(-46, -52, 92, 5));
  stroke(ctx, '#2b2d42', 1.5, () => {
    ctx.moveTo(-6, -52);
    ctx.lineTo(8, -70);
    ctx.lineTo(-4, -78);
  });
  if (m && Math.sin(p * 4) > 0.6) circle(ctx, -4, -79, 2.5, '#ffd23f');
  ctx.fillStyle = '#fff';
  ctx.font = `800 7px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('BỜ HỒ', 0, -29);
  drawFace(ctx, 34, -41, 9, face, shade(c, -0.2));
}

function vespa(ctx, c, p, m, face) {
  wheel(ctx, 26, -9, 9, p * 2.5);
  wheel(ctx, -24, -9, 9, p * 2.5);
  shape(ctx, c, () => {
    ctx.moveTo(-40, -14);
    ctx.quadraticCurveTo(-40, -36, -18, -36);
    ctx.lineTo(4, -36);
    ctx.lineTo(10, -16);
    ctx.lineTo(24, -16);
    ctx.lineTo(30, -46);
    ctx.lineTo(36, -46);
    ctx.lineTo(34, -14);
    ctx.closePath();
  });
  shape(ctx, '#5c3a21', () => roundedPath(ctx, -26, -42, 26, 7, 3), 1.5);
  circle(ctx, 36, -46, 4, '#ffd23f');
  leg(ctx, -8, -42, 24, 0.5, '#2b2d42', 5);
  riderTorso(ctx, -10, -64, '#ef476f', [30, -48]);
  // Scarf fluttering behind.
  stroke(ctx, '#ffd23f', 3, () => {
    ctx.moveTo(-14, -60);
    ctx.quadraticCurveTo(-26, -62 + swing(p * 2, 0, m, 4), -36, -58);
  });
  drawFace(ctx, -10, -72, 10, face, shade(c, -0.2));
}

export const HOLIDAY_PAINTERS = {
  giong, dragon, lacBird, nineTuskElephant,
  excavator, roller, forklift, worker,
  cyclo, flowerBike, tram, vespa,
};

/** Where accessories float above each character (animal units). */
export const HOLIDAY_HEAD_TOP = {
  giong: [-2, -100], dragon: [46, -64], lacBird: [34, -90], nineTuskElephant: [42, -83],
  excavator: [4, -62], roller: [-16, -76], forklift: [-12, -78], worker: [-11, -90],
  cyclo: [-24, -96], flowerBike: [0, -96], tram: [0, -84], vespa: [-10, -88],
};
