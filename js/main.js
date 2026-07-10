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

let game;
let inputMode = 'move'; // 'move' | 'throw' | 'push' | 'bow'
let started = false;

function newRun(seed) {
  game = new Game({ seed: seed ?? ((Math.random() * 0xffffffff) >>> 0) });
  renderer.attach(game);
  ui.hideEnd();
  setMode('move');
  refresh();
}

function beginFromTitle() {
  if (started) return;
  started = true;
  if (titleScreen) titleScreen.classList.add('hidden');
  if (titleHelp) titleHelp.classList.add('hidden');
  if (titleVideo) {
    titleVideo.pause();
    titleVideo.removeAttribute('src');
    titleVideo.load();
  }
  const urlSeed = new URLSearchParams(location.search).get('seed');
  newRun(urlSeed ? Number(urlSeed) >>> 0 : undefined);
  requestAnimationFrame(loop);
}

function setMode(mode) {
  inputMode = mode;
  renderer.mode = mode;
  refresh();
}

function refresh() {
  ui.refresh(game, inputMode);
  if (game.over || game.won) {
    setTimeout(() => ui.showEnd(game, () => newRun()), 600);
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
    ui.showShrine(game, res.offer, (id) => {
      const pick = game.chooseBoon(id);
      if (pick.ok && pick.events) renderer.addEvents(pick.events);
      refresh();
    });
  }
  setMode('move');
  refresh();
}

// A click on the board, resolved by current input mode with smart defaults.
function clickHex(hex) {
  if (game.over || game.won || game.pendingOffer) return;
  const p = game.player;

  if (inputMode === 'throw') return handleResult(game.act({ type: 'throw', to: hex }));
  if (inputMode === 'push') return handleResult(game.act({ type: 'push', to: hex }));
  if (inputMode === 'bow') return handleResult(game.act({ type: 'bow', to: hex }));

  // Move mode with smart defaults on occupied tiles:
  const y = game.yokaiAt(hex);
  const d = dist(p.pos, hex);
  if (y && d === 1) {
    if (y.kind === 'kappa') return handleResult(game.act({ type: 'bow', to: hex }));
    return handleResult(game.act({ type: 'push', to: hex }));
  }
  if (game.gourdAt(hex) && d === 1) return handleResult(game.act({ type: 'push', to: hex }));
  if (y && p.hasWakizashi && d <= p.throwRange()) {
    return handleResult(game.act({ type: 'throw', to: hex }));
  }
  if (game.shrinePos && eq(game.shrinePos, hex) && d === 1) {
    return handleResult(game.act({ type: 'pray' }));
  }
  handleResult(game.act({ type: 'move', to: hex }));
}

// Unified mouse + touch input via pointer events.
// Mouse: hover previews, click commits. Touch: first tap previews, second tap commits.
function eventHex(e) {
  const r = canvas.getBoundingClientRect();
  return renderer.screenToHex(e.clientX - r.left, e.clientY - r.top);
}

function setHover(hex) {
  if (!game) return;
  const foe = game.yokaiAt(hex);
  let featureLabel = null;
  if (game.gatePos && eq(hex, game.gatePos)) {
    featureLabel = game.mode === 'flight'
      ? 'Map — Flee to the ships'
      : 'Map — Onward into Battle';
  } else if (game.shrinePos && eq(hex, game.shrinePos)) {
    featureLabel = game.shrineUsed ? "Athena's statue (spent)" : "Athena's statue";
  } else {
    const terr = game.board.terrain(hex);
    if (terr === 'chasm') featureLabel = 'Planks on Fire';
    else if (terr === 'fire') featureLabel = 'Fire — scorches resolve';
  }
  renderer.hover = {
    hex,
    preview: inputMode === 'move' && !foe ? game.previewMove(hex) : null,
    // Hovering a foe telegraphs its attack range; otherwise show move preview.
    threat: foe ? game.threatTiles(foe) : null,
    threatFoe: foe || null,
    featureLabel,
  };
}

canvas.addEventListener('pointerdown', (e) => {
  e.preventDefault();
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
  if (e.pointerType !== 'mouse') return;
  setHover(eventHex(e));
});

canvas.addEventListener('pointerleave', (e) => {
  if (e.pointerType === 'mouse') renderer.hover = null;
});

document.addEventListener('keydown', (e) => {
  if (e.repeat || !started || !game) return;
  switch (e.key.toLowerCase()) {
    case 's': handleResult(game.act({ type: 'sheathe' })); break;
    case 'd': handleResult(game.act({ type: 'deflect' })); break;
    case 'r': handleResult(game.act({ type: 'pray' })); break;
    case 'w': case ' ': handleResult(game.act({ type: 'wait' })); e.preventDefault(); break;
    case 't': setMode(inputMode === 'throw' ? 'move' : 'throw'); break;
    case 'b': setMode(inputMode === 'push' ? 'move' : 'push'); break;
    case 'o': setMode(inputMode === 'bow' ? 'move' : 'bow'); break;
    case 'n': newRun(); break;
    case 'escape': setMode('move'); break;
    default: break;
  }
});

document.getElementById('btn-sheathe').onclick = () => handleResult(game.act({ type: 'sheathe' }));
document.getElementById('btn-deflect').onclick = () => handleResult(game.act({ type: 'deflect' }));
document.getElementById('btn-pray').onclick = () => handleResult(game.act({ type: 'pray' }));
document.getElementById('btn-wait').onclick = () => handleResult(game.act({ type: 'wait' }));
document.getElementById('btn-throw').onclick = () => setMode(inputMode === 'throw' ? 'move' : 'throw');
document.getElementById('btn-push').onclick = () => setMode(inputMode === 'push' ? 'move' : 'push');
document.getElementById('btn-bow').onclick = () => setMode(inputMode === 'bow' ? 'move' : 'bow');
document.getElementById('btn-new').onclick = () => newRun();

window.addEventListener('resize', () => renderer.resize());

function loop(t) {
  // A draw error must never kill the animation chain (a frozen canvas
  // looks like a hung game even though the engine is fine).
  try {
    renderer.frame(t);
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
  if (titleHelp) titleHelp.classList.remove('hidden');
}
function closeTitleHelp(e) {
  if (e) e.stopPropagation();
  if (titleHelp) titleHelp.classList.add('hidden');
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
    if ((e.key === 'Enter' || e.key === ' ') && (!titleHelp || titleHelp.classList.contains('hidden'))) {
      e.preventDefault();
      beginFromTitle();
    }
  });
} else {
  beginFromTitle();
}

// Debug/automation hook (also used by the browser smoke test).
window.YOMI = {
  get game() { return game; },
  act: (a) => handleResult(game.act(a)),
  chooseBoon: (id) => { const r = game.chooseBoon(id); refresh(); return r; },
  clickHex,
  newRun,
  setMode,
  beginFromTitle,
};
