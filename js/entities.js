// Entities: Diomedes and the host of Troy. Pure state; behavior lives in game.js/ai.js.

import { ring } from './hex.js';

let nextId = 1;

export class Player {
  constructor(pos) {
    this.pos = pos;
    this.resolve = 3;
    this.maxResolve = 3;
    this.menos = 100;             // menos — battle-fury granted by Athena
    this.maxMenos = 100;
    this.spearGrounded = true;      // spear grounded until blood is drawn
    this.hasJavelin = true;  // throwable javelin; needed for shield-guard & exit maps
    this.guarding = false;   // aspis raised: reflects the next ranged attacks
    this.hasKleos = false;      // the goal: your stolen kleos
    this.boons = new Set();
    this.killStreak = 0;       // consecutive turns with at least one kill (Aristeia)
    this.kleosOffered = 0;     // portions of glory sacrificed at altars
  }

  has(boon) { return this.boons.has(boon); }
  leapRange() { return this.has('light-feet') ? 3 : 2; }
  throwRange() { return this.has('far-javelin') ? 3 : 2; }

  damage(n = 1) {
    this.resolve = Math.max(0, this.resolve - n);
    return this.resolve <= 0;
  }

  gainMenos(n) { this.menos = Math.min(this.maxMenos, this.menos + n); }
}

// Stat table for every foe kind. Keys are stable for AI/tests; names are Iliad-facing.
export const FOE_DATA = {
  elite:          { name: 'Trojan Spearman',  melee: true },
  archer:       { name: 'Trojan Archer',    shotMin: 2, shotMax: 5 },
  marksman:     { name: 'Silver Marksman',  beamRange: 5, castCooldown: 2 },
  sapper:       { name: 'Pitch-Bearer',      bombRange: 3, bombCooldown: 3 },
  scout:        { name: 'Trojan Skirmisher', melee: true, leapCharge: 3 },
  fordGuard:    { name: 'Scamander Guard',   melee: true, slowOnLand: true },
  pursuitTroop: { name: 'Pursuing Spearman', melee: true },
  ares:  { name: 'Ares',             boss: true },
};

export class Foe {
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

  get data() { return FOE_DATA[this.kind]; }
  get isBoss() { return this.kind === 'ares'; }

  // Tiles this foe occupies (Ares fills a 7-tile flower).
  tiles() {
    return this.isBoss ? [this.pos, ...ring(this.pos, 1)] : [this.pos];
  }
}

export class Ares extends Foe {
  constructor(pos) {
    super('ares', pos);
    this.openWoundIndex = 0;     // which ring tile is the open wound
    this.attackReady = false; // strikes every other turn
  }

  openWoundTile() { return ring(this.pos, 1)[this.openWoundIndex]; }
  rotateOpenWound() { this.openWoundIndex = (this.openWoundIndex + 1) % 6; }
}

export function resetIds() { nextId = 1; } // for deterministic tests
