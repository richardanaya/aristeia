// Bootstrap: wires game, renderer, and UI together.

import { Game } from './game.js';
import { Renderer } from './render.js';
import { UI } from './ui.js';
import { dist, eq } from './hex.js';
import { loadAssets } from './assets.js';

const canvas = document.getElementById('cv');
const ui = new UI(document);
const renderer = new Renderer(canvas);
const titleScreen = document.getElementById('title-screen');
const titleVideo = document.getElementById('title-video');
const backgroundMusic = document.getElementById('background-music');
const TITLE_VIDEO_SRC = 'assets/title/intro.mp4';

if (backgroundMusic) {
  backgroundMusic.volume = 0.35;
  backgroundMusic.play().catch(() => {});
}

let game;
let inputMode = 'move'; // 'move' | 'throw' | 'push' | 'libation'
let started = false;
let loopRunning = false;

let lastMode = 'campaign'; // 'campaign' | 'training'
let lastTrainingLesson = 0;
let trainingHubOrigin = 'title';

function ensureLoop() {
  if (loopRunning) return;
  loopRunning = true;
  requestAnimationFrame(loop);
}

function newRun(seed) {
  lastMode = 'campaign';
  game = new Game({ seed: seed ?? ((Math.random() * 0xffffffff) >>> 0) });
  renderer.attach(game);
  ui.hideEnd();
  ui.hideTrainHub();
  setMode('move');
  refresh();
}

function newTrainingLesson(index, seed) {
  lastMode = 'training';
  lastTrainingLesson = index;
  game = new Game({
    seed: seed ?? ((Math.random() * 0xffffffff) >>> 0),
    training: true,
    trainingLesson: index,
  });
  renderer.attach(game);
  ui.hideEnd();
  ui.hideTrainHub();
  setMode('move');
  refresh();
}

/** Legacy hook / debug: start first drill. */
function newTraining(seed) {
  newTrainingLesson(0, seed);
}

function showTrainingHub(origin = started ? 'drill' : 'title') {
  trainingHubOrigin = origin;
  lastMode = 'training';
  ui.hideEnd();
  ui.showTrainHub({
    onPick: (index) => {
      leaveTitleForGame(() => newTrainingLesson(index));
    },
    onBack: () => {
      ui.hideTrainHub();
      if (trainingHubOrigin === 'drill') refresh();
    },
  });
}

function leaveTitleForGame(startFn) {
  if (backgroundMusic && backgroundMusic.paused) {
    backgroundMusic.play().catch(() => {});
  }
  if (!started) {
    started = true;
    if (titleHelp) titleHelp.classList.add('hidden');
    startFn();
    ensureLoop();
    const app = document.getElementById('app');
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (app) app.classList.add('visible');
        if (titleScreen) titleScreen.classList.add('fade-out');
      });
    });
    const FADE_MS = 1000;
    setTimeout(() => {
      if (titleScreen) titleScreen.classList.add('hidden');
      if (titleVideo) {
        titleVideo.pause();
        titleVideo.removeAttribute('src');
        titleVideo.load();
      }
    }, FADE_MS);
  } else {
    startFn();
    ensureLoop();
  }
}

function fadeFromTitle(startFn) {
  leaveTitleForGame(startFn);
}

function beginFromTitle() {
  const urlSeed = new URLSearchParams(location.search).get('seed');
  fadeFromTitle(() => newRun(urlSeed ? Number(urlSeed) >>> 0 : undefined));
}

function beginTraining() {
  // Hub on top of title first — pick a scenario, then enter the board.
  if (titleHelp) titleHelp.classList.add('hidden');
  showTrainingHub('title');
}

function restartCurrent() {
  if (lastMode === 'training') newTrainingLesson(lastTrainingLesson);
  else newRun();
}

function openHubFromGame() {
  if (lastMode !== 'training') return;
  ui.hideEnd();
  showTrainingHub('drill');
}

function setMode(mode) {
  inputMode = mode;
  renderer.mode = mode;
  refresh();
}

function refresh() {
  if (!game) return;
  ui.refresh(game, inputMode);
  if (game.over || game.won) {
    setTimeout(() => {
      if (!game || !(game.over || game.won)) return;
      ui.showEnd(game, {
        onRetry: () => restartCurrent(),
        onHub: () => openHubFromGame(),
        onNew: () => newRun(),
      });
    }, 600);
  }
}

function handleResult(res) {
  if (!res) return;
  if (!res.ok) {
    if (res.reason) game.say(res.reason);
    refresh();
    return;
  }
  renderer.addEvents(res.events || []);
  if (res.offer) {
    ui.showAthenaStatue(game, res.offer, (id) => {
      const pick = game.chooseBoon(id);
      if (pick.ok && pick.events) renderer.addEvents(pick.events);
      refresh();
    });
  }
  setMode('move');
  refresh();
}

// Resolve both previews and commits through the same smart-default policy.
function intendedTileAction(hex) {
  const p = game.player;
  if (inputMode === 'throw') return { type: 'throw', to: hex };
  if (inputMode === 'push') return { type: 'push', to: hex };
  if (inputMode === 'libation') return { type: 'libation', to: hex };

  // Move mode with smart defaults on occupied tiles:
  const y = game.foeAt(hex);
  const d = dist(p.pos, hex);
  if (y && d === 1) {
    if (y.kind === 'fordGuard') return { type: 'libation', to: hex };
    return { type: 'push', to: hex };
  }
  if (game.pitchJarAt(hex) && d === 1) return { type: 'push', to: hex };
  if (y && p.hasJavelin && d <= p.throwRange()) {
    return { type: 'throw', to: hex };
  }
  if (game.athenaStatuePos && eq(game.athenaStatuePos, hex) && d === 1) {
    return { type: 'sacrifice' };
  }
  return { type: 'move', to: hex };
}

function previewTileAction(action) {
  if (action.type === 'move') return game.previewMove(action.to);
  if (action.type === 'throw') return game.previewThrow(action.to);
  if (action.type === 'push') return game.pushInfo ? game.pushInfo(action.to) : { ok: true, kind: 'push' };
  if (action.type === 'libation') {
    const foe = game.foeAt(action.to);
    const ok = !!foe && foe.kind === 'fordGuard' && dist(game.player.pos, action.to) === 1;
    return { ok, kind: 'libation', reason: ok ? null : 'Only an adjacent ford guard answers a libation.' };
  }
  return { ok: true, kind: action.type };
}

function clickHex(hex) {
  if (!game || game.over || game.won || game.pendingOffer) return;
  handleResult(game.act(intendedTileAction(hex)));
}

// Unified mouse + touch input via pointer events.
// Mouse: hover previews, click commits. Touch: first tap previews, second tap commits.
function eventHex(e) {
  const r = canvas.getBoundingClientRect();
  return renderer.screenToHex(e.clientX - r.left, e.clientY - r.top);
}

function setHover(hex) {
  if (!game) return;

  // Javelin aim mode: show throw preview, not enemy threat (that would hide the cast).
  if (inputMode === 'throw') {
    renderer.hover = {
      hex,
      preview: game.previewThrow(hex),
      threat: null,
      threatFoe: null,
      featureLabel: null,
    };
    return;
  }

  const foe = game.foeAt(hex);
  const action = intendedTileAction(hex);
  let featureLabel = null;
  if (game.exitMapPos && eq(hex, game.exitMapPos)) {
    featureLabel = game.mode === 'flight'
      ? 'Way to the ships · return'
      : 'Way forward · advance';
  } else if (game.athenaStatuePos && eq(hex, game.athenaStatuePos)) {
    featureLabel = game.athenaStatueUsed ? 'Athena’s image · blessing received' : 'Athena’s image · seek blessing';
  } else {
    const terr = game.board.terrain(hex);
    if (terr === 'burning-planks') featureLabel = 'Burning planks · fatal';
    else if (terr === 'fire') featureLabel = 'Smoldering deck · costs 1 resolve';
  }
  renderer.hover = {
    hex,
    preview: previewTileAction(action),
    // Hovering a foe telegraphs its attack range; otherwise show move preview.
    threat: foe ? game.threatTiles(foe) : null,
    threatFoe: foe || null,
    featureLabel,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
  if (!game) return;
  const hex = eventHex(e);
  if (e.pointerType === 'touch') {
    const armed = renderer.hover && renderer.hover.hex
      && renderer.hover.hex.q === hex.q && renderer.hover.hex.r === hex.r;
    if (armed) {
      renderer.hover = null;
      clickHex(hex);
    } else {
      setHover(hex); // show the preview; a second tap commits
    }
  } else {
    clickHex(hex);
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (e.pointerType !== 'mouse' || !game) return;
  setHover(eventHex(e));
});

canvas.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse') renderer.hover = null;
});

document.addEventListener('keydown', (e) => {
  if (e.repeat || !started || !game) return;
  // Hub open: don't eat combat keys into a hidden board.
  const hub = document.getElementById('train-hub');
  if (hub && !hub.classList.contains('hidden')) {
    if (e.key === 'Escape') {
      e.preventDefault();
      ui.hideTrainHub();
      if (trainingHubOrigin === 'drill') refresh();
    }
    return;
  }
  switch (e.key.toLowerCase()) {
    case 's': handleResult(game.act({ type: 'ground-spear' })); break;
    case 'd': handleResult(game.act({ type: 'guard' })); break;
    case 'r': handleResult(game.act({ type: 'sacrifice' })); break;
    case 'w': case ' ': handleResult(game.act({ type: 'wait' })); e.preventDefault(); break;
    case 't': setMode(inputMode === 'throw' ? 'move' : 'throw'); break;
    case 'b': setMode(inputMode === 'push' ? 'move' : 'push'); break;
    case 'o': setMode(inputMode === 'libation' ? 'move' : 'libation'); break;
    case 'n': restartCurrent(); break;
    case 'escape': setMode('move'); break;
    default: break;
  }
});

document.getElementById('btn-ground-spear').onclick = () => handleResult(game.act({ type: 'ground-spear' }));
document.getElementById('btn-guard').onclick = () => handleResult(game.act({ type: 'guard' }));
document.getElementById('btn-sacrifice').onclick = () => handleResult(game.act({ type: 'sacrifice' }));
document.getElementById('btn-wait').onclick = () => handleResult(game.act({ type: 'wait' }));
document.getElementById('btn-throw').onclick = () => setMode(inputMode === 'throw' ? 'move' : 'throw');
document.getElementById('btn-push').onclick = () => setMode(inputMode === 'push' ? 'move' : 'push');
document.getElementById('btn-libation').onclick = () => setMode(inputMode === 'libation' ? 'move' : 'libation');
document.getElementById('btn-new').onclick = () => {
  if (lastMode === 'training') openHubFromGame();
  else restartCurrent();
};

window.addEventListener('resize', () => renderer.resize());

function loop(t) {
  // A draw error must never kill the animation chain (a frozen canvas
  // looks like a hung game even though the engine is fine).
  try {
    if (game) renderer.frame(t);
  } catch (err) {
    console.error('render frame failed:', err);
  }
  requestAnimationFrame(loop);
}

// Title screen: Imagine key art + video; load sprites, then wait for click.
loadAssets().then(() => {
  if (titleVideo) titleVideo.play().catch(() => {});
});

const titleHelp = document.getElementById('title-help');
const titleHelpBtn = document.getElementById('title-help-btn');
const titleHelpClose = document.getElementById('title-help-close');

function openTitleHelp(e) {
  if (e) e.stopPropagation();
  if (titleHelp) ui.openModal(titleHelp);
}
function closeTitleHelp(e) {
  if (e) e.stopPropagation();
  if (titleHelp) ui.closeModal(titleHelp);
}

if (titleScreen) {
  // Background click starts the run; buttons stop propagation.
  titleScreen.addEventListener('click', (e) => {
    if (e.target.closest('button')) return;
    beginFromTitle();
  });
  const titleStart = document.getElementById('title-start');
  if (titleStart) titleStart.addEventListener('click', (e) => {
    e.stopPropagation();
    beginFromTitle();
  });
  const titleTrain = document.getElementById('title-train');
  if (titleTrain) titleTrain.addEventListener('click', (e) => {
    e.stopPropagation();
    beginTraining();
  });
  if (titleHelpBtn) titleHelpBtn.addEventListener('click', openTitleHelp);
  if (titleHelpClose) titleHelpClose.addEventListener('click', closeTitleHelp);
  if (titleHelp) {
    titleHelp.addEventListener('click', (e) => {
      // Click outside the box closes help
      if (e.target === titleHelp) closeTitleHelp(e);
    });
  }
  document.addEventListener('keydown', (e) => {
    if (started) return;
    if (e.key === 'Escape' && titleHelp && !titleHelp.classList.contains('hidden')) {
      e.preventDefault();
      closeTitleHelp();
      return;
    }
    const hub = document.getElementById('train-hub');
    if (hub && !hub.classList.contains('hidden')) {
      if (e.key === 'Escape') {
        e.preventDefault();
        ui.hideTrainHub();
      }
      return;
    }
    if ((e.key === 'Enter' || e.key === ' ') && (!titleHelp || titleHelp.classList.contains('hidden'))) {
      e.preventDefault();
      beginFromTitle();
    }
  });
} else {
  beginFromTitle();
}

// Debug/automation hook (also used by the browser smoke test).
window.ARISTEIA = {
  get game() { return game; },
  act: (a) => handleResult(game.act(a)),
  chooseBoon: (id) => { const r = game.chooseBoon(id); refresh(); return r; },
  clickHex,
  newRun,
  newTraining,
  newTrainingLesson,
  showTrainingHub,
  setMode,
  beginFromTitle,
  beginTraining,
};
