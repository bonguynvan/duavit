// Character painters: drawn facing right, origin at ground level under the body, ~100 units long.
import { FONT, shape, roundedPath, starFlag, ellipse, circle, poly, stroke, leg, shade, drawFace, swing } from './paint.js';

/** T-54 style tank with the national + liberation flags; `number` is painted on the hull. */
function tankPainter(number) {
  return (ctx, c, p, m, face) => {
    const dark = shade(c, -0.18);
    const wave = m ? Math.sin(p * 1.3) * 3 : 0;
    stroke(ctx, '#2b2d42', 1.5, () => {
      ctx.moveTo(-22, -44);
      ctx.lineTo(-22, -92);
      ctx.moveTo(-38, -27);
      ctx.lineTo(-38, -74);
    });
    starFlag(ctx, -22, -92, 26 + wave * 0.3, 17, ['#da251d']);
    starFlag(ctx, -38, -74, 22 - wave * 0.3, 15, ['#da251d', '#1e6fd9']);
    shape(ctx, '#2b2d42', () => roundedPath(ctx, -40, -17, 80, 17, 8));
    for (let i = 0; i < 5; i += 1) {
      const wx = -30 + i * 15;
      circle(ctx, wx, -8.5, 5.5, '#6b6f78');
      const a = p * 2 + i;
      stroke(ctx, '#2b2d42', 1.2, () => {
        ctx.moveTo(wx + Math.cos(a) * 4, -8.5 + Math.sin(a) * 4);
        ctx.lineTo(wx - Math.cos(a) * 4, -8.5 - Math.sin(a) * 4);
      });
    }
    poly(ctx, [[-42, -17], [42, -17], [35, -31], [-37, -31]], c);
    ctx.fillStyle = '#fff';
    ctx.font = `800 11px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(number, 6, -23.5);
    shape(ctx, dark, () => ctx.rect(14, -42, 40, 6));
    shape(ctx, dark, () => ctx.rect(52, -43.5, 6, 9));
    poly(ctx, [[-22, -31], [20, -31], [14, -46], [-16, -46]], c);
    drawFace(ctx, -2, -56, 13, face, c);
  };
}

export const ANIMAL_PAINTERS = {
  horse(ctx, c, p, m, face) {
    const dark = shade(c, -0.18);
    stroke(ctx, '#3b2416', 6, () => {
      ctx.moveTo(-32, -46);
      ctx.quadraticCurveTo(-50 + swing(p, 0, m, 4), -40, -46, -18);
    });
    [[-22, Math.PI], [24, 0]].forEach(([x, o]) => leg(ctx, x, -34, 30, swing(p, o, m), dark));
    ellipse(ctx, 0, -44, 34, 15, c);
    [[-14, 0], [16, Math.PI]].forEach(([x, o]) => leg(ctx, x, -34, 30, swing(p, o, m), c));
    stroke(ctx, c, 16, () => {
      ctx.moveTo(22, -48);
      ctx.lineTo(34, -68);
    });
    poly(ctx, [[26, -86], [30, -102], [36, -88]], c);
    poly(ctx, [[38, -88], [46, -101], [47, -84]], c);
    stroke(ctx, '#3b2416', 5, () => {
      ctx.moveTo(18, -52);
      ctx.quadraticCurveTo(22, -74, 30, -88);
    });
    drawFace(ctx, 38, -72, 17, face, c);
  },
  rabbit(ctx, c, p, m, face) {
    const hop = m ? Math.abs(Math.sin(p)) * 8 : 0;
    ctx.translate(0, -hop);
    ellipse(ctx, 14, -60, 5.5, 18, c, 0.15);
    ellipse(ctx, 26, -62, 5.5, 18, c, 0.4);
    ellipse(ctx, 26, -62, 2.5, 12, '#f7b2c4', 0.4);
    ellipse(ctx, -16, -5, 13, 6, c);
    circle(ctx, -26, -26, 7, '#fff');
    ellipse(ctx, -2, -22, 24, 17, c);
    leg(ctx, 16, -12, 12, swing(p, 0, m, 0.7), c, 6);
    drawFace(ctx, 22, -38, 16, face, c);
  },
  turtle(ctx, c, p, m, face) {
    const skin = '#9ccc65';
    poly(ctx, [[-30, -10], [-40, -6], [-30, -4]], skin);
    [[-20, 0], [-6, Math.PI], [10, 0], [22, Math.PI]].forEach(([x, o]) => ellipse(ctx, x + swing(p, o, m, 4), -4, 6, 5, skin));
    stroke(ctx, skin, 9, () => {
      ctx.moveTo(24, -14);
      ctx.lineTo(34, -20);
    });
    shape(ctx, c, () => {
      ctx.ellipse(0, -10, 32, 26, 0, Math.PI, 0);
      ctx.closePath();
    });
    ctx.fillStyle = shade(c, -0.15);
    [[-14, -18], [0, -26], [14, -18], [0, -14]].forEach(([x, y]) => {
      ctx.beginPath();
      ctx.arc(x, y, 6, 0, Math.PI * 2);
      ctx.fill();
    });
    drawFace(ctx, 40, -26, 14, face, skin);
  },
  cat(ctx, c, p, m, face) {
    const dark = shade(c, -0.2);
    stroke(ctx, c, 6, () => {
      ctx.moveTo(-26, -34);
      ctx.quadraticCurveTo(-46, -40, -40 + swing(p, 1, m, 5), -62);
    });
    [[-18, Math.PI], [20, 0]].forEach(([x, o]) => leg(ctx, x, -26, 22, swing(p, o, m), dark, 6));
    ellipse(ctx, 0, -32, 28, 12, c);
    stroke(ctx, dark, 2, () => {
      [-10, -2, 6].forEach((x) => {
        ctx.moveTo(x, -43);
        ctx.lineTo(x - 3, -34);
      });
    });
    [[-10, 0], [12, Math.PI]].forEach(([x, o]) => leg(ctx, x, -26, 22, swing(p, o, m), c, 6));
    poly(ctx, [[20, -56], [21, -72], [32, -62]], c);
    poly(ctx, [[34, -63], [44, -73], [45, -56]], c);
    drawFace(ctx, 32, -48, 15, face, c);
  },
  dog(ctx, c, p, m, face) {
    const dark = shade(c, -0.25);
    stroke(ctx, c, 6, () => {
      ctx.moveTo(-28, -40);
      ctx.lineTo(-40, -58 + swing(p * 2, 0, m, 6));
    });
    [[-20, Math.PI], [22, 0]].forEach(([x, o]) => leg(ctx, x, -30, 24, swing(p, o, m), dark));
    ellipse(ctx, 0, -38, 30, 14, c);
    ellipse(ctx, -8, -44, 9, 6, dark);
    [[-12, 0], [14, Math.PI]].forEach(([x, o]) => leg(ctx, x, -30, 24, swing(p, o, m), c));
    ellipse(ctx, 20, -54, 6, 13, dark, 0.35);
    drawFace(ctx, 34, -56, 16, face, c);
    ellipse(ctx, 48, -50, 6, 12, dark, -0.35);
  },
  pig(ctx, c, p, m, face) {
    const dark = shade(c, -0.12);
    stroke(ctx, dark, 3, () => {
      ctx.moveTo(-30, -30);
      ctx.bezierCurveTo(-42, -40, -44, -22, -36, -26);
      ctx.bezierCurveTo(-30, -30, -38, -38, -42, -32);
    });
    [[-18, Math.PI], [20, 0]].forEach(([x, o]) => leg(ctx, x, -16, 14, swing(p, o, m, 0.45), dark, 8));
    ellipse(ctx, 0, -30, 31, 19, c);
    [[-10, 0], [12, Math.PI]].forEach(([x, o]) => leg(ctx, x, -16, 14, swing(p, o, m, 0.45), c, 8));
    poly(ctx, [[22, -48], [22, -62], [33, -54]], dark);
    poly(ctx, [[38, -55], [48, -62], [47, -48]], dark);
    drawFace(ctx, 34, -38, 16, face, c);
    ellipse(ctx, 52, -34, 5, 7, dark);
  },
  penguin(ctx, c, p, m, face) {
    const lift = (o) => (m ? Math.max(0, Math.sin(p * 1.4 + o)) * 5 : 0);
    ellipse(ctx, -6, -2 - lift(0), 8, 4, '#ff9f1c');
    ellipse(ctx, 9, -2 - lift(Math.PI), 8, 4, '#ff9f1c');
    ellipse(ctx, 0, -30, 18, 28, c);
    ellipse(ctx, 5, -27, 11, 20, '#fff');
    ellipse(ctx, -15, -34, 5, 14, c, 0.3 + swing(p, 0, m, 0.4));
    poly(ctx, [[18, -64], [28, -60], [18, -56]], '#ff9f1c');
    drawFace(ctx, 4, -62, 15, face, c);
  },
  camel(ctx, c, p, m, face) {
    const dark = shade(c, -0.18);
    stroke(ctx, dark, 3, () => {
      ctx.moveTo(-32, -50);
      ctx.lineTo(-38, -32);
    });
    [[-22, Math.PI], [22, 0]].forEach(([x, o]) => leg(ctx, x, -42, 38, swing(p, o, m, 0.45), dark, 6));
    ellipse(ctx, -12, -58, 11, 11, c);
    ellipse(ctx, 8, -58, 11, 11, c);
    ellipse(ctx, 0, -48, 32, 14, c);
    [[-14, 0], [14, Math.PI]].forEach(([x, o]) => leg(ctx, x, -42, 38, swing(p, o, m, 0.45), c, 6));
    stroke(ctx, c, 12, () => {
      ctx.moveTo(26, -50);
      ctx.quadraticCurveTo(40, -58, 38, -78);
    });
    drawFace(ctx, 42, -84, 14, face, c);
  },
  tiger(ctx, c, p, m, face) {
    const dark = '#2b2118';
    stroke(ctx, c, 7, () => {
      ctx.moveTo(-30, -40);
      ctx.quadraticCurveTo(-50, -44, -48 + swing(p, 1, m, 5), -66);
    });
    [[-20, Math.PI], [22, 0]].forEach(([x, o]) => leg(ctx, x, -30, 26, swing(p, o, m), shade(c, -0.2), 8));
    ellipse(ctx, 0, -38, 32, 15, c);
    stroke(ctx, dark, 2.5, () => {
      [-18, -8, 2, 12].forEach((x) => {
        ctx.moveTo(x, -52);
        ctx.lineTo(x - 4, -40);
      });
    });
    [[-12, 0], [14, Math.PI]].forEach(([x, o]) => leg(ctx, x, -30, 26, swing(p, o, m), c, 8));
    circle(ctx, 26, -66, 6, c);
    circle(ctx, 46, -66, 6, c);
    drawFace(ctx, 36, -54, 17, face, c);
  },
  fox(ctx, c, p, m, face) {
    const dark = '#3b2416';
    shape(ctx, c, () => {
      ctx.ellipse(-40, -40 + swing(p * 2, 0, m, 3), 18, 8, -0.5, 0, Math.PI * 2);
    });
    ellipse(ctx, -52, -32 + swing(p * 2, 0, m, 3), 6, 5, '#fff', -0.5);
    [[-18, Math.PI], [20, 0]].forEach(([x, o]) => leg(ctx, x, -28, 22, swing(p, o, m), dark, 6));
    ellipse(ctx, 0, -34, 28, 12, c);
    ellipse(ctx, 6, -28, 16, 6, '#fff');
    [[-10, 0], [12, Math.PI]].forEach(([x, o]) => leg(ctx, x, -28, 22, swing(p, o, m), dark, 6));
    poly(ctx, [[20, -58], [20, -78], [33, -64]], c);
    poly(ctx, [[36, -65], [48, -78], [48, -58]], c);
    drawFace(ctx, 33, -50, 15, face, c);
  },
  cow(ctx, c, p, m, face) {
    const spot = '#2b2d42';
    stroke(ctx, c, 3, () => {
      ctx.moveTo(-32, -42);
      ctx.lineTo(-40, -22 + swing(p, 0, m, 3));
    });
    [[-20, Math.PI], [22, 0]].forEach(([x, o]) => leg(ctx, x, -28, 26, swing(p, o, m, 0.45), shade(c, -0.15), 8));
    ellipse(ctx, 0, -40, 33, 18, c);
    ctx.fillStyle = spot;
    [[-14, -46, 8, 6], [8, -36, 9, 6], [-2, -52, 5, 4]].forEach(([x, y, rx, ry]) => {
      ctx.beginPath();
      ctx.ellipse(x, y, rx, ry, 0.3, 0, Math.PI * 2);
      ctx.fill();
    });
    ellipse(ctx, -2, -22, 7, 5, '#f5a9bc');
    [[-12, 0], [14, Math.PI]].forEach(([x, o]) => leg(ctx, x, -28, 26, swing(p, o, m, 0.45), c, 8));
    poly(ctx, [[22, -66], [16, -78], [28, -70]], '#fff3d6');
    poly(ctx, [[46, -70], [56, -78], [50, -64]], '#fff3d6');
    drawFace(ctx, 36, -54, 17, face, c);
  },
  chicken(ctx, c, p, m, face) {
    const lift = (o) => (m ? Math.max(0, Math.sin(p * 1.6 + o)) * 6 : 0);
    leg(ctx, -4, -16, 16, swing(p * 1.6, 0, m, 0.6), '#ff9f1c', 4);
    leg(ctx, 6, -16, 16, swing(p * 1.6, Math.PI, m, 0.6), '#ff9f1c', 4);
    ellipse(ctx, -24, -36 - lift(1), 9, 12, shade(c, -0.08), -0.6);
    ellipse(ctx, 0, -28, 22, 16, c);
    ellipse(ctx, -4, -30, 11, 7, shade(c, -0.08), 0.3 + swing(p, 0, m, 0.4));
    poly(ctx, [[8, -66], [12, -76], [16, -68], [20, -76], [22, -64]], '#ef476f');
    poly(ctx, [[28, -50], [38, -46], [28, -42]], '#ff9f1c');
    drawFace(ctx, 16, -48, 14, face, c);
  },
  duck(ctx, c, p, m, face) {
    leg(ctx, -4, -14, 14, swing(p * 1.4, 0, m, 0.5), '#ff9f1c', 4);
    leg(ctx, 8, -14, 14, swing(p * 1.4, Math.PI, m, 0.5), '#ff9f1c', 4);
    poly(ctx, [[-26, -30], [-38, -38], [-30, -22]], c);
    ellipse(ctx, 0, -26, 26, 14, c);
    ellipse(ctx, -4, -28, 13, 7, shade(c, -0.1), 0.2 + swing(p, 0, m, 0.4));
    ellipse(ctx, 38, -46, 10, 5, '#ff9f1c');
    drawFace(ctx, 22, -46, 14, face, c);
  },
  elephant(ctx, c, p, m, face) {
    const dark = shade(c, -0.15);
    stroke(ctx, c, 3, () => {
      ctx.moveTo(-36, -44);
      ctx.lineTo(-42, -28 + swing(p, 0, m, 3));
    });
    [[-20, Math.PI], [20, 0]].forEach(([x, o]) => leg(ctx, x, -26, 26, swing(p, o, m, 0.35), dark, 12));
    ellipse(ctx, 0, -46, 38, 24, c);
    [[-10, 0], [12, Math.PI]].forEach(([x, o]) => leg(ctx, x, -26, 26, swing(p, o, m, 0.35), c, 12));
    ellipse(ctx, 26, -60, 14, 18, dark, -0.2);
    stroke(ctx, c, 9, () => {
      ctx.moveTo(48, -54);
      ctx.quadraticCurveTo(60, -40, 56 + swing(p, 0, m, 4), -24);
    });
    drawFace(ctx, 42, -64, 17, face, c);
  },
  frog(ctx, c, p, m, face) {
    const hop = m ? Math.abs(Math.sin(p)) * 10 : 0;
    ctx.translate(0, -hop);
    ellipse(ctx, -16, -6, 16, 6, shade(c, -0.12));
    ellipse(ctx, 0, -18, 24, 15, c);
    ellipse(ctx, 6, -14, 13, 8, '#e9f5c9');
    leg(ctx, 16, -10, 10, swing(p, 0, m, 0.6), c, 6);
    circle(ctx, 16, -48, 7, c);
    circle(ctx, 36, -48, 7, c);
    circle(ctx, 16, -49, 3, '#fff');
    circle(ctx, 36, -49, 3, '#fff');
    drawFace(ctx, 26, -34, 15, face, c);
  },
  tank: tankPainter('390'),
  tank843: tankPainter('843'),
  palace(ctx, c, p, m, face) {
    // A mini Independence Palace waddling on two stubby legs.
    const sway = m ? Math.sin(p) * 0.04 : 0;
    [[-18, 0], [18, Math.PI]].forEach(([x, o]) => {
      leg(ctx, x, -16, 15, swing(p, o, m, 0.6), '#5c6670', 8);
      ellipse(ctx, x + swing(p, o, m, 4), -1.5, 8, 3.5, '#2b2d42');
    });
    ctx.rotate(sway);
    ellipse(ctx, 0, -14, 46, 5, '#7ac74f'); // front lawn strip
    shape(ctx, c, () => ctx.rect(-42, -50, 84, 36));
    shape(ctx, '#e3ddd0', () => ctx.rect(-45, -53, 90, 5));
    shape(ctx, '#ece7dc', () => ctx.rect(-15, -61, 30, 8));
    // Thin brise-soleil fins (no ink outline, or the facade reads as a cage).
    ctx.strokeStyle = '#c9c2b2';
    ctx.lineWidth = 1.1;
    ctx.beginPath();
    for (let x = -38; x <= 38; x += 4) {
      ctx.moveTo(x, -47);
      ctx.lineTo(x, -17);
    }
    ctx.stroke();
    stroke(ctx, '#2b2d42', 1.5, () => {
      ctx.moveTo(0, -61);
      ctx.lineTo(0, -88);
    });
    starFlag(ctx, 0, -88, 18 + (m ? Math.sin(p * 1.4) * 2 : 0), 12, ['#da251d']);
    drawFace(ctx, 0, -32, 12, face, '#5c6670');
  },
  helicopter(ctx, c, p, m, face) {
    const dark = shade(c, -0.18);
    // Hovers above its own shadow, bobbing gently.
    ctx.translate(0, -8 + Math.sin(p * 0.8) * 2.5);
    // Two people clinging to the skids ("đu càng"), legs swinging.
    [[-6, 0], [14, 1.9]].forEach(([x, offset]) => {
      ctx.save();
      ctx.translate(x, -34);
      ctx.rotate(Math.sin(p * 1.5 + offset) * (m ? 0.32 : 0.1));
      ctx.scale(1.3, 1.3); // small at race size: scale up so the outfit reads
      stroke(ctx, '#f5d0a9', 2, () => {
        ctx.moveTo(-2.5, 0);
        ctx.lineTo(-3, 8);
        ctx.moveTo(2.5, 0);
        ctx.lineTo(3, 8);
      });
      circle(ctx, 0, 6, 3.6, '#f5d0a9');
      // Yellow shirt with three red stripes (the old Saigon flag) — the 30/4/1975 evacuation scene.
      shape(ctx, '#f7d117', () => roundedPath(ctx, -3.5, 9.5, 7, 10, 2.5), 1.5);
      ctx.fillStyle = '#da251d';
      [12.6, 14.2, 15.8].forEach((y) => ctx.fillRect(-3.2, y, 6.4, 0.9));
      // Trousers in the same yellow with red stripes.
      const kick = Math.sin(p * 2.2 + offset) * (m ? 3 : 1);
      const legs = () => {
        ctx.moveTo(-1.5, 19);
        ctx.lineTo(-2.5 + kick, 27);
        ctx.moveTo(1.5, 19);
        ctx.lineTo(2.5 - kick, 27);
      };
      stroke(ctx, '#f7d117', 2.6, legs);
      ctx.strokeStyle = '#da251d';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      legs();
      ctx.stroke();
      ctx.restore();
    });
    stroke(ctx, '#2b2d42', 2.5, () => {
      ctx.moveTo(-22, -36);
      ctx.lineTo(32, -36);
      ctx.moveTo(-9, -36);
      ctx.lineTo(-5, -45);
      ctx.moveTo(20, -36);
      ctx.lineTo(16, -45);
    });
    shape(ctx, c, () => {
      ctx.moveTo(-14, -60);
      ctx.lineTo(-60, -64);
      ctx.lineTo(-60, -58);
      ctx.lineTo(-14, -50);
      ctx.closePath();
    });
    poly(ctx, [[-60, -64], [-67, -77], [-55, -64]], dark);
    const tailSpin = Math.abs(Math.cos(p * 7));
    ellipse(ctx, -62, -66, 1.8, 2 + 8 * tailSpin, 'rgba(43,45,66,0.55)');
    ellipse(ctx, 4, -54, 27, 13, c);
    ellipse(ctx, 21, -56, 11, 9, '#bfe3ff');
    drawFace(ctx, 19, -57, 9.5, face, dark);
    shape(ctx, dark, () => ctx.rect(1, -72, 6, 6));
    // Main rotor: a translucent disc plus two blades whose length foreshortens as they spin.
    ellipse(ctx, 4, -73, 54, 3.5, 'rgba(43,45,66,0.18)');
    const spin = m ? p * 9 : p * 2;
    stroke(ctx, '#2b2d42', 2.5, () => {
      ctx.moveTo(4 - 52 * Math.cos(spin), -73);
      ctx.lineTo(4 + 52 * Math.cos(spin), -73);
      ctx.moveTo(4 - 52 * Math.sin(spin), -73);
      ctx.lineTo(4 + 52 * Math.sin(spin), -73);
    });
  },
  mouse(ctx, c, p, m, face) {
    stroke(ctx, '#f5a9bc', 3, () => {
      ctx.moveTo(-24, -18);
      ctx.bezierCurveTo(-44, -14, -40, -36 + swing(p, 0, m, 6), -58, -30);
    });
    [[-12, Math.PI], [14, 0]].forEach(([x, o]) => leg(ctx, x, -12, 12, swing(p, o, m, 0.7), shade(c, -0.2), 5));
    ellipse(ctx, 0, -20, 24, 13, c);
    [[-6, 0], [8, Math.PI]].forEach(([x, o]) => leg(ctx, x, -12, 12, swing(p, o, m, 0.7), c, 5));
    circle(ctx, 18, -52, 10, c);
    circle(ctx, 18, -52, 5, '#f5a9bc');
    circle(ctx, 40, -52, 10, c);
    circle(ctx, 40, -52, 5, '#f5a9bc');
    drawFace(ctx, 30, -36, 14, face, c);
  },
};
