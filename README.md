# Aristeia: The Day of Diomedes

A turn-based hex-grid roguelike inspired by Hoplite, re-imagined around Diomedes'
day of glory on the Trojan plain. Character tokens, terrain tiles, and the title screen
use Grok Imagine art under `assets/` (procedural FX and fallbacks remain).
Full design rationale in [DESIGN.md](DESIGN.md).

## Premise

Athena sets fire around Diomedes' helm and lifts the mortal mist from his eyes.
Break through eight Trojan lines, wound Ares where Athena reveals the opening,
reclaim your *kleos*, and fight back to the ships. Most foes fall in one strike;
Diomedes' resolve permits few mistakes.

## Run

ES modules need a server:

```sh
python3 -m http.server 8000
# open http://localhost:8000  (append ?seed=42 for a fixed run)
```

## Test

The rules engine is DOM-free and covered by unit tests:

```sh
node tests/run-tests.mjs
```

## Architecture

| File | Role |
|---|---|
| `js/hex.js` | axial hex math (pure functions) |
| `js/rng.js` | seeded RNG (mulberry32) |
| `js/board.js` | tiles, terrain, BFS fields |
| `js/entities.js` | Player / foes / Ares state |
| `js/boons.js` | Olympian blessings |
| `js/levelgen.js` | procedural ranks w/ connectivity guarantee |
| `js/game.js` | the rules engine: actions, combat geometry, turn resolution |
| `js/ai.js` | foe attack & movement phases |
| `js/sprites.js` | all procedural canvas art |
| `js/render.js` | board renderer + FX (reads game, never mutates) |
| `js/ui.js` | side panel, Athena statue modal, end overlay |
| `js/main.js` | wiring, input, `window.ARISTEIA` debug hook |

Logic modules (`hex`→`ai`) never touch the DOM, so they run under Node for tests and bots.

## How to play

Works with mouse or touch. Mouse: hover previews a move (gold outline, vermillion ✕ on
anything it would kill), click commits. Touch: tap once to preview, tap again to commit;
the layout reflows for portrait phones.

Choose a space to walk; 2 spaces away for Athena's leap (50 menos). Moving **past** a foe cuts
it; moving **straight at** one thrusts. Your first strike from a **grounded spear** is a
sweeping arc — grounding the spear (S) staggers everything adjacent. Click adjacent foes
to shield-bash (30 menos); pour a libation (O) to ford guards; raise your aspis (D)
to turn arrows and god-light home. Seek blessings beside Athena's images; some cost one
measure of kleos and 1 max resolve. At the eighth line, strike the opening Athena lights, take
your kleos, and survive the flight back to the ships.

## Cast

| Foe | Role |
|---|---|
| **Trojan Spearman** | Heavy infantry; enrages if bashed and not killed |
| **Trojan Archer** | Shoots in straight lines, range 2–5 |
| **Silver Marksman** | Silver volley; freezes Scamander shallows into ice bridges |
| **Pitch-Bearer** | Lobs sparking pitch-jars |
| **Trojan Skirmisher** | Leaps 2 spaces when charged |
| **Scamander Guard** | Swims water; a libation makes him lose his footing |
| **Pursuing Spearman** | Appears during the return to the ships |
| **Ares** | At the eighth line; Athena's light reveals the opening to wound him |

## Debug hook

`window.ARISTEIA` exposes `game`, `act`, `chooseBoon`, `clickHex`, `newRun`, `setMode`.
