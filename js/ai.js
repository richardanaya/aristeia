// Foe AI. Deterministic given the game's seeded RNG.
// Phase order: every foe that can attack does; the rest then move.

import { DIRS, add, eq, dist, neighbors, dirBetween, between, key } from './hex.js';
import { T } from './board.js';

export function runAttackPhase(game, events) {
  for (const y of [...game.yokai]) {
    if (y.staggered > 0) continue;
    if (!game.yokai.includes(y)) continue; // died to a deflection earlier this phase
    const attacked = tryAttack(game, y, events);
    if (attacked) y.acted = true;
    if (game.over) return;
  }
}

export function runMovePhase(game, events) {
  for (const y of [...game.yokai]) {
    if (y.staggered > 0 || y.acted) continue;
    if (!game.yokai.includes(y)) continue;
    moveYokai(game, y, events);
  }
}

// ---- attacks -----------------------------------------------------------------

function tryAttack(game, y, events) {
  const p = game.player;
  switch (y.kind) {
    case 'oni': case 'tengu': case 'kappa': case 'shikome': {
      if (dist(y.pos, p.pos) !== 1) return false;
      game.hurtPlayer(events, `The ${y.data.name.toLowerCase()} strikes you.`);
      events.push({ type: 'melee', from: y.pos, to: p.pos });
      if (y.kind === 'oni') y.enraged = false; // rage is spent on the blow
      return true;
    }
    case 'archer': return tryShoot(game, y, events);
    case 'yukionna': return tryBeam(game, y, events);
    case 'tanuki': return tryBomb(game, y, events);
    case 'gashadokuro': return tryBossAttack(game, y, events);
    default: return false;
  }
}

function clearLine(game, from, to, { blockYokai = true } = {}) {
  const db = dirBetween(from, to);
  if (!db) return null;
  for (const h of between(from, to)) {
    if (game.board.blocksShots(h)) return null;
    if (game.shrinePos && eq(game.shrinePos, h)) return null;
    if (blockYokai && game.yokaiAt(h)) return null;
  }
  return db;
}

function tryShoot(game, y, events) {
  const p = game.player;
  const d = dist(y.pos, p.pos);
  if (d < y.data.shotMin || d > y.data.shotMax) return false;
  if (!clearLine(game, y.pos, p.pos)) return false;
  if (p.deflecting) {
    events.push({ type: 'shot', from: y.pos, to: p.pos, deflected: true });
    game.killYokai(y, events, 'deflect');
    game.say('You turn the arrow on the aspis and send it home.');
  } else {
    events.push({ type: 'shot', from: y.pos, to: p.pos });
    game.hurtPlayer(events, 'An arrow finds you.');
  }
  return true;
}

function tryBeam(game, y, events) {
  const p = game.player;
  if (y.cooldown > 0) return false;
  const d = dist(y.pos, p.pos);
  if (d > y.data.beamRange) return false;
  const db = dirBetween(y.pos, p.pos);
  if (!db) return false;
  // She will not sear her own kind, and stelai block the god-light.
  const path = [];
  for (let i = 1; i <= y.data.beamRange; i++) {
    const h = add(y.pos, { q: DIRS[db.dir].q * i, r: DIRS[db.dir].r * i });
    if (!game.board.has(h) || game.board.blocksShots(h)) break;
    if (game.shrinePos && eq(game.shrinePos, h)) break;
    if (game.yokaiAt(h)) return false;
    path.push(h);
  }
  if (!path.some((h) => eq(h, p.pos))) return false;

  if (p.deflecting) {
    events.push({ type: 'beam', from: y.pos, path, deflected: true });
    game.killYokai(y, events, 'deflect');
    game.say('You turn the volley back on its marksman.');
    return true;
  }
  for (const h of path) game.board.freeze(h); // water in the path becomes an ice bridge
  events.push({ type: 'beam', from: y.pos, path });
  game.hurtPlayer(events, 'An elite marksman rakes you with a silver volley.');
  y.cooldown = y.data.castCooldown;
  return true;
}

function tryBomb(game, y, events) {
  const p = game.player;
  if (y.cooldown > 0) return false;
  if (dist(y.pos, p.pos) > y.data.bombRange + 1) return false;
  // Lob a pitch-jar beside Diomedes.
  const spots = neighbors(p.pos).filter((h) =>
    dist(y.pos, h) <= y.data.bombRange
    && game.board.has(h) && game.board.walkable(h)
    && !game.occupied(h) && !eq(h, p.pos));
  if (spots.length === 0) return false;
  const spot = game.rng.pick(spots);
  game.gourds.push({ pos: spot, fuse: 1 });
  y.cooldown = y.data.bombCooldown;
  events.push({ type: 'lob', from: y.pos, to: spot });
  game.say('A sapper lobs a sparking pitch-jar at your feet.');
  return true;
}

function tryBossAttack(game, y, events) {
  const p = game.player;
  const adjacent = y.tiles().some((t) => dist(t, p.pos) === 1) && !y.tiles().some((t) => eq(t, p.pos));
  if (!y.attackReady) { y.attackReady = adjacent; return false; } // winds up first
  if (!adjacent) { y.attackReady = false; return false; }
  y.attackReady = false;
  events.push({ type: 'boss-smash', pos: y.pos });
  game.hurtPlayer(events, 'Ares brings down a fist of bronze and blood.');
  return true;
}

// ---- movement ------------------------------------------------------------------

function moveYokai(game, y, events) {
  if (y.kind === 'gashadokuro') return moveBoss(game, y, events);
  if (y.kind === 'kappa') {
    const onLand = game.board.terrain(y.pos) !== T.WATER;
    if (onLand) {
      y.landPause = !y.landPause;
      if (y.landPause) return; // sluggish out of water: moves every other turn
    } else {
      y.landPause = false;
    }
  }

  const steps = (y.kind === 'oni' && y.enraged) ? 2 : 1;
  for (let s = 0; s < steps; s++) {
    const to = pickStep(game, y);
    if (!to) break;
    const from = y.pos;
    y.pos = to;
    events.push({ type: 'ymove', id: y.id, from, to });
    if (dist(y.pos, game.player.pos) === 1) break; // in reach: stop and menace
  }

  // Scout leap: covers the gaps you thought were safe.
  if (y.kind === 'tengu' && y.charge >= y.data.leapCharge) {
    const d = dist(y.pos, game.player.pos);
    if (d >= 2 && d <= 4) {
      const spots = ringTiles(y.pos, 2).filter((h) =>
        game.board.has(h) && game.board.yokaiWalkable(h)
        && !game.occupied(h) && !eq(h, game.player.pos)
        && dist(h, game.player.pos) < d);
      if (spots.length) {
        const to = bestBy(spots, (h) => dist(h, game.player.pos), game.rng);
        const from = y.pos;
        y.pos = to;
        y.charge = 0;
        events.push({ type: 'yleap', id: y.id, from, to });
      }
    }
  }
}

function ringTiles(center, radius) {
  const out = [];
  for (const h of neighbors(center)) {
    for (const h2 of neighbors(h)) {
      if (dist(h2, center) === radius && !out.some((o) => eq(o, h2))) out.push(h2);
    }
  }
  return out;
}

function bestBy(arr, score, rng) {
  let best = null, bestScore = Infinity, ties = [];
  for (const a of arr) {
    const s = score(a);
    if (s < bestScore) { bestScore = s; ties = [a]; }
    else if (s === bestScore) ties.push(a);
  }
  best = ties.length > 1 ? rng.pick(ties) : ties[0];
  return best;
}

// One chase/reposition step for a normal foe.
function pickStep(game, y) {
  const p = game.player;
  const pass = (h) => game.board.yokaiWalkable(h, y.kind);
  const field = game.board.distanceField(p.pos, pass);
  const here = field.get(key(y.pos));
  const options = neighbors(y.pos).filter((h) =>
    game.board.has(h) && pass(h) && !game.occupied(h) && !eq(h, p.pos));
  if (options.length === 0) return null;

  const ranged = y.kind === 'archer' || y.kind === 'yukionna' || y.kind === 'tanuki';
  if (!ranged) {
    // Melee: strictly close the distance (BFS respects lakes and chasms).
    const closer = options.filter((h) => (field.get(key(h)) ?? Infinity) < (here ?? Infinity));
    return closer.length ? bestBy(closer, (h) => field.get(key(h)), game.rng) : null;
  }

  // Ranged: keep a killer's distance — near 3, never adjacent, prefer a clear axis.
  const d = dist(y.pos, p.pos);
  const score = (h) => {
    const hd = dist(h, p.pos);
    let s = Math.abs(hd - 3) * 10;
    if (hd <= 1) s += 100;
    if (dirBetween(h, p.pos) && clearLine(game, h, p.pos)) s -= 15;
    return s;
  };
  const current = Math.abs(d - 3) * 10 + (d <= 1 ? 100 : 0)
    - ((dirBetween(y.pos, p.pos) && clearLine(game, y.pos, p.pos)) ? 15 : 0);
  const best = bestBy(options, score, game.rng);
  return score(best) < current ? best : null;
}

function moveBoss(game, y, events) {
  const p = game.player;
  y.rotateJoint(); // the open wound crawls clockwise, always
  if (y.tiles().some((t) => dist(t, p.pos) <= 1)) return; // already looming
  const options = neighbors(y.pos).filter((c) => {
    const foot = [c, ...neighbors(c)];
    return foot.every((h) => {
      if (!game.board.has(h)) return false;
      const t = game.board.terrain(h);
      if (t !== T.GROUND && t !== T.ICE) return false;
      if (eq(h, p.pos)) return false;
      const other = game.yokaiAt(h);
      if (other && other !== y) return false;
      if (game.shrinePos && eq(game.shrinePos, h)) return false;
      if (game.gatePos && eq(game.gatePos, h)) return false;
      return true;
    });
  });
  if (!options.length) return;
  const to = bestBy(options, (c) => dist(c, p.pos), game.rng);
  if (dist(to, p.pos) >= dist(y.pos, p.pos)) return;
  const from = y.pos;
  y.pos = to;
  events.push({ type: 'ymove', id: y.id, from, to });
}
