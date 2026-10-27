// Characters for the Tết map. Same conventions as painters.js: facing right, origin on the ground under
// the body, ~100 units long. Every painter draws the player's badge exactly once (drawFace).
import { FONT, circle, drawFace, ellipse, leg, poly, roundedPath, shade, shape, stroke, swing, thinLine } from './paint.js';
import { nonLa } from './painters-holiday.js';

const SKIN = '#f5d0a9';
const GOLD = '#ffd23f';
const MAI = '#ffd23f';
const DAO = '#f7a8c4';
const BARK = '#6b4226';

/** Little blossoms along a branch; `sway` makes them shiver as the character runs. */
function blossoms(ctx, points, color, r, sway = 0) {
  points.forEach(([x, y], i) => circle(ctx, x + Math.sin(i * 2.1) * sway, y, r, color));
}

function lan(ctx, c, p, m, face) {
  // Lion dance: two dancers under a flowing cloth, the big lion head bobbing up front.
  const bob = Math.sin(p * 1.2) * (m ? 4 : 1.5);
  const wave = swing(p * 2, 0, m, 4);
  [[-42, Math.PI], [-28, 0], [0, Math.PI], [14, 0]].forEach(([x, o]) => leg(ctx, x, -30, 30, swing(p, o, m, 0.6), '#e9b44c', 7));
  shape(ctx, c, () => {
    ctx.moveTo(16, -62);
    ctx.quadraticCurveTo(-18, -72 + wave, -54, -58);
    ctx.lineTo(-58, -32);
    ctx.quadraticCurveTo(-20, -26 + wave * 0.5, 16, -30);
    ctx.closePath();
  });
  for (let i = 0; i < 7; i += 1) circle(ctx, -54 + i * 11, -31, 3, GOLD);
  stroke(ctx, GOLD, 4, () => {
    ctx.moveTo(-56, -50);
    ctx.quadraticCurveTo(-66, -56 - wave, -70, -46);
  });
  const hy = -64 + bob;
  [[12, hy - 16], [20, hy - 22], [30, hy - 25], [8, hy - 4], [12, hy + 8]].forEach(([x, y]) => circle(ctx, x, y, 7, GOLD));
  ellipse(ctx, 30, hy, 23, 21, c);
  ellipse(ctx, 42, hy + 15, 13, 7, '#ffffff');
  stroke(ctx, '#ffffff', 2, () => {
    ctx.moveTo(36, hy + 20);
    ctx.lineTo(34, hy + 28);
    ctx.moveTo(42, hy + 21);
    ctx.lineTo(42, hy + 30);
  });
  drawFace(ctx, 28, hy - 1, 10, face, GOLD); // the mirror on the lion's forehead
  poly(ctx, [[24, hy - 20], [30, hy - 36], [36, hy - 20]], '#7ac74f');
  [[44, hy - 9], [16, hy - 11]].forEach(([x, y]) => {
    circle(ctx, x, y, 5, '#ffffff');
    circle(ctx, x + 1.5, y, 2.2, '#1d1a2f');
  });
}

function ongDia(ctx, c, p, m, face) {
  // Ông Địa: a huge happy belly, waving his palm-leaf fan.
  [[-9, Math.PI], [9, 0]].forEach(([x, o]) => leg(ctx, x, -24, 22, swing(p, o, m, 0.5), BARK, 8));
  shape(ctx, c, () => roundedPath(ctx, -28, -66, 56, 44, 18));
  ellipse(ctx, 4, -42, 20, 18, SKIN);
  thinLine(ctx, shade(SKIN, -0.3), 1.6, () => ctx.arc(6, -40, 2.5, 0, Math.PI));
  stroke(ctx, SKIN, 5, () => {
    ctx.moveTo(-24, -54);
    ctx.lineTo(-34, -40);
  });
  const fan = swing(p * 1.5, 0, true, m ? 0.45 : 0.15);
  stroke(ctx, SKIN, 5, () => {
    ctx.moveTo(20, -58);
    ctx.lineTo(30, -74);
  });
  ctx.save();
  ctx.translate(30, -76);
  ctx.rotate(fan);
  ellipse(ctx, 6, -12, 12, 15, '#e9d18c', 0.3);
  thinLine(ctx, '#b8944f', 1.2, () => {
    for (let k = -2; k <= 2; k += 1) {
      ctx.moveTo(0, 0);
      ctx.lineTo(6 + k * 4, -24);
    }
  });
  ctx.restore();
  drawFace(ctx, 0, -80, 15, face, SKIN);
}

function banhChung(ctx, c, p, m, face) {
  // A square bánh chưng wrapped in dong leaves, tied with bamboo strings.
  [[-12, Math.PI], [12, 0]].forEach(([x, o]) => leg(ctx, x, -20, 20, swing(p, o, m, 0.75), BARK, 4));
  [[-26, -54], [26, -54]].forEach(([x, y], i) => leg(ctx, x, y, 14, i ? 1.9 + swing(p, 0, m, 0.4) : -1.9 - swing(p, 0, m, 0.4), BARK, 3));
  shape(ctx, c, () => roundedPath(ctx, -26, -76, 52, 56, 7));
  shape(ctx, shade(c, 0.12), () => roundedPath(ctx, -20, -70, 40, 44, 5), 1.5);
  stroke(ctx, '#e9d18c', 2.5, () => {
    ctx.moveTo(-9, -76);
    ctx.lineTo(-9, -20);
    ctx.moveTo(9, -76);
    ctx.lineTo(9, -20);
    ctx.moveTo(-26, -58);
    ctx.lineTo(26, -58);
    ctx.moveTo(-26, -38);
    ctx.lineTo(26, -38);
  });
  drawFace(ctx, 0, -48, 10, face, shade(c, -0.25));
}

function liXi(ctx, c, p, m, face) {
  // A red lucky envelope with a gold border and a gold "LỘC".
  [[-10, Math.PI], [10, 0]].forEach(([x, o]) => leg(ctx, x, -22, 22, swing(p, o, m, 0.75), BARK, 4));
  shape(ctx, c, () => roundedPath(ctx, -22, -88, 44, 66, 5));
  thinLine(ctx, GOLD, 1.6, () => roundedPath(ctx, -18, -84, 36, 58, 3));
  poly(ctx, [[-22, -86], [0, -66], [22, -86]], shade(c, -0.15));
  ctx.fillStyle = GOLD;
  ctx.font = `800 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LỘC', 0, -34);
  drawFace(ctx, 0, -60, 9, face, GOLD); // the gold seal
}

function chauMai(ctx, c, p, m, face) {
  // A potted mai tree trotting along, blossoms shivering.
  [[-10, Math.PI], [10, 0]].forEach(([x, o]) => leg(ctx, x, -20, 20, swing(p, o, m, 0.75), BARK, 4));
  const sway = m ? Math.sin(p * 2) * 1.2 : 0;
  stroke(ctx, BARK, 3, () => {
    ctx.moveTo(0, -48);
    ctx.quadraticCurveTo(-6, -70, -20, -88);
    ctx.moveTo(-2, -60);
    ctx.quadraticCurveTo(10, -78, 18, -96);
    ctx.moveTo(4, -70);
    ctx.quadraticCurveTo(0, -90, 4, -104);
  });
  blossoms(ctx, [[-20, -88], [-14, -80], [-8, -72], [18, -96], [12, -86], [8, -78], [4, -104], [2, -94], [-24, -94], [24, -100], [-4, -84], [14, -104]], MAI, 4, sway);
  shape(ctx, c, () => {
    ctx.moveTo(-22, -48);
    ctx.lineTo(22, -48);
    ctx.lineTo(15, -20);
    ctx.lineTo(-15, -20);
    ctx.closePath();
  });
  thinLine(ctx, '#2d5aa0', 1.6, () => {
    ctx.moveTo(-20, -42);
    ctx.lineTo(20, -42);
    ctx.moveTo(-16, -25);
    ctx.lineTo(16, -25);
  });
  drawFace(ctx, 0, -34, 8, face, '#2d5aa0');
}

function ongDo(ctx, c, p, m, face) {
  // The calligrapher in a brown áo dài and turban, brush raised, white beard.
  [[-4, Math.PI], [5, 0]].forEach(([x, o]) => leg(ctx, x, -32, 30, swing(p, o, m, 0.5), '#f7f3ea', 6));
  shape(ctx, c, () => {
    ctx.moveTo(-10, -70);
    ctx.lineTo(10, -70);
    ctx.lineTo(16, -26);
    ctx.lineTo(-16, -26);
    ctx.closePath();
  });
  thinLine(ctx, shade(c, -0.25), 1.4, () => {
    ctx.moveTo(0, -70);
    ctx.lineTo(0, -26);
  });
  stroke(ctx, c, 5, () => {
    ctx.moveTo(6, -64);
    ctx.lineTo(22, -56);
  });
  stroke(ctx, BARK, 2, () => {
    ctx.moveTo(22, -56);
    ctx.lineTo(34, -70 + swing(p, 0, m, 4));
  });
  circle(ctx, 35, -71 + swing(p, 0, m, 4), 2.5, '#1d1a2f');
  // A red scroll with a big character tucked under the other arm.
  shape(ctx, '#d62828', () => roundedPath(ctx, -26, -64, 8, 30, 2), 1.5);
  drawFace(ctx, 0, -82, 12, face, SKIN);
  shape(ctx, '#2b2d42', () => roundedPath(ctx, -13, -98, 26, 9, 4), 1.8);
  poly(ctx, [[-5, -71], [0, -60], [5, -71]], '#ffffff');
}

function aoDai(ctx, c, p, m, face) {
  // Cô Ba in a red áo dài and conical hat, holding up a peach-blossom branch.
  const flutter = swing(p * 1.5, 0, m, 4);
  [[-3, Math.PI], [4, 0]].forEach(([x, o]) => leg(ctx, x, -34, 32, swing(p, o, m, 0.55), '#fffaf0', 6));
  poly(ctx, [[-8, -46], [-2, -46], [-16, -18], [-28, -22 + flutter]], shade(c, -0.15));
  ellipse(ctx, -5, -78, 10, 15, '#1d1a2f');
  shape(ctx, c, () => roundedPath(ctx, -9, -70, 18, 26, 6));
  poly(ctx, [[-6, -46], [8, -46], [20, -20 + flutter], [4, -22]], c);
  stroke(ctx, SKIN, 3.5, () => {
    ctx.moveTo(6, -64);
    ctx.lineTo(18, -76);
  });
  stroke(ctx, BARK, 2.5, () => {
    ctx.moveTo(18, -76);
    ctx.quadraticCurveTo(26, -90, 32, -104);
    ctx.moveTo(24, -88);
    ctx.lineTo(36, -92);
  });
  blossoms(ctx, [[32, -104], [27, -96], [36, -92], [22, -86], [30, -88], [38, -100]], DAO, 3.5, m ? Math.sin(p * 2) : 0);
  drawFace(ctx, 0, -80, 11, face, '#1d1a2f');
  nonLa(ctx, 0, -80, 11);
}

function deCon(ctx, c, p, m, face) {
  // Dê con for the Year of the Goat: little horns, a goatee and a stubby tail.
  const dark = shade(c, -0.18);
  stroke(ctx, c, 5, () => {
    ctx.moveTo(-28, -40);
    ctx.lineTo(-34, -50 + swing(p * 2, 0, m, 4));
  });
  [[-18, Math.PI], [20, 0]].forEach(([x, o]) => leg(ctx, x, -30, 26, swing(p, o, m), dark, 6));
  ellipse(ctx, 0, -38, 28, 14, c);
  [[-10, 0], [12, Math.PI]].forEach(([x, o]) => leg(ctx, x, -30, 26, swing(p, o, m), c, 6));
  ellipse(ctx, 18, -56, 5, 11, dark, -0.6);
  drawFace(ctx, 32, -58, 14, face, c);
  stroke(ctx, '#a0896b', 3, () => {
    ctx.moveTo(26, -70);
    ctx.quadraticCurveTo(20, -84, 10, -80);
    ctx.moveTo(34, -71);
    ctx.quadraticCurveTo(30, -86, 20, -86);
  });
  poly(ctx, [[38, -46], [36, -34], [42, -44]], '#ffffff');
}

export const TET_PAINTERS = { lan, ongDia, banhChung, liXi, chauMai, ongDo, aoDai, deCon };

/** Where accessories float above each character (animal units). */
export const TET_HEAD_TOP = {
  lan: [30, -104], ongDia: [0, -98], banhChung: [0, -80], liXi: [0, -92],
  chauMai: [0, -110], ongDo: [0, -102], aoDai: [0, -104], deCon: [26, -90],
};
