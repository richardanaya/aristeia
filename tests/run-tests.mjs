// Node test suite for the ARISTEIA rules engine. Run: node tests/run-tests.mjs
import assert from 'node:assert/strict';

import { dist, dirBetween, ring, add, DIRS, eq } from '../js/hex.js';
import { Board, T } from '../js/board.js';
import { Game } from '../js/game.js';
import { Yokai, Gashadokuro, resetIds } from '../js/entities.js';
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
  const y = kind === 'gashadokuro' ? new Gashadokuro(pos) : new Yokai(kind, pos);
  game.yokai.push(y);
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

test('kesa cut: moving between two tiles adjacent to a yokai kills it', () => {
  const game = g();
  game.player.sheathed = false;
  spawn(game, 'oni', { q: 1, r: -1 });
  const res = game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.yokai.length, 0);
});

test('tsuki thrust: moving straight at a yokai kills it', () => {
  const game = g();
  game.player.sheathed = false;
  spawn(game, 'oni', { q: 2, r: 0 });
  game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(game.yokai.length, 0);
});

test('iai: sheathed walk draws only when the arc would kill', () => {
  const game = g();
  assert.equal(game.player.sheathed, true);
  // Walk with no targets: stays sheathed.
  game.act({ type: 'move', to: { q: 0, r: 1 } });
  assert.equal(game.player.sheathed, true);
  // Enemy in the arc ahead: the draw-cut kills and the sword is out.
  spawn(game, 'oni', { q: 2, r: 1 });
  game.act({ type: 'move', to: { q: 1, r: 1 } });
  assert.equal(game.yokai.length, 0);
  assert.equal(game.player.sheathed, false);
});

test('iai arc hits the off-axis arc tiles too', () => {
  const game = g();
  spawn(game, 'oni', { q: 2, r: -1 }); // rot(dir 0, +1) tile from destination (1,0)
  game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(game.yokai.length, 0);
});

// ---- stance --------------------------------------------------------------------

test('sheathing staggers adjacent yokai for one round', () => {
  const game = g();
  game.player.sheathed = false;
  const oni = spawn(game, 'oni', { q: 1, r: 0 });
  const res = game.act({ type: 'sheathe' });
  assert.equal(res.ok, true);
  assert.equal(game.player.resolve, 3);       // staggered: no attack
  assert.deepEqual(oni.pos, { q: 1, r: 0 });  // staggered: no move
  assert.equal(game.player.sheathed, true);
});

test('ki regen: +10 beside a yokai while drawn', () => {
  const game = g();
  game.player.boons.add('patient-blade');
  game.player.sheathed = false;
  game.player.ki = 0;
  const oni = spawn(game, 'oni', { q: 1, r: 0 });
  oni.staggered = 99; // hold still
  game.act({ type: 'wait' });
  assert.equal(game.player.ki, 10);
});

test('sheathed regen is doubled', () => {
  const game = g();
  game.player.boons.add('patient-blade');
  game.player.ki = 0;
  const oni = spawn(game, 'oni', { q: 1, r: 0 });
  oni.staggered = 99;
  game.act({ type: 'wait' });
  assert.equal(game.player.sheathed, true);
  assert.equal(game.player.ki, 20);
});

test('ki trickles back even with no yokai near (5 drawn, 10 sheathed)', () => {
  const game = g();
  game.player.boons.add('patient-blade');
  game.player.sheathed = false;
  game.player.ki = 0;
  game.act({ type: 'wait' });
  assert.equal(game.player.ki, 5);
  game.player.sheathed = true;
  game.act({ type: 'wait' });
  assert.equal(game.player.ki, 15);
});

test('the boon event carries a position (frozen-canvas regression)', () => {
  const game = g();
  game.shrinePos = { q: 1, r: 0 };
  const res = game.act({ type: 'pray' });
  const pick = game.chooseBoon(res.offer[0]);
  const boonEvent = pick.events.find((e) => e.type === 'boon');
  assert.ok(boonEvent.pos && typeof boonEvent.pos.q === 'number');
});

// ---- flash step ------------------------------------------------------------------

test('flash step costs 50 ki and cuts what it vaults over', () => {
  const game = g();
  spawn(game, 'oni', { q: 1, r: 0 });
  const res = game.act({ type: 'move', to: { q: 2, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.yokai.length, 0); // kesa via shared adjacency
  assert.equal(game.player.ki, 65);   // 100 - 50 leap + 10 kill + 5 trickle
});

test('flash step refused without ki', () => {
  const game = g();
  game.player.ki = 40;
  const res = game.act({ type: 'move', to: { q: 2, r: 0 } });
  assert.equal(res.ok, false);
});

// ---- push -----------------------------------------------------------------------

test('push into a chasm kills; costs 30 ki', () => {
  const game = g();
  game.board.setTerrain({ q: 2, r: 0 }, T.CHASM);
  spawn(game, 'oni', { q: 1, r: 0 });
  const res = game.act({ type: 'push', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.yokai.length, 0);
  assert.equal(game.player.ki, 90); // -30 push, +10 kill, +10 sheathed trickle
});

test('oni that survives a push enrages', () => {
  const game = g();
  const oni = spawn(game, 'oni', { q: 1, r: 0 });
  game.act({ type: 'push', to: { q: 1, r: 0 } });
  assert.equal(oni.enraged, true);
  // Enraged oni moved 2 in the move phase but cannot enter the player tile:
  assert.equal(dist(oni.pos, game.player.pos), 1);
});

test('pushing one yokai into another breaks both', () => {
  const game = g();
  spawn(game, 'oni', { q: 1, r: 0 });
  const far = spawn(game, 'archer', { q: 2, r: 0 });
  far.staggered = 99;
  game.act({ type: 'push', to: { q: 1, r: 0 } });
  assert.equal(game.yokai.length, 0);
});

// ---- wakizashi --------------------------------------------------------------------

test('throw kills at range, drops the blade, disables deflect until pickup', () => {
  const game = g();
  const oni = spawn(game, 'oni', { q: 2, r: 0 });
  oni.staggered = 99;
  const res = game.act({ type: 'throw', to: { q: 2, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.yokai.length, 0);
  assert.equal(game.player.hasWakizashi, false);
  assert.deepEqual(game.wakizashiPos, { q: 2, r: 0 });
  const noDeflect = game.act({ type: 'deflect' });
  assert.equal(noDeflect.ok, false);
  game.act({ type: 'move', to: { q: 1, r: 0 } });
  game.act({ type: 'move', to: { q: 2, r: 0 } });
  assert.equal(game.player.hasWakizashi, true);
  assert.equal(game.wakizashiPos, null);
});

test('deflect reflects an arrow and kills the archer', () => {
  const game = g();
  spawn(game, 'archer', { q: 3, r: 0 });
  const res = game.act({ type: 'deflect' });
  assert.equal(res.ok, true);
  assert.equal(game.yokai.length, 0);
  assert.equal(game.player.resolve, 3);
});

test('an undeflected arrow hurts', () => {
  const game = g();
  game.player.boons.add('patient-blade');
  spawn(game, 'archer', { q: 3, r: 0 });
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 2);
});

// ---- gourds ------------------------------------------------------------------------

test('a gourd explodes after one player action, hurting the adjacent ronin', () => {
  const game = g();
  game.player.boons.add('patient-blade');
  game.gourds.push({ pos: { q: 1, r: 0 }, fuse: 1 });
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 2);
  assert.equal(game.gourds.length, 0);
});

test('gourds can be pushed into a yokai to detonate on it', () => {
  const game = g();
  const oni = spawn(game, 'oni', { q: 2, r: 0 });
  oni.staggered = 99;
  game.gourds.push({ pos: { q: 1, r: 0 }, fuse: 99 });
  game.act({ type: 'push', to: { q: 1, r: 0 } });
  assert.equal(game.yokai.length, 0); // blast catches the oni
  assert.equal(game.gourds.length, 0);
});

// ---- kappa ---------------------------------------------------------------------------

test('bowing to a kappa staggers it for two rounds', () => {
  const game = g();
  game.player.boons.add('patient-blade');
  const kappa = spawn(game, 'kappa', { q: 1, r: 0 });
  const res = game.act({ type: 'bow', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 3); // still bowing
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 2); // recovered, strikes
});

test('yuki-onna freezes water in her beam into an ice bridge', () => {
  const game = g();
  game.board.setTerrain({ q: 2, r: 0 }, T.WATER);
  spawn(game, 'yukionna', { q: 4, r: 0 });
  game.player.boons.add('patient-blade');
  game.act({ type: 'wait' });
  assert.equal(game.player.resolve, 2);
  assert.equal(game.board.terrain({ q: 2, r: 0 }), T.ICE);
});

// ---- shrines & boons -------------------------------------------------------------------

test('praying offers boons; choosing one applies it and ends the turn', () => {
  const game = g();
  game.shrinePos = { q: 1, r: 0 };
  const res = game.act({ type: 'pray' });
  assert.equal(res.ok, true);
  assert.equal(res.offer.length, 3);
  const pick = game.chooseBoon(res.offer[0]);
  assert.equal(pick.ok, true);
  assert.equal(game.player.boons.has(res.offer[0]), true);
  assert.equal(game.shrineUsed, true);
  assert.equal(game.act({ type: 'pray' }).ok, false);
});

test('stepping away from a shrine does not re-roll a new offer', () => {
  const game = g();
  game.shrinePos = { q: 1, r: 0 };
  const first = game.act({ type: 'pray' });
  assert.equal(first.ok, true);
  const locked = [...first.offer].sort();
  game.chooseBoon(null); // step away
  assert.equal(game.shrineUsed, false);
  const again = game.act({ type: 'pray' });
  assert.equal(again.ok, true);
  assert.deepEqual([...again.offer].sort(), locked);
});

test('memory boons cost max resolve', () => {
  const game = g();
  game.player.maxResolve = 3;
  applyBoon(game.player, 'zanshin');
  assert.equal(game.player.maxResolve, 2);
  assert.equal(game.player.memoriesLost, 1);
});

test('zanshin: three killing turns restore ki and recall the wakizashi', () => {
  const game = g();
  game.player.boons.add('zanshin');
  game.player.sheathed = false;
  game.player.killStreak = 2;
  game.player.hasWakizashi = false;
  game.wakizashiPos = { q: 3, r: 0 };
  game.player.ki = 0;
  spawn(game, 'oni', { q: 1, r: -1 });
  game.act({ type: 'move', to: { q: 1, r: 0 } }); // kesa kill = third straight killing turn
  assert.equal(game.player.hasWakizashi, true);
  assert.equal(game.player.ki, game.player.maxKi);
});

// ---- structure ----------------------------------------------------------------------------

test('the gate refuses a ronin without his wakizashi', () => {
  const game = g();
  game.gatePos = { q: 1, r: 0 };
  game.player.hasWakizashi = false;
  const res = game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(res.ok, false);
});

test('descent gate advances the layer', () => {
  const game = g();
  game.gatePos = { q: 1, r: 0 };
  const res = game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(res.ok, true);
  assert.equal(game.layer, 2);
});

test('killing the gashadokuro drops the name; taking it starts the flight', () => {
  const game = g({ layer: 8 });
  const boss = spawn(game, 'gashadokuro', { q: 0, r: 2 });
  boss.staggered = 99;
  // Strike the weeping joint with a throw.
  const joint = boss.vulnTile();
  game.player.pos = add(joint, { q: 0, r: -1 });
  const res = game.act({ type: 'throw', to: joint });
  assert.equal(res.ok, true, res.reason);
  assert.equal(game.yokai.length, 0);
  assert.deepEqual(game.namePos, { q: 0, r: 2 });
  // Walk to the name (retrieve wakizashi is elsewhere; name pickup still works).
  game.player.pos = { q: 0, r: 1 };
  game.act({ type: 'move', to: { q: 0, r: 2 } });
  assert.equal(game.player.hasName, true);
  assert.equal(game.mode, 'flight');
});

test('a throw at the boss body glances off', () => {
  const game = g();
  const boss = spawn(game, 'gashadokuro', { q: 0, r: 2 });
  const body = boss.tiles().find((t) => !eq(t, boss.vulnTile()) && dist(t, game.player.pos) <= 2);
  const res = game.act({ type: 'throw', to: body });
  assert.equal(res.ok, false);
});

test('flight to layer 1 gate wins the run', () => {
  const game = g();
  game.mode = 'flight';
  game.layer = 1;
  game.player.hasName = true;
  game.gatePos = { q: 1, r: 0 };
  game.act({ type: 'move', to: { q: 1, r: 0 } });
  assert.equal(game.won, true);
});

test('shikome spawn from the entry gate during the flight', () => {
  const game = g();
  game.mode = 'flight';
  game.entryPos = { q: 0, r: 4 };
  game.player.boons.add('patient-blade');
  for (let i = 0; i < 4; i++) game.act({ type: 'wait' });
  assert.equal(game.yokai.filter((y) => y.kind === 'shikome').length, 1);
});

test('death ends the run', () => {
  const game = g();
  game.player.resolve = 1;
  game.player.sheathed = false;
  spawn(game, 'archer', { q: 3, r: 0 });
  game.act({ type: 'sheathe' }); // staggers nothing at range; archer fires
  assert.equal(game.over, true);
});

test('a full seeded run generates 8 descendable layers', () => {
  const game = new Game({ seed: 777 });
  assert.equal(game.layer, 1);
  for (let i = 1; i < 8; i++) {
    game.yokai = []; // clear the field; we only test structure here
    game.gourds = [];
    game.player.pos = [...game.board.coords()].find((h) =>
      dist(h, game.gatePos) === 1 && game.board.walkable(h));
    const res = game.act({ type: 'move', to: game.gatePos });
    assert.equal(res.ok, true, `layer ${i}: ${res.reason}`);
    assert.equal(game.layer, i + 1);
  }
  const boss = game.yokai.find((y) => y.isBoss);
  assert.ok(boss, 'layer 8 has a gashadokuro');
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
