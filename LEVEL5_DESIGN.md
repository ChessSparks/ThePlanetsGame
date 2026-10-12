# Planet 5 — "Haven" · Level Design

> All numbers live in `src/level5.js`. Play it with `game.html?level=5`, or finish Glacia and press **N**.

## 1. Purpose

Haven is the **turning point**, not the end. Nova arrives at her worst (damage 0.5, the heaviest glitching yet). The old station's repair pod patches her up (damage drops to 0.1, clearly sharper), but the patch is temporary. The station's logs point to **the Forge**, the shipyard where she was built, and that's planet 6. Its red, ringed silhouette hangs in Haven's sky.

The level is a **callback to every planet so far**, plus one new idea:

| Zone | Callback / new | What you do |
|---|---|---|
| **Docking Pad** (N pole) | none | Arrival cutscene: Nova glitching badly |
| **The Atrium** (hub) | Ember | A domed hall with 4 sliding doors. The dead generator needs 2 power cells |
| **Garden Dome** | Verdant | A glass dome, overgrown. Cell 1 on a planter in the middle |
| **Hangar** | Umbra | Cell 2, guarded: security robots wake up (2 waves). Shooting one **destroys** it: it collapses, sparks and smokes, then sinks away (no red glow) |
| **Repair Bay** | **New: broken gravity** | The door unlocks when the power is on. The floor is breached (open space below) between the walkway and the central island. Gravity is 0.6×, so a jump goes ~3 m high and ~11 m far |
| ↳ Puzzle | **New: the memory map** | At the pod's console, Nova's memory blocks are scrambled. Slide them back into order **1 to 15** (the 15-puzzle). The game pauses while it's open; Esc leaves and keeps your progress |
| ↳ Finale | none | Solving it plays the repair cutscene: the pod comes on, Nova recovers, and the logs name the Forge. Back to the ship |

## 2. Key numbers

| | |
|---|---|
| Planet radius | 58 m |
| Bay: walkway / breach / island | 14–18.5 m / 6.6–14 m / under 6.6 m from the centre |
| Low gravity | 0.6× inside 15.5 m, eased in and out. Floaty, not flying; the stepping platforms make every hop short |
| Stepping platforms | 4 kit "base" platforms at 10 m, for shorter hops |
| Falling into the breach | Not a death: you float back to the walkway and lose 20 health |
| Death | Back to the docking pad, progress kept |
| Robots | Sentry (melee), Gunner (shoots), Drone (hovers, shoots), only in the hangar. No boss: the finale is a puzzle |
| Memory map | A 4×4 sliding puzzle, shuffled with 90 random legal moves (always solvable, a few minutes). `moves` in the terminal sets the difficulty |

## 3. How it's built

- **The sci-fi kit is one file.** Each piece is pulled out by name: `{ url: KIT, part: 'Wall_1' }`. The file loads once.
- **Wall rings with doors:** `{ ring: 'wallWindow', radius, doors: ['dock', 'garden', ...], doorFrame, door }`. Walls fill the arcs between doorways. Each doorway gets a frame and a **sliding door** that opens as you approach. `{ toward: 'atrium', lockedUntil: 'power' }` keeps a door shut until an event.
- **Glass domes** (`structures: glassDome`) rest on the wall rings. Their rim height is lowered by the planet's curve.
- Floor tiles are laid on a 2 m grid with `heading` alignment.
- `terminals`: consoles that open a screen when you press E (here the 15-puzzle, `src/puzzle15.js`), optionally locked until an event (`requires`); solving emits `onSolved`.
- `hazards: breach`, `lowGravity`, `eventLights`, and `nova.fadeOn` (Nova's damage changes when an event happens) are all reusable.
- The robots' animation names are mapped with `anims` (Punch → Attack, etc.). Drones use `hover`.

## 4. Ideas / next steps

- Planet 6, **the Forge**: industrial, red, molten. The place that can fully fix Nova, or where the real ending happens.
- Sound: door swish, the generator powering up, the low-gravity whoosh.
