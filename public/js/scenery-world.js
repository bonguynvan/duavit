// Backgrounds for Phố siêu anh hùng, Vòng quanh thế giới and Chợ đêm. Registered by draw.js.
import { FONT, INK } from './paint.js';
import { block, cloud, hills, palm, sun, tree } from './scenery.js';
import { star } from './painters-world.js';

/** Fixed pseudo-random in [0, 1) for index i (never Math.random: scenery must not flicker). */
const hash = (i) => {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
};

function nightSky(ctx, w, h, t, count = 40) {
  for (let i = 0; i < count; i += 1) {
    const twinkle = 0.45 + 0.55 * Math.abs(Math.sin(t / 700 + i * 1.3));
    ctx.fillStyle = `rgba(255, 250, 220, ${twinkle})`;
    ctx.fillRect(hash(i) * w, hash(i + 99) * h * 0.6, 2, 2);
  }
}

function moon(ctx, x, y, r) {
  ctx.fillStyle = '#fff3c4';
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = 'rgba(214, 196, 140, 0.6)';
  [[-0.3, -0.2, 0.22], [0.25, 0.25, 0.16], [0.3, -0.35, 0.1]].forEach(([dx, dy, k]) => {
    ctx.beginPath();
    ctx.arc(x + dx * r, y + dy * r, k * r, 0, Math.PI * 2);
    ctx.fill();
  });
}

/** Lit-window grid on a building face; which windows glow is fixed per building. */
function windows(ctx, x, y, w, h, seed, lit = '#ffd96b', off = 'rgba(0, 0, 0, 0.25)') {
  const cols = Math.max(1, Math.floor(w / 9));
  const rows = Math.max(1, Math.floor(h / 11));
  const cw = w / cols;
  const rh = h / rows;
  for (let r = 0; r < rows; r += 1) {
    for (let c = 0; c < cols; c += 1) {
      ctx.fillStyle = hash(seed + r * 13 + c * 7) > 0.45 ? lit : off;
      ctx.fillRect(x + c * cw + cw * 0.25, y + r * rh + rh * 0.25, cw * 0.5, rh * 0.45);
    }
  }
}

// ---------------- Phố siêu anh hùng ----------------

/** Comic-book sound effect: spiky burst with a word in it. */
function comicBurst(ctx, x, y, r, text, fill) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 24; i += 1) {
    const a = (i * Math.PI) / 12;
    const rr = i % 2 === 0 ? r : r * 0.72;
    ctx.lineTo(x + Math.cos(a) * rr * 1.25, y + Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#e63946';
  ctx.font = `800 ${r * 0.62}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + r * 0.05);
}

/** Searchlight beam sweeping the sky, a star emblem where it hits the clouds. */
function searchlight(ctx, x, base, h, t, phase) {
  const a = -Math.PI / 2 + Math.sin(t / 2600 + phase) * 0.35;
  const len = h * 1.1;
  const tx = x + Math.cos(a) * len;
  const ty = base + Math.sin(a) * len;
  const spread = h * 0.14;
  ctx.fillStyle = 'rgba(255, 244, 190, 0.16)';
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(tx - spread, ty);
  ctx.lineTo(tx + spread, ty);
  ctx.closePath();
  ctx.fill();
  return { x: tx, y: ty + spread * 0.6 };
}

function heroSkyline(ctx, w, base, h) {
  for (let i = 0; i < 12; i += 1) {
    const bw = w * (0.06 + hash(i + 5) * 0.04);
    const bh = h * (0.32 + hash(i + 17) * 0.38);
    const x = (i / 12) * w;
    ctx.fillStyle = '#262b55';
    ctx.fillRect(x, base - bh, bw, bh);
    windows(ctx, x + 2, base - bh + 4, bw - 4, bh - 8, i * 31, 'rgba(255, 217, 107, 0.7)', 'rgba(0, 0, 0, 0.2)');
  }
}

function heroBuilding(ctx, x, base, w, h, fill, seed) {
  block(ctx, x, base - h, w, h, fill);
  windows(ctx, x + 3, base - h + 6, w - 6, h - 14, seed);
  block(ctx, x - 3, base - h - 4, w + 6, 5, '#2b2d42');
}

function waterTower(ctx, x, base, s) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.18, base);
  ctx.lineTo(x - s * 0.12, base - s * 0.35);
  ctx.moveTo(x + s * 0.18, base);
  ctx.lineTo(x + s * 0.12, base - s * 0.35);
  ctx.stroke();
  block(ctx, x - s * 0.2, base - s * 0.7, s * 0.4, s * 0.35, '#8d5a2b');
  ctx.fillStyle = '#6b4226';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.24, base - s * 0.7);
  ctx.lineTo(x, base - s * 0.9);
  ctx.lineTo(x + s * 0.24, base - s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/** A tiny caped hero streaking across the sky now and then. */
function flyingHero(ctx, x, y, s) {
  ctx.fillStyle = '#e63946';
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - s * 1.6, y - s * 0.3);
  ctx.lineTo(x - s * 1.4, y + s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#5b6cff';
  ctx.fillRect(x - s * 0.9, y - s * 0.15, s * 1.2, s * 0.4);
  ctx.fillStyle = '#f5d0a9';
  ctx.beginPath();
  ctx.arc(x + s * 0.45, y + s * 0.05, s * 0.28, 0, Math.PI * 2);
  ctx.fill();
}

// ---------------- Vòng quanh thế giới ----------------

function eiffel(ctx, x, base, s) {
  ctx.strokeStyle = '#6b4f3a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.22, base);
  ctx.quadraticCurveTo(x - s * 0.06, base - s * 0.45, x - s * 0.02, base - s);
  ctx.lineTo(x + s * 0.02, base - s);
  ctx.quadraticCurveTo(x + s * 0.06, base - s * 0.45, x + s * 0.22, base);
  ctx.stroke();
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  for (let k = 1; k < 9; k += 1) {
    const y = base - (s * k) / 10;
    const half = s * 0.2 * (1 - k / 10) ** 1.6;
    ctx.moveTo(x - half, y);
    ctx.lineTo(x + half, y - s * 0.1);
    ctx.moveTo(x + half, y);
    ctx.lineTo(x - half, y - s * 0.1);
  }
  ctx.stroke();
  [0.3, 0.6].forEach((k) => block(ctx, x - s * 0.18 * (1 - k), base - s * k, s * 0.36 * (1 - k), s * 0.03, '#8a6a4f', 1.5));
  ctx.strokeStyle = '#6b4f3a';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, base, s * 0.1, Math.PI, 0);
  ctx.stroke();
}

function pyramids(ctx, x, base, s) {
  [[0.3, 0.8, '#e0b04f'], [0, 1, '#e8bd5f'], [0.62, 0.55, '#d9a441']].forEach(([dx, k, fill]) => {
    const px = x + dx * s;
    const ph = s * 0.6 * k;
    ctx.fillStyle = fill;
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(px - ph * 0.85, base);
    ctx.lineTo(px, base - ph);
    ctx.lineTo(px + ph * 0.85, base);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
    ctx.beginPath();
    ctx.moveTo(px, base - ph);
    ctx.lineTo(px + ph * 0.85, base);
    ctx.lineTo(px + ph * 0.15, base);
    ctx.closePath();
    ctx.fill();
  });
}

function clockTower(ctx, x, base, s, t) {
  const w = s * 0.2;
  block(ctx, x - w / 2, base - s * 0.8, w, s * 0.8, '#d9b56b');
  block(ctx, x - w * 0.6, base - s * 0.86, w * 1.2, s * 0.08, '#b8944f');
  ctx.fillStyle = '#5b6b5a';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.6, base - s * 0.86);
  ctx.lineTo(x, base - s * 1.08);
  ctx.lineTo(x + w * 0.6, base - s * 0.86);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const cy = base - s * 0.7;
  ctx.fillStyle = '#fff8e1';
  ctx.beginPath();
  ctx.arc(x, cy, w * 0.36, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  const minute = t / 4000;
  ctx.moveTo(x, cy);
  ctx.lineTo(x + Math.sin(minute) * w * 0.28, cy - Math.cos(minute) * w * 0.28);
  ctx.moveTo(x, cy);
  ctx.lineTo(x + Math.sin(minute / 12) * w * 0.18, cy - Math.cos(minute / 12) * w * 0.18);
  ctx.stroke();
  for (let k = 0; k < 4; k += 1) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.18)';
    ctx.fillRect(x - w * 0.3, base - s * (0.5 - k * 0.11), w * 0.6, s * 0.05);
  }
}

function windmill(ctx, x, base, s, t) {
  ctx.fillStyle = '#c94f3d';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.14, base);
  ctx.lineTo(x - s * 0.09, base - s * 0.55);
  ctx.lineTo(x + s * 0.09, base - s * 0.55);
  ctx.lineTo(x + s * 0.14, base);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  block(ctx, x - s * 0.04, base - s * 0.16, s * 0.08, s * 0.16, '#6b4226', 1.5);
  const hub = base - s * 0.55;
  for (let k = 0; k < 4; k += 1) {
    const a = t / 900 + (k * Math.PI) / 2;
    ctx.save();
    ctx.translate(x, hub);
    ctx.rotate(a);
    block(ctx, -s * 0.02, -s * 0.42, s * 0.04, s * 0.42, '#f4f1ea', 1.2);
    block(ctx, s * 0.02, -s * 0.4, s * 0.08, s * 0.3, '#fffaf0', 1.2);
    ctx.restore();
  }
  ctx.fillStyle = INK;
  ctx.beginPath();
  ctx.arc(x, hub, s * 0.03, 0, Math.PI * 2);
  ctx.fill();
}

function airplane(ctx, x, y, s) {
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.ellipse(x, y, s, s * 0.18, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, y);
  ctx.lineTo(x - s * 0.4, y + s * 0.45);
  ctx.lineTo(x - s * 0.25, y + s * 0.45);
  ctx.lineTo(x + s * 0.15, y);
  ctx.moveTo(x - s * 0.8, y);
  ctx.lineTo(x - s * 1, y - s * 0.35);
  ctx.lineTo(x - s * 0.85, y - s * 0.35);
  ctx.lineTo(x - s * 0.6, y);
  ctx.fill();
  ctx.stroke();
}

// ---------------- Chợ đêm ----------------

function stall(ctx, x, base, s, colors, sign) {
  const w = s * 0.7;
  block(ctx, x, base - s * 0.32, w, s * 0.32, '#8d5a2b');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + 2, base - s * 0.32);
  ctx.lineTo(x + 2, base - s * 0.72);
  ctx.moveTo(x + w - 2, base - s * 0.32);
  ctx.lineTo(x + w - 2, base - s * 0.72);
  ctx.stroke();
  const stripes = 6;
  for (let k = 0; k < stripes; k += 1) {
    ctx.fillStyle = colors[k % 2];
    ctx.beginPath();
    ctx.moveTo(x - s * 0.04 + (k * (w + s * 0.08)) / stripes, base - s * 0.62);
    ctx.lineTo(x - s * 0.04 + ((k + 1) * (w + s * 0.08)) / stripes, base - s * 0.62);
    ctx.lineTo(x - s * 0.04 + ((k + 1) * (w + s * 0.08)) / stripes, base - s * 0.72);
    ctx.lineTo(x - s * 0.04 + (k * (w + s * 0.08)) / stripes, base - s * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.arc(x - s * 0.04 + ((k + 0.5) * (w + s * 0.08)) / stripes, base - s * 0.62, (w + s * 0.08) / stripes / 2, 0, Math.PI);
    ctx.fill();
  }
  ctx.strokeRect(x - s * 0.04, base - s * 0.72, w + s * 0.08, s * 0.1);
  block(ctx, x + w * 0.1, base - s * 0.86, w * 0.8, s * 0.13, '#fff6e5');
  ctx.fillStyle = '#c0392b';
  ctx.font = `800 ${s * 0.08}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(sign, x + w / 2, base - s * 0.79);
  // Bowls and pots on the counter.
  [0.2, 0.45, 0.72].forEach((k, i) => {
    ctx.fillStyle = ['#f7f3ea', '#c0392b', '#ffd23f'][i];
    ctx.beginPath();
    ctx.arc(x + w * k, base - s * 0.32, s * 0.045, Math.PI, 0);
    ctx.fill();
    ctx.stroke();
  });
}

/** A string of lanterns sagging across one tile; ends sit at the same height so tiles join. */
function lanternString(ctx, w, y, sag, t, size) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(0, y);
  ctx.quadraticCurveTo(w / 2, y + sag * 2, w, y);
  ctx.stroke();
  const n = 10;
  for (let i = 0; i < n; i += 1) {
    const u = (i + 0.5) / n;
    const lx = u * w;
    const ly = y + 4 * sag * u * (1 - u) + 3;
    const glow = 0.25 + 0.15 * Math.sin(t / 400 + i);
    ctx.fillStyle = `rgba(255, 200, 80, ${glow})`;
    ctx.beginPath();
    ctx.arc(lx, ly + size, size * 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = i % 3 === 0 ? '#ffd23f' : '#e63946';
    ctx.strokeStyle = INK;
    ctx.beginPath();
    ctx.ellipse(lx, ly + size, size, size * 1.25, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }
}

function lowTown(ctx, w, base, h) {
  for (let i = 0; i < 14; i += 1) {
    const bw = w * 0.07;
    const bh = h * (0.22 + hash(i + 40) * 0.2);
    const x = (i / 14) * w;
    ctx.fillStyle = '#3d2c5e';
    ctx.fillRect(x, base - bh, bw, bh);
    windows(ctx, x + 2, base - bh + 4, bw - 4, bh - 8, i * 17 + 3, 'rgba(255, 190, 110, 0.75)', 'rgba(0, 0, 0, 0.2)');
  }
}

export const WORLD_SCENERY = {
  sieuanhhung: {
    fixed(ctx, w, base, h, t) {
      nightSky(ctx, w, h, t);
      moon(ctx, w * 0.84, h * 0.2, h * 0.09);
      const spot = searchlight(ctx, w * 0.3, base, h, t, 0);
      ctx.fillStyle = 'rgba(255, 244, 190, 0.35)';
      ctx.beginPath();
      ctx.ellipse(spot.x, spot.y, h * 0.12, h * 0.07, 0, 0, Math.PI * 2);
      ctx.fill();
      star(ctx, spot.x, spot.y, h * 0.05, '#ffd23f');
      searchlight(ctx, w * 0.66, base, h, t, 2.1);
      const fx = ((t * 0.00006) % 1.6) * w - w * 0.3;
      if (fx > -w * 0.1 && fx < w * 1.1) flyingHero(ctx, fx, h * 0.3 + Math.sin(t / 500) * h * 0.03, h * 0.05);
    },
    far: (ctx, w, base, h) => heroSkyline(ctx, w, base, h),
    near(ctx, w, base, h) {
      heroBuilding(ctx, w * 0.02, base, w * 0.14, h * 0.62, '#b5523b', 1);
      comicBurst(ctx, w * 0.09, base - h * 0.75, h * 0.09, 'POW!', '#ffd23f');
      heroBuilding(ctx, w * 0.22, base, w * 0.12, h * 0.48, '#5b6b8a', 2);
      waterTower(ctx, w * 0.28, base - h * 0.52, h * 0.3);
      heroBuilding(ctx, w * 0.42, base, w * 0.16, h * 0.7, '#8a5a9e', 3);
      comicBurst(ctx, w * 0.5, base - h * 0.84, h * 0.08, 'BAM!', '#7ec8f2');
      heroBuilding(ctx, w * 0.66, base, w * 0.12, h * 0.52, '#3f7f6b', 4);
      heroBuilding(ctx, w * 0.82, base, w * 0.14, h * 0.6, '#b5523b', 5);
      comicBurst(ctx, w * 0.89, base - h * 0.72, h * 0.08, 'VÈO!', '#ff9f1c');
    },
  },
  vongquanh: {
    fixed(ctx, w, base, h, t) {
      sun(ctx, w * 0.47, h * 0.2, h * 0.1, '#ffe066');
      cloud(ctx, (w * 0.4 + t * 0.008) % (w + h * 0.4) - h * 0.2, h * 0.2, h * 0.08);
      cloud(ctx, (w * 0.8 + t * 0.005) % (w + h * 0.4) - h * 0.2, h * 0.3, h * 0.07);
      airplane(ctx, ((t * 0.00004) % 1.3) * w - w * 0.15, h * 0.14, h * 0.06);
    },
    far: (ctx, w, base, h) => hills(ctx, w, base, h * 0.3, '#b7dd8a', 2.2),
    near(ctx, w, base, h, t) {
      eiffel(ctx, w * 0.1, base, h * 0.85);
      tree(ctx, w * 0.22, base, h * 0.45, '#4caf50');
      pyramids(ctx, w * 0.32, base, h * 0.7);
      palm(ctx, w * 0.56, base, h * 0.55);
      clockTower(ctx, w * 0.68, base, h * 0.8, t);
      windmill(ctx, w * 0.88, base, h * 0.75, t);
    },
  },
  chodem: {
    fixed(ctx, w, base, h, t) {
      nightSky(ctx, w, h, t, 24);
      moon(ctx, w * 0.12, h * 0.2, h * 0.08);
    },
    far: (ctx, w, base, h) => lowTown(ctx, w, base, h),
    near(ctx, w, base, h, t) {
      stall(ctx, w * 0.02, base, h * 0.8, ['#e63946', '#fff6e5'], 'ỐC');
      stall(ctx, w * 0.27, base, h * 0.8, ['#18a999', '#fff6e5'], 'CHÈ');
      stall(ctx, w * 0.52, base, h * 0.8, ['#ff9f1c', '#fff6e5'], 'BÁNH TRÁNG');
      stall(ctx, w * 0.77, base, h * 0.8, ['#5b6cff', '#fff6e5'], 'NƯỚC MÍA');
      lanternString(ctx, w, base - h * 0.84, h * 0.05, t, h * 0.035);
    },
  },
};
