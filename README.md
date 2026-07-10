# Aristeia: Rage of Diomedes

A turn-based hex-grid roguelike inspired by Hoplite, re-imagined around Diomedes'
day of glory on the Trojan plain. Character tokens, terrain tiles, and the title screen
use Grok Imagine art under `assets/` (procedural FX and fallbacks remain).
Full design rationale in [DESIGN.md](DESIGN.md).

## Premise

You are Diomedes of Argos. Your *kleos* — the glory that is your name — has been
torn from you and kept by Ares himself. Descend through eight ranks of the Trojan
host, wound the war god at his open joint, take your kleos back, and flee for the
ships as pursuit troops pour after you.

Athena steadies your spear. The plain is deterministic. Every death is a misread.

## Run

ES modules need a server:

```sh
python3 -m http.server 8000
# open http://localhost:8000  (append ?seed=42 for a fixed run)
```

## Test

The rules engine is DOM-free and fully unit-tested:

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
| `js/ui.js` | side panel, altar modal, end overlay |
| `js/main.js` | wiring, input, `window.YOMI` debug hook |

Logic modules (`hex`→`ai`) never touch the DOM, so they run under Node for tests and bots.

## How to play

Works with mouse or touch. Mouse: hover previews a move (gold outline, vermillion ✕ on
anything it would kill), click commits. Touch: tap once to preview, tap again to commit;
the layout reflows for portrait phones.

Click/tap to walk; 2 tiles away for Athena's leap (50 menos). Moving **past** a foe cuts
it; moving **straight at** one thrusts. Your first strike from a **grounded spear** is a
sweeping arc — grounding the spear (S) staggers everything adjacent. Click adjacent foes
to shield-bash (30 menos); pour a libation (O) to ford guards; raise your aspis (D)
to turn arrows and god-light home. Sacrifice at Athena's altars — the strongest blessings
cost portions of kleos. Wound Ares on rank 8 by striking his glowing open wound, take
your kleos, and survive the flight back to the ships.

## Cast

| Foe | Role |
|---|---|
| **Trojan Elite** | Heavy infantry; enrages if bashed and not killed |
| **Trojan Archer** | Line archer; shoots along hex axes, range 2–5 |
| **Elite Marksman** | Silver volley beam; freezes Scamander shallows into ice bridges |
| **Trojan Sapper** | Lobs sparking pitch-jars |
| **Trojan Scout** | Light elite; leaps 2 tiles when charged |
| **Ford Guard** | River infantry; swims water; answer a libation and he loses footing |
| **Pursuit Troop** | Flight only — chasing infantry |
| **Ares** | Rank-8 boss; strike the rotating open wound |

## Debug hook

`window.YOMI` exposes `game`, `act`, `chooseBoon`, `clickHex`, `newRun`, `setMode`.
