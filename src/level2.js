// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 2 — "EMBER"
//  Desert planet with an abandoned outpost. Teaches: carrying, hazards, the blaster.
//  Same placement rules as level1.js, plus:
//    zone.rotate                         → turns the zone's e/n grid (here: +e points along the incoming path)
//    { zone, toward: 'outpost', dist }   → a point `dist` m from the zone centre in the direction of another zone
//  See LEVEL2_DESIGN.md for the reasoning.
// ─────────────────────────────────────────────────────────────────────────────

const L2 = 'models/level_two/';

// trunk / block / bend: as in level1.js
// box:  rectangular solid (buildings, crates) — roof can be stood on
// glow: emissive colour (crystals)
export const MODELS = {
  astronaut:    { url: 'models/main_character/Astronaut V2.glb' },
  ship:         { url: 'Spaceship by Quaternius - u105mYHLHU.glb' },
  alien:        { url: L2 + 'enemy/Alien by Quaternius - RRliSQBP7r.glb' },
  rifle:        { url: 'Scifi Pistol by Quaternius - U0Q1BrKL1y.glb' },   // the blaster (a pistol; key kept as 'rifle')

  buildingL:    { url: L2 + 'buildings/Building L by Quaternius - dsH7KEfuPP.glb', box: true },
  houseCyl:     { url: L2 + 'buildings/House Cylinder by Quaternius - VQF43DYGQO.glb', box: true },
  houseLong:    { url: L2 + 'buildings/House Long by Quaternius - X8671Q8mNc.glb', box: true },
  houseSingle:  { url: L2 + 'buildings/House Single by Quaternius - w8v6HfZzpE.glb', box: true, ground: true },   // its base floats 0.33 m in the file

  crystalSmall: { url: L2 + 'crystals/Big Crystal by Quaternius - pf5lzmgr2J.glb', glow: '#9b4dff', block: true },
  crystalA:     { url: L2 + 'crystals/Crystal by iPoly3D - dxCmHfpqc5.glb', glow: '#9b4dff', block: true },
  crystalTall:  { url: L2 + 'crystals/Crystal by iPoly3D - MlhTJAFuJY.glb', glow: '#9b4dff', block: true },
  crystalB:     { url: L2 + 'crystals/Crystal by iPoly3D - nyCeR6poJX.glb', glow: '#9b4dff', block: true },
  crystalC:     { url: L2 + 'crystals/Crystal by iPoly3D - Wj8Qjq38T8.glb', glow: '#9b4dff', block: true },
  crystalD:     { url: L2 + 'crystals/Crystal by iPoly3D - WzWPKHFMkL.glb', glow: '#9b4dff', block: true },
  mineral:      { url: L2 + 'crystals/Mineral by Quaternius - STixpWYaTd.glb', block: true },

  powercell:    { url: L2 + 'props/powercell.glb' },
  crate:        { url: L2 + 'props/Scifi Crate by Quaternius - bPeXlVjwCH.glb' },
  crateSmall:   { url: L2 + 'props/Scifi Crate by Nick Slough - l6YIg14bt6.glb', box: true },
  pickupCrate:  { url: L2 + 'props/Pickup Crate by Quaternius - 1dh0EFL5gl.glb', box: true },
  radioTower:   { url: L2 + 'props/Radio tower by Poly by Google - eWEYV9ppUjv.glb', trunk: 3.6 },
  rover:        { url: L2 + 'props/Rover by Quaternius - WRd1piJOfh.glb', block: true },   // mesh-shaped collider (like rocks)
  solarBase:    { url: L2 + 'props/Solar Panel Structure by Quaternius - snXloZEimW.glb', box: true },
  solarPanel:   { url: L2 + 'props/Solar Panel by Quaternius - ah89Y79JdT.glb' },

  rockPoly:     { url: L2 + 'rocks/Rock by Poly by Google - dmRuyy1VXEv.glb', block: true },
  rockA:        { url: L2 + 'rocks/Rock by Quaternius - 34W5ymEePk.glb', block: true },
  rockB:        { url: L2 + 'rocks/Rock by Quaternius - HtpdTh3Ld6.glb', block: true },
  rockC:        { url: L2 + 'rocks/Rock by Quaternius - R2UjZAX3By.glb', block: true },
  rockLargeA:   { url: L2 + 'rocks/Rock Large by Quaternius - d2VWOdthtR.glb', block: true },
  rockLargeB:   { url: L2 + 'rocks/Rock Large by Quaternius - li0YBlBEMz.glb', block: true },
  rubble:       { url: L2 + 'rocks/Rocks by Kay Lousberg - XVRCQ0j2AF.glb', block: true },

  barrelCactus: { url: L2 + 'vegetation/Barrel cactus by Poly by Google - 5-hrumGDq1K.glb', bend: 0.1 },
  bismarckPalm: { url: L2 + 'vegetation/Bismarck palm tree by Poly by Google - 7soBza255RP.glb', trunk: 0.5 },
  cactus:       { url: L2 + 'vegetation/Cactus by Poly by Google - 9UCcl_W0Xq3.glb', trunk: 0.25 },
  datePalm:     { url: L2 + 'vegetation/Date palm tree by Poly by Google - f9HQ8FJxn-o.glb', trunk: 0.5 },
  grassWispy:   { url: L2 + 'vegetation/Grass Wispy by Quaternius - Msr9zx66VU.glb', bend: 1 },
  palmTall:     { url: L2 + 'vegetation/Palm tree by Poly by Google - 1l79utpMAy0.glb', trunk: 1.4 },
  palmWide:     { url: L2 + 'vegetation/Palm tree by Poly by Google - 2RUnO1Yi99P.glb', trunk: 1.4 },
  pricklyPear:  { url: L2 + 'vegetation/Prickly pear cactus by Poly by Google - 47Af27jQemx.glb', bend: 0.25 },
  succulent:    { url: L2 + 'vegetation/Succulent by Isa Lousberg - CBczazDjjU.glb', bend: 0.3 },
  yucca:        { url: L2 + 'vegetation/Yucca Plant by Isa Lousberg - rR6S0uzgYa.glb', bend: 0.6 },
};

// Lava pools in Steamvent Flats: they flank the vent run, so there's no going around the steam
const LAVA = [
  { at: { zone: 'geysers', e: 30, n: 5.2 },   radius: 3 },
  { at: { zone: 'geysers', e: 23.3, n: -5.2 },  radius: 3 },
  { at: { zone: 'geysers', e: 16.8, n: 5.3 },   radius: 3 },
  { at: { zone: 'geysers', e: 10, n: -5.2 },  radius: 3 },
  { at: { zone: 'geysers', e: 25, n: -11 },   radius: 3.6 },
  { at: { zone: 'geysers', e: 19, n: 11 },    radius: 3.4 },
  { at: { zone: 'geysers', e: -9, n: 7 },     radius: 3.4 },
  { at: { zone: 'geysers', e: -8, n: -7 },    radius: 3 },
  { at: { zone: 'geysers', e: 3, n: -11 },    radius: 2.8 },
];

// Big vents. `size` scales the vent, its column and its blast radius (1.4 m × size).
const GEYSERS = [
  // the run in: four giant vents on the path, firing as a wave that rolls toward the cell.
  // Between them is a small safe pocket to wait in.
  { at: { zone: 'geysers', e: 33, n: 0 }, size: 1.7, offset: 0.6 },
  { at: { zone: 'geysers', e: 26.5, n: 0 }, size: 1.7, offset: 0.45 },
  { at: { zone: 'geysers', e: 20, n: 0 }, size: 1.7, offset: 0.3 },
  { at: { zone: 'geysers', e: 13.5, n: 0 }, size: 1.7, offset: 0.15 },
  // a closed ring of seven around the cell: their blasts overlap, so you go through a vent
  // the moment it dies down. They fire in turn, round and round.
  ...[...Array(7)].map((_, i) => {
    const a = (i / 7) * Math.PI * 2;
    return { at: { zone: 'geysers', e: 5 * Math.cos(a), n: 5 * Math.sin(a) }, size: 1.5, offset: i / 7, period: 4.2, active: 1.6, warn: 1 };
  }),
  // loose ones out in the flats
  { at: { zone: 'geysers', e: -15, n: -11 }, size: 1.3, offset: 0.1 },
  { at: { zone: 'geysers', e: 7,   n: 14 },  size: 1.4, offset: 0.7 },
  { at: { zone: 'geysers', e: -17, n: 6 },   size: 1.6, offset: 0.4 },
  { at: { zone: 'geysers', e: 14,  n: -15 }, size: 1.2, offset: 0.85 },
];

export const LEVEL2 = {
  name: 'Ember',
  subtitle: 'Planet 2 · Power up the abandoned outpost and recover a nav core',
  radius: 55,
  seed: 21,
  playerScale: 1,
  nova: { fade: 0.15 },   // Nova's damage on this planet
  next: { level: 3, name: 'Umbra' },
  shipWrecked: false,

  ground: { base: '#d08a52', path: '#efc896', pathWidth: 1.7 },

  sky: {
    background: '#0d0710',
    atmosphere: '#ff9a5a',
    hemi: ['#ffe2c4', '#5a3020', 1.25],
    sun: ['#ffe0b8', 2.7],
    ring: { inner: 1.9, outer: 3.1, color: '#f0cfa0', tilt: 25, yaw: 30 },   // Ember's own rings, visible from the ground
    planets: [
      { color: '#5fae4f', emissive: '#12300e', radius: 70, pos: [800, 350, 900] },      // Verdant, where you came from
      { color: '#7a4fd4', emissive: '#1d0f40', radius: 160, pos: [-900, -250, -1300] }, // planet 3 teaser
    ],
  },

  start: { zone: 'pad', e: 0, n: 1 },
  startFacing: 'outpost',

  zones: [
    { id: 'pad',     name: 'Landing Pad',      lat:  90, lon:   0, radius: 12, ground: '#a68b74' },
    { id: 'outpost', name: 'Rustwell Outpost', lat:  42, lon:   0, radius: 18, ground: '#c58b5e' },
    { id: 'geysers', name: 'Steamvent Flats',  lat:   0, lon:  80, radius: 34, ground: '#8c5236', rotate: 138 },   // local +e = toward the outpost path
    { id: 'depot',   name: 'Dustbowl Depot',   lat:   0, lon: -80, radius: 17, ground: '#dc9c62', rotate: 42 },    // canyon runs along the path
    { id: 'tower',   name: 'Signal Crater',    lat: -48, lon:   0, radius: 16, ground: '#6e3f3a' },
    { id: 'oasis',   name: 'Hidden Oasis',     lat:  -5, lon: 180, radius: 13, ground: '#8fae5a', secret: true },
  ],

  // The outpost is the hub; every route goes through it
  paths: [
    ['pad', 'outpost'],
    ['outpost', 'geysers'],
    ['outpost', 'depot'],
    ['outpost', 'tower'],
  ],

  patches: [
    { at: { zone: 'pad', e: -7, n: 3 }, radius: 6, color: '#7f7a76' },        // landing pad
    { at: { zone: 'outpost', e: 0, n: 0 }, radius: 7, color: '#b07a52' },     // packed dirt plaza
    { at: { zone: 'oasis', e: 0, n: 0 }, radius: 9, color: '#6f9a48' },
    ...LAVA.map(l => ({ at: l.at, radius: l.radius + 1.4, color: '#3a2420' })),   // scorched rims warn of lava
    ...GEYSERS.map(g => ({ at: g.at, radius: 1.8 * g.size, color: '#5a3a2c' })),
  ],

  clearings: [
    ...LAVA.map(l => ({ at: l.at, radius: l.radius + 1 })),
    ...GEYSERS.map(g => ({ at: g.at, radius: 2 * g.size })),
    { at: { zone: 'depot', e: 0, n: 0 }, radius: 7 },
    { at: { zone: 'tower', e: 0, n: 0 }, radius: 4 },
    { at: { zone: 'tower', toward: 'outpost', dist: -7 }, radius: 3 },
    { at: { zone: 'outpost', e: 0, n: 0 }, radius: 7 },
    { at: { zone: 'oasis', e: 0, n: 0 }, radius: 6 },
  ],

  props: [
    // LANDING PAD — a clean landing this time
    { model: 'ship', id: 'ship', at: { zone: 'pad', e: -7, n: 3 }, scale: 1.2, yaw: 180, sink: -2.55, dynamic: true, collider: { r: 3.4 } },
    { model: 'crateSmall', at: { zone: 'pad', e: -3, n: 6 }, scale: 2.5 },
    { model: 'pickupCrate', at: { zone: 'pad', e: -2, n: 7.5 }, scale: 1.2, sink: -0.5 },

    // RUSTWELL OUTPOST — generator (west), hall (east), solar field + rover (south)
    { model: 'houseCyl', id: 'generator', at: { zone: 'outpost', e: -8, n: 7 }, scale: 1, yaw: 135 },
    { model: 'buildingL', at: { zone: 'outpost', e: 9, n: 8 }, scale: 1, yaw: 225 },
    { model: 'houseLong', at: { zone: 'outpost', e: 10, n: -7 }, scale: 1, yaw: 0 },
    { model: 'solarBase', at: { zone: 'outpost', e: -7, n: -6 }, yaw: 20 },
    { model: 'solarBase', at: { zone: 'outpost', e: -11.5, n: -5 }, yaw: 20 },
    { model: 'solarBase', at: { zone: 'outpost', e: -9, n: -10.5 }, yaw: 20 },
    { model: 'rover', at: { zone: 'outpost', e: 4, n: -11 }, scale: 0.9, yaw: 70, tilt: [4, 6] },
    { model: 'crateSmall', at: { zone: 'outpost', e: 6, n: 4 }, scale: 2.5 },
    { model: 'crateSmall', at: { zone: 'outpost', e: 6.8, n: 4.6 }, scale: 2 },
    { model: 'pickupCrate', at: { zone: 'outpost', e: 5.5, n: -4 }, scale: 1, sink: -0.43 },

    // DUSTBOWL DEPOT — a canyon of big rocks with the armory at the dead end
    { line: 'rockLargeA', from: { zone: 'depot', e: -12, n: 7.5 },  to: { zone: 'depot', e: 12, n: 7.5 },  count: 6, scale: [0.75, 0.95], jitter: 0.6 },
    { line: 'rockLargeB', from: { zone: 'depot', e: -12, n: -7.5 }, to: { zone: 'depot', e: 12, n: -7.5 }, count: 5, scale: [0.6, 0.75], jitter: 0.6 },
    { model: 'rockLargeB', at: { zone: 'depot', e: -12, n: 0 }, scale: 0.8 },
    { model: 'houseSingle', id: 'armory', at: { zone: 'depot', e: -5, n: 0 }, scale: 1.05, yaw: 90 },   // roof 3.94 m: needs a 2-crate stack

    // SIGNAL CRATER — a ring of cliffs, the radio tower in the middle, one gate
    { model: 'radioTower', id: 'radioTower', at: { zone: 'tower', e: 0, n: 0 }, scale: 0.8 },
    { ring: 'rockLargeA', at: { zone: 'tower', e: 0, n: 0 }, radius: 14, count: 15, scale: [0.85, 1.05] },
    { ring: 'rockLargeB', at: { zone: 'tower', e: 0, n: 0 }, radius: 14.8, count: 14, scale: [0.7, 0.9] },
    { ring: 'rockC', at: { zone: 'tower', e: 0, n: 0 }, radius: 13, count: 18, scale: [0.8, 1.2] },
    { ring: 'crystalA', at: { zone: 'tower', e: 0, n: 0 }, radius: 10, count: 7, scale: [0.12, 0.2] },

    // HIDDEN OASIS — no objective, just a reward for exploring
    { ring: 'palmWide', at: { zone: 'oasis', e: 0, n: 0 }, radius: 7.5, count: 4, scale: [0.35, 0.45] },
    { ring: 'datePalm', at: { zone: 'oasis', e: 0, n: 0 }, radius: 8.5, count: 4, scale: [0.7, 0.9] },
    { model: 'palmTall', at: { zone: 'oasis', e: 2, n: 8 }, scale: 0.4 },
  ],

  // ── Mechanics ────────────────────────────────────────────────────────────
  itemTypes: {
    powercell: { model: 'powercell', scale: [0.74, 0.28, 0.74], carry: true, beam: true },   // ~1.34 m wide, 1 m tall
    crate:     { model: 'crate', scale: 1.25, carry: true, stack: true, size: 1.0, maxStack: 2 },
    rifle:     { model: 'rifle', scale: 1.3, equip: true, beam: true, float: 0.9, grip: { scale: 0.45, offset: [0.1, 0.03] } },
  },
  items: [
    { id: 'cell1', type: 'powercell', at: { zone: 'outpost', e: 5, n: -8.5 } },   // next to the rover: easy
    { id: 'cell2', type: 'powercell', at: { zone: 'geysers', e: 0, n: 0 } },      // in the middle of the geyser ring
    { id: 'crate1', type: 'crate', at: { zone: 'depot', e: 3, n: 3.5 } },
    { id: 'crate2', type: 'crate', at: { zone: 'depot', e: 5, n: -3.5 } },
    { id: 'crate3', type: 'crate', at: { zone: 'depot', e: 0.5, n: -4 } },
    { id: 'rifle', type: 'rifle', on: 'armory' },                                // on the armory roof (needs a 2-crate stack)
  ],
  sockets: [
    { id: 'gen1', group: 'generator', accepts: 'powercell', at: { zone: 'outpost', e: -4.2, n: 5.6 } },
    { id: 'gen2', group: 'generator', accepts: 'powercell', at: { zone: 'outpost', e: -6, n: 3.4 } },
  ],
  fields: [   // force field across the crater gate, drops when the generator has power
    { id: 'gate', at: { zone: 'tower', toward: 'outpost', dist: 14.2 }, facing: 'outpost', width: 9, height: 4.5, opensOn: 'power' },
  ],
  walls: [   // seals the gaps between the rim rocks — the gate is the only way in
    { center: { zone: 'tower', e: 0, n: 0 }, radius: 14.2, gapToward: 'outpost', gap: 9 },
  ],
  hazards: [
    ...LAVA.map(l => ({ type: 'lava', ...l })),
    ...GEYSERS.map(g => ({ type: 'geyser', period: 3.4, active: 1.5, warn: 0.9, ...g })),
  ],
  breakables: [   // crystal growth sealing the nav core — shoot it
    { id: 'shell', at: { zone: 'tower', toward: 'outpost', dist: -7 }, hp: 6, radius: 1.9,
      parts: [
        { model: 'crystalTall', e: 0.9, n: 0, scale: 0.24, yaw: 0 },
        { model: 'crystalB', e: -0.7, n: 0.7, scale: 0.3, yaw: 120 },
        { model: 'crystalC', e: -0.5, n: -0.9, scale: 0.3, yaw: 240 },
        { model: 'crystalD', e: 0.2, n: 1.0, scale: 0.18, yaw: 60 },
      ] },
  ],
  npc: { model: 'alien', height: 1.5, at: { zone: 'tower', toward: 'outpost', dist: -11, side: 4 } },

  // ── Cutscene: meeting the local (plays after the nav core is picked up) ──
  // cam:   'overShoulder' (behind `subject`, looking at `target`) · 'medium' / 'closeUp' (on `subject`, from the
  //        other character's side) · 'twoShot' (side view of both) · 'follow' (behind the player, tracking the alien)
  // alien / player: animation to play (an array plays the first once, then loops the second)
  cutscene: {
    shots: [
      { dur: 2.8, cam: 'overShoulder', subject: 'player', target: 'spot', say: 'Wait... something\'s moving behind those rocks.' },
      { dur: 2.2, cam: 'medium', subject: 'alien', spawn: true, alien: ['Jump_Land', 'Idle'] },
      { dur: 3.0, cam: 'closeUp', subject: 'alien', alien: 'Wave', say: 'Is that... a local? It\'s waving at us!' },
      { dur: 3.0, cam: 'overShoulder', subject: 'alien', target: 'player', alien: 'Idle', player: 'Wave', say: 'Well, don\'t be rude. Wave back!' },
      { dur: 2.2, cam: 'twoShot', alien: 'Yes' },
      { dur: 3.0, cam: 'follow', alien: 'Run', run: true, say: '...and it\'s gone.' },
    ],
    after: 'Okay. Let\'s get to the ship before it brings friends.',
  },

  // the level's "cells": the nav core, behind the crystal shell
  cells: [
    { id: 'nav', zone: 'tower', at: { zone: 'tower', toward: 'outpost', dist: -7 },
      line: "{happy}Nav core recovered! And... oh. It has spare memory banks. I can lean on those. I feel clearer already." },
  ],

  objective: (g) =>
    !g.flags.power ? `Restore power: bring energy cells to the outpost generator (${g.socketsFilled}/2)`
    : g.collected < g.total && !g.flags.rifle ? 'The crater gate is open, but the nav core is sealed in crystal. Find a tool at Dustbowl Depot'
    : g.collected < g.total ? 'Shoot the crystal shell and recover the nav core in Signal Crater'
    : 'Return to the ship',

  // where Nova's "need a hand?" hint points
  hintTarget: (g) =>
    !g.flags.power ? (g.carrying === 'powercell' ? 'socket' : 'item:powercell')
    : !g.flags.rifle ? 'item:rifle'
    : 'cell',

  scatter: [
    { zone: 'pad', models: ['rubble'], count: 8, scale: [0.4, 0.7], spacing: 1.5 },
    { zone: 'pad', models: ['succulent', 'yucca', 'grassWispy'], count: 30, scale: [0.8, 1.3], spacing: 0.9 },
    { zone: 'pad', models: ['datePalm', 'bismarckPalm'], count: 4, scale: [0.6, 0.8], spacing: 6 },

    { zone: 'outpost', models: ['rubble', 'mineral'], count: 14, scale: [0.4, 1.4], spacing: 1.2, allowPath: true },
    { zone: 'outpost', models: ['yucca', 'succulent', 'grassWispy'], count: 45, scale: [0.7, 1.2], spacing: 0.9 },
    { zone: 'outpost', models: ['cactus', 'pricklyPear'], count: 8, scale: [1, 1.4], spacing: 2.2 },
    { zone: 'outpost', models: ['datePalm', 'bismarckPalm'], count: 4, scale: [0.6, 0.85], spacing: 6 },

    { zone: 'geysers', models: ['rubble'], count: 40, scale: [0.4, 0.9], spacing: 1.4 },
    { zone: 'geysers', models: ['rockA', 'rockB', 'rockC'], count: 18, scale: [0.5, 1.1], spacing: 3 },
    { zone: 'geysers', models: ['crystalSmall'], count: 10, scale: [0.8, 1.3], spacing: 2 },
    { zone: 'geysers', models: ['grassWispy', 'succulent'], count: 30, scale: [0.6, 1], spacing: 1 },

    { zone: 'depot', models: ['rockA', 'rockB', 'rockC'], count: 10, scale: [0.6, 1.1], spacing: 3 },
    { zone: 'depot', models: ['rubble', 'rockPoly'], count: 16, scale: [0.3, 0.8], spacing: 1.2 },
    { zone: 'depot', models: ['barrelCactus'], count: 5, scale: [0.12, 0.2], spacing: 2 },
    { zone: 'depot', models: ['grassWispy', 'yucca', 'succulent'], count: 35, scale: [0.7, 1.2], spacing: 0.9 },
    { zone: 'depot', models: ['cactus', 'pricklyPear'], count: 6, scale: [1, 1.4], spacing: 2 },

    { zone: 'tower', models: ['crystalSmall'], count: 16, scale: [0.7, 1.6], spacing: 1.6 },
    { zone: 'tower', models: ['mineral'], count: 20, scale: [1, 2.2], spacing: 0.8 },

    { zone: 'oasis', models: ['grassWispy'], count: 90, scale: [0.8, 1.4], spacing: 0.6 },
    { zone: 'oasis', models: ['succulent', 'yucca', 'pricklyPear'], count: 35, scale: [0.8, 1.3], spacing: 1 },
    { zone: 'oasis', models: ['datePalm', 'bismarckPalm'], count: 5, scale: [0.6, 0.9], spacing: 4 },

    { zone: null, models: ['rockA', 'rockB', 'rockC'], count: 35, scale: [0.5, 1.4], spacing: 3 },
    { zone: null, models: ['rockLargeA', 'rockLargeB'], count: 8, scale: [0.5, 0.9], spacing: 7 },
    { zone: null, models: ['rubble', 'rockPoly'], count: 50, scale: [0.4, 1], spacing: 1.2 },
    { zone: null, models: ['cactus', 'pricklyPear'], count: 55, scale: [0.9, 1.5], spacing: 2 },
    { zone: null, models: ['barrelCactus'], count: 25, scale: [0.12, 0.24], spacing: 2 },
    { zone: null, models: ['grassWispy'], count: 220, scale: [0.7, 1.3], spacing: 0.7 },
    { zone: null, models: ['yucca', 'succulent'], count: 140, scale: [0.7, 1.3], spacing: 0.9 },
    { zone: null, models: ['bismarckPalm', 'datePalm'], count: 18, scale: [0.5, 0.85], spacing: 5 },
    { zone: null, models: ['palmWide'], count: 5, scale: [0.3, 0.4], spacing: 8 },
    { zone: null, models: ['crystalA', 'crystalB', 'crystalC'], count: 8, scale: [0.08, 0.15], spacing: 2.5 },
    { zone: null, models: ['mineral'], count: 25, scale: [1, 2], spacing: 0.8, allowPath: true },
  ],

  dialogue: {
    intro: [
      "{happy}Touchdown. Gentle this time, you're welcome.",
      "The ship flies, but our nav computer is fried. Without a nav core we can't find our way home.",
      "{worried}{glitch}And I... sorry. Lost my train of thought. That keeps happening since the crash.",
      "There's an old mining outpost ahead. Outposts have spares. Let's get its power back on first.",
    ],
    zones: {
      outpost: { enter: 'Rustwell Outpost. Abandoned years ago, by the dust.',
                 hint: (g) => g.flags.power ? null : 'The generator is the round building. It needs two energy cells. There\'s one by the rover — press E to pick it up.' },
      geysers: { enter: '{worried}Those are not small vents. They fire in a wave toward the middle. Run behind it, and wait in the gaps between them.',
                 hint: (g) => g.flags.power ? null : 'The cell is inside a ring of vents. They fire in turn, so go through one the second it dies down. And stay off the lava.' },
      depot:   { enter: 'Dustbowl Depot. Supply drops used to land here.',
                 hint: (g) => g.flags.rifle ? null : 'Something\'s on the armory roof: a mining blaster! Stack two crates next to the armory and climb up — drop a crate onto another one to stack it.' },
      tower:   { enter: 'Signal Crater. The tower still has power to its beacon... mostly.',
                 hint: (g) => g.collected ? null : 'The nav core is behind the tower, sealed in crystal.' },
      oasis:   { enter: "{sad}An oasis. I can see it, but I can't feel the sun on it. Stand here a second for me?", hint: null },
      pad:     { enter: null, hint: null },
    },
    events: {
      firstCarry: 'Got it. Carrying slows you down and you can\'t jump. Press E again to put it down.',
      socket: ['One cell in. One more — I\'m reading another one out in Steamvent Flats, east of the outpost.', null],
      power: "{happy}Power is back! The force field at Signal... the, um... the crater. It dropped. Head south to the tower.",
      fieldClosed: 'A force field. It\'s drawing power from the outpost. No power, no way in.',
      rifle: 'A mining blaster! Left click to fire. That should handle crystal.',
      shellNoGun: 'The core is sealed inside solid crystal. We need something that cuts rock.',
      shellBroken: 'The crystal shattered. Grab the core!',
      geyserHit: 'Ouch! Time it better: wait until the vent stops, then run.',
      lavaDeath: 'That was lava. I\'ve pulled you back to the landing pad. Let\'s not do that again.',
      dropped: 'You dropped it when the vent hit you. Pick it back up.',
      noRoom: 'No room to put that down here.',
      stackLimit: 'Two crates high is the limit. Any taller and you couldn\'t climb it.',
    },
    progress: [null, null],
    nextSignal: null,
    hint: 'Need a hand? Your next goal is {dir} of you, about {dist} meters away.',
    returnToShip: 'Nav core installed. Press E at the ship. Next stop: that purple planet.',
    launch: ['Course plotted.', "{worried}The spare memory buys me time. Not forever. Let's keep moving. Hold on!"],
  },
};
