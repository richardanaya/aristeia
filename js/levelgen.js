// Procedural rank generation. Guarantees a walkable path start -> exitMap
// and start -> altar before accepting a layout.

import { key, eq, dist, neighbors, range } from './hex.js';
import { Board, T } from './board.js';
import { Foe, Ares } from './entities.js';

export const RADIUS = 4;
export const MAX_RANK = 8;

export function generateRank(rng, index, mode) {
  for (let attempt = 0; attempt < 40; attempt++) {
    const gen = tryGenerate(rng, index, mode);
    if (gen) return gen;
  }
  return fallbackRank(rng, index, mode);
}

function tryGenerate(rng, index, mode) {
  const board = Board.hexagon(RADIUS);
  const isBossRank = mode === 'descent' && index === MAX_RANK;
  const all = [...board.coords()];

  const start = rng.pick(all.filter((h) => h.r >= RADIUS - 1));
  const exitMap = rng.pick(all.filter((h) => h.r <= -(RADIUS - 1) && dist(h, start) >= 6));
  const athenaStatue = rng.pick(all.filter((h) =>
    Math.abs(h.r) <= 2 && !eq(h, start) && !eq(h, exitMap)
    && dist(h, start) >= 2 && dist(h, exitMap) >= 2));
  if (!start || !exitMap || !athenaStatue) return null;

  const protectedTiles = new Set([key(start), key(exitMap), key(athenaStatue),
    ...neighbors(athenaStatue).map(key), ...neighbors(exitMap).map(key), ...neighbors(start).map(key)]);
  if (isBossRank) {
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

  const burningPlankFields = 2 + rng.int(2);
  for (let i = 0; i < burningPlankFields; i++) blob(T.BURNING_PLANKS, 2 + rng.int(3));
  if (index >= 2 && !isBossRank) blob(T.WATER, 3 + rng.int(4));
  if (index >= 3) {
    for (let i = 0, n = rng.int(3); i < n; i++) blob(T.FIRE, 1);
  }
  for (let i = 0, n = 2 + rng.int(3); i < n; i++) blob(T.STELE, 1);

  // Validate connectivity for Diomedes (fire counts as passable-at-a-cost).
  const field = board.distanceField(start, (h) => board.walkable(h) && !eq(h, athenaStatue));
  if (!field.has(key(exitMap))) return null;
  if (!neighbors(athenaStatue).some((n) => field.has(key(n)))) return null;

  const foes = spawnFoe(rng, board, index, mode, { start, exitMap, athenaStatue, isBossRank });
  return { board, start, exitMap, athenaStatue, foes };
}

function spawnFoe(rng, board, index, mode, { start, exitMap, athenaStatue, isBossRank }) {
  const foes = [];
  const taken = new Set([key(start), key(exitMap), key(athenaStatue)]);
  const openTiles = [...board.coords()].filter((h) =>
    board.foeWalkable(h) && dist(h, start) >= 3 && !taken.has(key(h)));
  const waterTiles = [...board.coords()].filter((h) => board.terrain(h) === T.WATER);

  const place = (kind, tiles) => {
    const spots = tiles.filter((h) => !taken.has(key(h)));
    if (!spots.length) return;
    const h = rng.pick(spots);
    taken.add(key(h));
    foes.push(new Foe(kind, h));
  };

  if (isBossRank) {
    const boss = new Ares({ q: 0, r: 0 });
    for (const t of boss.tiles()) taken.add(key(t));
    foes.push(boss);
    for (let i = 0; i < 3; i++) place(rng.pick(['elite', 'archer']), openTiles);
    return foes;
  }

  const pool = ['elite'];
  if (index >= 1) pool.push('archer');
  if (index >= 3) pool.push('marksman');
  if (index >= 4) pool.push('sapper');
  if (index >= 5) pool.push('scout');

  const count = Math.min(2 + index, 9) - (mode === 'flight' ? 2 : 0);
  for (let i = 0; i < count; i++) place(rng.pick(pool), openTiles);
  if (index >= 2 && waterTiles.length) place('fordGuard', waterTiles);
  return foes;
}

function fallbackRank(rng, index, mode) {
  // Ultra-safe layout: bare ground, guaranteed valid.
  const board = Board.hexagon(RADIUS);
  const start = { q: 0, r: RADIUS };
  const exitMap = { q: 0, r: -RADIUS };
  const athenaStatue = { q: 2, r: 0 };
  const foes = spawnFoe(rng, board, index, mode, {
    start, exitMap, athenaStatue, isBossRank: mode === 'descent' && index === MAX_RANK,
  });
  return { board, start, exitMap, athenaStatue, foes };
}
