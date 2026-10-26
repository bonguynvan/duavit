// Characters for the Chợ đêm map: street food on little legs.
// Same conventions as painters.js: facing right, origin on the ground under the body, ~100 units long.
import { INK, circle, drawFace, ellipse, leg, shade, shape, stroke, swing, thinLine } from './paint.js';

const LEG = '#3b2416';

/** Two stick legs (and optional stick arms) under a walking snack. */
function feet(ctx, p, m, xs, top, len = 20) {
  xs.forEach((x, i) => leg(ctx, x, top, len, swing(p, i ? 0 : Math.PI, m, 0.75), LEG, 4));
}

function banhMi(ctx, c, p, m, face) {
  feet(ctx, p, m, [-14, 14], -22);
  ellipse(ctx, 0, -36, 46, 15, c, -0.06);
  // The split side: pâté, cucumber, chilli and herbs poking out.
  shape(ctx, '#f2c6b4', () => {
    ctx.moveTo(-38, -36);
    ctx.quadraticCurveTo(0, -24, 40, -40);
    ctx.quadraticCurveTo(0, -30, -38, -36);
  }, 1.5);
  [[-26, -33, '#7ac74f'], [-12, -30, '#e63946'], [2, -30, '#7ac74f'], [16, -32, '#9ccf63'], [28, -36, '#e63946']].forEach(([x, y, color]) => ellipse(ctx, x, y, 5, 2.5, color, -0.3));
  thinLine(ctx, shade(c, -0.25), 2, () => {
    [-28, -14, 0, 14].forEach((x) => {
      ctx.moveTo(x, -48);
      ctx.lineTo(x + 6, -44);
    });
  });
  drawFace(ctx, 28, -46, 10, face, shade(c, -0.25));
}

function traSua(ctx, c, p, m, face) {
  feet(ctx, p, m, [-7, 7], -22);
  shape(ctx, c, () => {
    ctx.moveTo(-18, -82);
    ctx.lineTo(18, -82);
    ctx.lineTo(13, -22);
    ctx.lineTo(-13, -22);
    ctx.closePath();
  });
  // Tapioca pearls settle at the bottom and jiggle when it runs.
  for (let i = 0; i < 9; i += 1) {
    const jiggle = m ? Math.sin(p * 2 + i) * 1.2 : 0;
    circle(ctx, -9 + (i % 5) * 4.5, -27 - Math.floor(i / 5) * 4.5 + jiggle, 2.2, '#3b2416');
  }
  ellipse(ctx, 0, -84, 20, 5, '#fffaf0');
  shape(ctx, '#fffaf0', () => {
    ctx.arc(0, -86, 16, Math.PI, 0);
    ctx.closePath();
  }, 2);
  stroke(ctx, '#ef476f', 4, () => {
    ctx.moveTo(4, -96);
    ctx.lineTo(12, -108);
  });
  drawFace(ctx, 0, -54, 11, face, shade(c, -0.25));
}

function pho(ctx, c, p, m, face) {
  feet(ctx, p, m, [-12, 12], -18, 18);
  // Steam curls rising off the broth.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  ctx.lineWidth = 2.5;
  ctx.lineCap = 'round';
  [-12, 0, 12].forEach((x, i) => {
    const drift = Math.sin(p + i * 2) * 3;
    ctx.beginPath();
    ctx.moveTo(x, -54);
    ctx.quadraticCurveTo(x + 6 + drift, -62, x, -70);
    ctx.quadraticCurveTo(x - 6 - drift, -76, x, -84);
    ctx.stroke();
  });
  stroke(ctx, '#c08a4b', 3, () => {
    ctx.moveTo(8, -48);
    ctx.lineTo(30, -84);
    ctx.moveTo(14, -48);
    ctx.lineTo(38, -82);
  });
  shape(ctx, c, () => {
    ctx.arc(0, -46, 32, 0, Math.PI);
    ctx.closePath();
  });
  ellipse(ctx, 0, -46, 32, 6, '#e9b872');
  thinLine(ctx, '#fffaf0', 2, () => {
    for (let x = -22; x <= 14; x += 9) {
      ctx.moveTo(x, -46);
      ctx.quadraticCurveTo(x + 3, -50, x + 6, -46);
    }
  });
  [[-16, '#8d5a2b'], [4, '#8d5a2b'], [18, '#7ac74f']].forEach(([x, color]) => ellipse(ctx, x, -47, 5, 2.4, color));
  stroke(ctx, '#2d5aa0', 1.5, () => {
    ctx.moveTo(-30, -36);
    ctx.lineTo(30, -36);
  });
  drawFace(ctx, -4, -27, 9, face, '#2d5aa0');
}

function saurieng(ctx, c, p, m, face) {
  feet(ctx, p, m, [-10, 10], -22);
  // Its famous smell, wafting behind.
  if (m) {
    thinLine(ctx, '#9bbf3a', 2, () => {
      [-46, -38].forEach((y, i) => {
        const wob = Math.sin(p * 2 + i) * 3;
        ctx.moveTo(-30, y);
        ctx.quadraticCurveTo(-40, y - 4 + wob, -50, y + wob);
      });
    });
  }
  const spikes = 14;
  ctx.fillStyle = shade(c, -0.12);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= spikes * 2; i += 1) {
    const a = (i * Math.PI) / spikes;
    const r = i % 2 === 0 ? 31 : 25;
    ctx.lineTo(Math.cos(a) * r, -48 + Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  circle(ctx, 0, -48, 25, c);
  stroke(ctx, '#6b4226', 4, () => {
    ctx.moveTo(-2, -78);
    ctx.lineTo(2, -88);
  });
  drawFace(ctx, 6, -48, 11, face, shade(c, -0.3));
}

export const FOOD_PAINTERS = { banhMi, traSua, pho, saurieng };

/** Where accessories float above each character (animal units). */
export const FOOD_HEAD_TOP = {
  banhMi: [26, -62], traSua: [-6, -104], pho: [-8, -88], saurieng: [0, -92],
};
