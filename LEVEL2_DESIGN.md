# Planet 2 — "Ember" · Level Design

> All numbers live in `src/level2.js`. Play it with `?level=2`, or finish Verdant and press **N**.

## 1. Purpose

Verdant taught moving, looking and jumping. Ember adds **three new verbs**, one
zone each, then combines them:

| Zone | New idea | What you do |
|---|---|---|
| **Landing Pad** (north pole) | none: a calm start | The ship landed safely. The outpost is right down the path |
| **Rustwell Outpost** (hub) | **Carrying** | Pick up an energy cell by the rover (E), carry it to the generator socket |
| **Steamvent Flats** (east) | **Hazards + timing** | Get the 2nd cell from the centre of a geyser ring, between lava pools, and carry it back |
| **Dustbowl Depot** (west) | **Building your own steps** | Stack two crates to climb onto the armory roof and take the blaster |
| **Signal Crater** (south) | **Shooting** | The gate field drops once the generator has power. Shoot the crystal shell and take the nav core |
| **Hidden Oasis** (far side) | Exploring | Optional. Palms and a meadow, with "???" on the map until you find it |
| ↩ Landing Pad | | Launch. An alien waves goodbye first (teaser for planet 3) |

**Story:** the ship works this time, but the nav computer is fried, so you need a nav core.

## 2. Map

```
                     LANDING PAD (N pole)
                           │ ~46 m
                  ┌────────┴────────┐
 DUSTBOWL DEPOT ──┤ RUSTWELL OUTPOST├── STEAMVENT FLATS
  (crates, blaster)│  generator hub │   (geysers, lava, cell 2)
                  └────────┬────────┘
                           │ ~86 m   ◄─ force field (needs power)
                     SIGNAL CRATER (tower, nav core)

   HIDDEN OASIS: far side of the planet, no path leads there
```

This time the outpost is a **hub**. Every trip passes through it, so it
becomes familiar, and the generator, your main goal, is always on the way.

**Gating:**
- Crater gate: opens when the generator is powered (both cells). An invisible wall runs along the rim behind the rocks, so the gate is the only way in (tested by walking at the rim from 12 directions).
- Nav core: needs the blaster (from the depot roof).
- You can do the Steamvent Flats and the Depot in either order.

## 3. Key metrics

| Metric | Value | Why |
|---|---|---|
| Planet radius | 55 m (Verdant: 50) | Slightly bigger, so it feels like progress |
| Carry speed | 4.2 m/s, no jumping | Makes the geyser run back harder than the run out |
| Crate size | 1.0 m | Wide enough to read clearly in the astronaut's arms. Energy cells are 1.34 m wide |
| Max stack | 2 crates | A 3-high stack (2.5 m) can't be climbed, so Nova refuses a third and explains why. A stack's top crate can be picked up from the ground |
| Armory roof | 3.94 m (armory at 105% scale, sitting on the ground) | One crate: max height 2.75 m ✗. Two stacked against the wall: ✓. **A 2-crate stack is required.** The third crate is a spare |
| Geyser cycle | 3.6 s: idle 1.2, warning 1.1, firing 1.3 | The warning (flicker + puffs) gives the player time to react |
| Geyser wave | 4 giant path vents (size 1.7, 6.5 m apart, flanked by lava) fire as a wave toward the cell; 7 vents in a closed ring around it fire in turn | Run behind the wave, wait in the pockets, go through a ring vent the moment it dies down |
| Geyser hit | Throws you up and back. **You drop what you're carrying** | A penalty, but not death |
| Lava | Death → fade → respawn at the last safe spot | Safe spots are ≥1.5 m from lava and ≥2.5 m from vents |
| Crystal shell | 6 hits | |

## 4. Wayfinding (same language as Verdant)

- **Blue beam = goal.** Energy cells, the blaster and the nav core all have one.
- **Orange pulsing ring = empty socket**, which turns blue when filled.
- **The radio tower** (27 m, blinking red light) is visible from most of the planet. It shows where the finale is.
- **Scorched ground** around lava and vents warns of danger before you reach it.
- **Canyon walls** in the Depot funnel you straight to the armory.
- The previous planet (green) and the next one (purple) are in the sky, and Ember's rings cross it.

## 5. Teach → test → combine

1. **Teach carrying safely:** cell 1 lies next to the rover, about 10 m from the generator, with no danger.
2. **Teach hazards without a load:** you cross the geysers empty-handed on the way out.
3. **Combine them:** on the way back you carry the cell, so you're slower and a hit makes you drop it.
4. **New use for an old verb:** in the Depot you carry crates to *build* a staircase, which reuses Verdant's jumping.
5. **Payoff:** the blaster, which opens the crater's sealed core. Shooting is introduced last and used in one place, and planet 3 can build on it.

## 6. New engine features (usable in future levels)

All are optional blocks in a level file:

- `itemTypes` / `items`: carryable (`carry`, `stack`) or equipable (`equip`) objects
- `sockets`: drop spots that accept an item type. A full `generator` group sends `power`
- `fields`: force fields that open on an event (`opensOn: 'power'`)
- `walls`: invisible ring walls with one opening (seals the crater rim)
- `hazards`: `lava` (respawn) and `geyser` (knock-back, timed)
- `breakables`: model groups with HP that you shoot apart
- `npc`: a scripted appearance after the last cell (the alien)
- `objective(g)` / `hintTarget(g)` / zone `hint(g)`: functions that adapt Nova and the HUD to progress
- Zone `rotate`, and `{ zone, toward, dist }` positions: place things relative to where the paths enter a zone
- `box: true` models get rectangular colliders you can stand on (buildings, crates)
- Carried items follow the astronaut's hands every frame. The blaster is lined up with the pointing hand, and the camera moves over the right shoulder while it's equipped
- Off-centre models are fixed automatically when loaded (the rubble pack and rover needed this)

## 7. Ideas / next steps

- A **jump-pad geyser** (a safe one that launches you onto a high ledge) to turn the hazard into a tool.
- Sound: geyser hiss and rumble, field hum, blaster zap.
- Planet 3 (purple): use the blaster against the aliens, who have `Punch`, `HitReact` and `Death` animations.
