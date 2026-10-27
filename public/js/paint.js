// Canvas drawing primitives shared by characters, scenery and the race view (thick cartoon outlines).

export const INK = '#1d1a2f';
export const FONT = '"Baloo 2", "Be Vietnam Pro", system-ui, sans-serif';

export function shape(ctx, fill, build, lineWidth = 2.5) {
  ctx.beginPath();
  build();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.lineWidth = lineWidth;
  ctx.strokeStyle = INK;
  ctx.stroke();
}

export function roundedPath(ctx, x, y, w, h, r) {
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/**
 * Flag with a five-point yellow star, hanging from a pole at (x, top).
 * One colour = Vietnamese national flag; [red, blue] = the half-red/half-blue liberation flag.
 */
export function starFlag(ctx, x, top, fw, fh, bands) {
  bands.forEach((color, i) => {
    ctx.fillStyle = color;
    ctx.fillRect(x, top + (fh / bands.length) * i, fw, fh / bands.length + 0.5);
  });
  ctx.strokeStyle = INK;
  ctx.lineWidth = 1.2;
  ctx.strokeRect(x, top, fw, fh);
  ctx.fillStyle = '#ffde00';
  ctx.beginPath();
  for (let i = 0; i < 5; i += 1) {
    const a = -Math.PI / 2 + (i * 4 * Math.PI) / 5;
    const px = x + fw / 2 + Math.cos(a) * fh * 0.34;
    const py = top + fh / 2 + Math.sin(a) * fh * 0.34;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

export const ellipse = (ctx, x, y, rx, ry, fill, rot = 0) => shape(ctx, fill, () => ctx.ellipse(x, y, rx, ry, rot, 0, Math.PI * 2));
export const circle = (ctx, x, y, r, fill) => ellipse(ctx, x, y, r, r, fill);

export function poly(ctx, points, fill) {
  shape(ctx, fill, () => {
    ctx.moveTo(points[0][0], points[0][1]);
    points.slice(1).forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
  });
}

export function stroke(ctx, color, width, build) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  build();
  ctx.strokeStyle = INK;
  ctx.lineWidth = width + 5;
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** Plain line without the ink outline: wires, stitches, noodles — details too thin for `stroke`. */
export function thinLine(ctx, color, width, build) {
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  build();
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

export function leg(ctx, x, top, len, angle, color, width = 7) {
  const ex = x + Math.sin(angle) * len;
  const ey = top + Math.cos(angle) * len;
  stroke(ctx, color, width, () => {
    ctx.moveTo(x, top);
    ctx.lineTo(ex, ey);
  });
}

export function shade(hex, amount) {
  const n = parseInt(hex.slice(1), 16);
  const c = (v) => Math.max(0, Math.min(255, Math.round(v + amount * 255)));
  return `rgb(${c(n >> 16)}, ${c((n >> 8) & 255)}, ${c(n & 255)})`;
}

/** Round "face" badge: player's color + initials. */
export function drawFace(ctx, x, y, r, face, ring = INK) {
  if (face.capture) return face.capture(ctx, x, y, r, ring); // sprite cache: badge goes on later, per racer
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = face.color;
  ctx.fill();
  ctx.lineWidth = Math.max(2.5, r * 0.22);
  ctx.strokeStyle = ring;
  ctx.stroke();
  ctx.lineWidth = 2;
  ctx.strokeStyle = INK;
  ctx.beginPath();
  ctx.arc(x, y, r + ctx.lineWidth * 0.5 + r * 0.1, 0, Math.PI * 2);
  ctx.stroke();
  const text = face.initials ?? '?';
  ctx.fillStyle = '#fff';
  ctx.font = `800 ${r * (text.length > 1 ? 0.82 : 1.05)}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, x, y + r * 0.08);
}

export const swing = (phase, offset, moving, amp = 0.55) => (moving ? Math.sin(phase + offset) * amp : 0);
