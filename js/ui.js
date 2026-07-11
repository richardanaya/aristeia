// DOM side panel, altar modal, end-of-run overlay, and Akilles training hub.

import { BOONS } from './boons.js';
import { dist } from './hex.js';
import { LESSONS } from './training.js';

export class UI {
  constructor(root) {
    this.root = root;
    this.modalReturnFocus = new Map();
    this.el = {};
    for (const id of [
      'rank', 'hearts', 'menosbar', 'menostext', 'stance', 'equipment', 'streak',
      'log', 'modal', 'overlay', 'mode-banner',
      'btn-ground-spear', 'btn-guard', 'btn-throw', 'btn-push', 'btn-libation',
      'btn-sacrifice', 'btn-wait', 'btn-new',
      'train-hub', 'train-grid',
    ]) {
      this.el[id] = root.querySelector(`#${id}`);
    }
  }

  openModal(element) {
    if (!element) return;
    this.modalReturnFocus.set(element, this.root.activeElement);
    element.classList.remove('hidden');
    const app = this.root.querySelector('#app');
    const title = this.root.querySelector('#title-screen');
    for (const background of [app, title]) {
      if (background && !background.contains(element)) background.inert = true;
    }
    requestAnimationFrame(() => element.querySelector('button, [href], [tabindex]:not([tabindex="-1"])')?.focus());
  }

  closeModal(element) {
    if (!element) return;
    element.classList.add('hidden');
    for (const background of [this.root.querySelector('#app'), this.root.querySelector('#title-screen')]) {
      if (background) background.inert = false;
    }
    this.modalReturnFocus.get(element)?.focus?.();
    this.modalReturnFocus.delete(element);
  }

  refresh(game, inputMode) {
    if (!game) return;
    const p = game.player;
    const flight = game.mode === 'flight';
    const training = game.mode === 'training';
    if (training) {
      this.el.rank.textContent = game.trainingTitle
        ? `PRACTICE DRILL · ${game.trainingTitle}`
        : `PRACTICE DRILL ${game.trainingLesson + 1}`;
    } else {
      this.el.rank.textContent = flight
        ? `TROJAN LINE ${game.rank} OF 8 · RETURN`
        : `TROJAN LINE ${game.rank} OF 8 · ADVANCE`;
    }
    this.el.rank.classList.toggle('flight', flight);

    this.el.hearts.innerHTML = '';
    for (let i = 0; i < p.maxResolve; i++) {
      const s = document.createElement('span');
      s.className = 'magatama' + (i < p.resolve ? ' full' : '');
      s.textContent = '◆';
      this.el.hearts.appendChild(s);
    }
    if (p.kleosOffered > 0) {
      const m = document.createElement('span');
      m.className = 'memories';
      m.textContent = ` · ${p.kleosOffered} measure${p.kleosOffered > 1 ? 's' : ''} of kleos offered`;
      this.el.hearts.appendChild(m);
    }

    this.el.menosbar.style.width = `${(p.menos / p.maxMenos) * 100}%`;
    this.el.menostext.textContent = `${p.menos}/${p.maxMenos} menos`;
    this.el.stance.textContent = p.guarding
      ? 'ASPIS RAISED · ranged attacks reflected'
      : p.spearGrounded ? 'SPEAR GROUNDED · next killing move sweeps' : 'SPEAR LEVELLED · movement strikes';
    this.el.stance.className = 'stance ' + (p.spearGrounded ? 'spearGrounded' : 'drawn');

    this.el.equipment.textContent =
      (p.hasJavelin ? 'JAVELIN · IN HAND' : 'JAVELIN · RECOVER BEFORE ADVANCING') +
      (p.hasKleos ? '  ·  KLEOS · RECLAIMED' : '');
    this.el.streak.textContent = p.has('aristeia-boon') && p.killStreak > 0
      ? `UNBROKEN ARISTEIA · ${p.killStreak} OF 3 TURNS` : '';

    // Button states.
    this.el['btn-ground-spear'].disabled = p.spearGrounded;
    this.el['btn-guard'].disabled = !p.hasJavelin;
    this.el['btn-throw'].disabled = !p.hasJavelin;
    this.el['btn-wait'].disabled = !p.has('patient-spear');
    this.el['btn-sacrifice'].disabled = !game.athenaStatuePos || game.athenaStatueUsed
      || dist(p.pos, game.athenaStatuePos) !== 1;
    this.el['btn-libation'].disabled = !game.foes.some((y) =>
      y.kind === 'fordGuard' && dist(y.pos, p.pos) === 1);
    this.el['btn-push'].disabled = p.menos < 30;

    if (this.el['btn-new']) {
      this.el['btn-new'].textContent = training
        ? 'All Drills ‹'
        : 'Begin Again (N)';
    }

    for (const [btn, mode] of [['btn-throw', 'throw'], ['btn-push', 'push'], ['btn-libation', 'libation']]) {
      this.el[btn].classList.toggle('active', inputMode === mode);
    }
    this.el['mode-banner'].textContent =
      inputMode === 'throw' ? 'THROW JAVELIN · choose a foe in range · Esc cancels'
      : inputMode === 'push' ? 'SHIELD-BASH · choose an adjacent foe or jar · costs 30 menos · Esc cancels'
      : inputMode === 'libation' ? 'POUR LIBATION · choose an adjacent Scamander Guard · Esc cancels'
      : training && game.trainingHowto
        ? game.trainingHowto
        : '';

    this.el.log.innerHTML = game.log.slice(-8).map((l) => `<div>${l}</div>`).join('');
    this.el.log.scrollTop = this.el.log.scrollHeight;
  }

  showAthenaStatue(game, offer, onChoose) {
    const m = this.el.modal;
    m.innerHTML = `
      <div class="modal-box" role="dialog" aria-modal="true" aria-labelledby="blessing-heading">
        <h2 id="blessing-heading">Athena Hears You</h2>
        <p class="modal-sub">Choose one blessing. A listed cost takes that measure of kleos and the same amount of max resolve.</p>
        <div class="boons"></div>
        <button class="cancel">Not yet (step away)</button>
      </div>`;
    const list = m.querySelector('.boons');
    for (const id of offer) {
      const b = BOONS[id];
      const card = document.createElement('button');
      card.className = 'boon-card';
      card.innerHTML = `<strong>${b.name}</strong><span>${b.desc}</span>` +
        (b.kleosCost > 0 ? `<em class="cost">Cost: ${b.kleosCost} measure of kleos and −${b.kleosCost} max resolve</em>` : '<em class="cost">No kleos cost</em>');
      card.onclick = () => { this.closeModal(m); onChoose(id); };
      list.appendChild(card);
    }
    m.querySelector('.cancel').onclick = () => { this.closeModal(m); onChoose(null); };
    this.openModal(m);
  }

  /**
   * @param {import('./game.js').Game} game
   * @param {{ onRetry: () => void, onHub?: () => void, onNew?: () => void }} handlers
   */
  showEnd(game, handlers) {
    const o = this.el.overlay;
    const p = game.player;
    const won = game.won;
    const training = game.mode === 'training' || game.training;
    const onRetry = typeof handlers === 'function' ? handlers : handlers.onRetry;
    const onHub = typeof handlers === 'object' ? handlers.onHub : null;
    const onNew = typeof handlers === 'object' ? handlers.onNew : null;

    let title, body;
    if (training) {
      title = won ? 'Drill Complete' : 'Your Guard Breaks';
      body = won
        ? 'Achilles: “Cleanly done. Choose another drill, or return to the plain.”'
        : 'Achilles: “Rise. Read the distance, and begin again.”';
    } else {
      title = won ? 'The Ships Before You' : 'Your Aristeia Ends';
      body = won
        ? `Ares bears your wound to Olympus. The ships stand before you, and your name is your own again${p.kleosOffered > 0 ? `, though ${p.kleosOffered} measure${p.kleosOffered > 1 ? 's were' : ' was'} offered` : ''}.`
        : game.mode === 'flight'
          ? `You fall while returning through Trojan line ${game.rank}. Your kleos had blazed again; now the plain closes over it.`
          : `You fall while advancing through Trojan line ${game.rank}. The ships wait behind you.`;
    }

    if (training) {
      o.innerHTML = `
        <div class="modal-box end" role="dialog" aria-modal="true" aria-labelledby="end-heading">
          <h2 id="end-heading">${title}</h2>
          <p>${body}</p>
          <div class="end-actions">
            <button type="button" id="btn-again">Begin Again (N)</button>
            <button type="button" id="btn-hub">All Drills</button>
          </div>
        </div>`;
      o.querySelector('#btn-again').onclick = () => { o.classList.add('hidden'); onRetry(); };
      o.querySelector('#btn-hub').onclick = () => { o.classList.add('hidden'); onHub && onHub(); };
    } else {
      o.innerHTML = `
        <div class="modal-box end" role="dialog" aria-modal="true" aria-labelledby="end-heading">
          <h2 id="end-heading">${title}</h2>
          <p>${body}</p>
          <p class="seed">seed ${game.seed}</p>
          <button type="button" id="btn-again">Begin Again (N)</button>
        </div>`;
      o.querySelector('#btn-again').onclick = () => {
        o.classList.add('hidden');
        (onNew || onRetry)();
      };
    }
    this.openModal(o);
  }

  hideEnd() { this.closeModal(this.el.overlay); }

  /**
   * Training hub: Akilles face + grid of scenario puzzles.
   * @param {{ onPick: (index: number) => void, onBack: () => void }} handlers
   */
  showTrainHub({ onPick, onBack }) {
    const hub = this.el['train-hub'];
    const grid = this.el['train-grid'];
    if (!hub || !grid) return;
    grid.innerHTML = '';
    LESSONS.forEach((L, i) => {
      const card = document.createElement('button');
      card.type = 'button';
      card.className = 'train-card';
      card.innerHTML = `
        <span class="train-card-num">${String(i + 1).padStart(2, '0')}</span>
        <strong>${L.title}</strong>
        <span class="train-card-sum">${L.summary}</span>`;
      card.onclick = () => onPick(i);
      grid.appendChild(card);
    });
    const back = hub.querySelector('#train-hub-back');
    if (back) back.onclick = onBack;
    this.openModal(hub);
  }

  hideTrainHub() {
    const hub = this.el['train-hub'];
    if (hub) this.closeModal(hub);
  }
}
