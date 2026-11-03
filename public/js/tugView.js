// The tug-of-war scene, drawn by RaceView when a room pulls instead of racing: the map's sky and decor, a patch of
// ground with the middle line and the two winning lines, the rope with its red ribbon, and the two crews leaning
// back on it (team 1 on the left, team 2 mirrored on the right). Above them, each crew's pull and the time left.
import { MAPS, findMap } from '/shared/catalog.js';
import { TUG } from '/shared/tug.js';
import { PAINTERS } from './draw.js';
import { FONT, INK, shade } from './paint.js';
import { drawScenery } from './scenery.js';
import { pill, roundedRect } from './track-art.js';

const SMOOTHING = 8; // how fast the drawn rope follows the server (per second)
const LINE_AT = 0.28; // where the winning lines sit, as a share of the width from the middle
const CREW_DRAWN = 4; // crews are drawn as this many groups at most, however big the team

/** Holds what must persist between frames (the smoothed rope, the heave phase). */
export const createTugDisplay = () => ({ pos: 0, phase: 0 });

export function drawTug(ctx, w, h, state, display, { dt, t, clockOffset }) {
  const race = state.race;
  const map = findMap(race.mapId) ?? MAPS[0];
  const pulling = state.phase === 'racing' && !race.paused;
  const target = race.rope?.pos ?? 0;
  display.pos += (target - display.pos) * Math.min(1, dt * SMOOTHING);
  display.phase += pulling ? dt * 6 : 0;

  const sky = h * 0.42;
  drawScenery(ctx, map, w, sky, t);
  const ground = ctx.createLinearGradient(0, sky, 0, h);
  ground.addColorStop(0, map.palette.laneA);
  ground.addColorStop(1, shade(map.palette.laneB, -0.08));
  ctx.fillStyle = ground;
  ctx.fillRect(0, sky, w, h - sky);

  const mid = w / 2;
  const span = w * LINE_AT;
  const ropeY = sky + (h - sky) * 0.55;
  // the middle line and the two winning lines on the ground
  ctx.save();
  ctx.strokeStyle = map.palette.line;
  ctx.lineWidth = Math.max(3, w * 0.004);
  ctx.setLineDash([12, 10]);
  ctx.beginPath();
  ctx.moveTo(mid, sky + 8);
  ctx.lineTo(mid, h - 8);
  ctx.stroke();
  ctx.setLineDash([]);
  [-1, 1].forEach((side) => {
    ctx.strokeStyle = '#da251d';
    ctx.lineWidth = Math.max(4, w * 0.006);
    ctx.beginPath();
    ctx.moveTo(mid + side * span, sky + 8);
    ctx.lineTo(mid + side * span, h - 8);
    ctx.stroke();
  });
  ctx.restore();

  // the rope, shifted toward the side that is winning, and its ribbon
  const shift = (display.pos / TUG.winAt) * span;
  const sag = 6 + Math.sin(display.phase) * 2;
  ctx.save();
  ctx.strokeStyle = '#c8a46a';
  ctx.lineWidth = Math.max(5, h * 0.012);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(w * 0.02, ropeY);
  ctx.quadraticCurveTo(mid + shift, ropeY + sag, w * 0.98, ropeY);
  ctx.stroke();
  ribbon(ctx, mid + shift, ropeY + sag / 2, Math.max(14, h * 0.035));
  ctx.restore();

  // the crews: team 1 on the left, team 2 on the right (mirrored), each drawn as a few groups along the rope
  const size = Math.min(h * 0.32, w * 0.09);
  (race.teams ?? []).forEach((team, i) => {
    const racer = race.racers.find((r) => r.id === team.id);
    const crew = Math.max(1, Math.min(CREW_DRAWN, Math.ceil((racer?.crew ?? 1) / 3)));
    const dir = i === 0 ? 1 : -1;
    for (let k = 0; k < crew; k += 1) {
      // they move with the rope, but stay on screen when their side has won
      const x = Math.max(size * 0.9, Math.min(w - size * 0.9, mid + shift - dir * (span * 0.55 + k * size * 1.25)));
      ctx.save();
      ctx.translate(x, ropeY + size * 0.42);
      ctx.scale((dir * size) / 100, size / 100);
      PAINTERS.keoCo(ctx, team.color, display.phase + k * 0.4, pulling, { initials: team.initials, color: team.color });
      ctx.restore();
    }
    pullCard(ctx, { team, rate: racer?.rate ?? 0, crew: racer?.crew ?? 0, x: i === 0 ? 16 : w - 16, y: sky + 14, align: i === 0 ? 'left' : 'right', w });
  });
  timeLeft(ctx, state, w, sky, clockOffset);
}

function ribbon(ctx, x, y, s) {
  ctx.fillStyle = '#da251d';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x - s * 0.7, y - s * 0.5);
  ctx.lineTo(x - s * 0.7, y + s * 0.5);
  ctx.closePath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + s * 0.7, y - s * 0.5);
  ctx.lineTo(x + s * 0.7, y + s * 0.5);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(x - s * 0.15, y);
  ctx.lineTo(x - s * 0.3, y + s * 1.2);
  ctx.moveTo(x + s * 0.15, y);
  ctx.lineTo(x + s * 0.3, y + s * 1.2);
  ctx.strokeStyle = '#da251d';
  ctx.lineWidth = 4;
  ctx.stroke();
}

/** A team's card: name, crew size, and a bar for how hard it pulls (full at RULES.tapFullRate). */
function pullCard(ctx, { team, rate, crew, x, y, align, w }) {
  const cardW = Math.min(260, w * 0.3);
  const cardH = 58;
  const left = align === 'left' ? x : x - cardW;
  ctx.save();
  ctx.fillStyle = '#fffdf8';
  ctx.strokeStyle = INK;
  ctx.lineWidth = 3;
  ctx.beginPath();
  roundedRect(ctx, left, y, cardW, cardH, 14);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = INK;
  ctx.font = `800 18px ${FONT}`;
  ctx.textBaseline = 'top';
  ctx.textAlign = 'left';
  ctx.fillText(`${team.name} · ${crew} người`, left + 12, y + 8, cardW - 24);
  const barW = cardW - 24;
  const share = Math.min(1, rate / 8);
  ctx.fillStyle = '#e9e4d8';
  ctx.fillRect(left + 12, y + 36, barW, 12);
  ctx.fillStyle = team.color;
  ctx.fillRect(left + 12, y + 36, barW * share, 12);
  ctx.strokeRect(left + 12, y + 36, barW, 12);
  ctx.restore();
}

function timeLeft(ctx, state, w, sky, clockOffset) {
  const race = state.race;
  if (state.phase !== 'racing') return;
  const now = race.paused ? race.pausedAt : Date.now() + clockOffset;
  const left = Math.max(0, Math.ceil((race.startsAt + TUG.maxMs - now) / 1000));
  pill(ctx, w / 2, sky + 30, `⏱ ${left}s`, '#ffd23f', INK, 20);
}
