# Planet 3 — "Umbra" · Level Design

> All numbers live in `src/level3.js`. Play it with `?level=3`, or finish Ember and press **N**.

## 1. Purpose

Umbra is the **combat planet**. Planet 1 taught moving and jumping, and planet 2 taught carrying, hazards and the blaster. Here you fight, but **you cure the aliens instead of killing them**. Infected locals collapse, the purple blight drifts out of them, their real colours come back, and they get up, wave, and wander off.

**Story:** the little alien that waved at you on Ember lives here. A blight from the old ruins is turning its people hostile. You help the village, fight your way through the hive, cure the giant brute guarding the ruins, and shatter the blight crystal. Its portal is your way out.

| Zone | Teaches | What happens |
|---|---|---|
| **Landing Glade** (N pole) | none | **Cutscene:** the friendly local greets you, then runs off toward its village |
| **Lumen Village** | Talking (**E**) | **Cutscene:** the elder (by the campfire) explains the blight and asks you to free his people, not harm them |
| **Glowcap Forest** | **Bounce mushrooms**, spores, health | A practice pad launches you up to a floating health capsule. Spore clouds hurt, so go around or roll through them |
| **Blighted Hive** | **Combat + dodge roll (Q)** | A ring of thorns surrounds it, and only the glowcaps outside launch you over. Two waves: 3 grunts, then 2 grunts and 2 spitters |
| **Sunken Ruins** | **Boss** | The blight thorns sealing the entrance wither once the hive is cleared. **Cutscene:** the Blighted Brute steps out of the portal. Cure it, then shatter the crystal |
| ↩ Portal | | **Cutscene:** the portal turns cyan and your friend says goodbye. Walk in to finish |

## 2. Map

```
              LANDING GLADE (N pole) ── ship
                     │ ~42 m
               LUMEN VILLAGE ── elder, campfire, domes
                     │ ~62 m
              GLOWCAP FOREST ── practice pad, spores, health
                     │ ~58 m
        ┌──────── thorn ring (bounce over) ────────┐
        │          BLIGHTED HIVE: 2 waves          │
        └─────── thorns wither when cleared ───────┘
                     │ ~61 m
        ┌── column ring, thorn gate (withers after the hive) ──┐
        │   SUNKEN RUINS: boss → crystal → portal (exit)    │
        └───────────────────────────────────────────────────┘
```

The route is **linear** for the first time. That's on purpose: combat needs a clear "now you fight" moment. The gates are the thorn ring (crossed by bouncing in) and the ruins (a ring of columns with an invisible wall; the thorn gate is the only door).

## 3. Key metrics

| Metric | Value | Why |
|---|---|---|
| Planet radius | 60 m | It keeps growing: 50 → 55 → 60 |
| Player health | 100, regenerates 6/s after 4 s without damage | Forgiving: mistakes cost time, not progress |
| Defeat | Fade → respawn at the last safe spot, full health | Same as Ember's lava |
| Blaster | 1 blight damage per hit, 0.22 s between shots | Grunt/spitter: 3 hits. Brute: 30 |
| Aim assist | A near miss within ~4° (more up close) snaps onto the target; the crosshair turns red over one | Planet curvature + moving targets make raw aiming hard |
| Dodge roll (Q) | 0.6 s, invulnerable, 11 m/s, 0.9 s cooldown | The answer to every attack: punches, spit, slam, spores |
| Grunt | Chases, punches for 12 | |
| Spitter | Keeps 6–11 m away, blight orbs for 10 | Teaches you to keep moving |
| Brute (boss) | 3.6 m tall. Punch 22, spit volley ×3, **ground slam** (6 m shockwave, 18) every ~7 s | Roll or jump over the shockwave. Below 50% health it gets 35% faster |
| Bounce mushroom | Launch speed 15 → about 5 m high, 11 m forward | Clears the 3.2 m thorns with plenty to spare |

## 4. Teach → test → combine

1. **Glade:** a cutscene, no danger.
2. **Village:** a safe space. Meet the locals before you fight infected ones, so curing them means something.
3. **Forest:** bounce mushrooms with no pressure (a capsule overhead as the reward), and spores teach that some areas hurt.
4. **Hive, wave 1:** melee grunts only, so you learn to shoot and roll.
5. **Hive, wave 2:** spitters are added, so you have to keep moving.
6. **Boss:** everything at once, plus a telegraphed big attack (the slam).

## 5. Wayfinding at night

- **Bloom glow** on everything that matters: mushrooms, the portal, runes, the campfire, the health capsules.
- **Paths** are lighter blue-violet than the ground.
- **Purple = blight = danger:** thorns, spores, infected aliens, the portal before you clear it.
- **Cyan = good:** bounce mushrooms (with a ring under them) and the portal once it's clear.
- A **moon** and far-off **Ember** in the sky.

## 6. New engine pieces (reusable for planet 4+)

- **Events** (`mech.emit / on`): flags, fields, cutscenes and listeners all hang off named events (`hiveCleared`, `bossCured`, `broken:blight`, `enter:<zone>`, ...)
- **Several cutscenes per level**, each started by an event, with optional actor, anchors (`portal`, `boss`, `elder`), `emit` per shot, and `size` for framing big subjects
- `combat.js`: health, roll, (optional) sword, enemies (`enemyTypes`), `encounters` with waves, a boss, `villagers` and `talks`, `pads`, `spores`, `healthPacks`, `thorns`, the `portal` exit
- `generated.js`: campfire, portal, arch, wall, dome, thorns and spore cloud, all made in code
- `walls` (ring walls with one opening), `startWith` (keep your blaster), `exit: 'portal'`, `sky.bloom`, and the `ground` flag for models whose base floats

## 7. Ideas / next steps

- Sound: there's none in the game yet. The blaster, slam, bounce and campfire would benefit the most.
- A friendly villager reacting to each cured alien ("thank you!") with a speech bubble.
- Planet 4 through the portal: maybe an ice world, or a space station?
