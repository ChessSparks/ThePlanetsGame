# Planets

A Three.js game where an astronaut explores small spherical planets.

## Run

The browser won't load `.glb` models from `file://`, so serve the folder:

```
python -m http.server 8000
```

Then open http://localhost:8000 for the **main menu**: Continue, New Game, Missions (pick any unlocked planet), Settings and Credits. Progress (unlocked planets, best times, stats) is saved in your browser.

You can also jump straight into a planet: `game.html?level=1` to `?level=5`. Three.js loads from the jsDelivr CDN, so you need an internet connection.

## Files

| File | What it is |
|---|---|
| `src/level1.js` | **All level design for planet 1 (Verdant)**: zones, paths, props, cells, Nova's lines |
| `src/level2.js` | **All level design for planet 2 (Ember)**: plus items, sockets, force field, hazards, crystals, alien |
| `src/level3.js` | **All level design for planet 3 (Umbra)**: enemies, encounters, villagers, pads, spores, portal, 3 cutscenes |
| `src/level4.js` | **All level design for planet 4 (Glacia)**: warmth, lake levers + thin ice, melting, beacon, avalanche, 3 cutscenes |
| `src/frost.js` | Planet 4 systems: cold meter + heat sources, slippery ice, meltable ice, levers, thin ice, ship pickup, avalanche |
| `src/level5.js` | **All level design for planet 5 (Haven)**: station kit pieces, doors, domes, robots, breach + low gravity, the memory-map puzzle, 3 cutscenes |
| `src/puzzle15.js` | The 15-puzzle screen (Nova's memory map) |
| `src/intro.js` | Sparks Development Studio intro (~10 s) before the main menu: plays once per browser session, any key skips (`?nointro` turns it off) |
| `src/loading.js` | Each planet's loading screen: the planet turning in its own colours, mission, progress bar, rotating tips |
| `src/tutorial.js` | Tutorial cards ("[W][A][S][D] Move"), ticked off when you do it; steps come from `tutorial` in a level (Verdant has them) |
| `src/mechanics.js` | Events, cutscenes, carrying/stacking, sockets and power, force fields, geysers and lava, the blaster, breakables |
| `src/combat.js` | Health, dodge roll, sword, infected aliens and the boss (cured, not killed), bounce pads, spores, villagers, portal exit |
| `src/generated.js` | Props built in code: campfire, portal, ruins arches and walls, domes, thorns, spore clouds |
| `src/world.js` | Builds the planet surface, paths, props and colliders from the level data |
| `src/player.js` | Astronaut controller with spherical gravity, collisions and animations |
| `src/nova.js` | Nova, the ship AI: abstract hologram portrait (mood colours, damage glitches) + speech bubble |
| `index.html` + `src/menu.js` | Main menu: the little planet with the running astronaut, missions, settings |
| `src/progress.js` | Save data (localStorage): unlocked planets, best times, stats, settings |
| `game.html` + `src/main.js` | The game: loop, camera, objectives, map view, pause menu, level complete |
| `LEVEL1_DESIGN.md` … `LEVEL5_DESIGN.md` | The level design docs: why everything is where it is |

## Controls

WASD move · Mouse look (click to lock) · Space jump · Shift walk · E pick up / put down / talk / launch · 1/2 hands / blaster (H holsters) · Click shoot · Q dodge roll · M map · Enter skip dialogue · Wheel zoom · Esc pause · Shift+1–6 teleport to zones (for testing)

## Nova, the ship AI

Nova is witty and warm, and was damaged in the crash: she fades a little more on every planet (`nova: { fade }` in each level file, 0.06 on Verdant → 0.42 on Glacia). Her portrait is an abstract hologram drawn in code, with no face.

Lines can start with tags: `{happy}` `{worried}` `{sad}` set her colour and motion; `{glitch}` makes that line break up badly. Example: `"{sad}{glitch}I'm running on the last of my reserves."`

**Her arc:** the crash cracks her core (Verdant) → she starts losing words, and the nav core's spare memory props her up (Ember) → the elder sees her "light growing thin" (Umbra) → she reveals she's been spending her own power to keep you warm, and is on her last reserves (Glacia) → Haven's repair pod patches her up (damage 0.5 → 0.1), but only for now; the logs point to the Forge, where she was built (planet 6).
