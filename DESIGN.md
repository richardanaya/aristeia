# Aristeia: The Day of Diomedes

*A Hoplite-inspired hex tactics roguelike, re-imagined through the Iliad.*

## Premise

Athena sets fire around Diomedes' helm and lifts the mortal mist from his eyes. He breaks
through eight Trojan lines, wounds Ares where Athena reveals the opening, reclaims his
*kleos*, and fights back to the ships.

The structure mirrors Diomedes' aristeia and its aftermath: a careful **descent** into the
ranks, and a desperate **flight** as pursuit troops pour after you.

## Design pillars (inherited from Hoplite)

1. **Hex grid, ~79 tiles, one action per turn.** Small boards, total information.
2. **Movement is combat.** Attacks trigger automatically from the geometry of your move.
3. **Fully deterministic.** No hit rolls, no fog. Every death is a misread, never bad luck.
4. **Most foes fall in one strike.** Diomedes' resolve permits few mistakes.
5. **Permadeath**, one blessing choice per line.

## What we improve on Hoplite

| Hoplite weakness | ARISTEIA answer |
|---|---|
| Bash cooldown is a passive timer | **Stance system** — the rhythm is player-authored, not a countdown |
| 4 enemy types, one terrain hazard | 10+ foes, 5 terrain types, and enemies that *interact with terrain* |
| Runs converge on the same sacrifice builds | Two boon economies: clean **Olympian blessings** vs cursed **foe bargains** |
| The game ends at the fleece; depth 16+ is more of the same | **The Flight** — a second act that reuses every rule under time pressure |
| Waiting is simply forbidden | Waiting is a *weapon* (grounding the spear stuns; libations disarm ford guards) |

---

## Diomedes

### Resolve (health)
Start **3/3** (max 8). Every foe hit takes 1. At 0 you die on the plain.

### Menos (energy — battle-fury)
Start **100/100**, refilled each rank.
- **+10** per turn spent adjacent to a foe — courage under threat, doubled while the spear is grounded.
- **+10** per kill.

### The stance system — spear grounded / levelled (the core mechanic)

Your dory is either **grounded** or **levelled**. This replaces Hoplite's bash cooldown with
a rhythm you control:

- **Grounded:** No automatic cuts. Double menos regen. Your *next* move that would
  trigger a cut instead releases a **spear-sweep** — hitting a **3-tile arc**
  in your direction of movement. Levelling is free; it happens as part of the move.
- **Levelled:** Hoplite-style automatic attacks (see Cuts, below).
- **Grounding the spear:** costs your full action, but the moment of stillness **staggers all
  adjacent foes for one turn** (they neither attack nor move).

The loop: *ground (defensive stun) → move (arc kill on the rise) → fight levelled
(automatic cuts) → ground again.* No timers. The cooldown is a decision.

### Cuts (automatic, while levelled)

- **Pass-cut** (Hoplite's stab): any move that passes between two tiles *both adjacent to
  a foe* cuts that foe down. Circling and slipping past enemies kills them.
  **One cut per move** — never multi-kill with a single step.
- **Spear thrust** (Hoplite's lunge): any move *directly toward* a foe kills it.
  Boon-upgradable to pierce through to the tile beyond.

### Actions

- **Walk** — one adjacent tile (not burning planks, water, foe, pitch-jar, or Athena statue).
- **Athena's leap** (Hoplite's leap) — jump to a tile 2 away. **Costs 50 menos.**
  Triggers cuts and spear-sweeps; leaping *over* a foe delivers a pass-cut.
- **Shield-bash** (Hoplite's bash, reforged) — shove an adjacent foe or pitch-jar
  1 tile. **Costs 30 menos** (no cooldown — one unified economy). Pushes kill into ditches,
  watch-fire, and other jars. **No crush:** shoving into another living foe is blocked.
  **But:** a Trojan elite that survives a bash is *enraged*
  (moves 2 tiles/turn until it attacks) — bashing is a real decision, not a free stall.
- **Throw javelin** — kills at range 2 in a straight line
  (blessing-upgradable to 3). While it lies on the ground you lose **Guard**, and you
  cannot advance without retrieving it.
- **Guard (aspis raised)** — requires javelin in hand. Spend your action to raise the
  shield until your next turn: any arrow, god-light beam, or jar along a hex
  axis is turned and **reflected back down its line**, killing the shooter if the line is
  clear. Enemy geometry becomes your geometry.
- **Libation / Sacrifice** — libation targets an adjacent ford guard; sacrifice uses an adjacent Athena statue once per rank.

---

## Foes of Troy

All foes die to one cut. All deal 1 resolve. Turn order: Diomedes acts → pitch-jars explode →
foes attack → foes move (fixed order set at rank start). A foe never attacks and
moves in the same turn.

| Foe | Role | Behavior |
|---|---|---|
| **Trojan Spearman** | heavy infantry | Walks toward you, attacks adjacent. Enrages if bashed and not killed. |
| **Trojan Archer** | line archer | Shoots in straight lines, range 2–5, and cannot shoot adjacent. Blocked by stelai and other foes. |
| **Silver Marksman** | volley caster | Silver volley range 1–5; never fires twice in a row. Freezes Scamander shallows into temporary ice bridges. |
| **Pitch-Bearer** | jar thrower | Lobs a pitch-jar up to 3 spaces; it detonates at the start of your next turn. You can push the jar. |
| **Trojan Skirmisher** | light infantry | Leaps 2 spaces toward you when charged. |
| **Scamander Guard** | river infantry | Swims through water and moves slowly on land. An adjacent libation staggers him for 2 turns. |
| **Pursuing Spearman** | pursuing infantry | Appears only during the return to the ships. |
| **Ares** | war god | Occupies 7 spaces and attacks all adjacent spaces. Athena's light moves around him, revealing the one place where bronze can wound and drive him to Olympus. |

## Terrain

| Tile | Effect |
|---|---|
| **Burning planks** | Instant death. The bash target of choice. |
| **Scamander shallows** (water) | Impassable to you; ford guards swim it; elite marksman volleys freeze it into temporary bridges. |
| **Watch-fire** | Entering costs 1 resolve; leaping *over* is safe; foes pushed in die; foes path around it. |
| **Heroic stelai** | Block movement and all lines of fire — cover. Pitch-jars destroy them. |

## Athena Statues & Blessings

Every Trojan line has one image of Athena where Diomedes may seek a blessing:

Some cost a **measure of kleos** and permanently reduce max resolve by the same amount.

Blessing pool: Second Breath (full heal) · Aegis of Athena (+1 max resolve) ·
Athena's Vigor (+20 max menos and restore 20) · Tydides' Fury (+6 menos per kill) · Grey-Eyed Reach (sweep 3→5 spaces) ·
Spear of Tydeus (thrust reaches one space farther) · Long Cast (throw range 3) ·
Athena's Swift Step (leap range 3) · Aegis-Shock (leap landings stagger adjacent
foes) · Measured Spear (unlocks waiting) · **Unbroken Aristeia** (kills on 3 consecutive
turns: full menos, javelin returns to hand).

## Structure: the Descent and the Flight

**Act I — Advance (lines 1–8).** Navigate, cut, choose a blessing, and cross each line.
The eighth holds **Ares** and your **kleos**.

**Act II — Return (lines 8→1).** Take your kleos and the plain wakes. Each line is remade,
and every 4 turns a **pursuing spearman** may enter behind you.

**Win:** cross the way to the ships from line 1 with your kleos and javelin.
**Lose:** 0 resolve. Hades keeps you.
