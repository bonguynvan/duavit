// Backgrounds for the holiday maps. Registered into scenery.js's SCENERY table by draw.js.
import { INK, starFlag } from './paint.js';
import { cloud, hills, sun, tree } from './scenery.js';

function block(ctx, x, y, w, h, fill, line = 2) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = INK;
  ctx.lineWidth = line;
  ctx.strokeRect(x, y, w, h);
}

/** Pagoda-style roof with upturned eaves. */
function curvedRoof(ctx, x, y, w, h, color) {
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x - w * 0.12, y - h * 0.15);
  ctx.quadraticCurveTo(x + w * 0.1, y, x + w * 0.2, y - h);
  ctx.lineTo(x + w * 0.8, y - h);
  ctx.quadraticCurveTo(x + w * 0.9, y, x + w * 1.12, y - h * 0.15);
  ctx.lineTo(x + w, y + h * 0.15);
  ctx.lineTo(x, y + h * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

// ---------------- Đền Hùng ----------------

/** The sun as the face of a Đông Sơn bronze drum: 14-point star, rings, flying Lạc birds. */
function bronzeDrumSun(ctx, x, y, r, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.fillStyle = '#d9a441';
  ctx.strokeStyle = '#8a5a12';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  [0.82, 0.62, 0.42].forEach((k) => {
    ctx.beginPath();
    ctx.arc(0, 0, r * k, 0, Math.PI * 2);
    ctx.stroke();
  });
  ctx.fillStyle = '#f6d36b';
  ctx.beginPath();
  for (let i = 0; i < 28; i += 1) {
    const a = (i * Math.PI) / 14 + t / 9000;
    const rr = i % 2 === 0 ? r * 0.4 : r * 0.14;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#8a5a12';
  for (let i = 0; i < 6; i += 1) {
    const a = (i * Math.PI) / 3 - t / 6000;
    const bx = Math.cos(a) * r * 0.72;
    const by = Math.sin(a) * r * 0.72;
    ctx.beginPath();
    ctx.moveTo(bx - r * 0.07, by);
    ctx.lineTo(bx + r * 0.09, by - r * 0.03);
    ctx.lineTo(bx - r * 0.02, by + r * 0.04);
    ctx.fill();
  }
  ctx.restore();
}

function mountain(ctx, w, base, h) {
  ctx.fillStyle = '#4f8f5a';
  ctx.beginPath();
  ctx.moveTo(0, base);
  ctx.quadraticCurveTo(w * 0.18, base - h * 0.85, w * 0.36, base - h * 0.5);
  ctx.quadraticCurveTo(w * 0.5, base - h * 0.95, w * 0.68, base - h * 0.55);
  ctx.quadraticCurveTo(w * 0.85, base - h * 0.8, w, base);
  ctx.fill();
}

function terraces(ctx, w, base, h) {
  ['#9ccf63', '#86c25a', '#a7d46f'].forEach((color, i) => {
    hills(ctx, w, base - h * 0.04 * i, h * (0.22 - i * 0.05), color, i * 1.7);
  });
}

function temple(ctx, x, base, s) {
  const w = s * 0.9;
  block(ctx, x, base - s * 0.32, w, s * 0.32, '#c94f3d');
  ctx.fillStyle = '#3b2a2a';
  ctx.fillRect(x + w * 0.4, base - s * 0.22, w * 0.2, s * 0.22);
  curvedRoof(ctx, x, base - s * 0.34, w, s * 0.16, '#7a3b2e');
  curvedRoof(ctx, x + w * 0.2, base - s * 0.52, w * 0.6, s * 0.12, '#7a3b2e');
}

function festivalFlag(ctx, x, base, s, t, i) {
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - s);
  ctx.stroke();
  const colors = ['#da251d', '#ffd23f', '#18a999', '#5b6cff', '#fff'];
  const wave = Math.sin(t / 250 + i) * s * 0.05;
  colors.forEach((color, k) => {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x, base - s + k * s * 0.06);
    ctx.lineTo(x + s * 0.32 + wave, base - s + k * s * 0.06 + s * 0.03);
    ctx.lineTo(x, base - s + (k + 1) * s * 0.06);
    ctx.fill();
  });
}

// ---------------- Công trường ----------------

function factory(ctx, x, base, s, t) {
  const w = s * 1.2;
  block(ctx, x, base - s * 0.4, w, s * 0.4, '#b5523b');
  ctx.fillStyle = '#8f3e2c';
  for (let i = 0; i < 4; i += 1) {
    ctx.beginPath();
    ctx.moveTo(x + (w / 4) * i, base - s * 0.4);
    ctx.lineTo(x + (w / 4) * i, base - s * 0.55);
    ctx.lineTo(x + (w / 4) * (i + 1), base - s * 0.4);
    ctx.fill();
  }
  block(ctx, x + w * 0.78, base - s * 0.9, s * 0.1, s * 0.5, '#9a9a96');
  for (let k = 0; k < 3; k += 1) {
    const life = ((t / 2200 + k / 3) % 1);
    ctx.fillStyle = `rgba(220,220,220,${0.75 * (1 - life)})`;
    ctx.beginPath();
    ctx.arc(x + w * 0.83 + life * s * 0.3, base - s * (0.95 + life * 0.5), s * (0.06 + life * 0.08), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.fillStyle = '#da251d';
  ctx.fillRect(x + w * 0.06, base - s * 0.34, w * 0.62, s * 0.11);
  ctx.fillStyle = '#ffde00';
  ctx.font = `800 ${Math.max(7, s * 0.07)}px "Baloo 2", sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('LAO ĐỘNG LÀ VINH QUANG', x + w * 0.37, base - s * 0.285, w * 0.6);
}

function towerCrane(ctx, x, base, s, t) {
  ctx.strokeStyle = '#e0a800';
  ctx.lineWidth = Math.max(1.5, s * 0.02);
  const mast = s * 1.15;
  ctx.beginPath();
  ctx.rect(x, base - mast, s * 0.07, mast);
  for (let y = base; y > base - mast; y -= s * 0.07) {
    ctx.moveTo(x, y);
    ctx.lineTo(x + s * 0.07, y - s * 0.07);
  }
  ctx.moveTo(x - s * 0.3, base - mast);
  ctx.lineTo(x + s * 0.8, base - mast);
  ctx.stroke();
  const hookX = x + s * (0.45 + Math.sin(t / 2500) * 0.25);
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(hookX, base - mast);
  ctx.lineTo(hookX, base - mast * 0.55);
  ctx.stroke();
  block(ctx, hookX - s * 0.15, base - mast * 0.55, s * 0.3, s * 0.05, '#c0392b', 1.5);
}

function scaffolding(ctx, x, base, s) {
  ctx.strokeStyle = '#7f8c8d';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  for (let i = 0; i <= 4; i += 1) {
    ctx.moveTo(x + i * s * 0.12, base);
    ctx.lineTo(x + i * s * 0.12, base - s * 0.7);
  }
  for (let j = 0; j <= 5; j += 1) {
    ctx.moveTo(x, base - j * s * 0.14);
    ctx.lineTo(x + s * 0.48, base - j * s * 0.14);
  }
  ctx.stroke();
  ctx.fillStyle = 'rgba(46, 158, 91, 0.35)';
  ctx.fillRect(x, base - s * 0.7, s * 0.48, s * 0.35);
}

function cone(ctx, x, base, s) {
  ctx.fillStyle = '#ff7a1a';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.06, base);
  ctx.lineTo(x, base - s * 0.16);
  ctx.lineTo(x + s * 0.06, base);
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.fillRect(x - s * 0.03, base - s * 0.09, s * 0.06, s * 0.025);
}

function cityUnderConstruction(ctx, w, base, h) {
  ctx.fillStyle = 'rgba(130, 140, 155, 0.5)';
  for (let i = 0; i < 12; i += 1) {
    const bw = w * 0.06;
    const bh = h * (0.25 + ((i * 41) % 6) * 0.07);
    ctx.fillRect((i / 12) * w, base - bh, bw, bh);
  }
}

// ---------------- Ba Đình ----------------

/** Cột cờ Hà Nội: stacked brick tiers with the flag on top. */
function flagTower(ctx, x, base, s, t) {
  [[0.5, 0.18], [0.36, 0.16], [0.24, 0.14]].forEach(([w, h], i) => {
    const below = [0, 0.18, 0.34][i];
    block(ctx, x - (s * w) / 2, base - s * (below + h), s * w, s * h, '#c9a27a');
  });
  block(ctx, x - s * 0.05, base - s * 0.95, s * 0.1, s * 0.47, '#c9a27a');
  block(ctx, x - s * 0.08, base - s * 1.0, s * 0.16, s * 0.06, '#b38b62');
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(x, base - s * 1.0);
  ctx.lineTo(x, base - s * 1.3);
  ctx.stroke();
  starFlag(ctx, x, base - s * 1.3, s * 0.26 + Math.sin(t / 300) * s * 0.02, s * 0.17, ['#da251d']);
}

/** Chùa Một Cột: a small pagoda on a single pillar in a lotus pond. */
function onePillarPagoda(ctx, x, base, s) {
  ctx.fillStyle = '#7fb8d8';
  ctx.beginPath();
  ctx.ellipse(x, base - s * 0.03, s * 0.42, s * 0.07, 0, 0, Math.PI * 2);
  ctx.fill();
  ['#ef8fb0', '#ef8fb0', '#ef8fb0'].forEach((c, i) => {
    ctx.fillStyle = c;
    ctx.beginPath();
    ctx.arc(x - s * 0.28 + i * s * 0.28, base - s * 0.05, s * 0.025, 0, Math.PI * 2);
    ctx.fill();
  });
  block(ctx, x - s * 0.04, base - s * 0.35, s * 0.08, s * 0.32, '#8b6b4a');
  block(ctx, x - s * 0.16, base - s * 0.52, s * 0.32, s * 0.17, '#c94f3d');
  curvedRoof(ctx, x - s * 0.2, base - s * 0.53, s * 0.4, s * 0.12, '#7a3b2e');
}

/** Tháp Rùa on its islet in Hoàn Kiếm lake. */
function turtleTower(ctx, x, base, s) {
  ctx.fillStyle = '#5aa9d6';
  ctx.beginPath();
  ctx.ellipse(x, base - s * 0.03, s * 0.55, s * 0.08, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#7ac74f';
  ctx.beginPath();
  ctx.ellipse(x, base - s * 0.06, s * 0.2, s * 0.04, 0, 0, Math.PI * 2);
  ctx.fill();
  [[0.24, 0.16], [0.18, 0.12], [0.12, 0.1]].forEach(([w, h], i) => {
    const below = [0.06, 0.22, 0.34][i];
    block(ctx, x - (s * w) / 2, base - s * (below + h), s * w, s * h, '#e8dcc0');
  });
  ctx.fillStyle = '#7a3b2e';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.08, base - s * 0.44);
  ctx.lineTo(x, base - s * 0.54);
  ctx.lineTo(x + s * 0.08, base - s * 0.44);
  ctx.fill();
}

/** Nhà hát Lớn: cream neoclassical facade with columns and a dome. */
function operaHouse(ctx, x, base, s) {
  const w = s * 0.9;
  block(ctx, x, base - s * 0.45, w, s * 0.45, '#f1e4c3');
  ctx.strokeStyle = '#c9b88f';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 1; i < 7; i += 1) {
    ctx.moveTo(x + (w / 7) * i, base - s * 0.4);
    ctx.lineTo(x + (w / 7) * i, base - s * 0.05);
  }
  ctx.stroke();
  ctx.fillStyle = '#e8d5a8';
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.2, base - s * 0.45);
  ctx.lineTo(x + w / 2, base - s * 0.62);
  ctx.lineTo(x + w * 0.8, base - s * 0.45);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#5b8a8f';
  ctx.beginPath();
  ctx.arc(x + w / 2, base - s * 0.62, s * 0.08, Math.PI, 0);
  ctx.fill();
  ctx.stroke();
}

function lowSkyline(ctx, w, base, h) {
  ctx.fillStyle = 'rgba(140, 160, 180, 0.45)';
  for (let i = 0; i < 16; i += 1) {
    const bh = h * (0.18 + ((i * 29) % 5) * 0.04);
    ctx.fillRect((i / 16) * w, base - bh, w * 0.055, bh);
  }
}

export const HOLIDAY_SCENERY = {
  denhung: {
    fixed(ctx, w, base, h, t) {
      bronzeDrumSun(ctx, w * 0.84, h * 0.3, h * 0.19, t);
      cloud(ctx, (w * 0.2 + t * 0.008) % (w + h * 0.4) - h * 0.2, h * 0.22, h * 0.08);
    },
    far: (ctx, w, base, h) => mountain(ctx, w, base, h * 0.75),
    near(ctx, w, base, h, t) {
      terraces(ctx, w, base, h);
      temple(ctx, w * 0.08, base, h * 0.72);
      tree(ctx, w * 0.36, base, h * 0.5, '#3d8b3d');
      temple(ctx, w * 0.55, base, h * 0.6);
      tree(ctx, w * 0.9, base, h * 0.55, '#2f7a3a');
      [0.3, 0.47, 0.78, 0.97].forEach((fx, i) => festivalFlag(ctx, w * fx, base, h * 0.6, t, i));
    },
  },
  congtruong: {
    fixed(ctx, w, base, h) {
      sun(ctx, w * 0.12, h * 0.25, h * 0.11, '#ffe9a8');
    },
    far: (ctx, w, base, h) => cityUnderConstruction(ctx, w, base, h),
    near(ctx, w, base, h, t) {
      factory(ctx, w * 0.04, base, h * 0.75, t);
      towerCrane(ctx, w * 0.42, base, h * 0.75, t);
      scaffolding(ctx, w * 0.62, base, h * 0.72);
      factory(ctx, w * 0.78, base, h * 0.6, t + 900);
      [0.33, 0.38, 0.58, 0.74].forEach((fx) => cone(ctx, w * fx, base, h * 0.6));
    },
  },
  badinh: {
    fixed(ctx, w, base, h, t) {
      sun(ctx, w * 0.9, h * 0.22, h * 0.11, '#ffe066');
      cloud(ctx, (w * 0.35 + t * 0.006) % (w + h * 0.4) - h * 0.2, h * 0.16, h * 0.07);
    },
    far: (ctx, w, base, h) => lowSkyline(ctx, w, base, h),
    near(ctx, w, base, h, t) {
      flagTower(ctx, w * 0.1, base, h * 0.72, t);
      tree(ctx, w * 0.24, base, h * 0.5, '#3d8b3d');
      onePillarPagoda(ctx, w * 0.36, base, h * 0.7);
      turtleTower(ctx, w * 0.6, base, h * 0.7);
      operaHouse(ctx, w * 0.76, base, h * 0.72);
      tree(ctx, w * 0.97, base, h * 0.5, '#2f7a3a');
    },
  },
};
