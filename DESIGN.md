# Aristeia: Rage of Diomedes

*A Hoplite-inspired hex tactics roguelike, re-imagined through the Iliad.*

## Premise

You are Diomedes of Argos. Your *kleos* — the glory that is your name — has been torn from
you and kept by Ares on the Trojan plain. Athena steadies your spear: descend through eight
ranks of the host, wound the war god, take your kleos back, and flee for the ships.

The structure mirrors Diomedes' aristeia and its aftermath: a careful **descent** into the
ranks, and a desperate **flight** as pursuit troops pour after you.

## Design pillars (inherited from Hoplite)

1. **Hex grid, ~79 tiles, one action per turn.** Small boards, total information.
2. **Movement is combat.** Attacks trigger automatically from the geometry of your move.
3. **Fully deterministic.** No hit rolls, no fog. Every death is a misread, never bad luck.
4. **One hit kills — both ways** (with rare, telegraphed exceptions).
5. **Permadeath**, one boon choice per floor, achievement-style meta unlocks only.

## What we improve on Hoplite

| Hoplite weakness | ARISTEIA answer |
|---|---|
| Bash cooldown is a passive timer | **Stance system** — the rhythm is player-authored, not a countdown |
| 4 enemy types, one terrain hazard | 10+ yokai, 5 terrain types, and enemies that *interact with terrain* |
| Runs converge on the same prayer builds | Two boon economies: clean **kami blessings** vs cursed **yokai bargains** |
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
  a foe* cuts that foe down. Circling and slipping past enemies kills them; one move
  can cut several.
- **Spear thrust** (Hoplite's lunge): any move *directly toward* a foe kills it.
  Boon-upgradable to pierce through to the tile beyond.

### Actions

- **Walk** — one adjacent tile (not ditch, water, foe, pitch-jar, altar).
- **Athena's leap** (Hoplite's leap) — jump to a tile 2 away. **Costs 50 menos.**
  Triggers cuts and spear-sweeps; leaping *over* a foe delivers a pass-cut.
- **Shield-bash** (Hoplite's bash, reforged) — shove an adjacent foe or pitch-jar
  1 tile. **Costs 30 menos** (no cooldown — one unified economy). Pushes kill into ditches,
  watch-fire, and other jars. **But:** a Trojan elite that survives a bash is *enraged*
  (moves 2 tiles/turn until it attacks) — bashing is a real decision, not a free stall.
- **Throw javelin** — kills at range 2 along any axis
  (boon-upgradable to 3–4). While it lies on the ground you lose **Guard**, and you
  cannot pass a gate without retrieving it. Your spear is your life — it is never thrown.
- **Guard (aspis raised)** — requires javelin in hand. Spend your action to raise the
  shield until your next turn: any arrow, god-light beam, or jar along a hex
  axis is turned and **reflected back down its line**, killing the shooter if the line is
  clear. Enemy geometry becomes your geometry.
- **Libation / Sacrifice** — at an adjacent altar (once per rank), or *to a ford guard*.

---

## Foes of Troy

All foes die to one cut. All deal 1 resolve. Turn order: Diomedes acts → pitch-jars explode →
foes attack → foes move (fixed order set at rank start). A foe never attacks and
moves in the same turn.

| Foe | Role | Behavior |
|---|---|---|
| **Trojan Elite** | heavy infantry | Walks toward you, attacks adjacent. Enrages if bashed and not killed. |
| **Trojan Archer** | line archer | Shoots along the 6 axes, range 2–5, *cannot* shoot adjacent. Blocked by stelai and other foes. Keeps its distance. |
| **Elite Marksman** | volley caster | Silver volley range 1–5, hits everything in the line; won't fire through other foes; never twice in a row. **Freezes Scamander shallows into ice bridges for 3 turns.** |
| **Trojan Sapper** | demolitionist | Lobs a pitch-jar up to 3 tiles; it detonates at the start of your *next* turn. You can push the jar. Every 3 turns. |
| **Trojan Scout** | light elite | Melee — but leaps 2 tiles toward you when charged (recharges over 3 turns). Attacks your *escape routes* instead of your position. |
| **Ford Guard** | river infantry | Swims freely through water; slow on land (moves every other turn). **Pour a libation to an adjacent ford guard (costs your action) and he answers — losing his footing. Stunned 2 turns.** |
| **Pursuit Troop** | pursuit horde | Descent: absent. Flight only. Footman AI, but they keep coming. |
| **Ares** | rank-8 boss | Colossal form occupying 7 tiles (center + ring). Attacks all adjacent. Moves 1. Its one vulnerable tile — the **open wound** — rotates one step clockwise each turn. Kill him by striking the wound. |

## Terrain

| Tile | Effect |
|---|---|
| **Ditch** (the camp fosse) | Instant death. The bash target of choice. |
| **Scamander shallows** (water) | Impassable to you; ford guards swim it; elite marksman volleys freeze it into temporary bridges. |
| **Watch-fire** | Entering costs 1 resolve; leaping *over* is safe; foes pushed in die; foes path around it. |
| **Heroic stelai** | Block movement and all lines of fire — cover. Pitch-jars destroy them. |

## Altars & blessings

Every rank has one altar of Athena. Blessings from the Olympians:

The strongest cost a **portion of kleos**: permanent −1 max resolve. Reach the bottom with
no kleos offered and the ending changes.

Blessing pool: Second Breath (full heal) · Aegis of Athena (+1 max resolve) ·
Deep Menos (+20 max menos) · Ares' Hunger (+6 menos per kill) · Wide Sweep (arc 3→5 tiles) ·
Piercing Spear (thrust penetrates one further) · Far Javelin (+1 throw range) ·
Hermes' Sandals (leap range 3) · Zeus' Footfall (leap landings stagger adjacent
foes) · Odyssean Patience (unlocks wait) · **Aristeia** (kills on 3 consecutive
turns: full menos, javelin returns to hand).

## Structure: the Descent and the Flight

**Act I — Descent (ranks 1–8).** Hoplite pacing: navigate, cut, choose a blessing, take the
down-gate. Rank 8 holds **Ares** and, behind him, **your kleos**.

**Act II — The Flight (ranks 8→1).** Take your kleos and the plain wakes. Gates reverse. Each
rank regenerates, and every N turns the gate behind you spawns **pursuit troops**. Same
rules, inverted tempo: the descent rewards patience, the flight punishes it.

Mythic escape valve: like Izanagi throwing down his comb and peaches, you may **cast a
blessing away** at the down-gate — permanently losing that boon — to seal it against one
shikome wave. Your power is your ammunition. Arrive at layer 1 stripped bare, nameless no
more.

**Win:** pass the sealed gate at layer 1 with your name and your wakizashi.
**Lose:** 0 resolve. Yomi keeps you.

## Meta

- **Feats** (achievements) unlock new blessings/bargains into the shrine pool for future
  runs — e.g. *bow to 10 kappa* → unlocks Patient Blade; *deflect a gourd into its own
  tanuki* → unlocks a deflect upgrade.
- **Vows** (challenge mode): 3-layer gauntlets with a fixed boon loadout; daily seed.

## Open design questions

- Should Nurikabe facing be visible at all times or readable only from its slow turns?
- Flight layer regeneration: fully new layouts, or the descent layouts mirrored (memory
  as a skill)?
- Does bowing to kappa scale — one stun per kappa per layer, or unlimited?
- Boss density: only layer 8, or a mini-boss (rokurokubi nest?) at layer 4 as a midpoint
  exam?
