// Characters for Phố siêu anh hùng and Vòng quanh thế giới. Our own drawings with fun look-alike nicknames.
// Same conventions as painters.js: facing right, origin on the ground under the body, ~100 units long.
import { FONT, circle, drawFace, ellipse, leg, roundedPath, shade, shape, stroke, swing, thinLine } from './paint.js';
import { nonLa } from './painters-holiday.js';

const SKIN = '#f5d0a9';
const TYRE = '#2b2d42';

/** Five-point star centred on (x, y), with a thin outline that suits small sizes. */
export function star(ctx, x, y, r, fill) {
  shape(ctx, fill, () => {
    for (let i = 0; i < 10; i += 1) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rr = i % 2 === 0 ? r : r * 0.45;
      ctx.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr);
    }
    ctx.closePath();
  }, Math.max(1, r * 0.18));
}

// ---------------- Phố siêu anh hùng ----------------

function starShield(ctx, c, p, m, face) {
  // Navy suit, red boots, round red-and-gold shield carried in front.
  const dark = shade(c, -0.22);
  leg(ctx, -4, -36, 34, swing(p, Math.PI, m, 0.7), dark, 8);
  leg(ctx, -6, -62, 22, -0.5 + swing(p, 0, m, 0.5), dark, 6);
  leg(ctx, 4, -36, 34, swing(p, 0, m, 0.7), c, 8);
  shape(ctx, c, () => roundedPath(ctx, -12, -68, 24, 36, 8));
  shape(ctx, '#c0392b', () => ctx.rect(-12, -42, 24, 5), 1.5);
  star(ctx, 0, -56, 6, '#ffd23f');
  const lift = swing(p, 0, m, 3);
  stroke(ctx, c, 6, () => {
    ctx.moveTo(6, -60);
    ctx.lineTo(20, -52 + lift);
  });
  circle(ctx, 27, -52 + lift, 17, '#c0392b');
  circle(ctx, 27, -52 + lift, 12, '#ffd23f');
  circle(ctx, 27, -52 + lift, 8, '#c0392b');
  star(ctx, 27, -52 + lift, 6, '#ffd23f');
  drawFace(ctx, 0, -80, 12, face, c);
  shape(ctx, c, () => {
    ctx.arc(0, -86, 13.5, Math.PI * 1.1, Math.PI * 1.9);
    ctx.closePath();
  }, 2);
}

function nonLaHero(ctx, c, p, m, face) {
  // Flies flat out, fist first, red cape snapping behind, conical hat holding on somehow.
  ctx.translate(0, -26 + Math.sin(p * 0.6) * 3);
  const wave = swing(p * 2, 0, m, 5);
  shape(ctx, '#c0392b', () => {
    ctx.moveTo(4, -42);
    ctx.quadraticCurveTo(-26, -50 + wave, -52, -38 - wave);
    ctx.lineTo(-46, -26 + wave);
    ctx.quadraticCurveTo(-22, -30, 4, -32);
    ctx.closePath();
  });
  const kick = swing(p, 0, m, 0.12);
  leg(ctx, -12, -36, 30, -Math.PI / 2 + 0.12 + kick, shade(c, -0.2), 8);
  leg(ctx, -12, -33, 30, -Math.PI / 2 - 0.05 - kick, c, 8);
  ellipse(ctx, 4, -36, 20, 10, c);
  shape(ctx, '#ffd23f', () => ctx.rect(-10, -38, 5, 10), 1.5);
  stroke(ctx, c, 6, () => {
    ctx.moveTo(16, -40);
    ctx.lineTo(46, -46);
  });
  circle(ctx, 48, -46, 5, SKIN);
  drawFace(ctx, 26, -52, 12, face, c);
  nonLa(ctx, 26, -52, 12);
}

function robot(ctx, c, p, m, face) {
  const dark = shade(c, -0.25);
  // Jet pack on the back, flaming while it runs.
  shape(ctx, dark, () => roundedPath(ctx, -32, -62, 10, 26, 3));
  if (m) {
    const flicker = 1 + Math.sin(p * 5) * 0.25;
    ellipse(ctx, -30, -28, 5, 9 * flicker, '#ff9f1c');
    ellipse(ctx, -30, -30, 3, 5 * flicker, '#ffd23f');
  }
  leg(ctx, -10, -30, 26, swing(p, Math.PI, m, 0.5), dark, 10);
  leg(ctx, -14, -58, 22, -0.3 + swing(p, 0, m, 0.5), dark, 7);
  leg(ctx, 10, -30, 26, swing(p, 0, m, 0.5), c, 10);
  shape(ctx, c, () => roundedPath(ctx, -22, -64, 44, 36, 6));
  const blink = Math.sin(p * 3) > 0;
  [['#ef476f', -12], ['#ffd23f', -4], ['#7ac74f', 4]].forEach(([color, x], i) => circle(ctx, x, -48, 2.6, blink || i === 1 ? color : dark));
  shape(ctx, dark, () => ctx.rect(-14, -40, 28, 4), 1.2);
  leg(ctx, 16, -58, 22, 0.6 + swing(p, Math.PI, m, 0.5), c, 7);
  shape(ctx, c, () => roundedPath(ctx, -12, -94, 32, 28, 6));
  drawFace(ctx, 4, -80, 10, face, dark);
  stroke(ctx, dark, 2, () => {
    ctx.moveTo(4, -94);
    ctx.lineTo(4, -102);
  });
  circle(ctx, 4, -104, 3.5, blink ? '#ff5a36' : '#ffd23f');
}

function ninja(ctx, c, p, m, face) {
  // Leaning sprint, arms swept back, sword on the back, headband tails streaming.
  stroke(ctx, '#9aa0aa', 2.5, () => {
    ctx.moveTo(-20, -40);
    ctx.lineTo(10, -74);
  });
  stroke(ctx, '#6b4226', 3, () => {
    ctx.moveTo(-24, -36);
    ctx.lineTo(-18, -43);
  });
  leg(ctx, -2, -34, 32, swing(p, Math.PI, m, 0.8), shade(c, 0.12), 8);
  leg(ctx, 4, -34, 32, swing(p, 0, m, 0.8), c, 8);
  shape(ctx, c, () => {
    ctx.moveTo(-10, -34);
    ctx.lineTo(10, -34);
    ctx.lineTo(16, -64);
    ctx.lineTo(-4, -66);
    ctx.closePath();
  });
  shape(ctx, '#e63946', () => ctx.rect(-10, -42, 22, 4), 1.2);
  const trail = swing(p * 2, 0, m, 3);
  leg(ctx, 8, -60, 26, -1.3 + trail * 0.02, shade(c, 0.12), 6);
  leg(ctx, 10, -56, 26, -1.15 - trail * 0.02, c, 6);
  stroke(ctx, '#e63946', 3, () => {
    ctx.moveTo(0, -84);
    ctx.quadraticCurveTo(-14, -88 + trail, -28, -82 - trail);
    ctx.moveTo(0, -82);
    ctx.quadraticCurveTo(-12, -80 - trail, -24, -74 + trail);
  });
  drawFace(ctx, 10, -76, 12, face, c);
  stroke(ctx, '#e63946', 3, () => ctx.arc(10, -76, 13.5, Math.PI * 1.1, Math.PI * 1.9));
}

function buiCay(ctx, c, p, m, face) {
  // A chatty little bush waddling on its roots, waving twig arms and blurting out a word now and then.
  [[-8, Math.PI], [8, 0]].forEach(([x, o]) => leg(ctx, x, -24, 22, swing(p, o, m, 0.6), '#6b4226', 5));
  const wave = swing(p * 1.5, 0, m, 0.5);
  leg(ctx, -22, -50, 18, -2.2 + wave, '#6b4226', 3.5);
  leg(ctx, 22, -54, 18, 2.2 - wave, '#6b4226', 3.5);
  [[-16, -40, 15], [16, -42, 15], [0, -32, 16], [-10, -60, 15], [12, -62, 15], [0, -74, 13]].forEach(([x, y, r], i) => {
    circle(ctx, x, y, r, i % 2 ? c : shade(c, -0.08));
  });
  [[-18, -48], [8, -70], [20, -36]].forEach(([x, y]) => circle(ctx, x, y, 2.6, '#ef476f'));
  drawFace(ctx, 4, -50, 11, face, shade(c, -0.3));
  if (m && Math.sin(p * 0.4) > 0.55) {
    shape(ctx, '#ffffff', () => {
      roundedPath(ctx, 14, -102, 30, 15, 6);
      ctx.moveTo(18, -87);
      ctx.lineTo(16, -80);
      ctx.lineTo(24, -87);
    }, 1.5);
    ctx.fillStyle = '#1d1a2f';
    ctx.font = `800 9px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('Tui nè!', 29, -94);
  }
}

// ---------------- Vòng quanh thế giới ----------------

function astronaut(ctx, c, p, m, face) {
  // Moon-walk: slow, big hops.
  ctx.translate(0, -(m ? Math.abs(Math.sin(p * 0.5)) * 10 : 0));
  const dark = shade(c, -0.14);
  shape(ctx, dark, () => roundedPath(ctx, -26, -70, 14, 32, 4));
  leg(ctx, -6, -34, 30, swing(p, Math.PI, m, 0.4), dark, 11);
  leg(ctx, 6, -34, 30, swing(p, 0, m, 0.4), c, 11);
  shape(ctx, c, () => roundedPath(ctx, -14, -70, 30, 40, 10));
  shape(ctx, '#5b6cff', () => roundedPath(ctx, -6, -56, 16, 10, 2), 1.2);
  [['#ef476f', -2], ['#ffd23f', 3], ['#7ac74f', 8]].forEach(([color, x]) => circle(ctx, x, -51, 1.8, color));
  leg(ctx, 12, -62, 22, 1 + swing(p, Math.PI, m, 0.3), c, 9);
  circle(ctx, 2, -82, 17, c);
  circle(ctx, 2, -82, 13, '#1d3557');
  drawFace(ctx, 2, -82, 10, face, '#ffd23f');
  stroke(ctx, '#ffffff', 1.5, () => ctx.arc(2, -82, 15, Math.PI * 1.2, Math.PI * 1.45));
}

function mummy(ctx, c, p, m, face) {
  // Stiff-legged shuffle, arms straight out, one loose bandage trailing.
  const wave = swing(p * 2, 0, m, 4);
  stroke(ctx, c, 3, () => {
    ctx.moveTo(-8, -46);
    ctx.quadraticCurveTo(-28, -42 + wave, -44, -30 - wave);
  });
  leg(ctx, -4, -34, 32, swing(p, Math.PI, m, 0.3), shade(c, -0.12), 9);
  leg(ctx, 6, -34, 32, swing(p, 0, m, 0.3), c, 9);
  shape(ctx, c, () => roundedPath(ctx, -12, -68, 26, 36, 8));
  thinLine(ctx, shade(c, -0.3), 1.2, () => {
    for (let y = -62; y < -34; y += 6) {
      ctx.moveTo(-10, y + 3);
      ctx.lineTo(12, y);
    }
  });
  const reach = swing(p, 0, m, 0.08);
  leg(ctx, 8, -64, 30, Math.PI / 2 - 0.05 + reach, shade(c, -0.12), 7);
  leg(ctx, 8, -58, 30, Math.PI / 2 - reach, c, 7);
  drawFace(ctx, 2, -80, 12, face, c);
  stroke(ctx, c, 3, () => {
    ctx.moveTo(-11, -88);
    ctx.lineTo(14, -92);
    ctx.moveTo(-12, -72);
    ctx.lineTo(14, -70);
  });
}

function cowboy(ctx, c, p, m, face) {
  // Running, lasso spinning overhead.
  const jeans = '#3b5998';
  leg(ctx, -4, -36, 34, swing(p, Math.PI, m, 0.7), shade(jeans, -0.15), 8);
  leg(ctx, 4, -36, 34, swing(p, 0, m, 0.7), jeans, 8);
  shape(ctx, '#e9d18c', () => roundedPath(ctx, -11, -68, 22, 34, 7));
  shape(ctx, c, () => {
    ctx.moveTo(-11, -66);
    ctx.lineTo(-3, -66);
    ctx.lineTo(-3, -36);
    ctx.lineTo(-11, -36);
    ctx.closePath();
  }, 1.5);
  star(ctx, 5, -56, 4, '#ffd23f');
  stroke(ctx, '#e9d18c', 5, () => {
    ctx.moveTo(6, -62);
    ctx.lineTo(14, -90);
  });
  const spin = m ? p * 2 : 0.4;
  stroke(ctx, '#c9a27a', 2, () => {
    ctx.moveTo(14, -92);
    ctx.lineTo(16 + Math.cos(spin) * 14, -100);
    ctx.moveTo(16 + 16, -100);
    ctx.ellipse(16, -100, 16, 4.5, Math.sin(spin) * 0.15, 0, Math.PI * 2);
  });
  drawFace(ctx, 0, -78, 12, face, c);
  ellipse(ctx, 0, -88, 21, 4, '#8d5a2b');
  shape(ctx, '#8d5a2b', () => roundedPath(ctx, -9, -102, 18, 15, 5));
}

function doubleDecker(ctx, c, p, m, face) {
  // Red double-decker tour bus; the driver's face peeks out of the front window.
  wheel(ctx, -28, -9, 9, p * 2);
  wheel(ctx, 28, -9, 9, p * 2);
  shape(ctx, c, () => roundedPath(ctx, -48, -76, 96, 66, 8));
  shape(ctx, '#ffffff', () => ctx.rect(-48, -48, 96, 4), 1.2);
  for (let i = 0; i < 5; i += 1) {
    shape(ctx, '#bfe3ff', () => roundedPath(ctx, -42 + i * 18, -70, 14, 15, 3), 1.5);
    if (i < 4) shape(ctx, '#bfe3ff', () => roundedPath(ctx, -42 + i * 18, -40, 14, 14, 3), 1.5);
  }
  shape(ctx, '#2b2d42', () => ctx.rect(-40, -24, 64, 6), 1);
  ctx.fillStyle = '#ffd23f';
  ctx.font = `800 6px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('VÒNG QUANH THẾ GIỚI', -8, -21);
  drawFace(ctx, 36, -34, 9, face, shade(c, -0.2));
}

function wheel(ctx, x, y, r, p) {
  circle(ctx, x, y, r, TYRE);
  circle(ctx, x, y, r * 0.5, '#9aa0aa');
  stroke(ctx, TYRE, 1.2, () => {
    ctx.moveTo(x + Math.cos(p) * r * 0.45, y + Math.sin(p) * r * 0.45);
    ctx.lineTo(x - Math.cos(p) * r * 0.45, y - Math.sin(p) * r * 0.45);
  });
}

export const WORLD_PAINTERS = {
  starShield, nonLaHero, robot, ninja, buiCay,
  astronaut, mummy, cowboy, doubleDecker,
};

/** Where accessories float above each character (animal units). */
export const WORLD_HEAD_TOP = {
  starShield: [0, -100], nonLaHero: [26, -100], robot: [4, -110], ninja: [10, -94], buiCay: [0, -92],
  astronaut: [2, -102], mummy: [2, -96], cowboy: [-6, -108], doubleDecker: [0, -80],
};
