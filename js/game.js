// Game: the full rules engine. Deterministic, DOM-free, testable.
//
// Turn order (inherited from Hoplite):
//   1. Diomedes acts  2. pitch-jars explode  3. foes attack  4. foes move

import { DIRS, add, scale, eq, dist, neighbors, dirBetween, rot } from './hex.js';
import { Board, T } from './board.js';
import { Player, Yokai, Gashadokuro } from './entities.js';
import { offerBoons, applyBoon, BOONS } from './boons.js';
import { RNG } from './rng.js';
import { generateLayer } from './levelgen.js';
import { runAttackPhase, runMovePhase } from './ai.js';

export const MAX_LAYER = 8;
export const LEAP_COST = 50;
export const PUSH_COST = 30;

export class Game {
  constructor({ seed = (Date.now() >>> 0), test = false, radius = 4 } = {}) {
    this.rng = new RNG(seed);
    this.seed = seed;
    this.layer = 1;
    this.mode = 'descent'; // 'descent' | 'flight'
    this.over = false;
    this.won = false;
    this.turn = 0;
    this.turnInLayer = 0;
    this.log = [];
    this.pendingOffer = null; // boon ids while a shrine choice is open
    this.shrineOffer = null;  // locked once first prayed; re-open shows same choices

    if (test) {
      this.board = Board.hexagon(radius);
      this.player = new Player({ q: 0, r: 0 });
      this.yokai = [];
      this.gourds = [];       // {pos, fuse}
      this.wakizashiPos = null;
      this.namePos = null;
      this.gatePos = null;
      this.entryPos = { q: 0, r: 0 };
      this.shrinePos = null;
      this.shrineUsed = false;
    } else {
      this.player = new Player({ q: 0, r: 0 });
      this.loadLayer(1, 'descent');
    }
  }

  // ---- layer transitions -------------------------------------------------

  loadLayer(index, mode) {
    const gen = generateLayer(this.rng, index, mode);
    this.board = gen.board;
    this.player.pos = gen.start;
    this.gatePos = gen.gate;
    this.shrinePos = gen.shrine;
    this.entryPos = gen.start;
    this.yokai = gen.yokai;
    this.gourds = [];
    this.wakizashiPos = null;
    this.namePos = null;
    this.shrineUsed = false;
    this.shrineOffer = null;
    this.layer = index;
    this.mode = mode;
    this.turnInLayer = 0;
    this.player.ki = this.player.maxKi;
    this.player.deflecting = false;
    this.say(mode === 'flight'
      ? `You climb. Rank ${index} of the plain — pursuit troops are coming.`
      : `Rank ${index} of the Trojan plain.`);
  }

  // ---- queries -------------------------------------------------------------

  say(msg) { this.log.push(msg); if (this.log.length > 60) this.log.shift(); }

  yokaiAt(h) {
    return this.yokai.find((y) => y.tiles().some((t) => eq(t, h))) || null;
  }

  gourdAt(h) { return this.gourds.find((g) => eq(g.pos, h)) || null; }

  occupied(h) {
    return eq(this.player.pos, h) || !!this.yokaiAt(h) || !!this.gourdAt(h)
      || (this.shrinePos && eq(this.shrinePos, h));
  }

  // Can Diomedes end a move on this tile?
  canStand(h) {
    if (!this.board.has(h) || !this.board.walkable(h)) return false;
    if (this.yokaiAt(h) || this.gourdAt(h)) return false;
    if (this.shrinePos && eq(this.shrinePos, h)) return false;
    return true;
  }

  gateActive() {
    if (this.mode === 'descent' && this.layer === MAX_LAYER) return this.player.hasName;
    return true;
  }

  // Classify a prospective move. Returns {ok, kind, cost, reason}.
  moveInfo(to) {
    const d = dist(this.player.pos, to);
    if (d === 0) return { ok: false, reason: 'You are here.' };
    if (!this.canStand(to)) return { ok: false, reason: 'You cannot stand there.' };
    if (this.gatePos && eq(to, this.gatePos)) {
      if (!this.player.hasWakizashi) return { ok: false, reason: 'You will not leave your javelin on the plain.' };
      if (!this.gateActive()) return { ok: false, reason: 'The way is sealed. Your kleos is here somewhere.' };
    }
    if (d === 1) return { ok: true, kind: 'walk', cost: 0 };
    if (d <= this.player.leapRange()) {
      if (this.player.ki < LEAP_COST) return { ok: false, reason: 'Not enough menos for Athena\'s leap.' };
      return { ok: true, kind: 'leap', cost: LEAP_COST };
    }
    return { ok: false, reason: 'Too far.' };
  }

  legalMoves() {
    const out = [];
    for (const h of this.board.coords()) {
      const info = this.moveInfo(h);
      if (info.ok) out.push({ to: h, kind: info.kind });
    }
    return out;
  }

  // Tiles a foe can currently attack / threaten (for hover telegraph).
  // Pure preview — does not mutate state.
  threatTiles(y) {
    if (!y || y.staggered > 0) return [];
    const tiles = [];
    const push = (h) => {
      if (h && this.board.has(h) && !tiles.some((t) => eq(t, h))) tiles.push(h);
    };

    switch (y.kind) {
      case 'oni': case 'tengu': case 'kappa': case 'shikome': {
        for (const n of neighbors(y.pos)) push(n);
        break;
      }
      case 'archer': {
        for (let d = 0; d < 6; d++) {
          for (let step = y.data.shotMin; step <= y.data.shotMax; step++) {
            const h = add(y.pos, scale(DIRS[d], step));
            if (!this.board.has(h)) break;
            if (this.board.blocksShots(h)) break;
            if (this.shrinePos && eq(this.shrinePos, h)) break;
            if (this.yokaiAt(h) && !eq(h, this.player.pos)) break;
            push(h);
          }
        }
        break;
      }
      case 'yukionna': {
        if (y.cooldown > 0) break;
        for (let d = 0; d < 6; d++) {
          for (let step = 1; step <= y.data.beamRange; step++) {
            const h = add(y.pos, scale(DIRS[d], step));
            if (!this.board.has(h)) break;
            if (this.board.blocksShots(h)) break;
            if (this.shrinePos && eq(this.shrinePos, h)) break;
            if (this.yokaiAt(h) && !eq(h, this.player.pos)) break;
            push(h);
          }
        }
        break;
      }
      case 'tanuki': {
        if (y.cooldown > 0) break;
        // Can lob onto walkable tiles in bomb range (around you if in range).
        for (const h of this.board.coords()) {
          if (dist(y.pos, h) > y.data.bombRange) continue;
          if (!this.board.walkable(h)) continue;
          if (this.occupied(h) && !eq(h, this.player.pos)) continue;
          push(h);
        }
        break;
      }
      case 'gashadokuro': {
        for (const t of y.tiles()) {
          for (const n of neighbors(t)) {
            if (!y.tiles().some((ft) => eq(ft, n))) push(n);
          }
        }
        break;
      }
      default: break;
    }
    return tiles;
  }

  // ---- combat geometry (pure preview, shared with act) ---------------------

  // All kills a move from->to would cause, respecting the iai stance rules.
  computeMoveKills(from, to) {
    const p = this.player;
    const db = dirBetween(from, to);
    const kills = new Map(); // id -> yokai
    const addKill = (y) => { if (y) kills.set(y.id, y); };

    const bossHit = (tile) => {
      const y = this.yokaiAt(tile);
      return (y && y.isBoss && eq(y.vulnTile(), tile)) ? y : null;
    };
    const cutAt = (tile) => {
      const y = this.yokaiAt(tile);
      if (!y) return null;
      return y.isBoss ? bossHit(tile) : y;
    };

    // Kesa cut: any yokai adjacent to both the departed and arrived tile.
    const kesa = this.yokai.filter((y) => !y.isBoss
      && dist(y.pos, from) === 1 && dist(y.pos, to) === 1);

    // Tsuki thrust: straight moves strike the tile(s) beyond the destination.
    const tsukiTiles = [];
    if (db) {
      tsukiTiles.push(add(to, DIRS[db.dir]));
      if (p.has('piercing-tsuki')) tsukiTiles.push(add(to, scale(DIRS[db.dir], 2)));
    }

    // Iai arc: first strike out of the sheath sweeps the tiles ahead.
    const arcTiles = [];
    if (p.sheathed && db) {
      const spread = p.has('long-draw') ? [0, 1, -1, 2, -2] : [0, 1, -1];
      for (const s of spread) arcTiles.push(add(to, DIRS[rot(db.dir, s)]));
    }

    let draws = false;
    if (!p.sheathed) {
      for (const y of kesa) addKill(y);
      for (const t of tsukiTiles) addKill(cutAt(t));
    } else {
      // Sheathed: the sword stays sheathed unless the draw would spill blood.
      const found = new Map();
      for (const y of kesa) found.set(y.id, y);
      for (const t of [...tsukiTiles, ...arcTiles]) {
        const y = cutAt(t);
        if (y) found.set(y.id, y);
      }
      if (found.size > 0) {
        draws = true;
        for (const y of found.values()) addKill(y);
      }
    }
    return { kills: [...kills.values()], draws, dir: db ? db.dir : null };
  }

  previewMove(to) {
    const info = this.moveInfo(to);
    if (!info.ok) return { ...info, kills: [] };
    const { kills, draws } = this.computeMoveKills(this.player.pos, to);
    return { ...info, kills, draws };
  }

  // ---- actions --------------------------------------------------------------

  act(action) {
    if (this.over || this.won) return { ok: false, reason: 'The run is over.' };
    if (this.pendingOffer) return { ok: false, reason: 'The gods await your choice.' };
    const events = [];
    const p = this.player;
    p.deflecting = false; // water stance lasts exactly one round
    this.killsThisTurn = 0;

    let handled;
    switch (action.type) {
      case 'move': handled = this.doMove(action.to, events); break;
      case 'sheathe': handled = this.doSheathe(events); break;
      case 'push': handled = this.doPush(action.to, events); break;
      case 'throw': handled = this.doThrow(action.to, events); break;
      case 'deflect': handled = this.doDeflect(events); break;
      case 'bow': handled = this.doBow(action.to, events); break;
      case 'pray': handled = this.doPray(events); break;
      case 'wait':
        handled = p.has('patient-blade')
          ? { ok: true }
          : { ok: false, reason: 'You have not learned Odyssean patience.' };
        break;
      default: handled = { ok: false, reason: 'Unknown action.' };
    }

    if (!handled.ok) return { ...handled, events: [] };
    if (handled.layerChanged || handled.offer) {
      return { ok: true, events, offer: handled.offer || null };
    }
    this.endTurn(events);
    return { ok: true, events };
  }

  doMove(to, events) {
    const info = this.moveInfo(to);
    if (!info.ok) return info;
    const p = this.player;
    const from = p.pos;
    const { kills, draws, dir } = this.computeMoveKills(from, to);

    if (info.kind === 'leap') p.ki -= LEAP_COST;
    p.pos = to;
    events.push({ type: 'move', from, to, leap: info.kind === 'leap' });

    if (draws) {
      p.sheathed = false;
      events.push({ type: 'iai', pos: to, dir });
    }
    for (const y of kills) this.killYokai(y, events);

    if (info.kind === 'leap' && p.has('thunderclap')) {
      this.staggerAround(to, 1, events);
    }

    if (this.board.terrain(to) === T.FIRE) {
      this.hurtPlayer(events, 'Burning ship-planks sear you.');
      if (this.over) return { ok: true };
    }

    // Pickups.
    if (this.wakizashiPos && eq(this.wakizashiPos, to)) {
      this.wakizashiPos = null;
      p.hasWakizashi = true;
      events.push({ type: 'pickup', what: 'wakizashi', pos: to });
      this.say('You reclaim your javelin.');
    }
    if (this.namePos && eq(this.namePos, to)) {
      this.namePos = null;
      p.hasName = true;
      this.mode = 'flight';
      events.push({ type: 'pickup', what: 'name', pos: to });
      this.say('You take back your KLEOS. The plain wakes. RUN.');
    }

    // Gate.
    if (this.gatePos && eq(to, this.gatePos)) {
      return this.passGate(events);
    }
    return { ok: true };
  }

  passGate(events) {
    if (this.mode === 'descent') {
      this.loadLayer(this.layer + 1, 'descent');
      events.push({ type: 'layer', index: this.layer, mode: this.mode });
      return { ok: true, layerChanged: true };
    }
    // Flight: climbing back out.
    if (this.layer === 1) {
      this.won = true;
      this.say('You step through the last gate into the grey light of dawn. Your kleos is yours again.');
      events.push({ type: 'won' });
      return { ok: true, layerChanged: true };
    }
    this.loadLayer(this.layer - 1, 'flight');
    events.push({ type: 'layer', index: this.layer, mode: this.mode });
    return { ok: true, layerChanged: true };
  }

  doSheathe(events) {
    const p = this.player;
    if (p.sheathed) return { ok: false, reason: 'Your spear is already grounded.' };
    p.sheathed = true;
    this.staggerAround(p.pos, 1, events);
    events.push({ type: 'sheathe', pos: p.pos });
    this.say('You plant the spear. The stillness staggers those near you.');
    return { ok: true };
  }

  staggerAround(pos, turns, events) {
    for (const y of this.yokai) {
      if (y.tiles().some((t) => dist(t, pos) === 1)) {
        y.staggered = Math.max(y.staggered, turns + 1); // survives this turn's decrement
        events.push({ type: 'stagger', pos: y.pos });
      }
    }
  }

  doPush(to, events) {
    const p = this.player;
    if (dist(p.pos, to) !== 1) return { ok: false, reason: 'You can only push what is beside you.' };
    if (p.ki < PUSH_COST) return { ok: false, reason: 'Not enough menos.' };
    const db = dirBetween(p.pos, to);
    const dest = add(to, DIRS[db.dir]);
    const target = this.yokaiAt(to);
    const gourd = this.gourdAt(to);
    if (target && target.isBoss) return { ok: false, reason: 'Ares does not yield to a shield-bash.' };
    if (!target && !gourd) return { ok: false, reason: 'Nothing there to push.' };

    p.ki -= PUSH_COST;
    events.push({ type: 'push', from: to, to: dest });

    if (gourd) {
      const blocked = !this.board.has(dest) || !this.board.walkable(dest)
        || this.occupied(dest);
      if (blocked) this.explodeGourd(gourd, events, dest);
      else gourd.pos = dest;
      return { ok: true };
    }

    const terr = this.board.terrain(dest);
    const survivable = this.board.yokaiWalkable(dest, target.kind)
      && !this.occupied(dest) && !(this.shrinePos && eq(this.shrinePos, dest));
    const crushed = this.yokaiAt(dest); // shoved into another yokai: both die
    if (crushed && !crushed.isBoss) {
      this.killYokai(crushed, events);
      this.killYokai(target, events);
      this.say('Two foes break against each other.');
    } else if (!survivable) {
      this.killYokai(target, events, terr === T.CHASM ? 'pyre' : 'crush');
    } else {
      target.pos = dest;
      if (target.kind === 'oni') {
        target.enraged = true;
        events.push({ type: 'enrage', pos: dest });
        this.say('The elite howls — you have only angered him.');
      }
    }
    return { ok: true };
  }

  doThrow(to, events) {
    const p = this.player;
    if (!p.hasWakizashi) return { ok: false, reason: 'Your javelin lies elsewhere.' };
    if (dist(p.pos, to) > p.throwRange()) return { ok: false, reason: 'Beyond your throw.' };
    const y = this.yokaiAt(to);
    if (!y) return { ok: false, reason: 'Nothing there to strike.' };
    if (y.isBoss && !eq(y.vulnTile(), to)) {
      return { ok: false, reason: 'Bronze glances off the god. Strike the open wound.' };
    }
    p.hasWakizashi = false;
    const landing = y.isBoss ? to : { ...y.pos };
    this.killYokai(y, events);
    this.wakizashiPos = this.board.walkable(landing) ? landing : { ...p.pos };
    events.push({ type: 'throw', from: p.pos, to, landing: this.wakizashiPos });
    return { ok: true };
  }

  doDeflect(events) {
    const p = this.player;
    if (!p.hasWakizashi) return { ok: false, reason: 'Shield-guard needs your javelin hand free.' };
    p.deflecting = true;
    events.push({ type: 'deflect-stance', pos: p.pos });
    this.say('You raise the aspis. Athena steadies your arm.');
    return { ok: true };
  }

  doBow(to, events) {
    const y = this.yokaiAt(to);
    if (!y || y.kind !== 'kappa' || dist(this.player.pos, to) !== 1) {
      return { ok: false, reason: 'Only an adjacent ford guard answers a libation.' };
    }
    y.staggered = 2; // answers the rite, loses footing: helpless this round and the next
    events.push({ type: 'bow', pos: y.pos });
    this.say('You pour a libation. The ford guard answers — and loses his footing.');
    return { ok: true };
  }

  doPray(events) {
    if (!this.shrinePos || dist(this.player.pos, this.shrinePos) !== 1) {
      return { ok: false, reason: 'No altar within reach.' };
    }
    if (this.shrineUsed) return { ok: false, reason: 'The gods here have already spoken.' };
    // Lock the offer on first prayer so stepping away cannot re-roll new boons.
    if (!this.shrineOffer) {
      const offer = offerBoons(this.player, this.rng);
      if (offer.length === 0) return { ok: false, reason: 'The gods are silent.' };
      this.shrineOffer = offer;
    }
    this.pendingOffer = this.shrineOffer;
    events.push({ type: 'pray', pos: this.shrinePos });
    return { ok: true, offer: this.shrineOffer };
  }

  // Complete (or cancel) an altar sacrifice. Choosing ends the turn.
  chooseBoon(id) {
    if (!this.pendingOffer) return { ok: false, reason: 'No offer is open.' };
    if (id === null) { this.pendingOffer = null; return { ok: true, cancelled: true, events: [] }; }
    if (!this.pendingOffer.includes(id)) return { ok: false, reason: 'That was not offered.' };
    applyBoon(this.player, id);
    this.pendingOffer = null;
    this.shrineUsed = true;
    this.shrineOffer = null;
    this.say(`The gods grant you: ${BOONS[id]?.name || id.replace(/-/g, ' ')}.`);
    const events = [{ type: 'boon', id, pos: { ...this.player.pos } }];
    this.endTurn(events);
    return { ok: true, events };
  }

  // ---- kills & damage --------------------------------------------------------

  killYokai(y, events, cause = 'blade') {
    const idx = this.yokai.indexOf(y);
    if (idx === -1) return;
    this.yokai.splice(idx, 1);
    this.killsThisTurn++;
    this.player.gainKi(10 + (this.player.has('red-thirst') ? 6 : 0));
    events.push({ type: 'kill', pos: y.pos, kind: y.kind, cause });
    if (y.isBoss) {
      this.namePos = { ...y.pos };
      events.push({ type: 'name-drop', pos: y.pos });
      this.say('Ares falls roaring into the dust. Something bright gleams in the wreck — your kleos.');
    }
  }

  hurtPlayer(events, msg) {
    events.push({ type: 'damage', pos: this.player.pos });
    if (msg) this.say(msg);
    if (this.player.damage(1)) {
      this.over = true;
      events.push({ type: 'died' });
      this.say('Your resolve gutters out. Hades keeps you.');
    }
  }

  explodeGourd(g, events, at = null) {
    const center = at || g.pos;
    const i = this.gourds.indexOf(g);
    if (i !== -1) this.gourds.splice(i, 1);
    events.push({ type: 'explode', pos: center });
    const blast = [center, ...neighbors(center)];
    for (const h of blast) {
      if (this.board.terrain(h) === T.GRAVE) this.board.setTerrain(h, T.GROUND);
      const y = this.yokaiAt(h);
      if (y && !y.isBoss) this.killYokai(y, events, 'blast');
      if (eq(this.player.pos, h) && !this.over) this.hurtPlayer(events, 'The pitch-jar bursts over you.');
    }
  }

  // ---- turn resolution --------------------------------------------------------

  endTurn(events) {
    if (this.over || this.won) return;
    const p = this.player;

    // 2. Gourds explode.
    for (const g of [...this.gourds]) {
      g.fuse--;
      if (g.fuse <= 0) this.explodeGourd(g, events);
    }
    if (this.over) return;

    // 3 & 4. Yokai attack, then move (fixed order).
    runAttackPhase(this, events);
    if (this.over) return;
    runMovePhase(this, events);

    // Housekeeping.
    for (const y of this.yokai) {
      if (y.staggered > 0) y.staggered--;
      if (y.cooldown > 0) y.cooldown--;
      if (y.kind === 'tengu' && y.charge < y.data.leapCharge) y.charge++;
      y.acted = false;
    }
    this.board.tickIce((h) => this.occupied(h) || eq(this.player.pos, h));

    // Menos: courage under threat — being beside a foe draws fury from
    // danger (10/20); away from danger a slow trickle (5/10) so Diomedes is
    // never stranded without Athena's leap. Grounded-spear rates are doubled.
    const nearYokai = this.yokai.some((y) => y.tiles().some((t) => dist(t, p.pos) === 1));
    const regen = nearYokai ? 10 : 5;
    p.gainKi(p.sheathed ? regen * 2 : regen);

    // Aristeia streak.
    p.killStreak = this.killsThisTurn > 0 ? p.killStreak + 1 : 0;
    if (p.killStreak >= 3 && p.has('zanshin')) {
      p.ki = p.maxKi;
      if (!p.hasWakizashi) {
        p.hasWakizashi = true;
        this.wakizashiPos = null;
      }
      p.killStreak = 0;
      events.push({ type: 'zanshin', pos: p.pos });
      this.say('Aristeia. Menos returns; the javelin returns.');
    }

    // The Flight: pursuit troops pour from the gate you entered by.
    this.turn++;
    this.turnInLayer++;
    if (this.mode === 'flight' && this.turnInLayer % 4 === 0) {
      const alive = this.yokai.filter((y) => y.kind === 'shikome').length;
      if (alive < 8 && this.entryPos && !this.occupied(this.entryPos)
        && !eq(this.player.pos, this.entryPos) && this.board.walkable(this.entryPos)) {
        this.yokai.push(new Yokai('shikome', { ...this.entryPos }));
        events.push({ type: 'spawn', kind: 'shikome', pos: this.entryPos });
        this.say('A pursuit troop pours through the gate behind you.');
      }
    }
  }
}
