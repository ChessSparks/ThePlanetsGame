# Planet 1 — "Verdant" · Level Design

> All numbers below live in `src/level1.js`. Change them there and refresh.

## 1. Purpose of the first planet

Planet 1 is the tutorial. It teaches four things, one per zone, so the player
never has to learn two new things at once:

| # | Zone | Teaches | Energy cell challenge |
|---|------|---------|-----------------------|
| 0 | **Crash Site** (north pole) | Move, look, "the world is round" | none: the story setup |
| 1 | **Bloom Meadow** | Follow paths and beams to an objective | Walk into it. It's in the open, framed by a flower ring |
| 2 | **Whisperpine Woods** | Leave the path and read clues | Hidden in a clearing; a mushroom trail leads to it |
| 3 | **Boulder Ridge** | Jumping | On top of a boulder, reached by a 3-rock staircase |
| 4 | **The Hollow** | Mood change and a landmark payoff | At the roots of the giant twisted tree |
| ↩ | **Crash Site** | Closing the loop | Return to the ship and press **E** to launch |

The story fits in one line: *the ship crashed, the core is cracked, Nova
detects four cells, collect them and leave.* It's simple enough that
Nova's lines can explain it all.

## 2. Map (planet radius 50 m ≈ 314 m around)

```
                 NORTH POLE
             ┌───────────────┐
             │  CRASH SITE   │  ship + scorch + skid trail of debris
             └───────┬───────┘
                     │ path (~37 m)
             ┌───────┴───────┐
             │ BLOOM MEADOW  │  cell 1 (easy)
             └──┬─────────┬──┘
     path ~70 m │         │ path ~70 m
   ┌────────────┴─┐     ┌─┴──────────────┐
   │ WHISPERPINE  │     │ BOULDER RIDGE  │
   │ WOODS (east) │     │ (west)         │
   │ cell 2 hidden│     │ cell 3 on rock │
   └──────┬───────┘     └───────┬────────┘
          │ path ~82 m          │ path ~84 m
          └────────┬────────────┘
           ┌───────┴────────┐
           │  THE HOLLOW    │  cell 4 + giant twisted tree
           └────────────────┘
                SOUTH
```

The paths form a **loop**. The player picks forest-first or ridge-first and
both work, but every route ends at the Hollow. That gives some choice without
any way to get lost. The space between zones is the "wilds" (scattered trees,
grass and rocks), which can be explored but has nothing required in it.

Press **M** in game to see the whole planet from orbit with zone labels.

## 3. Key metrics (keep these consistent across all planets)

| Metric | Value | Why |
|---|---|---|
| Planet radius | 50 m | A full lap takes ~40 s of running. Small enough that the curve is always visible |
| Run / walk speed | 8 / 3.6 m/s | |
| Jump height | ~1.85 m | Steps must be **≤ 1.5 m** apart in height to be comfortable |
| Ridge climb | 1.37 → 2.6 → 3.73 m | Each step ≈ 1.2–1.4 m, so it's clearly jumpable. 3.73 m can't be reached from the ground, so the steps can't be skipped |
| Path width | ~3.4 m | Wide enough to read from far away and when looking down at the curve |
| Cell beam height | 45 m | Visible over the horizon from ~60 m away, so you can usually see the next goal |
| Time to finish | ~4–6 min | Right for a first level |

## 4. Wayfinding: how the player knows where to go

On a sphere the horizon is very close (about 17 m at eye height), so players
lose orientation quickly. Verdant layers several tools on top of each other:

1. **Light beams** on every cell. They're the main goal markers and they rise above the horizon.
2. **Dirt paths**, the "golden path". They always lead from one zone to the next.
3. **Ground colour per zone**: bright green meadow, dark green forest, grey-tan ridge, purple Hollow. You know where you are without the toast.
4. **Landmarks**: the big meadow tree, the ship, the giant red twisted tree.
5. **Breadcrumbs**: the mushroom trail in the forest teaches that "the world leaves clues".
6. **Framing**: the flower ring around cell 1 and the pine ring with a single gap around cell 2.
7. **Nova**: a zone-entry line + a hint if that zone's cell is still there, a "nearest signal" line after each pickup, and a direction hint after 60 s with no progress.
8. **The next planet in the sky** (orange, ringed). Nova names it at launch, which sets up planet 2.

### Tutorial cards
One card at a time, near the bottom of the screen, ticked off when you do it (`tutorial` in `src/level1.js`):
1. **W A S D**: Move. 2. **Mouse**: Look around. 3. **Space**: Jump.
4. **M**: Open the map. This one appears after the first cell (or after 75 s). On the map, **◆ NEXT** marks the next goal on every planet.
5. **M**: Close the map.

The HUD corner always shows **M map · C controls**.

## 5. Zone notes

**Crash Site.** The opening shot shows the player on the path with the wrecked
ship on the right, smoke rising, and the meadow beam straight ahead. The skid
trail (darker scorched ground + pebbles + a snapped dead tree) tells the
player the ship came in from the north. That's environmental storytelling with
no text needed. Once all four cells are collected the smoke stops and the
engines glow, which shows the "you're ready" state at a glance.

**Bloom Meadow.** Safe, bright and open, with no obstacles on the way to the
cell. It's about the first success, so it should feel good fast.

**Whisperpine Woods.** Dense pines (75, kept at least 5 m from the path) make
the forest feel enclosed. The cell sits 12 m *off* the path in a clearing. A
mushroom trail starts at the path and leads in, and a ring of pines around the
clearing has one gap facing the trail. This is the first time the player has
to leave the path.

**Boulder Ridge.** The open rock field contrasts with the forest. The path
ends at the base of a three-rock staircase. This is the only skill check on
the planet, and failing just means jumping again.

**The Hollow.** Purple ground, dead trees, pale mushrooms, a giant red tree.
The mood changes but there's no danger. It hints that later planets will be
less friendly. The cell sits at the roots on the side the path arrives from.

## 6. Nova

She speaks from a bubble in the bottom-left: her portrait plus typewriter
text. **Enter** skips. Rules used:

- Never more than ~2 sentences per bubble.
- Controls are explained once, in the intro, then never again.
- Each zone gets **one** entry line the first time you visit, plus a hint only if its cell is still there.
- After each pickup: flavour line → power % → nearest remaining signal. This stays correct in any order.
- If the player goes 60 s without progress she gives a relative direction ("ahead / to the left…, about 40 meters").

All lines are in `LEVEL1.dialogue`, so you can rewrite her personality there.

## 7. How to edit the level

- **Move a zone:** change its `lat`/`lon`/`radius`. Paths, ground colour and scattered props follow automatically.
- **Move a hand-placed object:** edit `at: { zone, e, n }` (meters east/north of the zone centre).
- **More or fewer trees:** change `count` in `scatter`. Change `seed` to reshuffle the random dressing.
- **Add a cell:** add it to `cells`, then add a matching `progress` line.
- **Test fast:** keys **1–5** teleport to each zone's entrance. `window.game` in the browser console exposes the player, cells and state.

## 8. Ideas for later (not built yet)

- **Secret:** a 5th "bonus" cell in the wilds on the far side (lon ≈ 180°), for players who explore.
- **Hazard preview:** a few bouncing spore-mushrooms in the Hollow (jump pads), to set up planet 2's mechanics.
- **Collectibles:** Nova "memory fragments" along the paths, which unlock lore lines.
- **Low-gravity jump zone** on the ridge, to teach that gravity can change per planet.
- **Level 2** already has a `Building L` model in `models/level_two`. An abandoned outpost on the orange planet would match the teaser in the sky.
