// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 1 — "VERDANT"
//  All level design lives in this file. Distances are in meters (world units)
//  measured along the surface. See LEVEL1_DESIGN.md for the reasoning.
//
//  Placement:   { zone: 'meadow', e: 4, n: -2 }  → 4 m east, 2 m south of the zone centre
//               { lat: 10, lon: 45 }             → absolute position on the planet
// ─────────────────────────────────────────────────────────────────────────────

const L1 = 'models/level_one/';

// trunk: blocks the player, radius in model units (scaled with the prop)
// block: solid rock the player can jump on top of (rocks under 0.5 m can be walked over)
// bend:  foliage that tilts away when the player walks through it (1 = ~40°, 0.15 = barely)
export const MODELS = {
  astronaut:    { url: 'models/main_character/Astronaut V2.glb' },
  ship:         { url: 'Spaceship by Quaternius - u105mYHLHU.glb' },
  treeA:        { url: L1 + 'Tree by Quaternius - aVOxaHRPWe.glb', trunk: 0.45 },
  treeB:        { url: L1 + 'Tree by Quaternius - t9KbsfYdXz.glb', trunk: 0.45 },
  pineA:        { url: L1 + 'Pine by Quaternius - 699sFuLCN2.glb', trunk: 0.4 },
  pineB:        { url: L1 + 'Pine by Quaternius - igSu0cPoBz.glb', trunk: 0.5 },
  deadTree:     { url: L1 + 'Dead Tree by Quaternius - CD4edbPSGm.glb', trunk: 0.9 },
  twistedTree:  { url: L1 + 'Twisted Tree by Quaternius - 8oraKn9m0x.glb', trunk: 1.6 },
  rockA:        { url: L1 + 'Rock Medium by Quaternius - KZdEP3uUpa.glb', block: true },
  rockB:        { url: L1 + 'Rock Medium by Quaternius - s1OJ3bBzqc.glb', block: true },
  bush:         { url: L1 + 'Bush with Flowers by Quaternius - U1ymDy8tbY.glb', bend: 0.35 },
  fern:         { url: L1 + 'Fern by Quaternius - jqcanvH7D6.glb', bend: 0.6 },
  flowerGroupA: { url: L1 + 'Flower Group by Quaternius - hfPzQAedOe.glb', bend: 1 },
  flowerGroupB: { url: L1 + 'Flower Group by Quaternius - LqTljN6Wg2.glb', bend: 1 },
  flowerA:      { url: L1 + 'Flower Single by Quaternius - GvfHo0roi3.glb', bend: 1 },
  flowerB:      { url: L1 + 'Flower Single by Quaternius - rHBoS64rRL.glb', bend: 1 },
  grass:        { url: L1 + 'Grass by Quaternius - vUJjrRsFp4.glb', bend: 1 },
  tallGrass:    { url: L1 + 'Tall Grass by Quaternius - JSIYtscPmP.glb', bend: 1 },
  mushroom:     { url: L1 + 'Mushroom by Quaternius - aOW08oSrd4.glb', bend: 0.15 },
  pebble:       { url: L1 + 'Pebble Round by Quaternius - icVsN3lmVy.glb' },
  plant:        { url: L1 + 'Plant by Quaternius - NrJN7UcglF.glb', bend: 0.8 },
  plantBig:     { url: L1 + 'Plant Big by Quaternius - MbhbP7JrTI.glb', bend: 0.5 },
};

export const LEVEL1 = {
  name: 'Verdant',
  radius: 50,          // planet radius → ~314 m around, ~40 s to run a full lap
  seed: 7,             // change to reshuffle the scattered props (hand-placed props stay put)
  playerScale: 1,
  nova: { fade: 0.06 },   // Nova, the ship AI: how damaged she is on this planet (0 healthy → 1 almost gone)
  subtitle: 'Planet 1 · Recover the four energy cells and repair your ship',
  next: { level: 2, name: 'Ember' },
  shipWrecked: true,   // smoke until all cells are collected

  sky: {
    background: '#060714',
    atmosphere: '#79c4ff',
    hemi: ['#cfe8ff', '#3a4a2a', 1.3],
    sun: ['#fff3dd', 2.6],
    planets: [   // Ember, the next level, hangs in the sky
      { color: '#d4874f', emissive: '#4a2410', radius: 110, pos: [-700, 420, -1100], ring: { inner: 150, outer: 210, color: '#e8c39a' } },
    ],
  },

  ground: { base: '#6aa84a', path: '#c9a46b', pathWidth: 1.7 },

  start: { zone: 'crash', e: 0, n: 1 },
  startFacing: 'meadow',

  // ── Zones: each one teaches one thing and owns one energy cell ───────────
  zones: [
    { id: 'crash',  name: 'Crash Site',        lat:  90, lon:   0, radius: 12, ground: '#7d9750' },
    { id: 'meadow', name: 'Bloom Meadow',      lat:  48, lon:  20, radius: 18, ground: '#92cb5a' },
    { id: 'forest', name: 'Whisperpine Woods', lat:   8, lon: 105, radius: 22, ground: '#3f7639' },
    { id: 'ridge',  name: 'Boulder Ridge',     lat:  10, lon: -65, radius: 17, ground: '#a09c78' },
    { id: 'hollow', name: 'The Hollow',        lat: -58, lon:  20, radius: 17, ground: '#5c4a6e' },
  ],

  // Dirt paths (great-circle arcs between zone centres) – the "golden path"
  paths: [
    ['crash', 'meadow'],
    ['meadow', 'forest'],
    ['meadow', 'ridge'],
    ['forest', 'hollow'],
    ['ridge', 'hollow'],
  ],

  // Painted ground patches (storytelling): scorch + skid trail of the crash, forest clearing
  patches: [
    { at: { zone: 'crash', e: -7, n: 3 },  radius: 6.5, color: '#3b332e' },
    { at: { zone: 'crash', e: -7, n: 8 },  radius: 3.2, color: '#4a3f33' },
    { at: { zone: 'crash', e: -7, n: 12 }, radius: 2.4, color: '#55493a' },
    { at: { zone: 'crash', e: -7, n: 15 }, radius: 1.6, color: '#5e5440' },
    { at: { zone: 'forest', e: 10, n: -7 }, radius: 5, color: '#5d9a44' },
    { at: { zone: 'hollow', e: 0, n: 0 },   radius: 9, color: '#4a3a59' },
  ],

  // Areas the random scatter must keep empty
  clearings: [
    { at: { zone: 'forest', e: 10, n: -7 }, radius: 5 },
    { at: { zone: 'ridge',  e: -4, n: 0 },  radius: 7 },
    { at: { zone: 'meadow', e: 0, n: 0 },   radius: 5 },
  ],

  // ── Hand-placed props (placed first, scatter avoids them) ────────────────
  props: [
    // CRASH SITE — the ship skidded in from the north, leaving a trail of debris and a snapped tree
    { model: 'ship', id: 'ship', at: { zone: 'crash', e: -7, n: 3 }, scale: 1.2, yaw: 180, tilt: [10, -9], sink: 0.5, dynamic: true, collider: { r: 3.4 } },
    { model: 'rockB', at: { zone: 'crash', e: -4, n: 9 }, scale: 0.45, yaw: 30 },
    { model: 'rockA', at: { zone: 'crash', e: -10.5, n: 11 }, scale: 0.35, yaw: 120 },
    { model: 'rockB', at: { zone: 'crash', e: -5, n: 14 }, scale: 0.3 },
    { model: 'deadTree', at: { zone: 'crash', e: -12, n: 7 }, scale: 0.4, yaw: 60 },
    { line: 'pebble', from: { zone: 'crash', e: -7, n: 7 }, to: { zone: 'crash', e: -7, n: 18 }, count: 12, scale: [1.5, 3], jitter: 1.5 },

    // BLOOM MEADOW — a flower ring frames the first cell (impossible to miss)
    { ring: 'flowerGroupA', at: { zone: 'meadow', e: 0, n: 0 }, radius: 3.6, count: 10, scale: [0.9, 1.2] },
    { model: 'treeA', at: { zone: 'meadow', e: 7, n: 6 }, scale: 1.4, yaw: 0 },     // landmark tree
    { model: 'bush', at: { zone: 'meadow', e: -6, n: 4 }, scale: 1.3 },

    // WHISPERPINE WOODS — mushrooms lead off the path into the hidden clearing
    { line: 'mushroom', from: { zone: 'forest', e: 1.5, n: -1 }, to: { zone: 'forest', e: 8, n: -5.5 }, count: 8, scale: [1.4, 2], jitter: 0.4 },
    { ring: 'mushroom', at: { zone: 'forest', e: 10, n: -7 }, radius: 2.4, count: 8, scale: [1.6, 2.4] },
    { ring: 'pineB', at: { zone: 'forest', e: 10, n: -7 }, radius: 7.5, count: 7, scale: [1.1, 1.4], skip: [3] },  // gap faces the trail (ring angle 0° = east, 90° = north)

    // BOULDER RIDGE — three-step jump climb (heights ≈ 1.4 m → 2.6 m → 3.8 m, jump = 1.8 m)
    { model: 'rockB', id: 'step1',  at: { zone: 'ridge', e: -6.7, n: 0 }, scale: 0.75, yaw: 0 },
    { model: 'rockA', id: 'step2',  at: { zone: 'ridge', e: -4.1, n: 0 }, scale: 1.5,  yaw: 0 },
    { model: 'rockB', id: 'pillar', at: { zone: 'ridge', e: 0,    n: 0 }, scale: 2.0,  yaw: 0 },
    // rock outcrops, kept clear of the paths (meadow path leaves at ~47°, hollow path at ~-58°)
    { model: 'rockA', at: { zone: 'ridge', e: -3, n: 12 }, scale: 2.4 },
    { ring: 'rockB', at: { zone: 'ridge', e: -3, n: 12 }, radius: 3.2, count: 5, scale: [0.6, 1.2] },
    { model: 'rockB', at: { zone: 'ridge', e: -9, n: -10 }, scale: 2.2 },
    { ring: 'rockA', at: { zone: 'ridge', e: -9, n: -10 }, radius: 3, count: 4, scale: [0.5, 1] },
    { model: 'rockA', at: { zone: 'ridge', e: 12, n: -1 }, scale: 1.8 },

    // THE HOLLOW — giant twisted tree guarded by a ring of dead trees
    { model: 'twistedTree', id: 'bigTree', at: { zone: 'hollow', e: 0, n: 0 }, scale: 1.1, yaw: 0 },
    { ring: 'deadTree', at: { zone: 'hollow', e: 0, n: 0 }, radius: 13, count: 6, scale: [0.4, 0.55] },   // solid ring props on a path are skipped automatically
  ],

  // ── Energy cells (the level's objectives) ────────────────────────────────
  cells: [
    { id: 'c1', zone: 'meadow', at: { zone: 'meadow', e: 0, n: 0 },
      line: "{happy}Cell one secured. That's the easy one." },
    { id: 'c2', zone: 'forest', at: { zone: 'forest', e: 10, n: -7 },
      line: "{happy}Got it! Good eye. The mushrooms knew the way." },
    { id: 'c3', zone: 'ridge', on: 'pillar',
      line: "Nice climbing! I'd enjoy the view too, if my optical feed wasn't... a bit fuzzy." },
    { id: 'c4', zone: 'hollow', at: { zone: 'hollow', e: 0, n: -5.5 },
      line: 'Pulled it from the roots. The tree seemed to... sigh?' },
  ],

  // ── Random dressing per zone (zone: null = the wilds between zones) ──────
  scatter: [
    { zone: 'crash',  models: ['pebble'], count: 30, scale: [1, 2.5], spacing: 0.6, allowPath: true },
    { zone: 'crash',  models: ['rockA', 'rockB'], count: 6, scale: [0.3, 0.55], spacing: 3 },
    { zone: 'crash',  models: ['grass', 'tallGrass'], count: 35, scale: [0.8, 1.2], spacing: 0.8 },

    { zone: 'meadow', models: ['treeA', 'treeB'], count: 4, scale: [0.9, 1.2], spacing: 7 },
    { zone: 'meadow', models: ['bush'], count: 18, scale: [0.9, 1.4], spacing: 2.3 },
    { zone: 'meadow', models: ['flowerGroupA', 'flowerGroupB'], count: 60, scale: [0.8, 1.3], spacing: 1.2 },
    { zone: 'meadow', models: ['flowerA', 'flowerB'], count: 70, scale: [0.8, 1.2], spacing: 0.8 },
    { zone: 'meadow', models: ['plant'], count: 15, scale: [0.8, 1.2], spacing: 1.2 },
    { zone: 'meadow', models: ['grass', 'tallGrass'], count: 120, scale: [0.8, 1.4], spacing: 0.6 },

    { zone: 'forest', models: ['pineA', 'pineB'], count: 95, scale: [0.75, 1.35], spacing: 3, pathClear: 5 },
    { zone: 'forest', models: ['bush'], count: 10, scale: [0.8, 1.1], spacing: 2 },
    { zone: 'forest', models: ['fern'], count: 30, scale: [0.22, 0.38], spacing: 2 },
    { zone: 'forest', models: ['plantBig', 'plant'], count: 35, scale: [0.7, 1.1], spacing: 1.4 },
    { zone: 'forest', models: ['tallGrass', 'grass'], count: 60, scale: [0.8, 1.2], spacing: 0.7 },
    { zone: 'forest', models: ['mushroom'], count: 20, scale: [0.8, 1.3], spacing: 1 },

    { zone: 'ridge',  models: ['rockA', 'rockB'], count: 40, scale: [0.6, 1.9], spacing: 3.2 },
    { zone: 'ridge',  models: ['rockA', 'rockB'], count: 35, scale: [0.15, 0.34], spacing: 1.3, allowPath: true },   // pebbles: ≤ 0.75 m, you walk over them
    { zone: 'ridge',  models: ['pebble'], count: 80, scale: [1, 3], spacing: 0.5, allowPath: true },
    { zone: 'ridge',  models: ['grass', 'tallGrass'], count: 30, scale: [0.7, 1], spacing: 0.8 },
    { zone: 'ridge',  models: ['pineA'], count: 4, scale: [0.6, 0.9], spacing: 5 },

    { zone: 'hollow', models: ['mushroom'], count: 40, scale: [1, 2.4], spacing: 1 },
    { zone: 'hollow', models: ['fern'], count: 12, scale: [0.22, 0.32], spacing: 2.2 },
    { zone: 'hollow', models: ['rockB'], count: 8, scale: [0.4, 1], spacing: 3 },
    { zone: 'hollow', models: ['tallGrass'], count: 25, scale: [0.7, 1], spacing: 0.8 },

    { zone: null, models: ['treeA', 'treeB'], count: 32, scale: [0.8, 1.3], spacing: 5 },
    { zone: null, models: ['pineA', 'pineB'], count: 14, scale: [0.7, 1.1], spacing: 4 },
    { zone: null, models: ['rockA', 'rockB'], count: 25, scale: [0.4, 1.3], spacing: 3 },
    { zone: null, models: ['bush', 'plant', 'plantBig'], count: 40, scale: [0.8, 1.2], spacing: 1.8 },
    { zone: null, models: ['flowerA', 'flowerB', 'flowerGroupB'], count: 40, scale: [0.8, 1.1], spacing: 1 },
    { zone: null, models: ['grass', 'tallGrass'], count: 200, scale: [0.8, 1.2], spacing: 0.7 },
    { zone: null, models: ['pebble'], count: 50, scale: [1, 2.5], spacing: 0.6, allowPath: true },
  ],

  // ── Tutorial cards (src/tutorial.js): one at a time, ticked off when you do it ──
  tutorial: [
    { keys: ['W', 'A', 'S', 'D'], text: 'Move', done: s => s.moved > 6 },
    { keys: ['Mouse'], text: 'Look around (click the game to capture the mouse)', done: s => s.looked > 500 },
    { keys: ['Space'], text: 'Jump', done: s => s.jumps > 0 },
    // the map, once there's somewhere to go next
    { keys: ['M'], text: 'Open the map', after: s => s.collected >= 1 || s.time > 75,
      line: "{happy}Lost track of the others? The map shows the whole planet from above.", done: s => s.mapOpen },
    { keys: ['M'], text: '◆ NEXT marks the closest cell. Press M again to close the map',
      line: "That's us, the yellow marker. The blue tag is the closest cell. The planet's round, so just keep walking toward it.", done: s => !s.mapOpen },
  ],

  // ── Nova ──────────────────────────────────────────────────────────────
  dialogue: {
    intro: [
      "{glitch}Systems rebooting... There you are. That landing was more 'falling with style' than I'd like.",
      "I'm Nova, your ship's AI. In case the crash knocked that out of you. It nearly knocked it out of me.",
      "Good news: you're in one piece. Bad news: the ship isn't. The crash cracked our power core.",
      "I'm picking up four energy cells scattered across this planet. See the blue beams on the horizon?",
      "Let's start close. Follow the dirt path to the meadow. Press C any time to see the controls.",
    ],
    zones: {
      meadow: { enter: 'Flowers, mild air, low gravity... honestly, not the worst place to crash.',
                hint: 'The signal is right in the middle of that flower ring. Just walk into it.' },
      forest: { enter: 'Dense canopy. Readings are bouncing off the trunks.',
                hint: "The cell's off the path. See the mushrooms? They grow where its energy leaks into the soil. Follow them." },
      ridge:  { enter: 'Boulder Ridge. Plenty of rock, not much else.',
                hint: "The cell is on top of the big boulder. Use the smaller rocks as steps — jump with SPACE." },
      hollow: { enter: "It's quieter here. Too quiet. That tree must be centuries old.",
                hint: 'The last signal is wedged between its roots, on the south side.' },
      crash:  { enter: null, hint: null },
    },
    progress: [
      null,
      'Power at 25%.',
      "Power at 50%. Halfway there.",
      'Power at 75%. One more.',
      "{happy}That's all four! Ship core at 100%. Get back to the ship, follow any path north.",
    ],
    nextSignal: 'Nearest remaining signal: {zone}.',
    hint: 'Need a hand? The nearest signal is {dir} of you, about {dist} meters away.',
    returnToShip: "Welcome back. Climb in, press E at the ship and let's get off this rock.",
    launch: [
      'Engines online. Next stop: that orange planet in the sky.',
      "{worried}{glitch}Oh, and, uh... my own core took a hit in the crash too. Nothing to worry about. Probably. Hold on!",
    ],
  },
};
