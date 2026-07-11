// Game: the full rules engine. Deterministic, DOM-free, testable.
//
// Turn order (inherited from Hoplite):
//   1. Diomedes acts  2. pitch-jars explode  3. foes attack  4. foes move

import { DIRS, add, scale, eq, dist, neighbors, dirBetween, between, rot } from './hex.js';
import { Board, T } from './board.js';
import { Player, Foe, Ares } from './entities.js';
import { offerBoons, applyBoon, BOONS } from './boons.js';
import { RNG } from './rng.js';
import { generateRank } from './levelgen.js';
import { runAttackPhase, runMovePhase } from './ai.js';
import { applyLesson } from './training.js';

export const MAX_RANK = 8;
export const LEAP_COST = 50;
export const PUSH_COST = 30;

export class Game {
  constructor({
    seed = (Date.now() >>> 0),
    test = false,
    radius = 4,
    training = false,
    trainingLesson = 0,
  } = {}) {
    this.rng = new RNG(seed);
    this.seed = seed;
    this.rank = 1;
    this.mode = 'descent'; // 'descent' | 'flight' | 'training'
    this.over = false;
    this.won = false;
    this.turn = 0;
    this.turnInRank = 0;
    this.log = [];
    this.pendingOffer = null; // boon ids while a athenaStatue choice is open
    this.athenaStatueOffer = null;  // locked once first used; re-open shows same choices
    this.training = training;
    this.trainingLesson = trainingLesson;
    this.trainingTitle = null;
    this.trainingHowto = null;

    if (test) {
      this.board = Board.hexagon(radius);
      this.player = new Player({ q: 0, r: 0 });
      this.foes = [];
      this.pitchJars = [];       // {pos, fuse}
      this.javelinPos = null;
      this.kleosPos = null;
      this.exitMapPos = null;
      this.entryPos = { q: 0, r: 0 };
      this.athenaStatuePos = null;
      this.athenaStatueUsed = false;
    } else if (training) {
      this.player = new Player({ q: 0, r: 0 });
      this.loadTrainingLesson(trainingLesson);
    } else {
      this.player = new Player({ q: 0, r: 0 });
      this.loadRank(1, 'descent');
    }
  }

  loadTrainingLesson(index) {
    applyLesson(this, index);
  }

  // ---- rank transitions -------------------------------------------------

  loadRank(index, mode) {
    const gen = generateRank(this.rng, index, mode);
    this.board = gen.board;
    this.player.pos = gen.start;
    this.exitMapPos = gen.exitMap;
    this.athenaStatuePos = gen.athenaStatue;
    this.entryPos = gen.start;
    this.foes = gen.foes;
    this.pitchJars = [];
    this.javelinPos = null;
    this.kleosPos = null;
    this.athenaStatueUsed = false;
    this.athenaStatueOffer = null;
    this.rank = index;
    this.mode = mode;
    this.turnInRank = 0;
    this.player.menos = this.player.maxMenos;
    this.player.guarding = false;
    this.say(mode === 'flight'
      ? `Trojan line ${index}. Fight toward the ships.`
      : `Trojan line ${index}. Advance.`);
  }

  // ---- queries -------------------------------------------------------------

  say(msg) { this.log.push(msg); if (this.log.length > 60) this.log.shift(); }

  foeAt(h) {
    return this.foes.find((y) => y.tiles().some((t) => eq(t, h))) || null;
  }

  pitchJarAt(h) { return this.pitchJars.find((g) => eq(g.pos, h)) || null; }

  occupied(h) {
    return eq(this.player.pos, h) || !!this.foeAt(h) || !!this.pitchJarAt(h)
      || (this.athenaStatuePos && eq(this.athenaStatuePos, h));
  }

  // Can Diomedes end a move on this tile?
  canStand(h) {
    if (!this.board.has(h) || !this.board.walkable(h)) return false;
    if (this.foeAt(h) || this.pitchJarAt(h)) return false;
    if (this.athenaStatuePos && eq(this.athenaStatuePos, h)) return false;
    return true;
  }

  exitMapActive() {
    if (this.mode === 'training') return this.foes.length === 0;
    if (this.mode === 'descent' && this.rank === MAX_RANK) return this.player.hasKleos;
    return true;
  }

  // Classify a prospective move. Returns {ok, kind, cost, reason}.
  moveInfo(to) {
    const d = dist(this.player.pos, to);
    if (d === 0) return { ok: false, reason: 'You are here.' };
    if (!this.canStand(to)) return { ok: false, reason: 'You cannot stand there.' };
    if (this.exitMapPos && eq(to, this.exitMapPos)) {
      if (!this.player.hasJavelin) return { ok: false, reason: 'You will not leave your javelin on the plain.' };
      if (!this.exitMapActive()) {
        return {
          ok: false,
          reason: this.mode === 'training'
            ? 'Clear the drill first.'
            : 'The way is sealed. Reclaim your kleos first.',
        };
      }
    }
    if (d === 1) return { ok: true, kind: 'walk', cost: 0 };
    if (d <= this.player.leapRange()) {
      if (this.player.menos < LEAP_COST) return { ok: false, reason: 'Not enough menos for Athena\'s leap.' };
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

  /** Pure: can the javelin strike this tile right now? */
  throwInfo(to) {
    const p = this.player;
    if (!p.hasJavelin) return { ok: false, reason: 'Your javelin lies elsewhere.' };
    const d = dist(p.pos, to);
    if (d < 1) return { ok: false, reason: 'You are here.' };
    if (d > p.throwRange()) return { ok: false, reason: 'Beyond your throw.' };
    if (!dirBetween(p.pos, to)) return { ok: false, reason: 'Throw the javelin in a straight line.' };
    for (const tile of between(p.pos, to)) {
      if (this.board.blocksShots(tile) || (this.athenaStatuePos && eq(this.athenaStatuePos, tile))
        || this.foeAt(tile)) {
        return { ok: false, reason: 'The javelin line is blocked.' };
      }
    }
    const y = this.foeAt(to);
    if (!y) return { ok: false, reason: 'Nothing there to strike.' };
    if (y.isBoss && !eq(y.openWoundTile(), to)) {
      return { ok: false, reason: 'Bronze glances off the god. Strike the opening lit by Athena.' };
    }
    return { ok: true, kind: 'throw', kills: [y] };
  }

  previewThrow(to) {
    return this.throwInfo(to);
  }

  /** Valid javelin target tiles (foe hexes in range). */
  legalThrows() {
    const out = [];
    if (!this.player.hasJavelin) return out;
    const range = this.player.throwRange();
    const seen = new Set();
    for (const y of this.foes) {
      for (const t of y.tiles()) {
        const key = `${t.q},${t.r}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (dist(this.player.pos, t) > range) continue;
        const info = this.throwInfo(t);
        if (info.ok) out.push({ to: t, foes: y });
      }
    }
    return out;
  }

  /** Every board tile within javelin range (for range envelope preview). */
  throwRangeTiles() {
    const out = [];
    if (!this.player.hasJavelin) return out;
    const range = this.player.throwRange();
    for (const h of this.board.coords()) {
      const d = dist(this.player.pos, h);
      if (d >= 1 && d <= range) out.push(h);
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
      case 'elite': case 'scout': case 'fordGuard': case 'pursuitTroop': {
        for (const n of neighbors(y.pos)) push(n);
        break;
      }
      case 'archer': {
        for (let d = 0; d < 6; d++) {
          for (let step = y.data.shotMin; step <= y.data.shotMax; step++) {
            const h = add(y.pos, scale(DIRS[d], step));
            if (!this.board.has(h)) break;
            if (this.board.blocksShots(h)) break;
            if (this.athenaStatuePos && eq(this.athenaStatuePos, h)) break;
            if (this.foeAt(h) && !eq(h, this.player.pos)) break;
            push(h);
          }
        }
        break;
      }
      case 'marksman': {
        if (y.cooldown > 0) break;
        for (let d = 0; d < 6; d++) {
          for (let step = 1; step <= y.data.beamRange; step++) {
            const h = add(y.pos, scale(DIRS[d], step));
            if (!this.board.has(h)) break;
            if (this.board.blocksShots(h)) break;
            if (this.athenaStatuePos && eq(this.athenaStatuePos, h)) break;
            if (this.foeAt(h) && !eq(h, this.player.pos)) break;
            push(h);
          }
        }
        break;
      }
      case 'sapper': {
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
      case 'ares': {
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

  // Kills a move from->to would cause (at most one foe). Stance / spear-sweep rules apply.
  computeMoveKills(from, to) {
    const p = this.player;
    const db = dirBetween(from, to);
    const kills = new Map(); // id -> foes
    // One cut per move — never multi-kill with a single step.
    const addKill = (y) => {
      if (!y || kills.size > 0) return;
      kills.set(y.id, y);
    };

    const bossHit = (tile) => {
      const y = this.foeAt(tile);
      return (y && y.isBoss && eq(y.openWoundTile(), tile)) ? y : null;
    };
    const cutAt = (tile) => {
      const y = this.foeAt(tile);
      if (!y) return null;
      return y.isBoss ? bossHit(tile) : y;
    };

    // Pass-cut cut: any foes adjacent to both the departed and arrived tile.
    const passCut = this.foes.filter((y) => !y.isBoss
      && dist(y.pos, from) === 1 && dist(y.pos, to) === 1);

    // Thrust thrust: straight moves strike the tile(s) beyond the destination.
    const thrustTiles = [];
    if (db) {
      thrustTiles.push(add(to, DIRS[db.dir]));
      if (p.has('piercing-thrust')) thrustTiles.push(add(to, scale(DIRS[db.dir], 2)));
    }

    // Spear-sweep arc: first strike out of the sheath sweeps the tiles ahead.
    const arcTiles = [];
    if (p.spearGrounded && db) {
      const spread = p.has('wide-sweep') ? [0, 1, -1, 2, -2] : [0, 1, -1];
      for (const s of spread) arcTiles.push(add(to, DIRS[rot(db.dir, s)]));
    }

    let draws = false;
    if (!p.spearGrounded) {
      for (const y of passCut) addKill(y);
      for (const t of thrustTiles) addKill(cutAt(t));
    } else {
      // SpearGrounded: the sword stays spearGrounded unless the draw would spill blood.
      const found = new Map();
      for (const y of passCut) found.set(y.id, y);
      for (const t of [...thrustTiles, ...arcTiles]) {
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
    p.guarding = false; // water stance lasts exactly one round
    this.killsThisTurn = 0;

    let handled;
    switch (action.type) {
      case 'move': handled = this.doMove(action.to, events); break;
      case 'ground-spear': handled = this.groundSpear(events); break;
      case 'push': handled = this.doPush(action.to, events); break;
      case 'throw': handled = this.doThrow(action.to, events); break;
      case 'guard': handled = this.guard(events); break;
      case 'libation': handled = this.performLibation(action.to, events); break;
      case 'sacrifice': handled = this.sacrifice(events); break;
      case 'wait':
        handled = p.has('patient-spear')
          ? { ok: true }
          : { ok: false, reason: 'You have not learned Odyssean patience.' };
        break;
      default: handled = { ok: false, reason: 'Unknown action.' };
    }

    if (!handled.ok) return { ...handled, events: [] };
    if (handled.rankChanged || handled.offer) {
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

    if (info.kind === 'leap') p.menos -= LEAP_COST;
    p.pos = to;
    events.push({ type: 'move', from, to, leap: info.kind === 'leap' });

    if (draws) {
      p.spearGrounded = false;
      events.push({ type: 'spear-sweep', pos: to, dir });
    }
    for (const y of kills) this.killFoe(y, events);

    if (info.kind === 'leap' && p.has('thunderclap')) {
      this.staggerAround(to, 1, events);
    }

    if (this.board.terrain(to) === T.FIRE) {
      this.hurtPlayer(events, 'Burning ship-planks sear you.');
      if (this.over) return { ok: true };
    }

    // Pickups.
    if (this.javelinPos && eq(this.javelinPos, to)) {
      this.javelinPos = null;
      p.hasJavelin = true;
      events.push({ type: 'pickup', what: 'javelin', pos: to });
      this.say('You reclaim your javelin.');
    }
    if (this.kleosPos && eq(this.kleosPos, to)) {
      this.kleosPos = null;
      p.hasKleos = true;
      this.mode = 'flight';
      events.push({ type: 'pickup', what: 'kleos', pos: to });
      this.say('Your name blazes through the plain once more. Every Trojan turns toward it. Fight for the ships.');
    }

    // Gate.
    if (this.exitMapPos && eq(to, this.exitMapPos)) {
      return this.passExitMap(events);
    }
    return { ok: true };
  }

  passExitMap(events) {
    // Training has no exitMap — puzzles end when the yard is clear.
    if (this.mode === 'training') {
      return { ok: false, reason: 'Clear the drill first.' };
    }
    if (this.mode === 'descent') {
      this.loadRank(this.rank + 1, 'descent');
      events.push({ type: 'rank', index: this.rank, mode: this.mode });
      return { ok: true, rankChanged: true };
    }
    // Flight: climbing back out.
    if (this.rank === 1) {
      this.won = true;
      this.say('The ships stand before you. Your name is your own again.');
      events.push({ type: 'won' });
      return { ok: true, rankChanged: true };
    }
    this.loadRank(this.rank - 1, 'flight');
    events.push({ type: 'rank', index: this.rank, mode: this.mode });
    return { ok: true, rankChanged: true };
  }

  groundSpear(events) {
    const p = this.player;
    if (p.spearGrounded) return { ok: false, reason: 'Your spear is already grounded.' };
    p.spearGrounded = true;
    this.staggerAround(p.pos, 1, events);
    events.push({ type: 'ground-spear', pos: p.pos });
    this.say('You plant the spear. The stillness staggers those near you.');
    return { ok: true };
  }

  staggerAround(pos, turns, events) {
    for (const y of this.foes) {
      if (y.tiles().some((t) => dist(t, pos) === 1)) {
        y.staggered = Math.max(y.staggered, turns + 1); // survives this turn's decrement
        events.push({ type: 'stagger', pos: y.pos });
      }
    }
  }

  doPush(to, events) {
    const p = this.player;
    if (dist(p.pos, to) !== 1) return { ok: false, reason: 'You can only push what is beside you.' };
    if (p.menos < PUSH_COST) return { ok: false, reason: 'Not enough menos.' };
    const db = dirBetween(p.pos, to);
    const dest = add(to, DIRS[db.dir]);
    const target = this.foeAt(to);
    const pitchJar = this.pitchJarAt(to);
    if (target && target.isBoss) return { ok: false, reason: 'Ares does not yield to a shield-bash.' };
    if (!target && !pitchJar) return { ok: false, reason: 'Nothing there to push.' };

    // Bash never crushes two living foes into each other — blocked by body.
    if (target && this.foeAt(dest)) {
      return { ok: false, reason: 'No room — another body blocks the shove.' };
    }

    p.menos -= PUSH_COST;
    events.push({ type: 'push', from: to, to: dest });

    if (pitchJar) {
      const blocked = !this.board.has(dest) || !this.board.walkable(dest)
        || this.occupied(dest);
      if (blocked) this.explodePitchJar(pitchJar, events, dest);
      else pitchJar.pos = dest;
      return { ok: true };
    }

    const terr = this.board.terrain(dest);
    const survivable = this.board.foeWalkable(dest, target.kind)
      && !this.occupied(dest) && !(this.athenaStatuePos && eq(this.athenaStatuePos, dest));
    if (!survivable) {
      // Into fire, ditch, stele, or board edge — only the shoved foe dies.
      this.killFoe(target, events, terr === T.BURNING_PLANKS ? 'pyre' : 'crush');
    } else {
      target.pos = dest;
      if (target.kind === 'elite') {
        target.enraged = true;
        events.push({ type: 'enrage', pos: dest });
        this.say('The elite howls — you have only angered him.');
      }
    }
    return { ok: true };
  }

  doThrow(to, events) {
    const info = this.throwInfo(to);
    if (!info.ok) return info;
    const p = this.player;
    const y = info.kills[0];
    p.hasJavelin = false;
    const landing = y.isBoss ? to : { ...y.pos };
    this.killFoe(y, events);
    this.javelinPos = this.board.walkable(landing) ? landing : { ...p.pos };
    events.push({ type: 'throw', from: p.pos, to, landing: this.javelinPos });
    return { ok: true };
  }

  guard(events) {
    const p = this.player;
    if (!p.hasJavelin) return { ok: false, reason: 'Recover your javelin before raising the aspis.' };
    p.guarding = true;
    events.push({ type: 'guard-stance', pos: p.pos });
    this.say('You raise the aspis. Athena steadies your arm.');
    return { ok: true };
  }

  performLibation(to, events) {
    const y = this.foeAt(to);
    if (!y || y.kind !== 'fordGuard' || dist(this.player.pos, to) !== 1) {
      return { ok: false, reason: 'Only an adjacent ford guard answers a libation.' };
    }
    y.staggered = 2; // answers the rite, loses footing: helpless this round and the next
    events.push({ type: 'libation', pos: y.pos });
    this.say('You pour a libation. The ford guard answers — and loses his footing.');
    return { ok: true };
  }

  sacrifice(events) {
    if (!this.athenaStatuePos || dist(this.player.pos, this.athenaStatuePos) !== 1) {
      return { ok: false, reason: 'No altar within reach.' };
    }
    if (this.athenaStatueUsed) return { ok: false, reason: 'The gods here have already spoken.' };
    // Lock the offer on first sacrifice so stepping away cannot re-roll new boons.
    if (!this.athenaStatueOffer) {
      const offer = offerBoons(this.player, this.rng);
      if (offer.length === 0) return { ok: false, reason: 'The gods are silent.' };
      this.athenaStatueOffer = offer;
    }
    this.pendingOffer = this.athenaStatueOffer;
    events.push({ type: 'sacrifice', pos: this.athenaStatuePos });
    return { ok: true, offer: this.athenaStatueOffer };
  }

  // Complete (or cancel) an altar sacrifice. Choosing ends the turn.
  chooseBoon(id) {
    if (!this.pendingOffer) return { ok: false, reason: 'No offer is open.' };
    if (id === null) { this.pendingOffer = null; return { ok: true, cancelled: true, events: [] }; }
    if (!this.pendingOffer.includes(id)) return { ok: false, reason: 'That was not offered.' };
    applyBoon(this.player, id);
    this.pendingOffer = null;
    this.athenaStatueUsed = true;
    this.athenaStatueOffer = null;
    this.say(`The gods grant you: ${BOONS[id]?.name || id.replace(/-/g, ' ')}.`);
    const events = [{ type: 'boon', id, pos: { ...this.player.pos } }];
    this.endTurn(events);
    return { ok: true, events };
  }

  // ---- kills & damage --------------------------------------------------------

  killFoe(y, events, cause = 'blade') {
    const idx = this.foes.indexOf(y);
    if (idx === -1) return;
    this.foes.splice(idx, 1);
    this.killsThisTurn++;
    this.player.gainMenos(10 + (this.player.has('red-thirst') ? 6 : 0));
    events.push({ type: 'kill', pos: y.pos, kind: y.kind, cause });
    if (y.isBoss) {
      this.kleosPos = { ...y.pos };
      events.push({ type: 'kleos-drop', pos: y.pos });
      this.say('Bronze bites the god. Ares roars and flees for Olympus.');
    }
  }

  hurtPlayer(events, msg) {
    events.push({ type: 'damage', pos: this.player.pos });
    if (msg) this.say(msg);
    if (this.player.damage(1)) {
      this.over = true;
      events.push({ type: 'died' });
      if (this.training || this.mode === 'training') {
        this.say('Achilles: “Rise. Read the distance, and begin again.”');
      } else {
        this.say('Your resolve gutters out. Hades keeps you.');
      }
    }
  }

  explodePitchJar(g, events, at = null) {
    const center = at || g.pos;
    const i = this.pitchJars.indexOf(g);
    if (i !== -1) this.pitchJars.splice(i, 1);
    events.push({ type: 'explode', pos: center });
    const blast = [center, ...neighbors(center)];
    for (const h of blast) {
      if (this.board.terrain(h) === T.STELE) this.board.setTerrain(h, T.GROUND);
      const y = this.foeAt(h);
      if (y && !y.isBoss) this.killFoe(y, events, 'blast');
      if (eq(this.player.pos, h) && !this.over) this.hurtPlayer(events, 'The pitch-jar bursts over you.');
    }
  }

  // ---- turn resolution --------------------------------------------------------

  endTurn(events) {
    if (this.over) return;
    const p = this.player;

    // 2. PitchJars explode.
    for (const g of [...this.pitchJars]) {
      g.fuse--;
      if (g.fuse <= 0) this.explodePitchJar(g, events);
    }
    if (this.over) return;
    if (this.mode === 'training' && this.foes.length === 0) {
      this.won = true;
      this.say('Achilles: “Cleanly done.”');
      events.push({ type: 'won' });
      return;
    }

    // 3 & 4. Foe attack, then move (fixed order).
    runAttackPhase(this, events);
    if (this.over || this.won) return;
    runMovePhase(this, events);
    if (this.over || this.won) return;

    // Housekeeping.
    for (const y of this.foes) {
      if (y.staggered > 0) y.staggered--;
      if (y.cooldown > 0) y.cooldown--;
      if (y.kind === 'scout' && y.charge < y.data.leapCharge) y.charge++;
      y.acted = false;
    }
    this.board.tickIce((h) => this.occupied(h) || eq(this.player.pos, h));

    // Menos: courage under threat — being beside a foe draws fury from
    // danger (10/20); away from danger a slow trickle (5/10) so Diomedes is
    // never stranded without Athena's leap. Grounded-spear rates are doubled.
    const nearFoe = this.foes.some((y) => y.tiles().some((t) => dist(t, p.pos) === 1));
    const regen = nearFoe ? 10 : 5;
    p.gainMenos(p.spearGrounded ? regen * 2 : regen);

    // Aristeia streak.
    p.killStreak = this.killsThisTurn > 0 ? p.killStreak + 1 : 0;
    if (p.killStreak >= 3 && p.has('aristeia-boon')) {
      p.menos = p.maxMenos;
      if (!p.hasJavelin) {
        p.hasJavelin = true;
        this.javelinPos = null;
      }
      p.killStreak = 0;
      events.push({ type: 'aristeia-boon', pos: p.pos });
      this.say('Aristeia. Menos returns; the javelin returns.');
    }

    // The Flight: pursuit troops pour from the exitMap you entered by.
    this.turn++;
    this.turnInRank++;
    if (this.mode === 'flight' && this.turnInRank % 4 === 0) {
      const alive = this.foes.filter((y) => y.kind === 'pursuitTroop').length;
      if (alive < 8 && this.entryPos && !this.occupied(this.entryPos)
        && !eq(this.player.pos, this.entryPos) && this.board.walkable(this.entryPos)) {
        this.foes.push(new Foe('pursuitTroop', { ...this.entryPos }));
        events.push({ type: 'spawn', kind: 'pursuitTroop', pos: this.entryPos });
        this.say('A pursuing spearman enters the line behind you.');
      }
    }
  }
}
