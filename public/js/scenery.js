// Map backgrounds: sky + parallax layers. Each map registers { fixed, far, near, overlay } painters.
// ---------- scenery ----------

export function cloud(ctx, x, y, s) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.beginPath();
  [[0, 0, 1], [0.9, -0.3, 0.8], [1.7, 0, 0.9], [0.8, 0.25, 0.9]].forEach(([dx, dy, r]) => {
    ctx.moveTo(x + dx * s + r * s, y + dy * s);
    ctx.arc(x + dx * s, y + dy * s, r * s, 0, Math.PI * 2);
  });
  ctx.fill();
}

export function sun(ctx, x, y, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
}

export function tree(ctx, x, base, s, leaf) {
  ctx.fillStyle = '#6b4226';
  ctx.fillRect(x - s * 0.08, base - s * 0.45, s * 0.16, s * 0.45);
  ctx.fillStyle = leaf;
  ctx.beginPath();
  ctx.arc(x, base - s * 0.6, s * 0.32, 0, Math.PI * 2);
  ctx.arc(x - s * 0.2, base - s * 0.45, s * 0.22, 0, Math.PI * 2);
  ctx.arc(x + s * 0.2, base - s * 0.45, s * 0.22, 0, Math.PI * 2);
  ctx.fill();
}

export function pine(ctx, x, base, s) {
  ctx.fillStyle = '#2f6b4f';
  for (let i = 0; i < 3; i += 1) {
    const top = base - s * (0.45 + i * 0.22);
    ctx.beginPath();
    ctx.moveTo(x, top - s * 0.25);
    ctx.lineTo(x - s * (0.3 - i * 0.06), top + s * 0.12);
    ctx.lineTo(x + s * (0.3 - i * 0.06), top + s * 0.12);
    ctx.fill();
  }
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.moveTo(x, base - s * 1.15);
  ctx.lineTo(x - s * 0.1, base - s * 0.98);
  ctx.lineTo(x + s * 0.1, base - s * 0.98);
  ctx.fill();
}

export function cactus(ctx, x, base, s) {
  ctx.strokeStyle = '#3c8d4f';
  ctx.lineCap = 'round';
  ctx.lineWidth = s * 0.16;
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.lineTo(x, base - s * 0.8);
  ctx.moveTo(x, base - s * 0.4);
  ctx.lineTo(x - s * 0.22, base - s * 0.4);
  ctx.lineTo(x - s * 0.22, base - s * 0.62);
  ctx.moveTo(x, base - s * 0.5);
  ctx.lineTo(x + s * 0.2, base - s * 0.5);
  ctx.lineTo(x + s * 0.2, base - s * 0.7);
  ctx.stroke();
}

export function palm(ctx, x, base, s) {
  ctx.strokeStyle = '#8d5a2b';
  ctx.lineWidth = s * 0.08;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(x, base);
  ctx.quadraticCurveTo(x + s * 0.15, base - s * 0.5, x + s * 0.05, base - s * 0.9);
  ctx.stroke();
  ctx.strokeStyle = '#2e9e5b';
  ctx.lineWidth = s * 0.07;
  [-2.6, -2, -1.2, -0.5].forEach((a) => {
    ctx.beginPath();
    ctx.moveTo(x + s * 0.05, base - s * 0.9);
    ctx.quadraticCurveTo(x + s * 0.05 + Math.cos(a) * s * 0.3, base - s * 1.05, x + s * 0.05 + Math.cos(a) * s * 0.45, base - s * 0.9 + Math.sin(a + 3.6) * s * 0.2);
    ctx.stroke();
  });
}

export function barn(ctx, x, base, s) {
  ctx.fillStyle = '#c0392b';
  ctx.fillRect(x, base - s * 0.55, s * 0.7, s * 0.55);
  ctx.fillStyle = '#7f2a1e';
  ctx.beginPath();
  ctx.moveTo(x - s * 0.06, base - s * 0.55);
  ctx.lineTo(x + s * 0.35, base - s * 0.85);
  ctx.lineTo(x + s * 0.76, base - s * 0.55);
  ctx.fill();
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = Math.max(1.5, s * 0.03);
  ctx.strokeRect(x + s * 0.24, base - s * 0.34, s * 0.22, s * 0.34);
}

// ---------- Saigon landmarks (map "Dinh Độc Lập") ----------
export const OUTLINE = '#1d1a2f';

export function block(ctx, x, y, w, h, fill, line = 2) {
  ctx.fillStyle = fill;
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = line;
  ctx.strokeRect(x, y, w, h);
}

export function vnFlag(ctx, x, y, s) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, s * 0.04);
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x, y - s);
  ctx.stroke();
  const fw = s * 0.62;
  const fh = s * 0.42;
  ctx.fillStyle = '#da251d';
  ctx.fillRect(x, y - s, fw, fh);
  ctx.fillStyle = '#ffde00';
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const px = x + fw / 2 + Math.cos(a) * fh * 0.32;
    const py = y - s + fh / 2 + Math.sin(a) * fh * 0.32;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/** Dinh Độc Lập: wide white modernist facade with its famous vertical fins. */
export function independencePalace(ctx, x, base, s) {
  const w = s * 1.7;
  const lawnH = s * 0.1;
  ctx.fillStyle = '#7ac74f';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, base, w * 0.62, lawnH * 1.6, 0, Math.PI, 0);
  ctx.fill();
  block(ctx, x, base - s * 0.5, w, s * 0.5 - lawnH * 0.4, '#f4f1ea');
  block(ctx, x + w * 0.3, base - s * 0.62, w * 0.4, s * 0.12, '#ece7dc');
  block(ctx, x - w * 0.04, base - s * 0.53, w * 1.08, s * 0.05, '#e3ddd0');
  ctx.strokeStyle = '#b9b2a3';
  ctx.lineWidth = Math.max(1, s * 0.012);
  ctx.beginPath();
  for (let fx = x + w * 0.04; fx < x + w * 0.97; fx += w / 28) {
    ctx.moveTo(fx, base - s * 0.46);
    ctx.lineTo(fx, base - lawnH * 0.6);
  }
  ctx.stroke();
  ctx.fillStyle = '#5c6670';
  ctx.fillRect(x + w * 0.44, base - s * 0.2, w * 0.12, s * 0.2 - lawnH * 0.4);
  vnFlag(ctx, x + w / 2, base - s * 0.62, s * 0.38);
  // Fountain in the front lawn.
  ctx.fillStyle = '#9bd7f5';
  ctx.beginPath();
  ctx.ellipse(x + w / 2, base - lawnH * 0.2, w * 0.1, lawnH * 0.5, 0, 0, Math.PI * 2);
  ctx.fill();
}

/** Nhà thờ Đức Bà: red brick, twin spires, rose window. */
export function cathedral(ctx, x, base, s) {
  const brick = '#b5523b';
  const spire = '#5b6d7f';
  const tw = s * 0.22;
  const w = s * 0.75;
  block(ctx, x + tw * 0.5, base - s * 0.55, w - tw, s * 0.55, brick);
  [x, x + w - tw].forEach((tx) => {
    block(ctx, tx, base - s * 0.85, tw, s * 0.85, brick);
    ctx.fillStyle = spire;
    ctx.strokeStyle = OUTLINE;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(tx - tw * 0.05, base - s * 0.85);
    ctx.lineTo(tx + tw / 2, base - s * 1.25);
    ctx.lineTo(tx + tw * 1.05, base - s * 0.85);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(tx + tw / 2, base - s * 1.25);
    ctx.lineTo(tx + tw / 2, base - s * 1.33);
    ctx.moveTo(tx + tw * 0.38, base - s * 1.3);
    ctx.lineTo(tx + tw * 0.62, base - s * 1.3);
    ctx.stroke();
    ctx.fillStyle = '#3b2a2a';
    ctx.fillRect(tx + tw * 0.35, base - s * 0.7, tw * 0.3, s * 0.12);
  });
  ctx.fillStyle = '#ffe9a8';
  ctx.beginPath();
  ctx.arc(x + w / 2, base - s * 0.4, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#3b2a2a';
  ctx.beginPath();
  ctx.moveTo(x + w / 2 - s * 0.07, base);
  ctx.lineTo(x + w / 2 - s * 0.07, base - s * 0.14);
  ctx.arc(x + w / 2, base - s * 0.14, s * 0.07, Math.PI, 0);
  ctx.lineTo(x + w / 2 + s * 0.07, base);
  ctx.fill();
}

/** Bưu điện Thành phố: yellow facade, green arched roof, clock. */
export function postOffice(ctx, x, base, s) {
  const w = s * 1.2;
  block(ctx, x, base - s * 0.5, w, s * 0.5, '#f2c14e');
  ctx.fillStyle = '#2f6b4f';
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x + w * 0.3, base - s * 0.5);
  ctx.quadraticCurveTo(x + w / 2, base - s * 0.86, x + w * 0.7, base - s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + w / 2, base - s * 0.6, s * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x + w / 2, base - s * 0.6);
  ctx.lineTo(x + w / 2, base - s * 0.65);
  ctx.moveTo(x + w / 2, base - s * 0.6);
  ctx.lineTo(x + w / 2 + s * 0.035, base - s * 0.6);
  ctx.stroke();
  ctx.fillStyle = '#8a5a2b';
  for (let i = 0; i < 5; i += 1) {
    const ax = x + w * (0.1 + i * 0.2) - s * 0.045;
    ctx.beginPath();
    ctx.moveTo(ax, base);
    ctx.lineTo(ax, base - s * 0.2);
    ctx.arc(ax + s * 0.045, base - s * 0.2, s * 0.045, Math.PI, 0);
    ctx.lineTo(ax + s * 0.09, base);
    ctx.fill();
  }
}

/** Chợ Bến Thành: low market hall with the clock tower. */
export function benThanh(ctx, x, base, s) {
  const w = s * 1.1;
  block(ctx, x, base - s * 0.3, w, s * 0.3, '#e8dcc0');
  block(ctx, x + w * 0.4, base - s * 0.72, w * 0.2, s * 0.42, '#efe4c8');
  ctx.fillStyle = '#b5523b';
  ctx.beginPath();
  ctx.moveTo(x + w * 0.37, base - s * 0.72);
  ctx.lineTo(x + w / 2, base - s * 0.86);
  ctx.lineTo(x + w * 0.63, base - s * 0.72);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(x + w / 2, base - s * 0.6, s * 0.06, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#b5523b';
  ctx.fillRect(x, base - s * 0.33, w, s * 0.05);
}

export function landmark81(ctx, x, base, s, color) {
  ctx.fillStyle = color;
  const steps = [[0.34, 0.55], [0.26, 0.78], [0.18, 0.95], [0.1, 1.12], [0.03, 1.28]];
  steps.forEach(([half, top]) => ctx.fillRect(x - s * half * 0.5, base - s * top, s * half, s * top));
}

export function bitexco(ctx, x, base, s, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.1, base);
  ctx.quadraticCurveTo(x - s * 0.12, base - s * 0.6, x - s * 0.04, base - s * 0.95);
  ctx.lineTo(x + s * 0.05, base - s * 0.95);
  ctx.quadraticCurveTo(x + s * 0.12, base - s * 0.6, x + s * 0.1, base);
  ctx.closePath();
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(x + s * 0.09, base - s * 0.68, s * 0.09, s * 0.025, 0, 0, Math.PI * 2);
  ctx.fill();
}

export function skyline(ctx, w, base, h) {
  const color = 'rgba(120, 150, 185, 0.55)';
  ctx.fillStyle = color;
  for (let i = 0; i < 14; i += 1) {
    const bw = w * (0.04 + ((i * 37) % 5) * 0.008);
    const bh = h * (0.22 + ((i * 53) % 7) * 0.05);
    ctx.fillRect((i / 14) * w, base - bh, bw, bh);
  }
  landmark81(ctx, w * 0.28, base, h * 0.85, color);
  bitexco(ctx, w * 0.72, base, h * 0.75, color);
}

export function scooter(ctx, x, base, s, color) {
  ctx.strokeStyle = OUTLINE;
  ctx.lineWidth = Math.max(1.5, s * 0.06);
  ctx.fillStyle = '#2b2d42';
  [x - s * 0.35, x + s * 0.35].forEach((wx) => {
    ctx.beginPath();
    ctx.arc(wx, base - s * 0.15, s * 0.15, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(x - s * 0.45, base - s * 0.3);
  ctx.lineTo(x + s * 0.1, base - s * 0.3);
  ctx.lineTo(x + s * 0.35, base - s * 0.6);
  ctx.lineTo(x + s * 0.45, base - s * 0.3);
  ctx.lineTo(x + s * 0.45, base - s * 0.15);
  ctx.lineTo(x - s * 0.45, base - s * 0.15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = '#f5d0a9';
  ctx.beginPath();
  ctx.arc(x - s * 0.05, base - s * 0.85, s * 0.11, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = color;
  ctx.fillRect(x - s * 0.16, base - s * 0.72, s * 0.22, s * 0.38);
  ctx.fillStyle = '#ffd23f';
  ctx.beginPath();
  ctx.arc(x - s * 0.05, base - s * 0.9, s * 0.12, Math.PI, 0); // helmet
  ctx.fill();
}

export function hills(ctx, w, base, h, color, seed) {
  // Two full sine periods per tile so the layer repeats seamlessly when scrolled.
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, base);
  for (let x = 0; x <= w; x += w / 48) {
    ctx.lineTo(x, base - h * (0.55 + 0.45 * Math.sin((x / w) * Math.PI * 4 + seed)));
  }
  ctx.lineTo(w, base);
  ctx.fill();
}

export function snowfall(ctx, w, base, t) {
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  for (let i = 0; i < 40; i += 1) {
    const fx = (i * 97.3 + t * 0.02 * (1 + (i % 3))) % w;
    const fy = (i * 53.7 + t * 0.03 * (1 + (i % 2))) % base;
    ctx.beginPath();
    ctx.arc(fx, fy, 1.5 + (i % 3), 0, Math.PI * 2);
    ctx.fill();
  }
}

export function waves(ctx, w, base, h, t) {
  ctx.fillStyle = '#1e88c7';
  ctx.fillRect(0, base - h * 0.38, w, h * 0.38);
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  for (let row = 0; row < 3; row += 1) {
    ctx.beginPath();
    for (let x = 0; x <= w; x += 12) {
      const y = base - h * (0.3 - row * 0.1) + Math.sin((x / w) * Math.PI * 16 + t / 500 + row) * 3;
      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
}

export function fence(ctx, w, base, h) {
  ctx.strokeStyle = '#fff6e5';
  ctx.lineWidth = Math.max(2, h * 0.03);
  ctx.beginPath();
  ctx.moveTo(0, base - h * 0.12);
  ctx.lineTo(w, base - h * 0.12);
  const step = w / Math.max(1, Math.round(w / 26));
  for (let x = 0; x < w; x += step) {
    ctx.moveTo(x, base);
    ctx.lineTo(x, base - h * 0.18);
  }
  ctx.stroke();
}

/**
 * Each map is drawn in layers:
 *  - fixed:   sun/clouds, drawn once (clouds drift slowly with time)
 *  - far/near: tiled horizontally and scrolled at different speeds (parallax)
 *  - overlay: weather on top, not scrolled
 */
export const SCENERY = {
  meadow: {
    fixed(ctx, w, base, h, t) {
      sun(ctx, w * 0.86, h * 0.3, h * 0.16, '#ffe066');
      cloud(ctx, (w * 0.18 + t * 0.01) % (w + h * 0.4) - h * 0.2, h * 0.3, h * 0.1);
      cloud(ctx, (w * 0.55 + t * 0.006) % (w + h * 0.4) - h * 0.2, h * 0.22, h * 0.08);
    },
    far: (ctx, w, base, h) => hills(ctx, w, base, h * 0.35, '#8fd16a', 0.6),
    near(ctx, w, base, h) {
      for (let i = 0; i < 7; i += 1) tree(ctx, w * (0.06 + i * 0.143), base, h * 0.55, i % 2 ? '#4caf50' : '#3d9a45');
    },
  },
  desert: {
    fixed: (ctx, w, base, h) => sun(ctx, w * 0.8, h * 0.35, h * 0.2, '#fff3b0'),
    far: (ctx, w, base, h) => hills(ctx, w, base, h * 0.4, '#e0a458', 1.8),
    near(ctx, w, base, h) {
      hills(ctx, w, base, h * 0.22, '#d48d3f', 0.2);
      for (let i = 0; i < 5; i += 1) cactus(ctx, w * (0.1 + i * 0.2), base, h * 0.5);
    },
  },
  snow: {
    far: (ctx, w, base, h) => hills(ctx, w, base, h * 0.5, '#c9d8ea', 2.4),
    near(ctx, w, base, h) {
      hills(ctx, w, base, h * 0.25, '#ffffff', 0.9);
      for (let i = 0; i < 8; i += 1) pine(ctx, w * (0.04 + i * 0.125), base, h * 0.55);
    },
    overlay: (ctx, w, base, h, t) => snowfall(ctx, w, base, t),
  },
  beach: {
    fixed(ctx, w, base, h, t) {
      sun(ctx, w * 0.15, h * 0.32, h * 0.14, '#ffe066');
      cloud(ctx, (w * 0.62 + t * 0.008) % (w + h * 0.4) - h * 0.2, h * 0.25, h * 0.08);
    },
    far: (ctx, w, base, h, t) => waves(ctx, w, base, h, t),
    near(ctx, w, base, h) {
      for (let i = 0; i < 4; i += 1) palm(ctx, w * (0.12 + i * 0.25), base, h * 0.6);
    },
  },
  farm: {
    fixed(ctx, w, base, h, t) {
      sun(ctx, w * 0.88, h * 0.28, h * 0.13, '#ffd166');
      cloud(ctx, (w * 0.3 + t * 0.01) % (w + h * 0.4) - h * 0.2, h * 0.24, h * 0.09);
    },
    far: (ctx, w, base, h) => hills(ctx, w, base, h * 0.3, '#a5d46a', 1.1),
    near(ctx, w, base, h) {
      barn(ctx, w * 0.62, base, h * 0.7);
      tree(ctx, w * 0.12, base, h * 0.55, '#3d9a45');
      tree(ctx, w * 0.35, base, h * 0.5, '#4caf50');
      fence(ctx, w, base, h);
    },
  },
};

SCENERY.saigon = {
  fixed(ctx, w, base, h, t) {
    sun(ctx, w * 0.9, h * 0.22, h * 0.11, '#ffe066');
    cloud(ctx, (w * 0.12 + t * 0.008) % (w + h * 0.4) - h * 0.2, h * 0.2, h * 0.08);
    cloud(ctx, (w * 0.58 + t * 0.005) % (w + h * 0.4) - h * 0.2, h * 0.14, h * 0.07);
  },
  far: (ctx, w, base, h) => skyline(ctx, w, base, h),
  near(ctx, w, base, h) {
    const s = h * 0.62;
    independencePalace(ctx, w * 0.02, base, s);
    tree(ctx, w * 0.27, base, h * 0.5, '#3d8b3d');
    cathedral(ctx, w * 0.31, base, s);
    tree(ctx, w * 0.47, base, h * 0.5, '#2f7a3a');
    postOffice(ctx, w * 0.51, base, s);
    tree(ctx, w * 0.72, base, h * 0.5, '#3d8b3d');
    benThanh(ctx, w * 0.76, base, s);
    tree(ctx, w * 0.97, base, h * 0.5, '#2f7a3a');
  },
  overlay(ctx, w, base, h, t) {
    // Saigon traffic never stops: scooters buzzing along the sidewalk.
    [['#ef476f', 0.11, 0], ['#18a999', 0.08, 0.45], ['#5b6cff', 0.14, 0.8]].forEach(([color, speed, offset]) => {
      const x = ((t * speed * 0.001 + offset) % 1.2) * w - w * 0.1;
      scooter(ctx, x, base - h * 0.02, h * 0.16, color);
    });
  },
};

export const PARALLAX = { far: 0.15, near: 0.45 };

export function tiled(ctx, w, offset, paint) {
  const shift = ((offset % w) + w) % w;
  ctx.save();
  ctx.translate(-shift, 0);
  paint();
  ctx.translate(w, 0);
  paint();
  ctx.restore();
}

/**
 * Paint sky + decor into the band [0, height].
 * @param {number} [scroll] camera position in pixels; layers move at different rates for depth.
 */
export function drawScenery(ctx, map, w, h, t = 0, scroll = 0) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, map.palette.skyTop);
  g.addColorStop(1, map.palette.skyBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  const layers = SCENERY[map.id] ?? SCENERY.meadow;
  layers.fixed?.(ctx, w, h, h, t);
  if (layers.far) tiled(ctx, w, scroll * PARALLAX.far, () => layers.far(ctx, w, h, h, t));
  if (layers.near) tiled(ctx, w, scroll * PARALLAX.near, () => layers.near(ctx, w, h, h, t));
  layers.overlay?.(ctx, w, h, h, t);
  ctx.fillStyle = map.palette.ground;
  ctx.fillRect(0, h - Math.max(3, h * 0.04), w, Math.max(3, h * 0.04));
}

export function paintMapCard(canvas, map) {
  const dpr = window.devicePixelRatio || 1;
  const w = canvas.clientWidth || canvas.width;
  const h = canvas.clientHeight || canvas.height;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  const sky = h * 0.62;
  drawScenery(ctx, map, w, sky);
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i % 2 ? map.palette.laneB : map.palette.laneA;
    ctx.fillRect(0, sky + ((h - sky) / 3) * i, w, (h - sky) / 3);
  }
}
