// Entity art prefers Grok Imagine sprites (assets/sprites/) when loaded;
// procedural painters remain as fallback for items/terrain/FX.
// Every painter draws centered on (0,0); the renderer translates/scales.

import { getSprite, drawSpriteImage } from './assets.js';

export const PAL = {
  black: '#0c0a0e',
  charcoal: '#1a1518',
  blood: '#c23b2e',        // blood-red
  bloodDeep: '#8e2a1e',
  crimson: '#b8252f',    // crimson
  gold: '#c9a24b',        // bronze-gold
  goldLight: '#e8d090',
  goldDark: '#8a6e2e',
  indigo: '#2a4a6b',         // Aegean indigo
  indigoDeep: '#152838',
  silk: '#f0ebe0',       // linen / marble
  bone: '#e6ddc4',
  wine: '#4a3048',   // wine-purple
  laurel: '#5a7a3c',
  ochre: '#b07a2e',    // ochre bronze
  ice: '#cfe4ee',
  elitebi: '#9fd8e8',      // watch-fire / god-light
  bronze: '#a87840',
  bronzeDeep: '#6e4a22',
  flesh: '#c8a07a',
  fleshDeep: '#9a7050',
};

function px(ctx, fn) { ctx.save(); fn(); ctx.restore(); }

// Soft left-side shading inside the current path silhouette.
function shade(ctx, pathFn, s) {
  ctx.save();
  pathFn();
  ctx.clip();
  const g = ctx.createLinearGradient(-s, 0, s * 0.6, 0);
  g.addColorStop(0, 'rgba(10,6,10,0.35)');
  g.addColorStop(1, 'rgba(10,6,10,0)');
  ctx.fillStyle = g;
  ctx.fillRect(-s, -s, s * 2, s * 2);
  ctx.restore();
}

// ---------------------------------------------------------------- Diomedes

export function drawPlayer(ctx, s, { spearGrounded, guarding, hasJavelin }, t) {
  const img = getSprite('player');
  if (img) {
    px(ctx, () => {
      if (guarding) {
        for (let i = 0; i < 3; i++) {
          const ph = ((t / 900) + i / 3) % 1;
          ctx.strokeStyle = `rgba(159,216,232,${(1 - ph) * 0.55})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.arc(0, 0, s * (0.55 + ph * 0.6), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      drawSpriteImage(ctx, img, s * 1.05);
      // Stance cue ring
      ctx.strokeStyle = spearGrounded ? 'rgba(201,162,75,0.55)' : 'rgba(223,230,242,0.45)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.arc(0, s * 0.55, s * 0.35, 0, Math.PI * 2);
      ctx.stroke();
    });
    return;
  }
  px(ctx, () => {
    if (guarding) {
      // Athena's aegis glow around the raised shield
      for (let i = 0; i < 3; i++) {
        const ph = ((t / 900) + i / 3) % 1;
        ctx.strokeStyle = `rgba(159,216,232,${(1 - ph) * 0.55})`;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(0, 0, s * (0.55 + ph * 0.6), 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    // greaves / greaved legs, dark bronze
    ctx.fillStyle = PAL.indigoDeep;
    ctx.beginPath();
    ctx.moveTo(-s * 0.38, s * 0.2);
    ctx.lineTo(-s * 0.46, s * 0.82);
    ctx.lineTo(-s * 0.14, s * 0.82);
    ctx.lineTo(0, s * 0.38);
    ctx.lineTo(s * 0.14, s * 0.82);
    ctx.lineTo(s * 0.46, s * 0.82);
    ctx.lineTo(s * 0.38, s * 0.2);
    ctx.closePath();
    ctx.fill();

    // bronze cuirass
    const cuirass = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.42, s * 0.08);
      ctx.lineTo(-s * 0.36, -s * 0.28);
      ctx.lineTo(-s * 0.12, -s * 0.36);
      ctx.lineTo(s * 0.12, -s * 0.36);
      ctx.lineTo(s * 0.36, -s * 0.28);
      ctx.lineTo(s * 0.42, s * 0.08);
      ctx.lineTo(s * 0.3, s * 0.48);
      ctx.lineTo(-s * 0.3, s * 0.48);
      ctx.closePath();
    };
    const cg = ctx.createLinearGradient(-s * 0.4, 0, s * 0.4, 0);
    cg.addColorStop(0, PAL.bronzeDeep);
    cg.addColorStop(0.45, PAL.gold);
    cg.addColorStop(1, PAL.bronzeDeep);
    ctx.fillStyle = cg;
    cuirass();
    ctx.fill();
    shade(ctx, cuirass, s);
    // muscle lines on the cuirass
    ctx.strokeStyle = 'rgba(60,40,15,0.45)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, -s * 0.1);
    ctx.quadraticCurveTo(0, s * 0.06, s * 0.18, -s * 0.1);
    ctx.moveTo(-s * 0.14, s * 0.12);
    ctx.quadraticCurveTo(0, s * 0.22, s * 0.14, s * 0.12);
    ctx.stroke();

    // crimson cloak over left shoulder
    ctx.fillStyle = PAL.bloodDeep;
    ctx.beginPath();
    ctx.moveTo(-s * 0.1, -s * 0.3);
    ctx.quadraticCurveTo(-s * 0.7, -s * 0.1, -s * 0.55, s * 0.55);
    ctx.quadraticCurveTo(-s * 0.3, s * 0.4, -s * 0.2, s * 0.1);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = 'rgba(200,160,70,0.5)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-s * 0.15, -s * 0.22);
    ctx.quadraticCurveTo(-s * 0.55, 0, -s * 0.48, s * 0.4);
    ctx.stroke();

    // head
    ctx.fillStyle = PAL.flesh;
    ctx.beginPath();
    ctx.arc(0, -s * 0.42, s * 0.16, 0, Math.PI * 2);
    ctx.fill();

    // Corinthian-style crested helm
    const helm = () => {
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.48, s * 0.24, s * 0.22, 0, 0, Math.PI * 2);
    };
    ctx.fillStyle = PAL.bronze;
    helm();
    ctx.fill();
    shade(ctx, helm, s);
    // cheek guards
    ctx.fillStyle = PAL.bronzeDeep;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.42);
    ctx.lineTo(-s * 0.22, -s * 0.22);
    ctx.lineTo(-s * 0.08, -s * 0.28);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(s * 0.2, -s * 0.42);
    ctx.lineTo(s * 0.22, -s * 0.22);
    ctx.lineTo(s * 0.08, -s * 0.28);
    ctx.closePath();
    ctx.fill();
    // nose guard
    ctx.fillStyle = PAL.goldDark;
    ctx.fillRect(-s * 0.03, -s * 0.48, s * 0.06, s * 0.2);
    // horsehair crest, vermillion
    ctx.fillStyle = PAL.blood;
    ctx.beginPath();
    ctx.moveTo(-s * 0.06, -s * 0.62);
    ctx.quadraticCurveTo(0, -s * 1.05, s * 0.06, -s * 0.62);
    ctx.quadraticCurveTo(0, -s * 0.72, -s * 0.06, -s * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.bloodDeep;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo((i - 1.5) * s * 0.03, -s * 0.68);
      ctx.quadraticCurveTo((i - 1.5) * s * 0.04, -s * 0.95, (i - 1.5) * s * 0.02, -s * 1.0);
      ctx.stroke();
    }

    // the dory (spear)
    if (spearGrounded) {
      // grounded: butt planted, tip up beside him
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(s * 0.38, s * 0.78);
      ctx.lineTo(s * 0.52, -s * 0.7);
      ctx.stroke();
      // bronze spearhead
      ctx.fillStyle = PAL.goldLight;
      ctx.beginPath();
      ctx.moveTo(s * 0.52, -s * 0.7);
      ctx.lineTo(s * 0.46, -s * 0.5);
      ctx.lineTo(s * 0.58, -s * 0.5);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = PAL.bronze;
      ctx.beginPath();
      ctx.arc(s * 0.52, -s * 0.48, s * 0.04, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // levelled for combat: spear raised high
      const bg = ctx.createLinearGradient(s * 0.15, s * 0.1, s * 0.9, -s * 0.95);
      bg.addColorStop(0, '#6a4a28');
      bg.addColorStop(0.7, '#8a6230');
      bg.addColorStop(1, PAL.goldLight);
      ctx.strokeStyle = bg;
      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(s * 0.18, s * 0.15);
      ctx.lineTo(s * 0.88, -s * 0.92);
      ctx.stroke();
      // spearhead
      ctx.fillStyle = '#dfe8f2';
      ctx.beginPath();
      ctx.moveTo(s * 0.88, -s * 0.92);
      ctx.lineTo(s * 0.78, -s * 0.72);
      ctx.lineTo(s * 0.96, -s * 0.74);
      ctx.closePath();
      ctx.fill();
      // grip wrap
      ctx.strokeStyle = PAL.blood;
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(s * 0.22, s * 0.08);
      ctx.lineTo(s * 0.32, -s * 0.05);
      ctx.stroke();
    }

    // aspis (round shield) on left arm when guarding or always faintly
    if (guarding || !spearGrounded) {
      const sx = -s * 0.48, sy = s * 0.05;
      const rg = ctx.createRadialGradient(sx - s * 0.05, sy - s * 0.05, 1, sx, sy, s * 0.38);
      rg.addColorStop(0, PAL.goldLight);
      rg.addColorStop(0.5, PAL.bronze);
      rg.addColorStop(1, PAL.bronzeDeep);
      ctx.fillStyle = rg;
      ctx.beginPath();
      ctx.arc(sx, sy, s * 0.36, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = PAL.goldDark;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(sx, sy, s * 0.36, 0, Math.PI * 2);
      ctx.stroke();
      // blazon: simple gorgoneion-like eye / owl of Athena
      ctx.fillStyle = PAL.bloodDeep;
      ctx.beginPath();
      ctx.arc(sx, sy, s * 0.12, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = PAL.silk;
      ctx.beginPath();
      ctx.arc(sx - s * 0.04, sy - s * 0.02, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + s * 0.04, sy - s * 0.02, s * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#141414';
      ctx.beginPath();
      ctx.arc(sx - s * 0.04, sy - s * 0.02, s * 0.015, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(sx + s * 0.04, sy - s * 0.02, s * 0.015, 0, Math.PI * 2);
      ctx.fill();
    }

    // javelin tucked when held
    if (hasJavelin) {
      ctx.strokeStyle = '#5a3a1a';
      ctx.lineWidth = 1.8;
      ctx.beginPath();
      ctx.moveTo(s * 0.4, s * 0.3);
      ctx.lineTo(-s * 0.05, s * 0.48);
      ctx.stroke();
      ctx.fillStyle = PAL.goldLight;
      ctx.beginPath();
      ctx.moveTo(-s * 0.05, s * 0.48);
      ctx.lineTo(-s * 0.12, s * 0.44);
      ctx.lineTo(-s * 0.08, s * 0.54);
      ctx.closePath();
      ctx.fill();
    }
  });
}

// ---------------------------------------------------------------- foes of Troy (soldiers & elites)

const FOE_PAINTERS = {
  // Trojan Elite — heavy infantry, enrages when bashed
  elite(ctx, s, y, t) {
    if (y.enraged) {
      ctx.strokeStyle = `rgba(255,80,40,${0.35 + 0.25 * Math.sin(t / 120)})`;
      ctx.lineWidth = 2;
      for (let i = 0; i < 4; i++) {
        const a = i * 1.6 + t / 400;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.65, Math.sin(a) * s * 0.65);
        ctx.lineTo(Math.cos(a) * s * 0.85, Math.sin(a) * s * 0.85);
        ctx.stroke();
      }
    }
    // scale cuirass
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.38, -s * 0.05);
      ctx.lineTo(s * 0.38, -s * 0.05);
      ctx.lineTo(s * 0.34, s * 0.48);
      ctx.lineTo(-s * 0.34, s * 0.48);
      ctx.closePath();
    };
    ctx.fillStyle = y.enraged ? '#7a3830' : '#4a4038';
    body();
    ctx.fill();
    shade(ctx, body, s);
    ctx.strokeStyle = PAL.goldDark;
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, s * (0.02 + i * 0.1));
      ctx.lineTo(s * 0.32, s * (0.02 + i * 0.1));
      ctx.stroke();
    }
    // greaved legs
    ctx.fillStyle = PAL.bronzeDeep;
    ctx.fillRect(-s * 0.26, s * 0.48, s * 0.18, s * 0.3);
    ctx.fillRect(s * 0.08, s * 0.48, s * 0.18, s * 0.3);
    // head + beard
    ctx.fillStyle = PAL.fleshDeep;
    ctx.beginPath();
    ctx.arc(0, -s * 0.28, s * 0.22, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a1a14';
    ctx.beginPath();
    ctx.arc(0, -s * 0.16, s * 0.15, 0.15, Math.PI - 0.15);
    ctx.fill();
    // crested bronze helm
    ctx.fillStyle = PAL.bronze;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.38, s * 0.24, s * 0.16, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.blood;
    ctx.beginPath();
    ctx.moveTo(-s * 0.04, -s * 0.48);
    ctx.quadraticCurveTo(0, -s * 0.95, s * 0.04, -s * 0.48);
    ctx.closePath();
    ctx.fill();
    // cheek guards
    ctx.fillStyle = PAL.bronzeDeep;
    ctx.fillRect(-s * 0.22, -s * 0.38, s * 0.08, s * 0.18);
    ctx.fillRect(s * 0.14, -s * 0.38, s * 0.08, s * 0.18);
    const e = y.enraged ? s * 0.055 : s * 0.04;
    ctx.fillStyle = y.enraged ? '#ffe9a8' : '#1a1410';
    ctx.beginPath(); ctx.arc(-s * 0.08, -s * 0.3, e, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.08, -s * 0.3, e, 0, Math.PI * 2); ctx.fill();
    // long spear
    ctx.strokeStyle = '#4a3020';
    ctx.lineWidth = 2.6;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, s * 0.5);
    ctx.lineTo(s * 0.72, -s * 0.7);
    ctx.stroke();
    ctx.fillStyle = PAL.goldLight;
    ctx.beginPath();
    ctx.moveTo(s * 0.72, -s * 0.7);
    ctx.lineTo(s * 0.64, -s * 0.5);
    ctx.lineTo(s * 0.8, -s * 0.52);
    ctx.closePath();
    ctx.fill();
    // round aspis
    const sx = -s * 0.42, sy = s * 0.08;
    ctx.fillStyle = PAL.bronze;
    ctx.beginPath();
    ctx.arc(sx, sy, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(sx, sy, s * 0.28, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = PAL.bloodDeep;
    ctx.beginPath();
    ctx.arc(sx, sy, s * 0.1, 0, Math.PI * 2);
    ctx.fill();
  },

  // Trojan Archer — line archer in Phrygian cap
  archer(ctx, s, y, t) {
    ctx.strokeStyle = '#6b4423';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s * 0.42, s * 0.52);
    ctx.quadraticCurveTo(s * 0.92, -s * 0.05, s * 0.38, -s * 0.78);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(240,238,225,0.7)';
    ctx.lineWidth = 0.8;
    ctx.beginPath();
    ctx.moveTo(s * 0.42, s * 0.52);
    ctx.lineTo(s * 0.38, -s * 0.78);
    ctx.stroke();
    ctx.strokeStyle = PAL.bone;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(s * 0.04, -s * 0.08);
    ctx.lineTo(s * 0.7, -s * 0.14);
    ctx.stroke();
    ctx.fillStyle = PAL.silk;
    ctx.beginPath();
    ctx.moveTo(s * 0.04, -s * 0.08);
    ctx.lineTo(s * 0.13, -s * 0.14);
    ctx.lineTo(s * 0.13, -s * 0.02);
    ctx.closePath();
    ctx.fill();
    // soft tunic + leather breast
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.28, -s * 0.05);
      ctx.lineTo(s * 0.24, -s * 0.05);
      ctx.lineTo(s * 0.28, s * 0.48);
      ctx.lineTo(-s * 0.24, s * 0.5);
      ctx.closePath();
    };
    ctx.fillStyle = '#5a4838';
    body();
    ctx.fill();
    shade(ctx, body, s);
    ctx.fillStyle = '#3a3028';
    ctx.fillRect(-s * 0.22, s * 0.0, s * 0.42, s * 0.22);
    ctx.strokeStyle = PAL.flesh;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.22, s * 0.05); ctx.lineTo(-s * 0.4, s * 0.28);
    ctx.moveTo(s * 0.18, s * 0.02); ctx.lineTo(s * 0.48, -s * 0.1);
    ctx.moveTo(-s * 0.1, s * 0.48); ctx.lineTo(-s * 0.12, s * 0.78);
    ctx.moveTo(s * 0.12, s * 0.46); ctx.lineTo(s * 0.16, s * 0.78);
    ctx.stroke();
    ctx.fillStyle = PAL.flesh;
    ctx.beginPath();
    ctx.arc(0, -s * 0.28, s * 0.17, 0, Math.PI * 2);
    ctx.fill();
    // Phrygian cap
    ctx.fillStyle = '#6a3038';
    ctx.beginPath();
    ctx.moveTo(-s * 0.18, -s * 0.35);
    ctx.quadraticCurveTo(-s * 0.02, -s * 0.72, s * 0.26, -s * 0.52);
    ctx.quadraticCurveTo(s * 0.12, -s * 0.34, -s * 0.18, -s * 0.35);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.beginPath(); ctx.arc(-s * 0.06, -s * 0.3, s * 0.028, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.06, -s * 0.3, s * 0.028, 0, Math.PI * 2); ctx.fill();
    // quiver
    ctx.fillStyle = '#3a2818';
    ctx.fillRect(-s * 0.42, s * 0.05, s * 0.1, s * 0.35);
    ctx.strokeStyle = PAL.goldDark;
    ctx.lineWidth = 0.8;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.4 + i * 0.03, s * 0.05);
      ctx.lineTo(-s * 0.4 + i * 0.03, -s * 0.05);
      ctx.stroke();
    }
  },

  // Elite Marksman — heavier archer, silver volley beam
  marksman(ctx, s, y, t) {
    // long composite libation
    ctx.strokeStyle = '#5a3a20';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(s * 0.48, s * 0.58);
    ctx.quadraticCurveTo(s * 1.0, 0, s * 0.42, -s * 0.85);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(200,220,255,0.75)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(s * 0.48, s * 0.58);
    ctx.lineTo(s * 0.42, -s * 0.85);
    ctx.stroke();
    // glowing nocked shaft
    ctx.strokeStyle = '#cfe4ee';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    ctx.moveTo(s * 0.02, -s * 0.05);
    ctx.lineTo(s * 0.78, -s * 0.12);
    ctx.stroke();
    ctx.fillStyle = '#e8f4ff';
    ctx.beginPath();
    ctx.moveTo(s * 0.78, -s * 0.12);
    ctx.lineTo(s * 0.68, -s * 0.18);
    ctx.lineTo(s * 0.68, -s * 0.06);
    ctx.closePath();
    ctx.fill();
    // bronze-scale torso
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.3, -s * 0.08);
      ctx.lineTo(s * 0.26, -s * 0.08);
      ctx.lineTo(s * 0.3, s * 0.45);
      ctx.lineTo(-s * 0.26, s * 0.48);
      ctx.closePath();
    };
    ctx.fillStyle = PAL.bronzeDeep;
    body();
    ctx.fill();
    shade(ctx, body, s);
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 0.9;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(-s * 0.26, s * (0.02 + i * 0.12));
      ctx.lineTo(s * 0.26, s * (0.02 + i * 0.12));
      ctx.stroke();
    }
    ctx.strokeStyle = PAL.flesh;
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.24, s * 0.05); ctx.lineTo(-s * 0.42, s * 0.28);
    ctx.moveTo(s * 0.2, s * 0.0); ctx.lineTo(s * 0.5, -s * 0.08);
    ctx.moveTo(-s * 0.1, s * 0.46); ctx.lineTo(-s * 0.12, s * 0.78);
    ctx.moveTo(s * 0.12, s * 0.44); ctx.lineTo(s * 0.16, s * 0.78);
    ctx.stroke();
    ctx.fillStyle = PAL.flesh;
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // open-face helm with crest
    ctx.fillStyle = PAL.bronze;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.4, s * 0.2, s * 0.12, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#2a5080';
    ctx.beginPath();
    ctx.moveTo(-s * 0.03, -s * 0.48);
    ctx.quadraticCurveTo(0, -s * 0.88, s * 0.03, -s * 0.48);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.beginPath(); ctx.arc(-s * 0.07, -s * 0.32, s * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.07, -s * 0.32, s * 0.03, 0, Math.PI * 2); ctx.fill();
    // silver mote trail (volley ready)
    ctx.fillStyle = 'rgba(180,210,240,0.7)';
    for (let i = 0; i < 3; i++) {
      const ph = ((t / 1800) + i / 3) % 1;
      ctx.beginPath();
      ctx.arc(s * (0.55 + ph * 0.15), -s * (0.1 + i * 0.15), 1.3, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // Trojan Sapper — pitch-jar specialist
  sapper(ctx, s, y, t) {
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, -s * 0.05);
      ctx.lineTo(s * 0.32, -s * 0.05);
      ctx.lineTo(s * 0.28, s * 0.5);
      ctx.lineTo(-s * 0.28, s * 0.5);
      ctx.closePath();
    };
    ctx.fillStyle = '#3a2a22';
    body();
    ctx.fill();
    shade(ctx, body, s);
    // leather apron + straps
    ctx.fillStyle = '#5a4030';
    ctx.beginPath();
    ctx.moveTo(-s * 0.28, s * 0.15);
    ctx.lineTo(s * 0.28, s * 0.15);
    ctx.lineTo(s * 0.22, s * 0.62);
    ctx.lineTo(-s * 0.22, s * 0.62);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = PAL.goldDark;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.02);
    ctx.lineTo(-s * 0.08, s * 0.2);
    ctx.moveTo(s * 0.2, -s * 0.02);
    ctx.lineTo(s * 0.08, s * 0.2);
    ctx.stroke();
    // legs
    ctx.fillStyle = '#2a2018';
    ctx.fillRect(-s * 0.22, s * 0.5, s * 0.14, s * 0.28);
    ctx.fillRect(s * 0.08, s * 0.5, s * 0.14, s * 0.28);
    // head
    ctx.fillStyle = PAL.fleshDeep;
    ctx.beginPath();
    ctx.arc(0, -s * 0.28, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // soot bandana / skull-cap
    ctx.fillStyle = '#2a1a14';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.4, s * 0.2, s * 0.1, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#1a1410';
    ctx.beginPath(); ctx.arc(-s * 0.07, -s * 0.3, s * 0.03, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.07, -s * 0.3, s * 0.03, 0, Math.PI * 2); ctx.fill();
    // torch
    ctx.strokeStyle = '#4a3020';
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.38, s * 0.22);
    ctx.lineTo(-s * 0.52, -s * 0.32);
    ctx.stroke();
    const fl = 0.5 + 0.5 * Math.sin(t / 120);
    const tg = ctx.createRadialGradient(-s * 0.52, -s * 0.38, 1, -s * 0.52, -s * 0.38, s * 0.2);
    tg.addColorStop(0, 'rgba(255,240,160,0.9)');
    tg.addColorStop(0.45, 'rgba(255,140,40,0.7)');
    tg.addColorStop(1, 'rgba(200,40,10,0)');
    ctx.fillStyle = tg;
    ctx.beginPath();
    ctx.arc(-s * 0.52, -s * 0.4 - fl * 2, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    drawPitchJar(ctx, s * 0.38, { x: s * 0.38, y: s * 0.18 }, t);
  },

  // Trojan Scout — light elite, leaps when charged
  scout(ctx, s, y, t) {
    // short cloak (motion)
    ctx.fillStyle = '#3a2830';
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.08, -s * 0.1);
      ctx.quadraticCurveTo(side * s * 0.65, -s * 0.4, side * s * 0.55, s * 0.2);
      ctx.lineTo(side * s * 0.15, s * 0.15);
      ctx.closePath();
      ctx.fill();
    }
    // light leather harness
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.26, -s * 0.12);
      ctx.lineTo(s * 0.26, -s * 0.12);
      ctx.lineTo(s * 0.28, s * 0.4);
      ctx.lineTo(-s * 0.28, s * 0.4);
      ctx.closePath();
    };
    ctx.fillStyle = '#5a4030';
    body();
    ctx.fill();
    shade(ctx, body, s);
    ctx.fillStyle = PAL.bronze;
    ctx.fillRect(-s * 0.26, s * 0.02, s * 0.52, s * 0.07);
    // bare legs for speed
    ctx.strokeStyle = PAL.flesh;
    ctx.lineWidth = 2.4;
    ctx.beginPath();
    ctx.moveTo(-s * 0.12, s * 0.4); ctx.lineTo(-s * 0.2, s * 0.78);
    ctx.moveTo(s * 0.12, s * 0.4); ctx.lineTo(s * 0.22, s * 0.78);
    ctx.stroke();
    // head
    ctx.fillStyle = PAL.flesh;
    ctx.beginPath();
    ctx.arc(0, -s * 0.32, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    // light open helm
    ctx.fillStyle = PAL.bronze;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.42, s * 0.18, s * 0.1, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.blood;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.48);
    ctx.lineTo(s * 0.03, -s * 0.72);
    ctx.lineTo(-s * 0.03, -s * 0.72);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#141414';
    ctx.beginPath(); ctx.arc(-s * 0.06, -s * 0.34, s * 0.028, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.06, -s * 0.34, s * 0.028, 0, Math.PI * 2); ctx.fill();
    // short xiphos / spear
    ctx.strokeStyle = '#4a3020';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s * 0.22, s * 0.25);
    ctx.lineTo(s * 0.55, -s * 0.4);
    ctx.stroke();
    ctx.fillStyle = PAL.goldLight;
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 0.4);
    ctx.lineTo(s * 0.48, -s * 0.26);
    ctx.lineTo(s * 0.62, -s * 0.28);
    ctx.closePath();
    ctx.fill();
    // small pelte
    ctx.fillStyle = PAL.bronzeDeep;
    ctx.beginPath();
    ctx.arc(-s * 0.38, s * 0.05, s * 0.18, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = PAL.gold;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.arc(-s * 0.38, s * 0.05, s * 0.18, 0, Math.PI * 2);
    ctx.stroke();
    if (y.charge >= 3) {
      ctx.strokeStyle = `rgba(216,178,92,${0.5 + 0.3 * Math.sin(t / 180)})`;
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.9, t / 300, t / 300 + 1.6);
      ctx.stroke();
    }
  },

  // Ford Guard — river-trained infantry (slow on land, swims)
  fordGuard(ctx, s, y, t) {
    // wet cloak / dark tunic
    const body = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.32, -s * 0.08);
      ctx.lineTo(s * 0.32, -s * 0.08);
      ctx.lineTo(s * 0.3, s * 0.5);
      ctx.lineTo(-s * 0.3, s * 0.5);
      ctx.closePath();
    };
    ctx.fillStyle = '#2a4850';
    body();
    ctx.fill();
    shade(ctx, body, s);
    // water-dark greaves
    ctx.fillStyle = '#1a3038';
    ctx.fillRect(-s * 0.24, s * 0.48, s * 0.16, s * 0.28);
    ctx.fillRect(s * 0.08, s * 0.48, s * 0.16, s * 0.28);
    // bronze breast band
    ctx.fillStyle = PAL.bronzeDeep;
    ctx.fillRect(-s * 0.28, s * 0.0, s * 0.56, s * 0.12);
    // head
    ctx.fillStyle = PAL.fleshDeep;
    ctx.beginPath();
    ctx.arc(0, -s * 0.3, s * 0.2, 0, Math.PI * 2);
    ctx.fill();
    // wet hair under simple helm
    ctx.fillStyle = '#1a2830';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.4, s * 0.2, s * 0.1, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.bronze;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.42, s * 0.18, s * 0.08, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#e8f4f0';
    ctx.beginPath(); ctx.arc(-s * 0.07, -s * 0.32, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.07, -s * 0.32, s * 0.04, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#0a2020';
    ctx.beginPath(); ctx.arc(-s * 0.06, -s * 0.32, s * 0.018, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.08, -s * 0.32, s * 0.018, 0, Math.PI * 2); ctx.fill();
    // short spear
    ctx.strokeStyle = '#3a2818';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, s * 0.4);
    ctx.lineTo(s * 0.55, -s * 0.45);
    ctx.stroke();
    ctx.fillStyle = PAL.goldLight;
    ctx.beginPath();
    ctx.moveTo(s * 0.55, -s * 0.45);
    ctx.lineTo(s * 0.48, -s * 0.3);
    ctx.lineTo(s * 0.62, -s * 0.32);
    ctx.closePath();
    ctx.fill();
    // water-skin / canteen (libation target) — tipped when staggered
    if (y.staggered > 0) {
      ctx.strokeStyle = '#8aa8a8';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.ellipse(s * 0.12, -s * 0.55, s * 0.14, s * 0.06, 0.5, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(168,216,232,0.9)';
      ctx.beginPath();
      ctx.arc(s * 0.26, -s * 0.42 + (t % 500) / 500 * s * 0.2, 1.6, 0, Math.PI * 2);
      ctx.fill();
    } else {
      ctx.fillStyle = PAL.bronzeDeep;
      ctx.beginPath();
      ctx.ellipse(-s * 0.35, s * 0.15, s * 0.12, s * 0.16, 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#a8d8e8';
      ctx.beginPath();
      ctx.ellipse(-s * 0.35, s * 0.08, s * 0.07, s * 0.04, 0, 0, Math.PI * 2);
      ctx.fill();
    }
  },

  // Pursuit Troop — flight-only chasing infantry
  pursuitTroop(ctx, s, y, t) {
    // worn red-brown cloak, torn edges
    const robe = () => {
      ctx.beginPath();
      ctx.moveTo(-s * 0.38, s * 0.65);
      ctx.lineTo(-s * 0.42, s * 0.1);
      ctx.quadraticCurveTo(-s * 0.35, -s * 0.3, 0, -s * 0.35);
      ctx.quadraticCurveTo(s * 0.4, -s * 0.25, s * 0.38, s * 0.15);
      ctx.lineTo(s * 0.3, s * 0.5);
      ctx.lineTo(s * 0.18, s * 0.38);
      ctx.lineTo(s * 0.12, s * 0.68);
      ctx.lineTo(-s * 0.02, s * 0.48);
      ctx.lineTo(-s * 0.16, s * 0.7);
      ctx.closePath();
    };
    ctx.fillStyle = '#5a3028';
    robe();
    ctx.fill();
    shade(ctx, robe, s);
    // light armor plate
    ctx.fillStyle = PAL.bronzeDeep;
    ctx.beginPath();
    ctx.moveTo(-s * 0.2, -s * 0.05);
    ctx.lineTo(s * 0.2, -s * 0.05);
    ctx.lineTo(s * 0.18, s * 0.28);
    ctx.lineTo(-s * 0.18, s * 0.28);
    ctx.closePath();
    ctx.fill();
    // reaching spear-hand
    ctx.strokeStyle = PAL.flesh;
    ctx.lineWidth = 2;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(side * s * 0.28, s * 0.0);
      ctx.lineTo(side * s * 0.55, s * 0.18);
      ctx.stroke();
    }
    // head + simple helm
    ctx.fillStyle = PAL.fleshDeep;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.28, s * 0.16, s * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = PAL.bronze;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.38, s * 0.16, s * 0.1, 0, Math.PI, Math.PI * 2);
    ctx.fill();
    // hungry eyes
    ctx.fillStyle = '#1a0808';
    ctx.beginPath(); ctx.ellipse(-s * 0.06, -s * 0.3, s * 0.04, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(s * 0.06, -s * 0.3, s * 0.04, s * 0.05, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#e8a040';
    ctx.beginPath(); ctx.arc(-s * 0.05, -s * 0.3, 1.1, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(s * 0.07, -s * 0.3, 1.1, 0, Math.PI * 2); ctx.fill();
    // short spear
    ctx.strokeStyle = '#3a2818';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(s * 0.35, s * 0.2);
    ctx.lineTo(s * 0.65, -s * 0.25);
    ctx.stroke();
    ctx.fillStyle = PAL.goldLight;
    ctx.beginPath();
    ctx.moveTo(s * 0.65, -s * 0.25);
    ctx.lineTo(s * 0.58, -s * 0.12);
    ctx.lineTo(s * 0.72, -s * 0.14);
    ctx.closePath();
    ctx.fill();
  },
};

// Ares — the war god, towering bronze and blood. Drawn across a 7-tile footprint.
export function drawAres(ctx, s, boss, t) {
  const img = getSprite('ares');
  if (img) {
    px(ctx, () => {
      const bob = Math.sin(t / 700) * s * 0.05;
      ctx.translate(0, bob);
      drawSpriteImage(ctx, img, s * 2.4);
    });
    return;
  }
  const S = s * 2.5;
  px(ctx, () => {
    const bob = Math.sin(t / 700) * s * 0.05;
    ctx.translate(0, bob);
    // broad shoulders / cuirass silhouette
    ctx.fillStyle = '#4a2018';
    ctx.beginPath();
    ctx.moveTo(-S * 0.55, S * 0.35);
    ctx.quadraticCurveTo(0, S * 0.15, S * 0.55, S * 0.35);
    ctx.lineTo(S * 0.4, S * 0.7);
    ctx.lineTo(-S * 0.4, S * 0.7);
    ctx.closePath();
    ctx.fill();
    // bronze breastplate gleam
    const bg = ctx.createLinearGradient(-S * 0.4, 0, S * 0.4, 0);
    bg.addColorStop(0, PAL.bronzeDeep);
    bg.addColorStop(0.5, PAL.gold);
    bg.addColorStop(1, PAL.bronzeDeep);
    ctx.fillStyle = bg;
    ctx.beginPath();
    ctx.ellipse(0, S * 0.35, S * 0.42, S * 0.28, 0, 0, Math.PI * 2);
    ctx.fill();
    // helm crest rising high
    ctx.fillStyle = PAL.blood;
    ctx.beginPath();
    ctx.moveTo(-S * 0.08, -S * 0.55);
    ctx.quadraticCurveTo(0, -S * 1.15, S * 0.08, -S * 0.55);
    ctx.closePath();
    ctx.fill();
    // massive helm / head
    const sg = ctx.createRadialGradient(-S * 0.1, -S * 0.2, S * 0.05, 0, -S * 0.05, S * 0.5);
    sg.addColorStop(0, PAL.goldLight);
    sg.addColorStop(1, PAL.bronzeDeep);
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.arc(0, -S * 0.08, S * 0.4, 0, Math.PI * 2);
    ctx.fill();
    // face-plate slits
    ctx.fillStyle = '#1a0808';
    ctx.beginPath();
    ctx.ellipse(-S * 0.14, -S * 0.12, S * 0.08, S * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(S * 0.14, -S * 0.12, S * 0.08, S * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    // burning eyes of war
    for (const side of [-1, 1]) {
      const fx = side * S * 0.14, fy = -S * 0.12;
      const g = ctx.createRadialGradient(fx, fy, 1, fx, fy, S * 0.14);
      g.addColorStop(0, '#fff0c0');
      g.addColorStop(0.4, '#ff6030');
      g.addColorStop(1, 'rgba(80,10,0,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(fx, fy, S * 0.14, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ff2800';
      ctx.beginPath();
      ctx.arc(fx, fy, S * 0.04, 0, Math.PI * 2);
      ctx.fill();
    }
    // beard of bronze wire
    ctx.strokeStyle = PAL.goldDark;
    ctx.lineWidth = 2;
    for (let i = -3; i <= 3; i++) {
      ctx.beginPath();
      ctx.moveTo(i * S * 0.06, S * 0.15);
      ctx.lineTo(i * S * 0.07, S * 0.38 + Math.abs(i) * S * 0.02);
      ctx.stroke();
    }
    // spear shaft rising behind
    ctx.strokeStyle = '#3a2818';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(S * 0.45, S * 0.6);
    ctx.lineTo(S * 0.7, -S * 0.7);
    ctx.stroke();
    ctx.fillStyle = PAL.goldLight;
    ctx.beginPath();
    ctx.moveTo(S * 0.7, -S * 0.7);
    ctx.lineTo(S * 0.6, -S * 0.45);
    ctx.lineTo(S * 0.8, -S * 0.48);
    ctx.closePath();
    ctx.fill();
  });
}

export function drawFoe(ctx, size, y, t) {
  const img = getSprite(y.kind);
  px(ctx, () => {
    const dim = y.staggered > 0 && y.kind !== 'fordGuard' ? 0.7 : 1;
    if (img) {
      drawSpriteImage(ctx, img, size * 1.05, { alpha: dim });
      if (y.kind === 'elite' && y.enraged) {
        ctx.strokeStyle = `rgba(255,80,40,${0.35 + 0.25 * Math.sin(t / 120)})`;
        ctx.lineWidth = 2;
        for (let i = 0; i < 4; i++) {
          const a = i * 1.6 + t / 400;
          ctx.beginPath();
          ctx.moveTo(Math.cos(a) * size * 0.7, Math.sin(a) * size * 0.7);
          ctx.lineTo(Math.cos(a) * size * 0.95, Math.sin(a) * size * 0.95);
          ctx.stroke();
        }
      }
      if (y.kind === 'scout' && y.charge >= 3) {
        ctx.strokeStyle = `rgba(216,178,92,${0.5 + 0.3 * Math.sin(t / 180)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.arc(0, 0, size * 0.95, t / 300, t / 300 + 1.6);
        ctx.stroke();
      }
    } else {
      const painter = FOE_PAINTERS[y.kind];
      if (!painter) return;
      if (dim < 1) ctx.globalAlpha = dim;
      painter(ctx, size, y, t);
    }
    if (y.staggered > 0) {
      ctx.globalAlpha = 1;
      ctx.fillStyle = PAL.gold;
      for (let i = 0; i < 3; i++) {
        const a = t / 250 + i * 2.1;
        ctx.beginPath();
        ctx.arc(Math.cos(a) * size * 0.5, -size * 0.8 + Math.sin(a) * 3, 1.6, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  });
}

// ---------------------------------------------------------------- items

export function drawPitchJar(ctx, s, offset = { x: 0, y: 0 }, t = 0) {
  // Pitch-jar / oil flask with fuse
  px(ctx, () => {
    ctx.translate(offset.x, offset.y);
    const gg = ctx.createRadialGradient(-s * 0.1, 0, 1, 0, s * 0.05, s * 0.5);
    gg.addColorStop(0, '#6a4a28');
    gg.addColorStop(1, '#3a2814');
    ctx.fillStyle = gg;
    // amphora body
    ctx.beginPath();
    ctx.ellipse(0, s * 0.12, s * 0.28, s * 0.36, 0, 0, Math.PI * 2);
    ctx.fill();
    // neck
    ctx.fillStyle = '#5a3a20';
    ctx.fillRect(-s * 0.1, -s * 0.28, s * 0.2, s * 0.22);
    // rim
    ctx.fillStyle = PAL.bronze;
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.28, s * 0.14, s * 0.05, 0, 0, Math.PI * 2);
    ctx.fill();
    // handles
    ctx.strokeStyle = PAL.bronzeDeep;
    ctx.lineWidth = 1.6;
    for (const side of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(side * s * 0.22, -s * 0.05, s * 0.1, -Math.PI / 2, Math.PI / 2, side < 0);
      ctx.stroke();
    }
    // fuse and spark
    ctx.strokeStyle = '#5c4020';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, -s * 0.32);
    ctx.quadraticCurveTo(s * 0.15, -s * 0.5, s * 0.1, -s * 0.65);
    ctx.stroke();
    const sp = (Math.sin(t / 90) + 1) / 2;
    ctx.fillStyle = `rgba(255,${190 + sp * 50},90,${0.6 + sp * 0.4})`;
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.68, 1.6 + sp * 1.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(255,255,220,${sp})`;
    ctx.beginPath();
    ctx.arc(s * 0.1, -s * 0.68, 0.8, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawJavelin(ctx, s, t) {
  // Javelin on the ground
  px(ctx, () => {
    ctx.rotate(-0.55);
    const glow = 0.35 + 0.2 * Math.sin(t / 400);
    ctx.strokeStyle = `rgba(216,178,92,${glow})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.moveTo(-s * 0.4, 0); ctx.lineTo(s * 0.45, 0); ctx.stroke();
    // shaft
    ctx.strokeStyle = '#6a4a28';
    ctx.lineWidth = 2.2;
    ctx.beginPath(); ctx.moveTo(-s * 0.38, 0); ctx.lineTo(s * 0.28, 0); ctx.stroke();
    // bronze head
    ctx.fillStyle = PAL.goldLight;
    ctx.beginPath();
    ctx.moveTo(s * 0.28, 0);
    ctx.lineTo(s * 0.45, -s * 0.05);
    ctx.lineTo(s * 0.45, s * 0.05);
    ctx.closePath();
    ctx.fill();
    // binding
    ctx.strokeStyle = PAL.blood;
    ctx.lineWidth = 1.4;
    ctx.beginPath(); ctx.moveTo(s * 0.2, -1.5); ctx.lineTo(s * 0.28, -1.5);
    ctx.moveTo(s * 0.2, 1.5); ctx.lineTo(s * 0.28, 1.5);
    ctx.stroke();
  });
}

export function drawAthenaStatue(ctx, s, t) {
  // Statue of Athena — Imagine prop, procedural fallback
  px(ctx, () => {
    const img = getSprite('athenaStatue');
    if (img) {
      // Standing statue planted on the hex
      drawSpriteImage(ctx, img, s * 1.25, { feet: true });
      // Soft divine aura
      const fl = 0.5 + 0.5 * Math.sin(t / 450);
      const g = ctx.createRadialGradient(0, -s * 0.15, 1, 0, -s * 0.1, s * 0.7);
      g.addColorStop(0, `rgba(200,220,255,${0.1 + fl * 0.08})`);
      g.addColorStop(1, 'rgba(180,160,80,0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, -s * 0.1, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // stepped base (fallback)
    ctx.fillStyle = '#5a5650';
    ctx.fillRect(-s * 0.5, s * 0.35, s, s * 0.12);
    ctx.fillStyle = '#6a6660';
    ctx.fillRect(-s * 0.42, s * 0.18, s * 0.84, s * 0.2);
    ctx.fillStyle = '#7a766e';
    ctx.fillRect(-s * 0.48, s * 0.05, s * 0.96, s * 0.16);
    ctx.fillStyle = '#8a8680';
    ctx.fillRect(-s * 0.4, -s * 0.35, s * 0.12, s * 0.42);
    ctx.fillRect(s * 0.28, -s * 0.35, s * 0.12, s * 0.42);
    ctx.fillStyle = PAL.bronze;
    ctx.beginPath();
    ctx.moveTo(-s * 0.55, -s * 0.32);
    ctx.lineTo(0, -s * 0.7);
    ctx.lineTo(s * 0.55, -s * 0.32);
    ctx.closePath();
    ctx.fill();
    const fl = 0.5 + 0.5 * Math.sin(t / 200);
    const g = ctx.createRadialGradient(0, s * 0.0, 1, 0, -s * 0.15, s * 0.35);
    g.addColorStop(0, `rgba(255,230,140,${0.5 + fl * 0.3})`);
    g.addColorStop(0.5, `rgba(255,120,40,${0.35})`);
    g.addColorStop(1, 'rgba(255,80,20,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, -s * 0.05, s * 0.28, 0, Math.PI * 2);
    ctx.fill();
  });
}

export function drawExitMap(ctx, s, { active, up }, t) {
  px(ctx, () => {
    const img = getSprite(up ? 'exitMap_up' : 'exitMap_down');
    const dim = active ? 1 : 0.35;
    ctx.globalAlpha = dim;
    if (img) {
      // Map prop — keep small so it sits on the hex
      const pulse = 1 + 0.03 * Math.sin(t / 400);
      drawSpriteImage(ctx, img, s * 0.72 * pulse, { feet: false });
      // Soft parchment glow (natural, not neon portal)
      const hue = '180,150,100';
      const g = ctx.createRadialGradient(0, 0, s * 0.12, 0, 0, s * 0.65);
      g.addColorStop(0, `rgba(${hue},${0.08 + 0.04 * Math.sin(t / 500)})`);
      g.addColorStop(1, `rgba(${hue},0)`);
      ctx.globalAlpha = dim;
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.7, 0, Math.PI * 2);
      ctx.fill();
      return;
    }
    // Procedural fallback
    const hue = up ? 'rgba(238,213,140,' : 'rgba(159,216,232,';
    ctx.fillStyle = '#040308';
    ctx.beginPath();
    ctx.ellipse(0, s * 0.1, s * 0.55, s * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = `rgba(90,85,75,${0.7 * dim + 0.2})`;
    ctx.fillRect(-s * 0.58, -s * 0.35, s * 0.16, s * 0.85);
    ctx.fillRect(s * 0.42, -s * 0.35, s * 0.16, s * 0.85);
    ctx.fillStyle = `rgba(110,100,80,${0.75 * dim + 0.2})`;
    ctx.fillRect(-s * 0.62, -s * 0.48, s * 1.24, s * 0.16);
    const pulse = 0.3 + 0.2 * Math.sin(t / 500);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s * 0.95);
    g.addColorStop(0, `${hue}${pulse * dim})`);
    g.addColorStop(1, `${hue}0)`);
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, s * 0.95, 0, Math.PI * 2); ctx.fill();
  });
}

export function drawKleos(ctx, s, t) {
  // Kleos — a gleaming laurel wreath / name-tablet
  px(ctx, () => {
    const pulse = 0.5 + 0.5 * Math.sin(t / 350);
    const g = ctx.createRadialGradient(0, 0, 1, 0, 0, s);
    g.addColorStop(0, `rgba(238,213,140,${0.3 + pulse * 0.3})`);
    g.addColorStop(1, 'rgba(238,213,140,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, s, 0, Math.PI * 2); ctx.fill();
    // wax tablet / name plate
    ctx.fillStyle = PAL.silk;
    ctx.fillRect(-s * 0.32, -s * 0.18, s * 0.64, s * 0.36);
    ctx.fillStyle = PAL.bronze;
    ctx.fillRect(-s * 0.38, -s * 0.22, s * 0.08, s * 0.44);
    ctx.fillRect(s * 0.3, -s * 0.22, s * 0.08, s * 0.44);
    // Greek-style strokes: ΚΛΕΟΣ suggestion
    ctx.strokeStyle = '#221e1e';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    // rough letter-like marks
    ctx.moveTo(-s * 0.18, -s * 0.08); ctx.lineTo(-s * 0.18, s * 0.1);
    ctx.moveTo(-s * 0.18, -s * 0.08); ctx.lineTo(-s * 0.05, s * 0.01);
    ctx.moveTo(-s * 0.18, s * 0.1); ctx.lineTo(-s * 0.05, s * 0.01);
    ctx.moveTo(s * 0.0, -s * 0.08); ctx.lineTo(s * 0.0, s * 0.1);
    ctx.moveTo(s * 0.0, -s * 0.08); ctx.lineTo(s * 0.12, -s * 0.08);
    ctx.moveTo(s * 0.0, s * 0.01); ctx.lineTo(s * 0.1, s * 0.01);
    ctx.moveTo(s * 0.16, -s * 0.08); ctx.lineTo(s * 0.16, s * 0.1);
    ctx.stroke();
    // laurel leaf accent
    ctx.fillStyle = PAL.laurel;
    ctx.beginPath();
    ctx.ellipse(-s * 0.02, -s * 0.28, s * 0.08, s * 0.03, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.08, -s * 0.26, s * 0.08, s * 0.03, 0.4, 0, Math.PI * 2);
    ctx.fill();
  });
}
