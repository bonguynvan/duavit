// Backgrounds for the Tết map: mai and peach trees, a welcome gate, red lanterns, petals drifting down.
// Registered into scenery.js's SCENERY table by draw.js.
import { FONT, INK, partyFlag, starFlag } from './paint.js';
import { block, cloud, hills, sun } from './scenery.js';

/** Fixed pseudo-random in [0, 1) for index i (scenery must never flicker). */
const hash = (i) => {
  const x = Math.sin(i * 91.7 + 17.3) * 43758.5453;
  return x - Math.floor(x);
};

/** A blossoming tree: twisty dark branches covered in mai (yellow) or peach (pink) flowers. */
export function blossomTree(ctx, x, base, s, petal, seed) {
  ctx.strokeStyle = '#4a2c1a';
  ctx.lineCap = 'round';
  const branches = [[0, -0.45, -0.28, -0.85], [0, -0.5, 0.3, -0.9], [0, -0.55, 0.02, -1], [0, -0.35, -0.38, -0.6], [0, -0.4, 0.4, -0.62]];
  ctx.lineWidth = Math.max(2, s * 0.06);
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x - s * 0.06, base - s * 0.25, x, base - s * 0.45);
  ctx.stroke();
  ctx.lineWidth = Math.max(1.2, s * 0.025);
  branches.forEach(([x0, y0, x1, y1], i) => {
    ctx.beginPath();
    ctx.moveTo(x + x0 * s, base + y0 * s);
    ctx.quadraticCurveTo(x + (x1 * s) * 0.4 + (i % 2 ? 1 : -1) * s * 0.08, base + ((y0 + y1) / 2) * s, x + x1 * s, base + y1 * s);
    ctx.stroke();
  });
  ctx.fillStyle = petal;
  ctx.strokeStyle = 'rgba(29, 26, 47, 0.35)';
  ctx.lineWidth = 1;
  for (let i = 0; i < 46; i += 1) {
    const [x0, y0, x1, y1] = branches[i % branches.length];
    const k = 0.35 + hash(seed + i) * 0.75;
    const bx = x + (x0 + (x1 - x0) * k) * s + (hash(seed + i * 3) - 0.5) * s * 0.18;
    const by = base + (y0 + (y1 - y0) * k) * s + (hash(seed + i * 7) - 0.5) * s * 0.14;
    ctx.beginPath();
    ctx.arc(bx, by, Math.max(1.5, s * 0.03), 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

/** Welcome gate: two red pillars with couplets and a "CHÚC MỪNG NĂM MỚI" board, flags on top. */
function welcomeGate(ctx, x, base, s) {
  const w = s * 1.1;
  const pillar = s * 0.09;
  block(ctx, x, base - s * 0.72, pillar, s * 0.72, '#c0392b');
  block(ctx, x + w - pillar, base - s * 0.72, pillar, s * 0.72, '#c0392b');
  block(ctx, x - s * 0.05, base - s * 0.9, w + s * 0.1, s * 0.18, '#d62828');
  ctx.fillStyle = '#ffde00';
  ctx.font = `800 ${Math.max(7, s * 0.085)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('CHÚC MỪNG NĂM MỚI', x + w / 2, base - s * 0.81);
  // Couplets down the pillars.
  ctx.font = `800 ${Math.max(6, s * 0.06)}px ${FONT}`;
  ['AN', 'KHANG'].forEach((word, i) => ctx.fillText(word, x + pillar / 2, base - s * (0.55 - i * 0.14)));
  ['VẠN', 'PHÚC'].forEach((word, i) => ctx.fillText(word, x + w - pillar / 2, base - s * (0.55 - i * 0.14)));
  const fw = s * 0.22;
  const fh = s * 0.14;
  [[x + pillar / 2, starFlag, ['#da251d']], [x + w - pillar / 2, partyFlag, null]].forEach(([px, flag, bands]) => {
    ctx.strokeStyle = INK;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(px, base - s * 0.9);
    ctx.lineTo(px, base - s * 1.18);
    ctx.stroke();
    flag(ctx, px, base - s * 1.18, fw, fh, bands);
  });
}

/** Red lanterns hanging from a string across one tile; both ends at the same height so tiles join. */
function lanterns(ctx, w, y, sag, size, t) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.quadraticCurveTo(w / 2, y + sag * 2, w, y);
  ctx.stroke();
  for (let i = 0; i < 8; i += 1) {
    const u = (i + 0.5) / 8;
    const lx = u * w + Math.sin(t / 500 + i) * size * 0.15;
    const ly = y + 4 * sag * u * (1 - u) + size * 1.3;
    ctx.fillStyle = '#d62828';
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(lx, ly, size, size * 0.8, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#ffd23f';
    ctx.fillRect(lx - size * 0.45, ly - size * 0.95, size * 0.9, size * 0.22);
    ctx.fillRect(lx - size * 0.45, ly + size * 0.75, size * 0.9, size * 0.22);
    ctx.strokeStyle = '#ffd23f';
    ctx.beginPath();
    ctx.moveTo(lx, ly + size);
    ctx.lineTo(lx, ly + size * 1.6);
    ctx.stroke();
  }
}

/** Mai and peach petals drifting down across the sky band. */
function petals(ctx, w, base, h, t) {
  for (let i = 0; i < 26; i += 1) {
    const fall = ((t / (5200 + hash(i) * 3000) + hash(i + 50)) % 1);
    const x = ((hash(i + 9) * w + Math.sin(t / 900 + i) * h * 0.08 - fall * w * 0.12) % w + w) % w;
    const y = fall * base;
    ctx.fillStyle = i % 2 ? '#ffd23f' : '#f7a8c4';
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(1.5, h * 0.012), Math.max(1, h * 0.007), t / 400 + i, 0, Math.PI * 2);
    ctx.fill();
  }
}

export const TET_SCENERY = {
  tet: {
    fixed(ctx, w, base, h, t) {
      sun(ctx, w * 0.88, h * 0.24, h * 0.11, '#ffe066');
      cloud(ctx, (w * 0.25 + t * 0.008) % (w + h * 0.4) - h * 0.2, h * 0.2, h * 0.08);
      cloud(ctx, (w * 0.6 + t * 0.005) % (w + h * 0.4) - h * 0.2, h * 0.14, h * 0.06);
    },
    far: (ctx, w, base, h) => hills(ctx, w, base, h * 0.32, '#b7dd8a', 3.1),
    near(ctx, w, base, h, t) {
      blossomTree(ctx, w * 0.07, base, h * 0.7, '#ffd23f', 1);
      welcomeGate(ctx, w * 0.17, base, h * 0.72);
      blossomTree(ctx, w * 0.42, base, h * 0.66, '#f7a8c4', 2);
      blossomTree(ctx, w * 0.62, base, h * 0.72, '#ffd23f', 3);
      blossomTree(ctx, w * 0.84, base, h * 0.68, '#f7a8c4', 4);
      lanterns(ctx, w, base - h * 0.9, h * 0.05, h * 0.045, t);
    },
    overlay: (ctx, w, base, h, t) => petals(ctx, w, base, h, t),
  },
};
