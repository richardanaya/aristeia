// DOM side panel, altar modal, and end-of-run overlay.

import { BOONS } from './boons.js';
import { dist } from './hex.js';

export class UI {
  constructor(root) {
    this.el = {};
    for (const id of [
      'layer', 'hearts', 'kibar', 'kitext', 'stance', 'blades', 'streak',
      'log', 'modal', 'overlay', 'mode-banner',
      'btn-sheathe', 'btn-deflect', 'btn-throw', 'btn-push', 'btn-bow',
      'btn-pray', 'btn-wait', 'btn-new',
    ]) {
      this.el[id] = root.querySelector(`#${id}`);
    }
  }

  refresh(game, inputMode) {
    const p = game.player;
    const flight = game.mode === 'flight';
    this.el.layer.textContent = flight
      ? `RANK ${game.layer} — THE FLIGHT`
      : `Rank ${game.layer} of ${8} — Descent`;
    this.el.layer.classList.toggle('flight', flight);

    this.el.hearts.innerHTML = '';
    for (let i = 0; i < p.maxResolve; i++) {
      const s = document.createElement('span');
      s.className = 'magatama' + (i < p.resolve ? ' full' : '');
      s.textContent = '◆';
      this.el.hearts.appendChild(s);
    }
    if (p.memoriesLost > 0) {
      const m = document.createElement('span');
      m.className = 'memories';
      m.textContent = ` ✕${p.memoriesLost} kleos offered`;
      this.el.hearts.appendChild(m);
    }

    this.el.kibar.style.width = `${(p.ki / p.maxKi) * 100}%`;
    this.el.kitext.textContent = `${p.ki}/${p.maxKi} menos`;
    this.el.stance.textContent = p.deflecting
      ? 'ASPIS RAISED (guarding)'
      : p.sheathed ? 'SPEAR GROUNDED — sweep ready' : 'SPEAR LEVELLED';
    this.el.stance.className = 'stance ' + (p.sheathed ? 'sheathed' : 'drawn');

    this.el.blades.textContent =
      (p.hasWakizashi ? '⚔ javelin in hand' : '⚔ javelin LOST — recover it') +
      (p.hasName ? '  ·  ⚑ you carry your KLEOS' : '');
    this.el.streak.textContent = p.has('zanshin') && p.killStreak > 0
      ? `aristeia ${p.killStreak}/3` : '';

    // Button states.
    this.el['btn-sheathe'].disabled = p.sheathed;
    this.el['btn-deflect'].disabled = !p.hasWakizashi;
    this.el['btn-throw'].disabled = !p.hasWakizashi;
    this.el['btn-wait'].disabled = !p.has('patient-blade');
    this.el['btn-pray'].disabled = !game.shrinePos || game.shrineUsed
      || dist(p.pos, game.shrinePos) !== 1;
    this.el['btn-bow'].disabled = !game.yokai.some((y) =>
      y.kind === 'kappa' && dist(y.pos, p.pos) === 1);
    this.el['btn-push'].disabled = p.ki < 30;

    for (const [btn, mode] of [['btn-throw', 'throw'], ['btn-push', 'push'], ['btn-bow', 'bow']]) {
      this.el[btn].classList.toggle('active', inputMode === mode);
    }
    this.el['mode-banner'].textContent =
      inputMode === 'throw' ? 'THROW — click a foe in range (Esc to cancel)'
      : inputMode === 'push' ? 'BASH — click an adjacent foe or jar (Esc to cancel)'
      : inputMode === 'bow' ? 'LIBATION — click an adjacent ford guard (Esc to cancel)'
      : '';

    this.el.log.innerHTML = game.log.slice(-8).map((l) => `<div>${l}</div>`).join('');
    this.el.log.scrollTop = this.el.log.scrollHeight;
  }

  showShrine(game, offer, onChoose) {
    const m = this.el.modal;
    m.innerHTML = `
      <div class="modal-box">
        <h2>⚗ Athena is listening</h2>
        <p class="modal-sub">Choose a blessing at her statue. Some demand a portion of your kleos.</p>
        <div class="boons"></div>
        <button class="cancel">Not yet (step away)</button>
      </div>`;
    const list = m.querySelector('.boons');
    for (const id of offer) {
      const b = BOONS[id];
      const card = document.createElement('button');
      card.className = 'boon-card';
      card.innerHTML = `<strong>${b.name}</strong><span>${b.desc}</span>` +
        (b.memory > 0 ? `<em class="cost">costs ${b.memory} kleos (−${b.memory} max resolve)</em>` : '');
      card.onclick = () => { m.classList.add('hidden'); onChoose(id); };
      list.appendChild(card);
    }
    m.querySelector('.cancel').onclick = () => { m.classList.add('hidden'); onChoose(null); };
    m.classList.remove('hidden');
  }

  showEnd(game, onNew) {
    const o = this.el.overlay;
    const p = game.player;
    const won = game.won;
    o.innerHTML = `
      <div class="modal-box end">
        <h2>${won ? 'You walk out of the plain' : 'Hades keeps you'}</h2>
        <p>${won
          ? `Dawn is grey and cold and yours. ${p.memoriesLost > 0
              ? `You offered ${p.memoriesLost} portion${p.memoriesLost > 1 ? 's' : ''} of kleos — but you kept your name.`
              : 'You kept every portion of kleos, and your name. A perfect aristeia.'}`
          : `Your resolve failed on rank ${game.layer}${game.mode === 'flight' ? ', so close to the ships' : ''}. Pursuit troops are already gathering.`}</p>
        <p class="seed">seed ${game.seed}</p>
        <button id="btn-again">New Run (N)</button>
      </div>`;
    o.querySelector('#btn-again').onclick = onNew;
    o.classList.remove('hidden');
  }

  hideEnd() { this.el.overlay.classList.add('hidden'); }
}
