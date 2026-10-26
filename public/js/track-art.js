// Trackside art for the race view: crowd, banners, flags, finish lines, shared canvas helpers.
import { ANIMALS, findAnimal } from '/shared/catalog.js';
import { drawFace, FONT, INK, starFlag } from './draw.js';

export function checkered(ctx, x, top, height, cell) {
  for (let y = top, row = 0; y < top + height; y += cell, row += 1) {
    for (let col = 0; col < 2; col += 1) {
      ctx.fillStyle = (row + col) % 2 ? '#fff' : INK;
      ctx.fillRect(x + col * cell, y, cell, Math.min(cell, top + height - y));
    }
  }
}

/** ctx.roundRect is missing on iOS < 16; fall back to arcs. */
export function roundedRect(ctx, x, y, w, h, r) {
  if (ctx.roundRect) return ctx.roundRect(x, y, w, h, r);
  const rr = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function pill(ctx, x, y, text, bg, fg, size, maxWidth = Infinity) {
  ctx.font = `800 ${size}px ${FONT}`;
  const w = Math.min(maxWidth, ctx.measureText(text).width + size);
  ctx.fillStyle = bg;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.beginPath();
  roundedRect(ctx, x - w / 2, y - size * 0.75, w, size * 1.5, size * 0.75);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = fg;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + size * 0.05, w - size * 0.6);
}

export const animalOf = (id) => findAnimal(id) ?? ANIMALS[0];

// ---------- roadside crowd & banners (part of the canvas, so they end up in the video) ----------
export const FAN_EVERY_M = 3.5;
export const BANNER_EVERY_M = 70;
export const BANNER_SPAN_M = 13;
export const SHIRTS = ['#ff5a36', '#18a999', '#5b6cff', '#ffd23f', '#c840e9', '#ef476f', '#2d9cdb', '#7ac74f'];
export const SKINS = ['#f5d0a9', '#e8b48a', '#c98e62', '#f1c27d'];
export const SIGNS = ['CỐ LÊN!', 'GO GO!', '🔥🔥', 'NHANH!', '❤️', '🏆', 'YEAH!', '👏👏'];

export function fan(ctx, x, base, h, seed, t, face) {
  const jump = Math.max(0, Math.sin(t / 160 + seed * 7)) * h * 0.12;
  const y = base - jump;
  const bodyW = h * 0.42;
  ctx.fillStyle = SHIRTS[seed % SHIRTS.length];
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, h * 0.05);
  ctx.beginPath();
  roundedRect(ctx, x - bodyW / 2, y - h * 0.62, bodyW, h * 0.62, bodyW * 0.35);
  ctx.fill();
  ctx.stroke();
  // Arms up, waving.
  const wave = Math.sin(t / 120 + seed) * h * 0.08;
  ctx.beginPath();
  ctx.moveTo(x - bodyW * 0.45, y - h * 0.5);
  ctx.lineTo(x - bodyW * 0.75, y - h * 0.95 + wave);
  ctx.moveTo(x + bodyW * 0.45, y - h * 0.5);
  ctx.lineTo(x + bodyW * 0.75, y - h * 0.95 - wave);
  ctx.stroke();
  const headR = h * 0.2;
  if (face) {
    drawFace(ctx, x, y - h * 0.78, headR * 1.15, face);
  } else {
    ctx.fillStyle = SKINS[seed % SKINS.length];
    ctx.beginPath();
    ctx.arc(x, y - h * 0.8, headR, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = INK;
    ctx.fillRect(x - headR * 0.4, y - h * 0.83, Math.max(1, headR * 0.18), Math.max(1, headR * 0.18));
    ctx.fillRect(x + headR * 0.25, y - h * 0.83, Math.max(1, headR * 0.18), Math.max(1, headR * 0.18));
  }
  return { left: { x: x - bodyW * 0.75, y: y - h * 0.95 + wave }, right: { x: x + bodyW * 0.75, y: y - h * 0.95 - wave } };
}

export function sign(ctx, hand, h, text) {
  const size = Math.max(8, h * 0.22);
  ctx.font = `800 ${size}px ${FONT}`;
  const w = ctx.measureText(text).width + size * 0.8;
  ctx.fillStyle = '#fff';
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(1.5, h * 0.04);
  ctx.beginPath();
  roundedRect(ctx, hand.x - w / 2, hand.y - size * 1.5, w, size * 1.4, 3);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, hand.x, hand.y - size * 0.8);
}

export function banner(ctx, a, b, h, text, color, t) {
  const sag = Math.sin(t / 300) * h * 0.04;
  const top = Math.min(a.y, b.y) - h * 0.45 + sag;
  const height = h * 0.5;
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = Math.max(2, h * 0.05);
  ctx.beginPath();
  ctx.moveTo(a.x, top);
  ctx.quadraticCurveTo((a.x + b.x) / 2, top + sag * 2, b.x, top);
  ctx.lineTo(b.x, top + height);
  ctx.quadraticCurveTo((a.x + b.x) / 2, top + height + sag * 2, a.x, top + height);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const size = Math.max(9, height * 0.58);
  ctx.font = `800 ${size}px ${FONT}`;
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineWidth = Math.max(2, size * 0.18);
  ctx.strokeText(text, (a.x + b.x) / 2, top + height / 2 + sag, Math.abs(b.x - a.x) - 10);
  ctx.fillText(text, (a.x + b.x) / 2, top + height / 2 + sag, Math.abs(b.x - a.x) - 10);
}

export function gate(ctx, x, base, h, label, title, color) {
  const width = Math.max(90, h * 1.9);
  const top = base - h * 1.55;
  ctx.fillStyle = INK;
  ctx.fillRect(x - width / 2, top, Math.max(3, h * 0.07), base - top);
  ctx.fillRect(x + width / 2 - Math.max(3, h * 0.07), top, Math.max(3, h * 0.07), base - top);
  ctx.fillStyle = color;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundedRect(ctx, x - width / 2 - 6, top - h * 0.1, width + 12, h * (title ? 0.75 : 0.5), 8);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.font = `800 ${Math.max(10, h * 0.26)}px ${FONT}`;
  ctx.fillText(label, x, top + h * 0.12, width);
  if (title) {
    ctx.font = `700 ${Math.max(8, h * 0.17)}px ${FONT}`;
    ctx.fillText(title, x, top + h * 0.42, width);
  }
}

// ---------- roadside flags ----------
export const POLE_EVERY_M = 9;
export const KERB_FLAG_EVERY_M = 4;
export const PENNANTS = ['#ff5a36', '#ffd23f', '#18a999', '#5b6cff', '#c840e9'];
export const VN_PENNANTS = ['#da251d', '#ffde00'];

/** Festive mode per map: the Saigon map flies the national flag, others get colourful bunting. */
export const flagStyle = (mapId) => (mapId === 'saigon' ? 'vn' : 'party');

export function pennantString(ctx, a, b, sag, colors, offset) {
  const count = Math.max(3, Math.floor(Math.hypot(b.x - a.x, b.y - a.y) / 16));
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag * 2, b.x, b.y);
  ctx.stroke();
  for (let i = 0; i < count; i += 1) {
    const k = (i + 0.5) / count;
    const x = a.x + (b.x - a.x) * k;
    const y = a.y + (b.y - a.y) * k + 4 * sag * k * (1 - k);
    const size = Math.max(5, sag * 0.55);
    ctx.fillStyle = colors[(i + offset) % colors.length];
    ctx.beginPath();
    ctx.moveTo(x - size * 0.5, y);
    ctx.lineTo(x + size * 0.5, y);
    ctx.lineTo(x, y + size * 1.1);
    ctx.closePath();
    ctx.fill();
  }
}

/** Cheap deterministic hash in [0, 1) for scattering ground details. */
export const hash = (n) => {
  const x = Math.sin(n * 127.1) * 43758.5453;
  return x - Math.floor(x);
};


export const easeOut = (k) => 1 - (1 - k) ** 3;
export const GATE_FALL_MS = 700;

/** Drops fast, then a couple of small bounces as it hits the road. */
export function bounceOut(k) {
  if (k < 0.6) return (k / 0.6) ** 2;
  const t = (k - 0.6) / 0.4;
  return 1 - Math.abs(Math.sin(t * Math.PI * 2)) * 0.08 * (1 - t);
}

// ---------- finish lines ----------

/**
 * Dinh Độc Lập's wrought-iron gate as the finish line.
 * It stands across the road until the first racer arrives, then crashes down flat onto the road.
 */
export function palaceGate(ctx, race, x, top, h, laneH, since) {
  const sinceHit = since;
  const fall = sinceHit < 0 ? 0 : Math.min(1, sinceHit / GATE_FALL_MS);
  const standW = Math.max(9, laneH * 0.14);
  const fallenW = Math.max(40, laneH * 1.1);
  const pw = Math.max(14, laneH * 0.28);
  const ph = Math.max(34, laneH * 0.55);
  const gateTop = top + ph * 0.55;
  const gateBottom = h - ph * 0.9;

  // Seen from above, a gate tipping forward grows "longer" along the road as it lies down.
  const width = standW + (fallenW - standW) * bounceOut(fall);
  const skew = fall > 0 ? 0.06 : 0; // lands a bit crooked
  ctx.save();
  ctx.translate(x, gateTop);
  ctx.transform(1, skew, 0, 1, 0, 0);
  const height = gateBottom - gateTop;
  ctx.fillStyle = fall > 0 ? 'rgba(29,26,47,0.22)' : 'transparent';
  ctx.fillRect(2, 4, width, height); // shadow of the fallen gate on the asphalt
  ctx.strokeStyle = '#2f3d33';
  ctx.lineWidth = Math.max(2, standW * 0.25);
  ctx.strokeRect(0, 0, width, height);
  ctx.lineWidth = Math.max(1.2, standW * 0.13);
  ctx.beginPath();
  for (let y = 8; y < height; y += 9) { // the iron bars
    ctx.moveTo(0, y);
    ctx.lineTo(width, y);
  }
  for (let k = 1; k < 4; k += 1) {
    ctx.moveTo((width / 4) * k, 0);
    ctx.lineTo((width / 4) * k, height);
  }
  ctx.stroke();
  ctx.fillStyle = '#c9a227';
  [0.25, 0.75].forEach((f) => {
    ctx.beginPath();
    ctx.arc(width / 2, height * f, Math.max(4, standW * 0.4), 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();

  if (sinceHit >= 0 && sinceHit < GATE_FALL_MS + 900) {
    const k = Math.min(1, sinceHit / (GATE_FALL_MS + 900));
    ctx.fillStyle = `rgba(210, 200, 180, ${0.7 * (1 - k)})`;
    for (let i = 0; i < 9; i += 1) {
      const dy = gateTop + ((i + 0.5) / 9) * (gateBottom - gateTop);
      ctx.beginPath();
      ctx.arc(x + fallenW * (0.3 + 0.7 * hash(i)) , dy, 8 + k * 26 * hash(i + 3), 0, Math.PI * 2);
      ctx.fill();
    }
    if (fall >= 0.6) pill(ctx, x + fallenW / 2, (gateTop + gateBottom) / 2, 'RẦM!! 💥', '#ffd23f', INK, Math.max(16, laneH * 0.3) * (1.3 - k * 0.3));
  }

  const pillar = (y) => {
    ctx.fillStyle = '#efe8d8';
    ctx.strokeStyle = INK;
    ctx.lineWidth = 2;
    ctx.fillRect(x - pw / 2, y, pw, ph);
    ctx.strokeRect(x - pw / 2, y, pw, ph);
    ctx.fillStyle = '#d6cbb3';
    ctx.fillRect(x - pw * 0.65, y - 4, pw * 1.3, 6);
    ctx.strokeRect(x - pw * 0.65, y - 4, pw * 1.3, 6);
  };
  pillar(top - ph * 0.45);
  pillar(gateBottom);
  pill(ctx, x, top + 12, fall > 0 ? 'CỔNG DINH ĐÃ ĐỔ!' : 'CỔNG DINH', fall > 0 ? '#da251d' : '#fff', fall > 0 ? '#ffde00' : INK, 11);
}

export function pillar(ctx, x, y, w, h, fill) {
  ctx.fillStyle = fill;
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.fillRect(x - w / 2, y, w, h);
  ctx.strokeRect(x - w / 2, y, w, h);
}

/** Đền Hùng: temple gate; a bronze drum booms (shock rings) when the first racer arrives. */
export function templeDrum(ctx, x, top, h, laneH, since) {
  const pw = Math.max(14, laneH * 0.26);
  const ph = Math.max(34, laneH * 0.55);
  pillar(ctx, x, top - ph * 0.45, pw, ph, '#c94f3d');
  pillar(ctx, x, h - ph * 0.9, pw, ph, '#c94f3d');
  ctx.fillStyle = 'rgba(201, 79, 61, 0.35)';
  ctx.fillRect(x - 2, top, 4, h - top);
  const drumR = Math.max(16, laneH * 0.32);
  const cy = (top + h) / 2;
  if (since >= 0) {
    for (let k = 0; k < 3; k += 1) {
      const age = ((since + k * 450) % 1350) / 1350;
      if (since < k * 450) continue;
      ctx.strokeStyle = `rgba(217, 164, 65, ${0.8 * (1 - age)})`;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(x, cy, drumR + age * laneH * 2.4, 0, Math.PI * 2);
      ctx.stroke();
    }
  }
  const beat = since >= 0 ? 1 + Math.max(0, Math.sin(since / 110)) * 0.12 : 1;
  ctx.save();
  ctx.translate(x, cy);
  ctx.scale(beat, beat);
  ctx.fillStyle = '#d9a441';
  ctx.strokeStyle = '#8a5a12';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(0, 0, drumR, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f6d36b';
  ctx.beginPath();
  for (let i = 0; i < 28; i += 1) {
    const a = (i * Math.PI) / 14;
    const rr = i % 2 === 0 ? drumR * 0.7 : drumR * 0.25;
    ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  pill(ctx, x, top + 12, since >= 0 ? 'TÙNG! TÙNG! 🥁' : 'ĐỀN HÙNG', since >= 0 ? '#d9a441' : '#fff', INK, 11);
}

/** Công trường: opening-ceremony ribbon, snapped by the first racer, with confetti. */
export function ribbon(ctx, x, top, h, laneH, since) {
  const pw = Math.max(12, laneH * 0.22);
  const ph = Math.max(30, laneH * 0.5);
  pillar(ctx, x, top - ph * 0.45, pw, ph, '#f2b705');
  pillar(ctx, x, h - ph * 0.9, pw, ph, '#f2b705');
  const a = top + ph * 0.55;
  const b = h - ph * 0.9;
  const mid = (a + b) / 2;
  const cut = since >= 0 ? Math.min(1, since / 500) : 0;
  ctx.strokeStyle = '#da251d';
  ctx.lineWidth = Math.max(5, laneH * 0.08);
  ctx.lineCap = 'round';
  ctx.beginPath();
  if (cut === 0) {
    ctx.moveTo(x, a);
    ctx.quadraticCurveTo(x + 8 + Math.sin(Date.now() / 300) * 4, mid, x, b);
  } else {
    // Two halves droop back toward their posts.
    const droop = (mid - a) * (1 - cut * 0.6);
    ctx.moveTo(x, a);
    ctx.quadraticCurveTo(x + 30 * cut, a + droop * 0.6, x + 18 * cut, a + droop);
    ctx.moveTo(x, b);
    ctx.quadraticCurveTo(x + 30 * cut, b - droop * 0.6, x + 18 * cut, b - droop);
  }
  ctx.stroke();
  ctx.fillStyle = '#da251d';
  ctx.beginPath();
  ctx.arc(x, mid, Math.max(7, laneH * 0.12) * (cut ? 0 : 1), 0, Math.PI * 2);
  ctx.fill();
  if (since >= 0 && since < 3500) {
    const k = since / 3500;
    const colors = ['#ef476f', '#ffd23f', '#18a999', '#5b6cff', '#ff9f1c'];
    for (let i = 0; i < 40; i += 1) {
      const ang = hash(i) * Math.PI * 2;
      const speed = laneH * (1 + hash(i + 7) * 2);
      const px = x + Math.cos(ang) * speed * k;
      const py = mid + Math.sin(ang) * speed * k + laneH * 2.5 * k * k;
      ctx.fillStyle = colors[i % colors.length];
      ctx.globalAlpha = 1 - k;
      ctx.fillRect(px, py, 6, 3);
    }
    ctx.globalAlpha = 1;
  }
  pill(ctx, x, top + 12, since >= 0 ? 'KHÁNH THÀNH! 🎉' : 'CẮT BĂNG', since >= 0 ? '#da251d' : '#fff', since >= 0 ? '#ffde00' : INK, 11);
}

/** Ba Đình: the flag is raised up the pole when the winner arrives, then fireworks. */
export function flagRaise(ctx, x, top, h, laneH, since) {
  const poleTop = 8;
  ctx.fillStyle = '#d8d8d8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2;
  ctx.fillRect(x - 3, poleTop, 6, h - poleTop);
  ctx.strokeRect(x - 3, poleTop, 6, h - poleTop);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(x, poleTop, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  const raise = since >= 0 ? easeOut(Math.min(1, since / 1800)) : 0;
  const fw = Math.max(42, laneH * 0.9);
  const fh = fw * 0.66;
  const flagY = h - fh - 6 - (h - fh - 6 - poleTop - 6) * raise;
  const wave = Math.sin(Date.now() / 240) * fw * 0.05;
  starFlag(ctx, x + 3, flagY, fw + wave, fh, ['#da251d']);
  if (since >= 1200) fireworks(ctx, x, top, since - 1200);
  pill(ctx, x, top + 12, raise >= 1 ? 'CHÀO CỜ! ⭐' : 'CỘT CỜ', raise >= 1 ? '#da251d' : '#fff', raise >= 1 ? '#ffde00' : INK, 11);
}

export function fireworks(ctx, x, top, ms) {
  const colors = ['#ffd23f', '#ef476f', '#18a999', '#fff', '#ff9f1c'];
  for (let burst = 0; burst < 6; burst += 1) {
    const age = (ms - burst * 650) / 1400;
    if (age < 0 || age > 1) continue;
    const cx = x - 260 + hash(burst * 3) * 520;
    const cy = top * (0.25 + hash(burst * 5) * 0.5);
    ctx.globalAlpha = 1 - age;
    for (let i = 0; i < 16; i += 1) {
      const a = (i * Math.PI * 2) / 16;
      const r = 10 + easeOut(age) * 55;
      ctx.fillStyle = colors[(burst + i) % colors.length];
      ctx.beginPath();
      ctx.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r + age * 12, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.globalAlpha = 1;
}
