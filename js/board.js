// Board: hex tiles + terrain. Pure logic, no rendering.

import { key, neighbors, range } from './hex.js';

export const T = {
  GROUND: 'ground',
  BURNING_PLANKS: 'burning-planks',   // planks on fire — instant death, push target
  WATER: 'water',   // impassable to Diomedes; ford guards swim it; elite marksmen freeze it
  ICE: 'ice',       // frozen water, walkable for a few turns
  FIRE: 'fire',     // entering costs 1 resolve; foes avoid it, pushed in they die
  STELE: 'stele',   // blocks movement and lines of fire; pitch-jars destroy it
};

export class Board {
  constructor(radius) {
    this.radius = radius;
    this.tiles = new Map(); // key -> {terrain, iceTimer}
  }

  static hexagon(radius, terrain = T.GROUND) {
    const b = new Board(radius);
    for (const h of range({ q: 0, r: 0 }, radius)) {
      b.tiles.set(key(h), { terrain, iceTimer: 0 });
    }
    return b;
  }

  has(h) { return this.tiles.has(key(h)); }
  get(h) { return this.tiles.get(key(h)); }
  terrain(h) { return this.tiles.get(key(h))?.terrain; }

  setTerrain(h, terrain) {
    const t = this.tiles.get(key(h));
    if (t) { t.terrain = terrain; t.iceTimer = 0; }
  }

  freeze(h, turns = 3) {
    const t = this.tiles.get(key(h));
    if (t && t.terrain === T.WATER) { t.terrain = T.ICE; t.iceTimer = turns; }
  }

  *coords() {
    for (const k of this.tiles.keys()) {
      const [q, r] = k.split(',').map(Number);
      yield { q, r };
    }
  }

  // Walkability for Diomedes. Fire is enterable (at a cost handled by the game).
  walkable(h) {
    const t = this.terrain(h);
    return t === T.GROUND || t === T.ICE || t === T.FIRE;
  }

  // Walkability for foes. They shun watch-fire; ford guards also swim water.
  foeWalkable(h, kind = null) {
    const t = this.terrain(h);
    if (t === T.GROUND || t === T.ICE) return true;
    if (t === T.WATER && kind === 'fordGuard') return true;
    return false;
  }

  // Does this tile block ranged attacks (arrows, beams)?
  blocksShots(h) {
    const t = this.terrain(h);
    return t === undefined || t === T.STELE;
  }

  // BFS distance field from `start` over tiles passing `passFn`.
  distanceField(start, passFn) {
    const dist = new Map([[key(start), 0]]);
    const queue = [start];
    while (queue.length) {
      const h = queue.shift();
      const d = dist.get(key(h));
      for (const n of neighbors(h)) {
        if (!this.has(n) || dist.has(key(n)) || !passFn(n)) continue;
        dist.set(key(n), d + 1);
        queue.push(n);
      }
    }
    return dist;
  }

  // Tick ice: melts back to water when the timer expires (unless occupied).
  tickIce(isOccupied) {
    for (const [k, t] of this.tiles) {
      if (t.terrain !== T.ICE || t.iceTimer <= 0) continue;
      const [q, r] = k.split(',').map(Number);
      t.iceTimer--;
      if (t.iceTimer <= 0) {
        if (isOccupied({ q, r })) t.iceTimer = 1; // holds one more turn under weight
        else t.terrain = T.WATER;
      }
    }
  }
}
