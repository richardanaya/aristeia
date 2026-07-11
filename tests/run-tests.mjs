// Node test suite for the ARISTEIA rules engine. Run: node tests/run-tests.mjs
import assert from 'node:assert/strict';

import { dist, dirBetween, ring, add, DIRS, eq } from '../js/hex.js';
import { Board, T } from '../js/board.js';
import { Game } from '../js/game.js';
import { Foe, Ares, resetIds } from '../js/entities.js';
import { applyBoon } from '../js/boons.js';

let passed = 0, failed = 0;
function test(name, fn) {
  try {
    resetIds();
    fn();
    passed++;
    console.log(`  ok  ${name}`);
  } catch (e) {
    failed++;
    console.error(`FAIL  ${name}\n      ${e.message}`);
  }
}

const g = (setup = {}) => {
  const game = new Game({ test: true, seed: 12345 });
  Object.assign(game, setup);
  return game;
};
const spawn = (game, kind, pos) => {
  const y = kind === 'ares' ? new Ares(pos) : new Foe(kind, pos);
  game.foes.push(y);
  return y;
};

// ---- hex math ----------------------------------------------------------------

test('hex distance', () => {
  assert.equal(dist({ q: 0, r: 0 }, { q: 2, r: -1 }), 2);
  assert.equal(dist({ q: 0, r: 0 }, { q: -1, r: -1 }), 2);
  assert.equal(dist({ q: 0, r: 0 }, { q: 3, r: 0 }), 3);
});

test('dirBetween finds straight lines only', () => {
  assert.deepEqual(dirBetween({ q: 0, r: 0 }, { q: 3, r: 0 }), { dir: 0, steps: 3 });
  assert.deepEqual(dirBetween({ q: 0, r: 0 }, { q: 0, r: 2 }), { dir: 5, steps: 2 });
  assert.equal(dirBetween({ q: 0, r: 0 }, { q: 2, r: -1 }), null);
});

test('ring has 6r tiles', () => {
  assert.equal(ring({ q: 0, r: 0 }, 1).length, 6);
  assert.equal(ring({ q: 0, r: 0 }, 2).length, 12);
});

// ---- cuts ---------------------------------------------------------------------

test('pass-cut: moving between two tiles adjacent to a foe kills it', () => {
  const game = g();
  game.player.spearGrounded = false;
  spawn(game, 'elite', { q: 1, r: -1 });
  const res = game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.foes.length, 0);
});

test('thrust: moving straight at a foe kills it', () => {
  const game = g();
  game.player.spearGrounded = false;
  spawn(game, 'elite', { q: 2, r: 0 });
  game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(game.foes.length, 0);
});

test('spear-sweep: grounded walk levels the spear only when the arc kills', () => {
  const game = g();
  assert.equal(game.player.spearGrounded, true);
  // Walk with no targets: stays grounded.
  game.act({ type: 'move', to: { q: 0, r: 1 } });
  assert.equal(game.player.spearGrounded, true);
  // Foe in the arc ahead: the sweep kills and the spear is levelled.
  spawn(game, 'elite', { q: 2, r: 1 });
  game.act({ type: 'move', to: { q: 1, r: 1 } });
  assert.equal(game.foes.length, 0);
  assert.equal(game.player.spearGrounded, false);
});

test('spear-sweep arc hits the off-axis arc tiles too', () => {
  const game = g();
  spawn(game, 'elite', { q: 2, r: -1 }); // rot(dir 0, +1) tile from destination (1,0)
  game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(game.foes.length, 0);
});

// ---- stance --------------------------------------------------------------------

test('grounding the spear staggers adjacent foes for one round', () => {
  const game = g();
  game.player.spearGrounded = false;
  const elite = spawn(game, 'elite', { q: 1, r: 0 });
  const res = game.act({ type: 'ground-spear' });
  assert.equal(res.ok, true);
  assert.equal(game.player.resolve, 3);       // staggered: no attack
  assert.deepEqual(elite.pos, { q: 1, r: 0 });  // staggered: no move
  assert.equal(game.player.spearGrounded, true);
});

test('menos regen: +10 beside a foe while levelled', () => {
  const game = g();
  game.player.boons.add('patient-spear');
  game.player.spearGrounded = false;
  game.player.menos = 0;
  const elite = spawn(game, 'elite', { q: 1, r: 0 });
  elite.staggered = 99; // hold still
  game.act({ type: 'wait' });
  assert.equal(game.player.menos, 10);
});

test('grounded-spear regen is doubled', () => {
  const game = g();
  game.player.boons.add('patient-spear');
  game.player.menos = 0;
  const elite = spawn(game, 'elite', { q: 1, r: 0 });
  elite.staggered = 99;
  game.act({ type: 'wait' });
  assert.equal(game.player.spearGrounded, true);
  assert.equal(game.player.menos, 20);
});

test('menos trickles back with no foes near (5 levelled, 10 grounded)', () => {
  const game = g();
  game.player.boons.add('patient-spear');
  game.player.spearGrounded = false;
  game.player.menos = 0;
  game.act({ type: 'wait' });
  assert.equal(game.player.menos, 5);
  game.player.spearGrounded = true;
  game.act({ type: 'wait' });
  assert.equal(game.player.menos, 15);
});

test('the boon event carries a position (frozen-canvas regression)', () => {
  const game = g();
  game.athenaStatuePos = { q: 1, r: 0 };
  const res = game.act({ type: 'sacrifice' });
  const pick = game.chooseBoon(res.offer[0]);
  const boonEvent = pick.events.find((e) => e.type === 'boon');
  assert.ok(boonEvent.pos && typeof boonEvent.pos.q === 'number');
});

// ---- flash step ------------------------------------------------------------------

test('flash step costs 50 menos and cuts what it vaults over', () => {
  const game = g();
  spawn(game, 'elite', { q: 1, r: 0 });
  const res = game.act({ type: 'move', to: { q: 2, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.foes.length, 0); // passCut via shared adjacency
  assert.equal(game.player.menos, 65);   // 100 - 50 leap + 10 kill + 5 trickle
});

test('flash step refused without menos', () => {
  const game = g();
  game.player.menos = 40;
  const res = game.act({ type: 'move', to: { q: 2, r: 0 } });
  assert.equal(res.ok, false);
});

// ---- push -----------------------------------------------------------------------

test('push into a burning-planks kills; costs 30 menos', () => {
  const game = g();
  game.board.setTerrain({ q: 2, r: 0 }, T.BURNING_PLANKS);
  spawn(game, 'elite', { q: 1, r: 0 });
  const res = game.act({ type: 'push', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.foes.length, 0);
  assert.equal(game.player.menos, 90); // -30 push, +10 kill, +10 spearGrounded trickle
});

test('elite that survives a push enrages', () => {
  const game = g();
  const elite = spawn(game, 'elite', { q: 1, r: 0 });
  game.act({ type: 'push', to: { q: 1, r: 0 } });
  assert.equal(elite.enraged, true);
  // Enraged elite moved 2 in the move phase but cannot enter the player tile:
  assert.equal(dist(elite.pos, game.player.pos), 1);
});

test('pushing one foe into another is blocked (no crush)', () => {
  const game = g();
  spawn(game, 'elite', { q: 1, r: 0 });
  const far = spawn(game, 'archer', { q: 2, r: 0 });
  far.staggered = 99;
  const res = game.act({ type: 'push', to: { q: 1, r: 0 } });
  assert.equal(res.ok, false);
  assert.equal(game.foes.length, 2);
});

test('a single move kills at most one foe', () => {
  const game = g();
  game.player.spearGrounded = false;
  spawn(game, 'elite', { q: 1, r: -1 });
  spawn(game, 'elite', { q: 0, r: 1 });
  // Geometry that would pass-cut both if multi-kill were allowed.
  const res = game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.foes.length, 1);
});

// ---- javelin --------------------------------------------------------------------

test('throw kills at range, drops the javelin, disables guard until pickup', () => {
  const game = g();
  const elite = spawn(game, 'elite', { q: 2, r: 0 });
  elite.staggered = 99;
  const res = game.act({ type: 'throw', to: { q: 2, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.foes.length, 0);
  assert.equal(game.player.hasJavelin, false);
  assert.deepEqual(game.javelinPos, { q: 2, r: 0 });
  const noDeflect = game.act({ type: 'guard' });
  assert.equal(noDeflect.ok, false);
  game.act({ type: 'move', to: { q: 1, r: 0 } });
  game.act({ type: 'move', to: { q: 2, r: 0 } });
  assert.equal(game.player.hasJavelin, true);
  assert.equal(game.javelinPos, null);
});

test('javelin requires a straight line', () => {
  const game = g();
  spawn(game, 'elite', { q: 2, r: -1 });
  const res = game.act({ type: 'throw', to: { q: 2, r: -1 } });
  assert.equal(res.ok, false);
  assert.match(res.reason, /straight line/);
});

test('blocking terrain stops a javelin cast', () => {
  const game = g();
  game.board.setTerrain({ q: 1, r: 0 }, T.STELE);
  spawn(game, 'elite', { q: 2, r: 0 });
  const res = game.act({ type: 'throw', to: { q: 2, r: 0 } });
  assert.equal(res.ok, false);
  assert.match(res.reason, /blocked/);
});

test('training final kill resolves an immediate pitch-jar hazard before victory', () => {
  const game = new Game({ test: true, training: true });
  game.mode = 'training';
  game.training = true;
  game.player.resolve = 1;
  game.pitchJars.push({ pos: { q: 1, r: 0 }, fuse: 1 });
  spawn(game, 'elite', { q: 2, r: 0 }).staggered = 99;
  game.act({ type: 'throw', to: { q: 2, r: 0 } });
  assert.equal(game.over, true);
  assert.equal(game.won, false);
});

test('guard reflects an arrow and kills the archer', () => {
  const game = g();
  spawn(game, 'archer', { q: 3, r: 0 });
  const res = game.act({ type: 'guard' });
  assert.equal(res.ok, true);
  assert.equal(game.foes.length, 0);
  assert.equal(game.player.resolve, 3);
});

test('an unguarded arrow hurts', () => {
  const game = g();
  game.player.boons.add('patient-spear');
  spawn(game, 'archer', { q: 3, r: 0 });
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 2);
});

// ---- pitchJars ------------------------------------------------------------------------

test('a pitchJar explodes after one player action, hurting the adjacent Diomedes', () => {
  const game = g();
  game.player.boons.add('patient-spear');
  game.pitchJars.push({ pos: { q: 1, r: 0 }, fuse: 1 });
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 2);
  assert.equal(game.pitchJars.length, 0);
});

test('pitch-jars can be pushed into a foe to detonate on it', () => {
  const game = g();
  const elite = spawn(game, 'elite', { q: 2, r: 0 });
  elite.staggered = 99;
  game.pitchJars.push({ pos: { q: 1, r: 0 }, fuse: 99 });
  game.act({ type: 'push', to: { q: 1, r: 0 } });
  assert.equal(game.foes.length, 0); // blast catches the elite
  assert.equal(game.pitchJars.length, 0);
});

// ---- fordGuard ---------------------------------------------------------------------------

test('performing a libation to a fordGuard staggers it for two rounds', () => {
  const game = g();
  game.player.boons.add('patient-spear');
  const fordGuard = spawn(game, 'fordGuard', { q: 1, r: 0 });
  const res = game.act({ type: 'libation', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 3); // still staggered by the libation
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 2); // recovered, strikes
});

test('marksman freezes water in her beam into an ice bridge', () => {
  const game = g();
  game.board.setTerrain({ q: 2, r: 0 }, T.WATER);
  spawn(game, 'marksman', { q: 4, r: 0 });
  game.player.boons.add('patient-spear');
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 2);
  assert.equal(game.board.terrain({ q: 2, r: 0 }), T.ICE);
});

// ---- Athena statues & boons -------------------------------------------------------------------

test('sacrificing offers boons; choosing one applies it and ends the turn', () => {
  const game = g();
  game.athenaStatuePos = { q: 1, r: 0 };
  const res = game.act({ type: 'sacrifice' });
  assert.equal(res.ok, true);
  assert.equal(res.offer.length, 3);
  const pick = game.chooseBoon(res.offer[0]);
  assert.equal(pick.ok, true);
  assert.equal(game.player.boons.has(res.offer[0]), true);
  assert.equal(game.athenaStatueUsed, true);
  assert.equal(game.act({ type: 'sacrifice' }).ok, false);
});

test('stepping away from an Athena statue does not re-roll a new offer', () => {
  const game = g();
  game.athenaStatuePos = { q: 1, r: 0 };
  const first = game.act({ type: 'sacrifice' });
  assert.equal(first.ok, true);
  const locked = [...first.offer].sort();
  game.chooseBoon(null); // step away
  assert.equal(game.athenaStatueUsed, false);
  const again = game.act({ type: 'sacrifice' });
  assert.equal(again.ok, true);
  assert.deepEqual([...again.offer].sort(), locked);
});

test('kleos-cost blessings reduce max resolve', () => {
  const game = g();
  game.player.maxResolve = 3;
  applyBoon(game.player, 'aristeia-boon');
  assert.equal(game.player.maxResolve, 2);
  assert.equal(game.player.kleosOffered, 1);
});

test('aristeia-boon: three killing turns restore menos and recall the javelin', () => {
  const game = g();
  game.player.boons.add('aristeia-boon');
  game.player.spearGrounded = false;
  game.player.killStreak = 2;
  game.player.hasJavelin = false;
  game.javelinPos = { q: 3, r: 0 };
  game.player.menos = 0;
  spawn(game, 'elite', { q: 1, r: -1 });
  game.act({ type: 'move', to: { q: 1, r: 0 } }); // passCut kill = third straight killing turn
  assert.equal(game.player.hasJavelin, true);
  assert.equal(game.player.menos, game.player.maxMenos);
});

// ---- structure ----------------------------------------------------------------------------

test('the exitMap refuses a Diomedes without his javelin', () => {
  const game = g();
  game.exitMapPos = { q: 1, r: 0 };
  game.player.hasJavelin = false;
  const res = game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(res.ok, false);
});

test('descent exitMap advances the rank', () => {
  const game = g();
  game.exitMapPos = { q: 1, r: 0 };
  const res = game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.rank, 2);
});

test('killing Ares drops kleos; taking it starts the flight', () => {
  const game = g({ rank: 8 });
  const boss = spawn(game, 'ares', { q: 0, r: 2 });
  boss.staggered = 99;
  // Strike the weeping joint with a throw.
  const joint = boss.openWoundTile();
  game.player.pos = add(joint, { q: 0, r: -1 });
  const res = game.act({ type: 'throw', to: joint });
  assert.equal(res.ok, true, res.reason);
  assert.equal(game.foes.length, 0);
  assert.deepEqual(game.kleosPos, { q: 0, r: 2 });
  // Walk to the kleos (retrieve javelin is elsewhere; kleos pickup still works).
  game.player.pos = { q: 0, r: 1 };
  game.act({ type: 'move', to: { q: 0, r: 2 } });
  assert.equal(game.player.hasKleos, true);
  assert.equal(game.mode, 'flight');
});

test('a throw at the boss body glances off', () => {
  const game = g();
  const boss = spawn(game, 'ares', { q: 0, r: 2 });
  const body = boss.tiles().find((t) => !eq(t, boss.openWoundTile()) && dist(t, game.player.pos) <= 2);
  const res = game.act({ type: 'throw', to: body });
  assert.equal(res.ok, false);
});

test('flight to rank 1 exitMap wins the run', () => {
  const game = g();
  game.mode = 'flight';
  game.rank = 1;
  game.player.hasKleos = true;
  game.exitMapPos = { q: 1, r: 0 };
  game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(game.won, true);
});

test('pursuitTroop spawn from the entry exitMap during the flight', () => {
  const game = g();
  game.mode = 'flight';
  game.entryPos = { q: 0, r: 4 };
  game.player.boons.add('patient-spear');
  for (let i = 0; i < 4; i++) game.act({ type: 'wait' });
  assert.equal(game.foes.filter((y) => y.kind === 'pursuitTroop').length, 1);
});

test('death ends the run', () => {
  const game = g();
  game.player.resolve = 1;
  game.player.spearGrounded = false;
  spawn(game, 'archer', { q: 3, r: 0 });
  game.act({ type: 'ground-spear' }); // staggers nothing at range; archer fires
  assert.equal(game.over, true);
});

test('a full seeded run generates 8 descendable ranks', () => {
  const game = new Game({ seed: 777 });
  assert.equal(game.rank, 1);
  for (let i = 1; i < 8; i++) {
    game.foes = []; // clear the field; we only test structure here
    game.pitchJars = [];
    game.player.pos = [...game.board.coords()].find((h) =>
      dist(h, game.exitMapPos) === 1 && game.board.walkable(h));
    const res = game.act({ type: 'move', to: game.exitMapPos });
    assert.equal(res.ok, true, `rank ${i}: ${res.reason}`);
    assert.equal(game.rank, i + 1);
  }
  const boss = game.foes.find((y) => y.isBoss);
  assert.ok(boss, 'rank 8 has a ares');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
