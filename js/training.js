// Achilles' practice drills teach one rule at a time.

import { Board, T } from './board.js';
import { Foe } from './entities.js';

/** @typedef {{ kind: string, pos: {q:number,r:number} }} TrainingFoe */
/** @typedef {{
 *   id: string,
 *   title: string,
 *   summary: string,
 *   howto: string,
 *   intro: string[],
 *   radius?: number,
 *   start: {q:number,r:number},
 *   foes: TrainingFoe[],
 *   terrain?: { pos: {q:number,r:number}, type: string }[],
 *   setup?: (game: import('./game.js').Game) => void,
 * }} TrainingLesson */

/** @type {TrainingLesson[]} */
export const LESSONS = [
  {
    id: 'pass-cut',
    title: 'Pass-cut',
    summary: 'Move between two spaces that both border the foe.',
    howto: 'With the spear levelled, move to a space that borders the spearman along with the space you leave. Clear the drill.',
    intro: [
      'Achilles: “Do not meet his point. Pass it.”',
      'Move from one space beside the spearman to another space beside him. Your levelled spear cuts as you pass.',
      'When every foe is down, the drill is done.',
    ],
    radius: 3,
    start: { q: 0, r: 1 },
    foes: [{ kind: 'elite', pos: { q: 1, r: 0 } }],
    setup(game) {
      game.player.spearGrounded = false;
    },
  },
  {
    id: 'thrust',
    title: 'Thrust',
    summary: 'Move straight toward a foe one space beyond your landing.',
    howto: 'With the spear levelled, move one space straight toward the spearman. Your thrust strikes the next space in that line.',
    intro: [
      'Achilles: “Keep the line. Let the spear finish it.”',
      'Move one space straight toward the spearman. Your levelled spear strikes one space beyond where you land.',
      'Fell him to complete the drill.',
    ],
    radius: 3,
    start: { q: 0, r: 0 },
    foes: [{ kind: 'elite', pos: { q: 2, r: 0 } }],
    setup(game) {
      game.player.spearGrounded = false;
    },
  },
  {
    id: 'leap',
    title: "Athena's leap",
    summary: 'Leap two spaces and pass beside a foe for 50 menos.',
    howto: 'Choose a blue space two spaces away. Leap from one side of the spearman to another; the pass-cut still strikes. Costs 50 menos.',
    intro: [
      'Achilles: “Athena lends the step. Spend it with purpose.”',
      'Choose a blue space two spaces away. The leap costs 50 menos.',
      'Land beside the spearman after leaving a space beside him; the pass-cut still strikes.',
    ],
    radius: 3,
    start: { q: 0, r: 0 },
    foes: [{ kind: 'elite', pos: { q: 1, r: 0 } }],
    setup(game) {
      game.player.spearGrounded = false;
      game.player.menos = game.player.maxMenos;
    },
  },
  {
    id: 'bash',
    title: 'Shield-bash',
    summary: 'Drive an adjacent foe into burning planks for 30 menos.',
    howto: 'Choose Shield-Bash, then choose the adjacent spearman. He is driven one space into the burning planks. Costs 30 menos.',
    intro: [
      'Achilles: “The aspis can answer bronze with earth.”',
      'Choose Shield-Bash, then choose the adjacent spearman. A bash drives him one space directly away from you.',
      'The burning planks kill whoever enters them. The bash costs 30 menos.',
    ],
    radius: 3,
    start: { q: 0, r: 0 },
    foes: [{ kind: 'elite', pos: { q: 1, r: 0 } }],
    terrain: [
      { pos: { q: 2, r: 0 }, type: T.BURNING_PLANKS },
    ],
    setup(game) {
      game.player.spearGrounded = false;
      game.player.menos = game.player.maxMenos;
    },
  },
  {
    id: 'javelin',
    title: 'Javelin',
    summary: 'Throw two spaces in a straight, clear line.',
    howto: 'Choose Throw Javelin, then choose the archer two spaces away. The clear, straight cast fells him and completes the drill.',
    intro: [
      'Achilles: “Cast only when the line is yours.”',
      'Choose Throw Javelin, then choose the archer two spaces away. Nothing may block the straight line.',
      'The cast ends this drill. In battle, recover the javelin before advancing.',
    ],
    radius: 3,
    start: { q: 0, r: 0 },
    foes: [{ kind: 'archer', pos: { q: 2, r: 0 } }],
    setup(game) {
      game.player.spearGrounded = false;
      game.player.hasJavelin = true;
      game.javelinPos = null;
    },
  },
  {
    id: 'guard',
    title: 'Guard',
    summary: 'Raise the aspis to return a shot along its clear line.',
    howto: 'Choose Raise Aspis. It takes your turn. The archer’s shot returns and fells him because the straight line remains clear.',
    intro: [
      'Achilles: “Hold the aspis true. His arrow will know him.”',
      'Choose Raise Aspis. Guarding takes your whole turn and requires the javelin in hand.',
      'A ranged attack returns along its straight line if nothing blocks the way.',
    ],
    radius: 3,
    start: { q: 0, r: 0 },
    foes: [{ kind: 'archer', pos: { q: 3, r: 0 } }],
    setup(game) {
      game.player.spearGrounded = false;
      game.player.hasJavelin = true;
    },
  },
];

/**
 * Build a training board for a lesson into `game` (mutates game fields).
 * @param {import('./game.js').Game} game
 * @param {number} index
 */
export function applyLesson(game, index) {
  const L = LESSONS[index];
  if (!L) return false;

  const radius = L.radius ?? 3;
  game.board = Board.hexagon(radius, T.GROUND);
  for (const t of L.terrain || []) {
    if (game.board.has(t.pos)) game.board.setTerrain(t.pos, t.type);
  }

  game.player.pos = { ...L.start };
  game.player.menos = game.player.maxMenos;
  game.player.resolve = game.player.maxResolve;
  game.player.spearGrounded = true;
  game.player.hasJavelin = true;
  game.player.guarding = false;
  game.player.killStreak = 0;
  game.player.hasKleos = false;
  // Training ignores permanent boons from a prior run path — clean slate.
  game.player.boons = new Set();
  game.player.kleosOffered = 0;

  game.foes = L.foes.map((f) => new Foe(f.kind, { ...f.pos }));
  game.pitchJars = [];
  game.javelinPos = null;
  game.kleosPos = null;
  // Puzzle ends on clear or death — no exitMap.
  game.exitMapPos = null;
  game.entryPos = { ...L.start };
  game.athenaStatuePos = null;
  game.athenaStatueUsed = false;
  game.athenaStatueOffer = null;
  game.pendingOffer = null;

  game.rank = index + 1;
  game.mode = 'training';
  game.training = true;
  game.trainingLesson = index;
  game.turnInRank = 0;
  game.over = false;
  game.won = false;
  game.log = [];

  game.trainingTitle = L.title;
  game.trainingHowto = L.howto;
  for (const line of L.intro) game.say(line);
  if (typeof L.setup === 'function') L.setup(game);
  return true;
}

export function lessonCount() { return LESSONS.length; }

export function lessonTitle(index) {
  return LESSONS[index]?.title || `Drill ${index + 1}`;
}

export function getLesson(index) {
  return LESSONS[index] || null;
}
