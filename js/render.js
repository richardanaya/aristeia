// Canvas renderer. Reads game state; never mutates it.
// Visual language: Homeric night-plain — wine-dark sky, bronze dust,
// blood and Aegean accents.

import { dist, toPixel, fromPixel } from './hex.js';
import { T } from './board.js';
import {
  PAL, drawRonin, drawYokai, drawGashadokuro, drawGourd,
  drawWakizashi, drawShrine, drawGate, drawName,
} from './sprites.js';
import { getTile, getBg, drawTileImage } from './assets.js';

// Cheap deterministic per-tile hash for texture variation.
function tileHash(h) {
  let x = (h.q * 374761393 + h.r * 668265263) | 0;
  x = (x ^ (x >> 13)) * 1274126177;
  return ((x ^ (x >> 16)) >>> 0) / 4294967296;
}

export class Renderer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.fx = [];
    this.smooth = new Map(); // entity id -> {x, y}
    this.hover = null;       // {hex, preview}
    this.mode = 'move';
    this.lastT = 0;
    this.hex = 34;
    this.resize();
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const w = this.canvas.clientWidth, h = this.canvas.clientHeight;
    this.canvas.width = Math.max(1, w * dpr);
    this.canvas.height = Math.max(1, h * dpr);
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.w = w;
    this.h = h;
    this.fitBoard();
  }

  // Fit the hex size to the canvas so the board works on any screen.
  fitBoard() {
    const R = this.game ? this.game.board.radius : 4;
    const cols = 2 * R + 2.2;
    const s = Math.min(this.w / (Math.sqrt(3) * cols), this.h / (1.5 * (2 * R + 1) + 2.4));
    this.hex = Math.max(11, Math.min(38, s));
  }

  attach(game) {
    this.game = game;
    this.smooth.clear();
    this.fx = [];
    this.fitBoard();
  }

  hexToScreen(h) {
    const p = toPixel(h, this.hex);
    return { x: p.x + this.w / 2, y: p.y + this.h / 2 };
  }

  screenToHex(x, y) {
    return fromPixel(x - this.w / 2, y - this.h / 2, this.hex);
  }

  addEvents(events) {
    const now = performance.now();
    for (const e of events) {
      switch (e.type) {
        case 'kill': this.fx.push({ ...e, t0: now, dur: 420 }); break;
        case 'iai': this.fx.push({ ...e, t0: now, dur: 380 }); break;
        case 'shot': case 'melee': this.fx.push({ ...e, t0: now, dur: 300 }); break;
        case 'beam': this.fx.push({ ...e, t0: now, dur: 500 }); break;
        case 'explode': this.fx.push({ ...e, t0: now, dur: 550 }); break;
        case 'damage': this.fx.push({ ...e, t0: now, dur: 700, text: '-1' }); break;
        case 'stagger': case 'bow': this.fx.push({ ...e, t0: now, dur: 500 }); break;
        case 'zanshin': case 'pickup': case 'name-drop': case 'boon':
          this.fx.push({ ...e, t0: now, dur: 800 }); break;
        case 'spawn': this.fx.push({ ...e, t0: now, dur: 600 }); break;
        case 'lob': this.fx.push({ ...e, t0: now, dur: 400 }); break;
        case 'layer': this.smooth.clear(); this.fx = []; break;
        default: break;
      }
    }
  }

  smoothPos(id, target, dt) {
    let s = this.smooth.get(id);
    if (!s) { s = { x: target.x, y: target.y }; this.smooth.set(id, s); }
    const k = Math.min(1, dt * 0.014);
    s.x += (target.x - s.x) * k;
    s.y += (target.y - s.y) * k;
    return s;
  }

  hexPath(x, y, size = this.hex * 0.985) {
    const ctx = this.ctx;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = Math.PI / 3 * i + Math.PI / 6;
      const px = x + size * Math.cos(a), py = y + size * Math.sin(a);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }

  frame(t) {
    const dt = Math.min(64, t - this.lastT);
    this.lastT = t;
    const { ctx, game } = this;
    if (!game) return;

    this.drawBackdrop(t);
    for (const h of game.board.coords()) this.drawTile(h, t);
    this.drawMoveHints();
    this.drawFeatures(t);
    this.drawHover();
    this.drawEntities(t, dt);
    this.drawFx(t);
  }

  // Always show where Diomedes can walk / leap (Hoplite-style opportunity map).
  drawMoveHints() {
    const { ctx, game } = this;
    if (!game || game.over || game.won || game.pendingOffer) return;
    if (this.mode !== 'move') return;
    // Dim hints when inspecting an enemy's threat range.
    const inspectingThreat = this.hover?.threat?.length;
    for (const m of game.legalMoves()) {
      const { x, y } = this.hexToScreen(m.to);
      this.hexPath(x, y, this.hex * 0.92);
      if (m.kind === 'leap') {
        ctx.fillStyle = inspectingThreat
          ? 'rgba(100,160,190,0.06)'
          : 'rgba(109,184,216,0.14)';
        ctx.fill();
        ctx.strokeStyle = inspectingThreat
          ? 'rgba(109,184,216,0.2)'
          : 'rgba(109,184,216,0.45)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      } else {
        ctx.fillStyle = inspectingThreat
          ? 'rgba(200,170,80,0.05)'
          : 'rgba(238,213,140,0.12)';
        ctx.fill();
        ctx.strokeStyle = inspectingThreat
          ? 'rgba(238,213,140,0.18)'
          : 'rgba(238,213,140,0.4)';
        ctx.lineWidth = 1.1;
        ctx.stroke();
      }
    }
  }

  // Blurry Olympians watching from the sky, behind the hex plain.
  drawBackdrop(t) {
    const { ctx, game } = this;
    const flight = game.mode === 'flight';
    // Dark base so letterboxing never flashes
    ctx.fillStyle = flight ? '#120a10' : '#080a12';
    ctx.fillRect(0, 0, this.w, this.h);

    const img = getBg('gods');
    if (img) {
      // Cover the canvas (like background-size: cover)
      const scale = Math.max(this.w / img.width, this.h / img.height);
      const dw = img.width * scale;
      const dh = img.height * scale;
      const dx = (this.w - dw) / 2;
      // slight drift so the sky feels alive
      const driftX = Math.sin(t / 18000) * 12;
      const driftY = Math.cos(t / 22000) * 8;
      ctx.save();
      ctx.globalAlpha = flight ? 0.42 : 0.5;
      ctx.drawImage(img, dx + driftX, (this.h - dh) / 2 + driftY - this.h * 0.04, dw, dh);
      ctx.restore();
      // Vignette + dim so hexes stay primary
      const vig = ctx.createRadialGradient(
        this.w / 2, this.h * 0.45, this.h * 0.15,
        this.w / 2, this.h * 0.5, Math.max(this.w, this.h) * 0.72,
      );
      vig.addColorStop(0, 'rgba(5,6,10,0.15)');
      vig.addColorStop(0.55, 'rgba(5,6,10,0.45)');
      vig.addColorStop(1, 'rgba(5,6,10,0.82)');
      ctx.fillStyle = vig;
      ctx.fillRect(0, 0, this.w, this.h);
      // Bottom fade into the plain
      const bot = ctx.createLinearGradient(0, this.h * 0.55, 0, this.h);
      bot.addColorStop(0, 'rgba(5,6,10,0)');
      bot.addColorStop(1, 'rgba(5,6,10,0.55)');
      ctx.fillStyle = bot;
      ctx.fillRect(0, 0, this.w, this.h);
    } else {
      const bg = ctx.createLinearGradient(0, 0, 0, this.h);
      bg.addColorStop(0, flight ? '#1a0e12' : '#0c1018');
      bg.addColorStop(1, '#050408');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, this.w, this.h);
    }

    // Soft bronze dust motes
    ctx.fillStyle = 'rgba(206,180,120,0.08)';
    for (let i = 0; i < 10; i++) {
      const ph = ((t / 22000) + i / 10) % 1;
      const mx = ((i * 89.7) % this.w + Math.sin(t / 3000 + i) * 20 + this.w) % this.w;
      ctx.beginPath();
      ctx.arc(mx, this.h * (1 - ph), 1, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  drawTile(h, t) {
    const { ctx } = this;
    const S = this.hex;
    const { x, y } = this.hexToScreen(h);
    const terr = this.game.board.terrain(h);
    const hash = tileHash(h);
    this.hexPath(x, y);

    // Prefer Grok Imagine terrain textures (hex-clipped). Static photo only for pyres/fire.
    const tileImg = getTile(terr);
    if (tileImg) {
      ctx.save();
      this.hexPath(x, y);
      ctx.clip();
      ctx.fillStyle = terr === T.CHASM || terr === T.FIRE ? '#c04010'
        : terr === T.WATER ? '#0a1c2a'
        : terr === T.ICE ? '#9dbfd2'
        : terr === T.GRAVE ? '#2a2c30'
        : '#3a3028';
      ctx.fill();
      // Fiery surface: seamless texture, panned per hex so tiles vary
      const isFire = terr === T.CHASM || terr === T.FIRE;
      drawTileImage(ctx, tileImg, x, y, S, hash, {
        jitter: !isFire,
        pan: isFire,
      });
      ctx.restore();

      this.hexPath(x, y);
      ctx.strokeStyle = isFire ? 'rgba(255,100,30,0.4)'
        : terr === T.WATER ? 'rgba(80,140,180,0.35)'
        : terr === T.ICE ? 'rgba(200,230,255,0.45)'
        : 'rgba(180,140,70,0.35)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      if (terr === T.WATER) {
        const drift = Math.sin(t / 1800 + hash * 5) * 0.5 + 0.5;
        ctx.strokeStyle = `rgba(180,220,240,${0.12 + drift * 0.12})`;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(x, y + S * 0.1, S * (0.25 + drift * 0.1), Math.PI * 0.1, Math.PI * 0.9);
        ctx.stroke();
      } else if (terr === T.ICE) {
        const gl = (Math.sin(t / 700 + hash * 9) + 1) / 2;
        ctx.fillStyle = `rgba(255,255,255,${gl * 0.35})`;
        ctx.beginPath();
        ctx.arc(x + S * 0.15, y - S * 0.1, 1.4, 0, Math.PI * 2);
        ctx.fill();
      }
      return;
    }

    // Procedural fallback if a texture failed to load.
    this.drawTileProcedural(h, t, x, y, S, terr, hash);
  }

  drawTileProcedural(h, t, x, y, S, terr, hash) {
    const { ctx } = this;
    this.hexPath(x, y);
    switch (terr) {
      case T.GROUND: {
        const v = 42 + hash * 14;
        ctx.fillStyle = `rgb(${v + 18},${v + 10},${v})`;
        ctx.fill();
        ctx.strokeStyle = 'rgba(180,140,70,0.28)';
        ctx.lineWidth = 1.2;
        ctx.stroke();
        break;
      }
      case T.CHASM:
      case T.FIRE: {
        // Full fiery tile fallback
        const g = ctx.createRadialGradient(x, y, 1, x, y, S);
        g.addColorStop(0, '#ffe080');
        g.addColorStop(0.35, '#ff8020');
        g.addColorStop(0.75, '#c02808');
        g.addColorStop(1, '#501008');
        ctx.fillStyle = g;
        ctx.fill();
        ctx.strokeStyle = 'rgba(255,120,40,0.55)';
        ctx.lineWidth = 1.2;
        this.hexPath(x, y);
        ctx.stroke();
        break;
      }
      case T.WATER: {
        ctx.fillStyle = '#0b1a2c';
        ctx.fill();
        break;
      }
      case T.ICE: {
        ctx.fillStyle = '#9dbfd2';
        ctx.fill();
        break;
      }
      case T.GRAVE: {
        ctx.fillStyle = '#2a2c30';
        ctx.fill();
        ctx.fillStyle = '#6a6860';
        ctx.fillRect(x - S * 0.16, y - S * 0.35, S * 0.32, S * 0.7);
        break;
      }
      default: break;
    }
  }

  drawFeatures(t) {
    const { ctx, game } = this;
    const S = this.hex;
    if (game.gatePos) {
      const { x, y } = this.hexToScreen(game.gatePos);
      ctx.save();
      ctx.translate(x, y);
      drawGate(ctx, S, { active: game.gateActive(), up: game.mode === 'flight' }, t);
      ctx.restore();
    }
    if (game.shrinePos) {
      const { x, y } = this.hexToScreen(game.shrinePos);
      ctx.save();
      ctx.translate(x, y);
      drawShrine(ctx, S, t);
      ctx.restore();
      if (!game.shrineUsed && dist(game.player.pos, game.shrinePos) === 1) {
        this.hexPath(x, y);
        ctx.strokeStyle = `rgba(238,213,140,${0.35 + 0.2 * Math.sin(t / 300)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    }
    if (game.wakizashiPos) {
      const { x, y } = this.hexToScreen(game.wakizashiPos);
      ctx.save(); ctx.translate(x, y); drawWakizashi(ctx, S, t); ctx.restore();
    }
    if (game.namePos) {
      const { x, y } = this.hexToScreen(game.namePos);
      ctx.save(); ctx.translate(x, y); drawName(ctx, S, t); ctx.restore();
    }
    for (const g of game.gourds) {
      const { x, y } = this.hexToScreen(g.pos);
      ctx.save(); ctx.translate(x, y); drawGourd(ctx, S * 0.8, { x: 0, y: 0 }, t); ctx.restore();
    }
  }

  drawEntities(t, dt) {
    const { ctx, game } = this;
    const S = this.hex;
    for (const y of game.yokai) {
      const target = this.hexToScreen(y.pos);
      const s = this.smoothPos(y.id, target, dt);
      // grounding shadow
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(s.x, s.y + S * (y.isBoss ? 1.1 : 0.55), S * (y.isBoss ? 1.6 : 0.42), S * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.save();
      ctx.translate(s.x, s.y);
      if (y.isBoss) drawGashadokuro(ctx, S, y, t);
      else drawYokai(ctx, S * 0.9, y, t);
      ctx.restore();
      if (y.isBoss) {
        // Ares' open wound: a glowing gash Athena made visible
        const v = this.hexToScreen(y.vulnTile());
        this.hexPath(v.x, v.y, S * 0.7);
        ctx.strokeStyle = `rgba(255,80,50,${0.55 + 0.35 * Math.sin(t / 200)})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        ctx.strokeStyle = `rgba(255,200,80,${0.7 + 0.3 * Math.sin(t / 200)})`;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(v.x - S * 0.3, v.y + S * 0.2);
        ctx.lineTo(v.x - S * 0.08, v.y - S * 0.05);
        ctx.lineTo(v.x + S * 0.12, v.y + S * 0.1);
        ctx.lineTo(v.x + S * 0.3, v.y - S * 0.22);
        ctx.stroke();
      }
    }
    const pt = this.hexToScreen(game.player.pos);
    const ps = this.smoothPos('player', pt, dt);
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.beginPath();
    ctx.ellipse(ps.x, ps.y + S * 0.6, S * 0.42, S * 0.12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.save();
    ctx.translate(ps.x, ps.y);
    drawRonin(ctx, S * 0.95, game.player, t);
    ctx.restore();
  }

  /** Dark pill label above a hex (enemies, portal, statue, fire). */
  drawHoverLabel(x, y, S, text, { accent = 'rgba(200, 70, 50, 0.55)', lift = 1.45 } = {}) {
    const { ctx } = this;
    const fontPx = Math.max(11, Math.round(S * 0.32));
    ctx.font = `${fontPx}px Georgia, serif`;
    const tw = ctx.measureText(text).width;
    const padX = 8;
    const padY = 5;
    const boxH = fontPx + padY * 2;
    const boxW = tw + padX * 2;
    const by = y - S * lift - boxH;
    const bx = x - boxW / 2;
    ctx.fillStyle = 'rgba(8, 10, 14, 0.9)';
    ctx.strokeStyle = accent;
    ctx.lineWidth = 1;
    const r = 3;
    ctx.beginPath();
    ctx.moveTo(bx + r, by);
    ctx.arcTo(bx + boxW, by, bx + boxW, by + boxH, r);
    ctx.arcTo(bx + boxW, by + boxH, bx, by + boxH, r);
    ctx.arcTo(bx, by + boxH, bx, by, r);
    ctx.arcTo(bx, by, bx + boxW, by, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = 'rgba(243, 239, 225, 0.96)';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, x, by + boxH / 2);
    ctx.textAlign = 'start';
    ctx.textBaseline = 'alphabetic';
  }

  drawHover() {
    const { ctx, game } = this;
    const S = this.hex;
    if (!this.hover || game.over || game.won || game.pendingOffer) return;
    const { hex, preview, threat, threatFoe, featureLabel } = this.hover;
    if (!game.board.has(hex)) return;
    const { x, y } = this.hexToScreen(hex);

    // Enemy threat telegraph: red wash on every tile they can hit.
    if (threat && threat.length) {
      for (const h of threat) {
        const p = this.hexToScreen(h);
        this.hexPath(p.x, p.y, S * 0.94);
        ctx.fillStyle = 'rgba(200,50,40,0.22)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(220,70,50,0.55)';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      }
      // Outline the foe under the cursor.
      this.hexPath(x, y, S * 0.98);
      ctx.strokeStyle = 'rgba(255,100,80,0.95)';
      ctx.lineWidth = 2.4;
      ctx.stroke();
      if (threatFoe) {
        this.drawHoverLabel(x, y, S, threatFoe.data?.name || threatFoe.kind, {
          accent: 'rgba(200, 70, 50, 0.55)',
          lift: 1.45,
        });
      }
      // Boss: also pulse the open wound while inspecting.
      if (threatFoe?.isBoss) {
        const v = this.hexToScreen(threatFoe.vulnTile());
        this.hexPath(v.x, v.y, S * 0.75);
        ctx.strokeStyle = 'rgba(255,200,80,0.95)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
      }
      return;
    }

    // Feature labels: arrow (gate), Athena statue, fire / planks on fire
    if (featureLabel) {
      const isFire = featureLabel.startsWith('Fire') || featureLabel.startsWith('Planks');
      const isMap = featureLabel.startsWith('Map');
      this.hexPath(x, y, S * 0.98);
      ctx.strokeStyle = isFire ? 'rgba(255,140,40,0.85)'
        : isMap ? 'rgba(120,190,255,0.85)'
        : 'rgba(200,180,100,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
      this.drawHoverLabel(x, y, S, featureLabel, {
        accent: isFire ? 'rgba(255,140,40,0.55)'
          : isMap ? 'rgba(120,190,255,0.55)'
          : 'rgba(200,180,100,0.55)',
        lift: isMap || featureLabel.includes('Athena') ? 1.35 : 1.15,
      });
    }

    if (preview && preview.ok) {
      this.hexPath(x, y);
      ctx.strokeStyle = preview.kind === 'leap' ? 'rgba(159,216,232,0.95)' : 'rgba(238,213,140,0.95)';
      ctx.lineWidth = 2.5;
      ctx.stroke();
      ctx.fillStyle = preview.kind === 'leap'
        ? 'rgba(159,216,232,0.16)'
        : 'rgba(238,213,140,0.14)';
      ctx.fill();
      for (const victim of preview.kills || []) {
        const v = this.hexToScreen(victim.pos);
        this.hexPath(v.x, v.y, S * 0.82);
        ctx.fillStyle = 'rgba(208,71,47,0.2)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(208,71,47,0.95)';
        ctx.lineWidth = 2.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(v.x - 7, v.y - 7); ctx.lineTo(v.x + 7, v.y + 7);
        ctx.moveTo(v.x + 7, v.y - 7); ctx.lineTo(v.x - 7, v.y + 7);
        ctx.stroke();
      }
      if (preview.draws) {
        ctx.fillStyle = 'rgba(243,239,225,0.95)';
        ctx.font = `${Math.max(9, S * 0.28)}px Georgia, serif`;
        ctx.fillText('SWEEP', x - S * 0.45, y - S * 0.75);
      }
    } else if (this.mode !== 'move') {
      this.hexPath(x, y);
      ctx.strokeStyle = 'rgba(238,213,140,0.85)';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      this.hexPath(x, y);
      ctx.strokeStyle = 'rgba(243,239,225,0.2)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  drawFx(t) {
    const { ctx } = this;
    const S = this.hex;
    this.fx = this.fx.filter((f) => t - f.t0 < f.dur);
    for (const f of this.fx) {
      const p = (t - f.t0) / f.dur;
      const fade = 1 - p;
      switch (f.type) {
        case 'kill': {
          const { x, y } = this.hexToScreen(f.pos);
          ctx.strokeStyle = `rgba(243,239,225,${fade})`;
          ctx.lineWidth = 3 * fade;
          ctx.beginPath();
          ctx.moveTo(x - S * 0.7 * p - 4, y + S * 0.5 * p);
          ctx.lineTo(x + S * 0.7 * p + 4, y - S * 0.5 * p);
          ctx.stroke();
          ctx.fillStyle = `rgba(201,31,55,${fade * 0.6})`;
          for (let i = 0; i < 5; i++) {
            const a = i * 1.3;
            ctx.beginPath();
            ctx.arc(x + Math.cos(a) * S * 0.6 * p, y + Math.sin(a) * S * 0.6 * p, 2 * fade, 0, Math.PI * 2);
            ctx.fill();
          }
          break;
        }
        case 'iai': {
          const { x, y } = this.hexToScreen(f.pos);
          const base = (f.dir ?? 0) * -Math.PI / 3;
          ctx.strokeStyle = `rgba(243,239,225,${fade})`;
          ctx.lineWidth = 4 * fade;
          ctx.beginPath();
          ctx.arc(x, y, S * (0.7 + p * 0.7), base - 1.4 + p * 1.2, base + 0.2 + p * 1.2);
          ctx.stroke();
          ctx.strokeStyle = `rgba(238,213,140,${fade * 0.7})`;
          ctx.lineWidth = 1.4;
          ctx.beginPath();
          ctx.arc(x, y, S * (0.78 + p * 0.7), base - 1.4 + p * 1.2, base + 0.2 + p * 1.2);
          ctx.stroke();
          break;
        }
        case 'shot': case 'melee': {
          const a = this.hexToScreen(f.from), b = this.hexToScreen(f.to);
          ctx.strokeStyle = f.deflected
            ? `rgba(159,216,232,${fade})`
            : `rgba(240,230,200,${fade})`;
          ctx.lineWidth = 1.6;
          ctx.beginPath();
          ctx.moveTo(a.x, a.y);
          ctx.lineTo(a.x + (b.x - a.x) * Math.min(1, p * 2), a.y + (b.y - a.y) * Math.min(1, p * 2));
          ctx.stroke();
          break;
        }
        case 'beam': {
          const a = this.hexToScreen(f.from);
          const end = this.hexToScreen(f.path[f.path.length - 1]);
          ctx.strokeStyle = `rgba(170,225,255,${fade * 0.9})`;
          ctx.lineWidth = 8 * fade;
          ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(end.x, end.y); ctx.stroke();
          ctx.strokeStyle = `rgba(255,255,255,${fade})`;
          ctx.lineWidth = 2;
          ctx.stroke();
          break;
        }
        case 'explode': {
          const { x, y } = this.hexToScreen(f.pos);
          ctx.strokeStyle = `rgba(232,138,69,${fade})`;
          ctx.lineWidth = 4 * fade;
          ctx.beginPath();
          ctx.arc(x, y, S * (0.3 + p * 1.6), 0, Math.PI * 2);
          ctx.stroke();
          ctx.fillStyle = `rgba(238,213,140,${fade * 0.35})`;
          ctx.beginPath();
          ctx.arc(x, y, S * (0.2 + p * 1.2), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'damage': {
          const { x, y } = this.hexToScreen(f.pos);
          ctx.fillStyle = `rgba(224,96,80,${fade})`;
          ctx.font = 'bold 14px Georgia, serif';
          ctx.fillText(f.text || '-1', x + 10, y - S * 0.6 - p * 18);
          break;
        }
        case 'stagger': case 'bow': {
          const { x, y } = this.hexToScreen(f.pos);
          ctx.fillStyle = `rgba(238,213,140,${fade})`;
          ctx.font = '12px Georgia, serif';
          ctx.fillText(f.type === 'bow' ? 'σκ' : '✶', x - 6, y - S * 0.8 - p * 10);
          break;
        }
        case 'zanshin': case 'boon': case 'pickup': case 'name-drop': {
          const { x, y } = this.hexToScreen(f.pos);
          ctx.strokeStyle = `rgba(238,213,140,${fade})`;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(x, y, S * (0.4 + p), 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'spawn': {
          const { x, y } = this.hexToScreen(f.pos);
          ctx.strokeStyle = `rgba(143,132,150,${fade})`;
          ctx.lineWidth = 2.5;
          ctx.beginPath();
          ctx.arc(x, y, S * (1 - p), 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
        case 'lob': {
          const a = this.hexToScreen(f.from), b = this.hexToScreen(f.to);
          const mx = (a.x + b.x) / 2, my = (a.y + b.y) / 2 - 30;
          const q = Math.min(1, p * 1.4);
          const lx = (1 - q) * (1 - q) * a.x + 2 * (1 - q) * q * mx + q * q * b.x;
          const ly = (1 - q) * (1 - q) * a.y + 2 * (1 - q) * q * my + q * q * b.y;
          ctx.fillStyle = `rgba(232,138,69,${fade + 0.3})`;
          ctx.beginPath();
          ctx.arc(lx, ly, 4, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        default: break;
      }
    }
  }
}
