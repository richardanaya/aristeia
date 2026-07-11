// Olympian blessings offered at altars. Some cost a portion of kleos (−1 max resolve).

export const BOONS = {
  'second-wind':    { name: 'Second Breath',      desc: 'Your resolve is fully restored.', kleosCost: 0, once: false },
  'iron-spirit':    { name: 'Aegis of Athena',    desc: '+1 max resolve, and heal 1.', kleosCost: 0, once: false },
  'deep-breath':    { name: 'Athena’s Vigor',      desc: 'Gain 20 max menos and restore 20 menos.', kleosCost: 0, once: false },
  'red-thirst':     { name: 'Tydides’ Fury',       desc: 'Gain 6 additional menos whenever you fell a foe.', kleosCost: 1, once: true },
  'wide-sweep':     { name: 'Grey-Eyed Reach',     desc: 'Your first spear sweep reaches 5 spaces instead of 3.', kleosCost: 1, once: true },
  'piercing-thrust': { name: 'Spear of Tydeus',    desc: 'Thrusts strike one additional space beyond the first.', kleosCost: 0, once: true },
  'far-javelin':    { name: 'Long Cast',           desc: 'Throw your javelin up to 3 spaces instead of 2.', kleosCost: 0, once: true },
  'light-feet':     { name: 'Athena’s Swift Step', desc: 'Athena’s leap reaches 3 spaces instead of 2.', kleosCost: 1, once: true },
  'thunderclap':    { name: 'Aegis-Shock',         desc: 'Landing from Athena’s leap staggers every adjacent foe.', kleosCost: 1, once: true },
  'patient-spear':  { name: 'Measured Spear',      desc: 'You may hold ground and let one turn pass.', kleosCost: 0, once: true },
  'aristeia-boon':  { name: 'Unbroken Aristeia',   desc: 'Fell a foe on 3 consecutive turns to refill menos and recover your javelin.', kleosCost: 1, once: true },
};

// Boons that may be offered to this player right now.
export function availableBoons(player) {
  return Object.keys(BOONS).filter((id) => {
    const b = BOONS[id];
    if (b.once && player.has(id)) return false;
    // A kleos sacrifice needs a spare portion: never drop max resolve below 1.
    if (b.kleosCost > 0 && player.maxResolve - b.kleosCost < 1) return false;
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
  if (b.kleosCost > 0) {
    if (player.maxResolve - b.kleosCost < 1) return false;
    player.maxResolve -= b.kleosCost;
    player.kleosOffered += b.kleosCost;
    player.resolve = Math.min(player.resolve, player.maxResolve);
  }
  switch (id) {
    case 'second-wind': player.resolve = player.maxResolve; break;
    case 'iron-spirit':
      player.maxResolve = Math.min(8, player.maxResolve + 1);
      player.resolve = Math.min(player.maxResolve, player.resolve + 1);
      break;
    case 'deep-breath':
      player.maxMenos += 20;
      player.menos = Math.min(player.maxMenos, player.menos + 20);
      break;
    default: break; // passive boons are checked via player.has(id)
  }
  player.boons.add(id);
  return true;
}
