// Entities: Diomedes and the host of Troy. Pure state; behavior lives in game.js/ai.js.

import { ring } from './hex.js';

let nextId = 1;

export class Player {
  constructor(pos) {
    this.pos = pos;
    this.resolve = 3;
    this.maxResolve = 3;
    this.ki = 100;             // menos — battle-fury granted by Athena
    this.maxKi = 100;
    this.sheathed = true;      // spear grounded until blood is drawn
    this.hasWakizashi = true;  // throwable javelin; needed for shield-guard & gates
    this.deflecting = false;   // aspis raised: reflects the next ranged attacks
    this.hasName = false;      // the goal: your stolen kleos
    this.boons = new Set();
    this.killStreak = 0;       // consecutive turns with at least one kill (Aristeia)
    this.memoriesLost = 0;     // portions of glory sacrificed at altars
  }

  has(boon) { return this.boons.has(boon); }
  leapRange() { return this.has('light-feet') ? 3 : 2; }
  throwRange() { return this.has('far-wakizashi') ? 3 : 2; }

  damage(n = 1) {
    this.resolve = Math.max(0, this.resolve - n);
    return this.resolve <= 0;
  }

  gainKi(n) { this.ki = Math.min(this.maxKi, this.ki + n); }
}

// Stat table for every foe kind. Keys are stable for AI/tests; names are Iliad-facing.
export const YOKAI = {
  oni:          { name: 'Trojan Elite',     melee: true },
  archer:       { name: 'Trojan Archer',    shotMin: 2, shotMax: 5 },
  yukionna:     { name: 'Elite Marksman',   beamRange: 5, castCooldown: 2 },
  tanuki:       { name: 'Trojan Sapper',    bombRange: 3, bombCooldown: 3 },
  tengu:        { name: 'Trojan Scout',     melee: true, leapCharge: 3 },
  kappa:        { name: 'Ford Guard',       melee: true, slowOnLand: true },
  shikome:      { name: 'Pursuit Troop',    melee: true },
  gashadokuro:  { name: 'Ares',             boss: true },
};

export class Yokai {
  constructor(kind, pos) {
    this.id = nextId++;
    this.kind = kind;
    this.pos = pos;
    this.staggered = 0;   // turns of stagger remaining (skips attack & move)
    this.cooldown = 0;    // ranged/bomb cooldown
    this.charge = 0;      // scout leap charge
    this.enraged = false; // elite pushed and survived: moves 2/turn until it strikes
    this.landPause = false; // ford guard moves every other turn on land
    this.acted = false;   // attacked this turn (attackers don't also move)
  }

  get data() { return YOKAI[this.kind]; }
  get isBoss() { return this.kind === 'gashadokuro'; }

  // Tiles this foe occupies (Ares fills a 7-tile flower).
  tiles() {
    return this.isBoss ? [this.pos, ...ring(this.pos, 1)] : [this.pos];
  }
}

export class Gashadokuro extends Yokai {
  constructor(pos) {
    super('gashadokuro', pos);
    this.vulnIdx = 0;        // which ring tile is the open wound
    this.attackReady = false; // strikes every other turn
  }

  vulnTile() { return ring(this.pos, 1)[this.vulnIdx]; }
  rotateJoint() { this.vulnIdx = (this.vulnIdx + 1) % 6; }
}

export function resetIds() { nextId = 1; } // for deterministic tests
