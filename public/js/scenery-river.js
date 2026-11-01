// Scenery for the river map (boat races): a far bank of hills, bamboo and a stilt house, a little sampan
// drifting by. Built from the shared helpers in scenery.js; same layer contract (fixed / far / near / overlay).
import { block, cloud, hills, sun, tree } from './scenery.js';

function bamboo(ctx, x, base, s) {
  for (let k = 0; k < 5; k += 1) {
    const sx = x + (k - 2) * s * 0.07;
    const top = base - s * (0.75 + (k % 3) * 0.1);
    ctx.strokeStyle = k % 2 ? '#4f9a4f' : '#5fae4e';
    ctx.lineWidth = Math.max(2, s * 0.03);
    ctx.beginPath();
    ctx.moveTo(sx, base);
    ctx.quadraticCurveTo(sx + s * 0.04, (base + top) / 2, sx + s * 0.1 * (k % 2 ? 1 : -1), top);
    ctx.stroke();
  }
  ctx.fillStyle = '#4f9a4f';
  for (let k = 0; k < 9; k += 1) {
    ctx.beginPath();
    ctx.ellipse(x + (k - 4) * s * 0.06, base - s * (0.7 + (k % 3) * 0.1), s * 0.09, s * 0.03, (k % 2 ? 0.5 : -0.5), 0, Math.PI * 2);
    ctx.fill();
  }
}

/** A thatched house on stilts at the water's edge. */
function stiltHouse(ctx, x, base, s) {
  ctx.strokeStyle = '#5c3a1e';
  ctx.lineWidth = Math.max(2, s * 0.03);
  for (let k = 0; k < 4; k += 1) {
    ctx.beginPath();
    ctx.moveTo(x + s * (0.06 + k * 0.16), base);
    ctx.lineTo(x + s * (0.06 + k * 0.16), base - s * 0.22);
    ctx.stroke();
  }
  block(ctx, x, base - s * 0.5, s * 0.6, s * 0.28, '#c9a06b');
  block(ctx, x + s * 0.24, base - s * 0.44, s * 0.12, s * 0.2, '#5c3a1e', 1.5);
  ctx.fillStyle = '#d9b25f';
  ctx.strokeStyle = '#1d1a2f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.08, base - s * 0.48);
  ctx.lineTo(x + s * 0.3, base - s * 0.72);
  ctx.lineTo(x + s * 0.68, base - s * 0.48);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** A small sampan with a boatman in a nón lá, drifting along the far bank. */
function sampan(ctx, x, base, s) {
  ctx.fillStyle = '#7a4a2a';
  ctx.strokeStyle = '#1d1a2f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.5, base - s * 0.12);
  ctx.quadraticCurveTo(x, base + s * 0.08, x + s * 0.5, base - s * 0.12);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e9d18c';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.12, base - s * 0.36);
  ctx.lineTo(x, base - s * 0.48);
  ctx.lineTo(x + s * 0.12, base - s * 0.36);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  block(ctx, x - s * 0.05, base - s * 0.36, s * 0.1, s * 0.22, '#3a5a98', 1.5);
}

export const RIVER_SCENERY = {
  song: {
    fixed(ctx, w, base, h, t) {
      sun(ctx, w * 0.82, h * 0.3, h * 0.14, '#ffe066');
      cloud(ctx, (w * 0.25 + t * 0.008) % (w + h * 0.4) - h * 0.2, h * 0.26, h * 0.09);
      cloud(ctx, (w * 0.6 + t * 0.005) % (w + h * 0.4) - h * 0.2, h * 0.18, h * 0.07);
    },
    far: (ctx, w, base, h) => hills(ctx, w, base, h * 0.4, '#8cc66a', 1.4),
    near(ctx, w, base, h) {
      bamboo(ctx, w * 0.06, base, h * 0.7);
      stiltHouse(ctx, w * 0.18, base, h * 0.6);
      tree(ctx, w * 0.45, base, h * 0.55, '#3d9a45');
      bamboo(ctx, w * 0.58, base, h * 0.65);
      tree(ctx, w * 0.78, base, h * 0.5, '#4caf50');
      bamboo(ctx, w * 0.93, base, h * 0.7);
    },
    overlay(ctx, w, base, h, t) {
      const x = ((t * 0.00002) % 1.3) * w - w * 0.15;
      sampan(ctx, x, base - h * 0.02, h * 0.22);
    },
  },
};
