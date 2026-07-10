// Olympian blessings offered at altars. Some cost a portion of kleos (−1 max resolve).

export const BOONS = {
  'second-wind':    { name: 'Second Breath',      desc: 'Your resolve is fully restored.', memory: 0, once: false },
  'iron-spirit':    { name: 'Aegis of Athena',    desc: '+1 max resolve, and heal 1.', memory: 0, once: false },
  'deep-breath':    { name: 'Deep Menos',         desc: '+20 max menos.', memory: 0, once: false },
  'red-thirst':     { name: "Ares' Hunger",       desc: '+6 menos on every kill.', memory: 1, once: true },
  'long-draw':      { name: 'Wide Sweep',         desc: 'Your first spear-sweep arc widens to 5 tiles.', memory: 1, once: true },
  'piercing-tsuki': { name: 'Piercing Spear',     desc: 'Thrusts pierce one tile further.', memory: 0, once: true },
  'far-wakizashi':  { name: 'Far Javelin',        desc: 'Javelin throw range +1.', memory: 0, once: true },
  'light-feet':     { name: "Hermes' Sandals",    desc: "Athena's leap reaches 3 tiles.", memory: 1, once: true },
  'thunderclap':    { name: "Zeus' Footfall",     desc: 'Leap landings stagger adjacent foes.', memory: 1, once: true },
  'patient-blade':  { name: 'Odyssean Patience',  desc: 'You may wait, letting a turn pass.', memory: 0, once: true },
  'zanshin':        { name: 'Aristeia',           desc: 'Kills on 3 consecutive turns: full menos and your javelin returns to hand.', memory: 1, once: true },
};

// Boons that may be offered to this player right now.
export function availableBoons(player) {
  return Object.keys(BOONS).filter((id) => {
    const b = BOONS[id];
    if (b.once && player.has(id)) return false;
    // A kleos sacrifice needs a spare portion: never drop max resolve below 1.
    if (b.memory > 0 && player.maxResolve - b.memory < 1) return false;
    return true;
  });
}

export function offerBoons(player, rng, count = 3) {
  const pool = availableBoons(player);
  return rng.shuffle(pool).slice(0, count);
}

// Apply a boon. Returns false if not applicable.
export function applyBoon(player, id) {
  const b = BOONS[id];
  if (!b) return false;
  if (b.once && player.has(id)) return false;
  if (b.memory > 0) {
    if (player.maxResolve - b.memory < 1) return false;
    player.maxResolve -= b.memory;
    player.memoriesLost += b.memory;
    player.resolve = Math.min(player.resolve, player.maxResolve);
  }
  switch (id) {
    case 'second-wind': player.resolve = player.maxResolve; break;
    case 'iron-spirit':
      player.maxResolve = Math.min(8, player.maxResolve + 1);
      player.resolve = Math.min(player.maxResolve, player.resolve + 1);
      break;
    case 'deep-breath':
      player.maxKi += 20;
      player.ki = Math.min(player.maxKi, player.ki + 20);
      break;
    default: break; // passive boons are checked via player.has(id)
  }
  player.boons.add(id);
  return true;
}
