// Axial hex-grid math (pointy-top). Pure functions, no dependencies.

export const DIRS = [
  { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
  { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
];

export const key = (h) => `${h.q},${h.r}`;
export const add = (a, b) => ({ q: a.q + b.q, r: a.r + b.r });
export const sub = (a, b) => ({ q: a.q - b.q, r: a.r - b.r });
export const scale = (h, k) => ({ q: h.q * k, r: h.r * k });
export const eq = (a, b) => a.q === b.q && a.r === b.r;

export function dist(a, b) {
  const dq = a.q - b.q, dr = a.r - b.r;
  return (Math.abs(dq) + Math.abs(dr) + Math.abs(dq + dr)) / 2;
}

export const neighbors = (h) => DIRS.map((d) => add(h, d));

export const rot = (dirIdx, steps) => ((dirIdx + steps) % 6 + 6) % 6;

// If `to` lies on a straight hex axis from `from`, return {dir, steps}; else null.
export function dirBetween(from, to) {
  const dq = to.q - from.q, dr = to.r - from.r;
  if (dq === 0 && dr === 0) return null;
  for (let i = 0; i < 6; i++) {
    const d = DIRS[i];
    const k = d.q !== 0 ? dq / d.q : dr / d.r;
    if (Number.isInteger(k) && k > 0 && dq === d.q * k && dr === d.r * k) {
      return { dir: i, steps: k };
    }
  }
  return null;
}

// Tiles strictly between two colinear hexes (empty array if adjacent or not colinear).
export function between(from, to) {
  const db = dirBetween(from, to);
  if (!db) return [];
  const out = [];
  for (let i = 1; i < db.steps; i++) out.push(add(from, scale(DIRS[db.dir], i)));
  return out;
}

export function ring(center, radius) {
  if (radius === 0) return [center];
  const out = [];
  let h = add(center, scale(DIRS[4], radius));
  for (let side = 0; side < 6; side++) {
    for (let i = 0; i < radius; i++) {
      out.push(h);
      h = add(h, DIRS[side]);
    }
  }
  return out;
}

export function range(center, radius) {
  const out = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = Math.max(-radius, -q - radius); r <= Math.min(radius, -q + radius); r++) {
      out.push(add(center, { q, r }));
    }
  }
  return out;
}

const SQRT3 = Math.sqrt(3);

export function toPixel(h, size) {
  return { x: size * SQRT3 * (h.q + h.r / 2), y: size * 1.5 * h.r };
}

export function fromPixel(x, y, size) {
  const qf = (SQRT3 / 3 * x - y / 3) / size;
  const rf = (2 / 3 * y) / size;
  return cubeRound(qf, rf);
}

function cubeRound(qf, rf) {
  const sf = -qf - rf;
  let q = Math.round(qf), r = Math.round(rf), s = Math.round(sf);
  const dq = Math.abs(q - qf), dr = Math.abs(r - rf), ds = Math.abs(s - sf);
  if (dq > dr && dq > ds) q = -r - s;
  else if (dr > ds) r = -q - s;
  return { q, r };
}
