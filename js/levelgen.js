// Procedural layer generation. Guarantees a walkable path start -> gate
// and start -> altar before accepting a layout.

import { key, eq, dist, neighbors, range } from './hex.js';
import { Board, T } from './board.js';
import { Yokai, Gashadokuro } from './entities.js';

export const RADIUS = 4;
export const MAX_LAYER = 8;

export function generateLayer(rng, index, mode) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const gen = tryGenerate(rng, index, mode);
    if (gen) return gen;
  }
  return fallbackLayer(rng, index, mode);
}

function tryGenerate(rng, index, mode) {
  const board = Board.hexagon(RADIUS);
  const isBossLayer = mode === 'descent' && index === MAX_LAYER;
  const all = [...board.coords()];

  const start = rng.pick(all.filter((h) => h.r >= RADIUS - 1));
  const gate = rng.pick(all.filter((h) => h.r <= -(RADIUS - 1) && dist(h, start) >= 6));
  const shrine = rng.pick(all.filter((h) =>
    Math.abs(h.r) <= 2 && !eq(h, start) && !eq(h, gate)
    && dist(h, start) >= 2 && dist(h, gate) >= 2));
  if (!start || !gate || !shrine) return null;

  const protectedTiles = new Set([key(start), key(gate), key(shrine),
    ...neighbors(shrine).map(key), ...neighbors(gate).map(key), ...neighbors(start).map(key)]);
  if (isBossLayer) {
    for (const h of range({ q: 0, r: 0 }, 2)) protectedTiles.add(key(h));
  }
  const carvable = all.filter((h) => !protectedTiles.has(key(h)));

  const blob = (terrain, size) => {
    let h = rng.pick(carvable);
    for (let i = 0; i < size; i++) {
      if (!protectedTiles.has(key(h))) board.setTerrain(h, terrain);
      const opts = neighbors(h).filter((n) => board.has(n) && !protectedTiles.has(key(n)));
      if (!opts.length) break;
      h = rng.pick(opts);
    }
  };

  const chasms = 2 + rng.int(2);
  for (let i = 0; i < chasms; i++) blob(T.CHASM, 2 + rng.int(3));
  if (index >= 2 && !isBossLayer) blob(T.WATER, 3 + rng.int(4));
  if (index >= 3) {
    for (let i = 0, n = rng.int(3); i < n; i++) blob(T.FIRE, 1);
  }
  for (let i = 0, n = 2 + rng.int(3); i < n; i++) blob(T.GRAVE, 1);

  // Validate connectivity for Diomedes (fire counts as passable-at-a-cost).
  const field = board.distanceField(start, (h) => board.walkable(h) && !eq(h, shrine));
  if (!field.has(key(gate))) return null;
  if (!neighbors(shrine).some((n) => field.has(key(n)))) return null;

  const yokai = spawnYokai(rng, board, index, mode, { start, gate, shrine, isBossLayer });
  return { board, start, gate, shrine, yokai };
}

function spawnYokai(rng, board, index, mode, { start, gate, shrine, isBossLayer }) {
  const yokai = [];
  const taken = new Set([key(start), key(gate), key(shrine)]);
  const openTiles = [...board.coords()].filter((h) =>
    board.yokaiWalkable(h) && dist(h, start) >= 3 && !taken.has(key(h)));
  const waterTiles = [...board.coords()].filter((h) => board.terrain(h) === T.WATER);

  const place = (kind, tiles) => {
    const spots = tiles.filter((h) => !taken.has(key(h)));
    if (!spots.length) return;
    const h = rng.pick(spots);
    taken.add(key(h));
    yokai.push(new Yokai(kind, h));
  };

  if (isBossLayer) {
    const boss = new Gashadokuro({ q: 0, r: 0 });
    for (const t of boss.tiles()) taken.add(key(t));
    yokai.push(boss);
    for (let i = 0; i < 3; i++) place(rng.pick(['oni', 'archer']), openTiles);
    return yokai;
  }

  const pool = ['oni'];
  if (index >= 1) pool.push('archer');
  if (index >= 3) pool.push('yukionna');
  if (index >= 4) pool.push('tanuki');
  if (index >= 5) pool.push('tengu');

  const count = Math.min(2 + index, 9) - (mode === 'flight' ? 2 : 0);
  for (let i = 0; i < count; i++) place(rng.pick(pool), openTiles);
  if (index >= 2 && waterTiles.length) place('kappa', waterTiles);
  return yokai;
}

function fallbackLayer(rng, index, mode) {
  // Ultra-safe layout: bare ground, guaranteed valid.
  const board = Board.hexagon(RADIUS);
  const start = { q: 0, r: RADIUS };
  const gate = { q: 0, r: -RADIUS };
  const shrine = { q: 2, r: 0 };
  const yokai = spawnYokai(rng, board, index, mode, {
    start, gate, shrine, isBossLayer: mode === 'descent' && index === MAX_LAYER,
  });
  return { board, start, gate, shrine, yokai };
}
