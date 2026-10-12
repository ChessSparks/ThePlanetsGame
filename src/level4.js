// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 4 — "GLACIA"
//  A frozen moon with an abandoned research station. Teaches: staying warm (cold meter),
//  sliding on ice, the blaster as a tool (melting), thin ice + frozen levers. Finale: avalanche escape.
//  Same placement rules as the other levels. See LEVEL4_DESIGN.md for the reasoning.
// ─────────────────────────────────────────────────────────────────────────────

const L2 = 'models/level_two/';
const L4 = 'models/level_fourth/';

// ground: the model's base is above or below its origin → sit it on the surface
export const MODELS = {
  astronaut:   { url: 'models/main_character/Astronaut V2.glb' },
  ship:        { url: 'Spaceship by Quaternius - u105mYHLHU.glb' },
  rifle:       { url: 'Scifi Pistol by Quaternius - U0Q1BrKL1y.glb' },   // the blaster
  powercell:   { url: L2 + 'props/powercell.glb' },                         // the beacon core

  pineSnow:    { url: L4 + 'vegetation/Pine Tree with Snow by Quaternius - 17vQv2X5rh.glb', trunk: 0.3 },
  pineSnowB:   { url: L4 + 'vegetation/Pine Tree with Snow by Chris Lee - 3pWKPFASEn-.glb', trunk: 0.06, ground: true },
  snowTree:    { url: L4 + 'vegetation/Snow Tree by Jarlan Perez - 1H99E82pKYS.glb', trunk: 0.06, ground: true },

  snowRock:    { url: L4 + 'rocks/free_asset_snowy_rock_01.glb', block: true, ground: true },   // ~900 units in the file: scale ≈ 0.004
  iceRock:     { url: L4 + 'rocks/snowy_ice.glb', block: true },
  mountain:    { url: L4 + 'rocks/Mountain by Quaternius - 7HYR2s9JVi.glb', block: true },
  mine:        { url: L4 + 'rocks/Mine by Quaternius - wOJ61Fa0Lt.glb', block: true },
  pebble:      { url: L4 + 'rocks/Rock by Kenney - 96WFhOKCXK.glb', block: true },

  igloo:       { url: L4 + 'station/Igloo by Poly by Google - 6k656rJhVzY.glb', block: true, ground: true },
  landerA:     { url: L4 + 'station/Lander A by Kay Lousberg - TVASj3JcDO.glb', block: true },
  landerB:     { url: L4 + 'station/Lander B by Kay Lousberg - YPZ2B9ao7L.glb', block: true },
  dish:        { url: L4 + 'station/Satellite dish by Poly by Google - 5iVbfDhRnN7.glb', trunk: 2.6 },

  barrel:      { url: L4 + 'props/Barrel by Quaternius - MraIiFnpAY.glb', box: true },
  chest:       { url: L4 + 'props/Chest by Quaternius - vXaxy7ortM.glb', box: true },
  crate:       { url: L4 + 'props/Pickup Crate by Quaternius - 1dh0EFL5gl.glb', box: true },
  lantern:     { url: L4 + 'props/Lantern by Kay Lousberg - CtHBJ1ufeW.glb' },
  rover:       { url: L4 + 'props/Round Rover by Quaternius - ejdkcNgMpr.glb', block: true },
  computer:    { url: L4 + 'props/Scifi Computer by Quaternius - U0xmt6tUlL.glb', box: true },

  crystalA:    { url: L2 + 'crystals/Crystal by iPoly3D - dxCmHfpqc5.glb', glow: '#6fd8ff', block: true },
  crystalB:    { url: L2 + 'crystals/Crystal by iPoly3D - Wj8Qjq38T8.glb', glow: '#6fd8ff', block: true },
};

export const LEVEL4 = {
  name: 'Glacia',
  subtitle: 'Planet 4 · Answer the distress signal on a frozen moon',
  radius: 62,
  seed: 44,
  playerScale: 1,
  nova: { fade: 0.42 },   // Nova's damage on this planet: the cold is hard on her
  next: { level: 5, name: 'Haven' },
  shipWrecked: false,
  startWith: ['rifle'],
  launchRequires: 'escaped',     // the ship only takes off once you've outrun the avalanche
  groundSpark: '#dff2ff',
  boltColor: '#ffb35a',          // warm bolts: the blaster melts ice here

  ground: { base: '#cfdbe8', path: '#9fb3cb', pathWidth: 1.7 },

  sky: {
    background: '#040816',
    atmosphere: '#9fd8ff',
    hemi: ['#c8dcf5', '#4a5a78', 1.15],
    sun: ['#e6eeff', 1.6],
    stars: 0.8,
    bloom: { strength: 0.5, radius: 0.5, threshold: 0.75 },
    planets: [
      { color: '#7a4fd4', emissive: '#2a1060', radius: 70, pos: [-800, 300, -900] },    // Umbra, behind you
      { color: '#9fb8d8', emissive: '#28344a', radius: 260, pos: [900, -350, 1300], ring: { inner: 330, outer: 470, color: '#cfe0f5' } },   // a pale gas giant
    ],
  },

  start: { zone: 'drop', e: 0, n: 1 },
  startFacing: 'station',

  zones: [
    { id: 'drop',    name: 'Drop Point',        lat:  90, lon:   0, radius: 10, ground: '#e8eff8' },
    { id: 'station', name: 'Frostfall Station', lat:  52, lon:   0, radius: 16, ground: '#c9d5e2' },
    { id: 'lake',    name: 'Mirror Lake',       lat:  22, lon:  68, radius: 15, ground: '#9cc2e2' },
    { id: 'caves',   name: 'Crystal Caves',     lat: -28, lon:  48, radius: 13, ground: '#86a3c4' },
    { id: 'peak',    name: 'Beacon Peak',       lat: -22, lon: -38, radius: 14, ground: '#f1f6fb' },
  ],

  paths: [
    ['drop', 'station'],
    ['station', 'lake'],
    ['lake', 'caves'],
    ['caves', 'peak'],
    ['peak', 'station'],   // the old supply trail: sealed by an ice cliff until the avalanche breaks it
  ],

  patches: [
    { at: { zone: 'station', e: -3, n: 2 }, radius: 7, color: '#b7c4d3' },        // trampled snow around the heater
    { at: { zone: 'station', toward: 'peak', dist: 9 }, radius: 4.5, color: '#9aa8b8' },   // landing pad
  ],

  clearings: [
    { at: { zone: 'lake', e: 0, n: 0 }, radius: 15 },
    { at: { zone: 'caves', e: 0, n: 0 }, radius: 4 },
    { at: { zone: 'peak', e: 0, n: 0 }, radius: 6 },
    { at: { zone: 'station', toward: 'peak', dist: 9 }, radius: 5 },
    { at: { zone: 'drop', e: 0, n: -4 }, radius: 3.5 },
  ],

  props: [
    // FROSTFALL STATION
    { model: 'ship', id: 'ship', at: { zone: 'station', toward: 'peak', dist: 9 }, scale: 1.2, yaw: 30, sink: -2.55, dynamic: true, collider: { r: 3.4 } },
    { model: 'landerA', at: { zone: 'station', e: -9, n: 6 }, scale: 3.2, yaw: 20 },
    { model: 'landerB', at: { zone: 'station', e: -10, n: -1.5 }, scale: 3.2, yaw: 80 },
    { model: 'igloo', at: { zone: 'station', e: 6, n: 8 }, scale: 3, yaw: 200 },
    { model: 'dish', id: 'dish', at: { zone: 'station', e: 9, n: -5 }, scale: 0.5, yaw: 220 },
    { model: 'rover', at: { zone: 'station', e: 12.5, n: 4.5 }, scale: 0.8, yaw: 90 },   // clear of the igloo and the dish
    { model: 'computer', id: 'computer', at: { zone: 'station', e: -2, n: 7 }, scale: 1, yaw: 180 },
    { model: 'barrel', at: { zone: 'station', e: -6.5, n: 9 }, scale: 1.2 },
    { model: 'barrel', at: { zone: 'station', e: -5.6, n: 9.6 }, scale: 1.1 },
    { model: 'crate', at: { zone: 'station', e: -12, n: 3 }, scale: 1.3, sink: -0.55 },
    { model: 'chest', at: { zone: 'station', e: 1.5, n: 11 }, scale: 1.6 },

    // DROP POINT
    { model: 'snowRock', at: { zone: 'drop', e: 5, n: -6 }, scale: 0.004 },
    { model: 'snowRock', at: { zone: 'drop', e: -6, n: -5 }, scale: 0.003 },

    // CRYSTAL CAVES — a ring of ice cliffs (gaps toward the lake and the peak), crystals inside
    { ring: 'iceRock', at: { zone: 'caves', e: 0, n: 0 }, radius: 14, count: 16, scale: [0.9, 1.2] },
    { ring: 'snowRock', at: { zone: 'caves', e: 0, n: 0 }, radius: 15.5, count: 12, scale: [0.004, 0.005] },
    { model: 'mine', at: { zone: 'caves', e: -7, n: 5 }, scale: 3.4, yaw: 90 },
    { model: 'crystalA', at: { zone: 'caves', e: 6, n: 6 }, scale: 0.25 },
    { model: 'crystalB', at: { zone: 'caves', e: -6, n: -6 }, scale: 0.28 },
    { model: 'crystalA', at: { zone: 'caves', e: 7, n: -3 }, scale: 0.18 },

    // BEACON PEAK — mountains all around, one way in (from the caves), one way out (the sealed trail)
    { ring: 'mountain', at: { zone: 'peak', e: 0, n: 0 }, radius: 18, count: 11, scale: [7, 9.5], sink: 1.2 },
    { ring: 'snowRock', at: { zone: 'peak', e: 0, n: 0 }, radius: 14.5, count: 14, scale: [0.004, 0.0055] },
  ],

  // ── Planet 4 systems (frost.js) ───────────────────────────────────────────
  frost: {
    lanternModel: 'lantern',
    cold: { drain: 1.0, zoneDrain: { caves: 2.2, peak: 1.6 } },   // warmth lost per second (out of 100)
    lanterns: [
      { at: { zone: 'drop', e: 2.5, n: 2 } },
      { at: { zone: 'station', e: -5, n: 1 } },
      { at: { zone: 'station', toward: 'lake', dist: 30, side: 3 } },
      { at: { zone: 'lake', toward: 'station', dist: 15.5, side: 2.5 } },   // at the shore where you climb out
      { at: { zone: 'lake', e: 11.7, n: 6.8 } },
      { at: { zone: 'lake', e: 2.3, n: -13.5 } },
      { at: { zone: 'lake', e: -12.7, n: -4.6 } },
      { at: { zone: 'caves', toward: 'lake', dist: 18, side: 3 } },
      { at: { zone: 'peak', toward: 'caves', dist: 10, side: -3 } },
    ],
    heater: { at: { zone: 'station', e: -3, n: 3 }, zoneCenter: { zone: 'station', e: 0, n: 0 }, radius: 15 },
    iceAreas: [{ zone: 'lake', radius: 15, traction: 0.22 }],
    structures: [
      { type: 'portalRing', id: 'arrivalPortal', at: { zone: 'drop', e: 0, n: -4, face: 'station' } },
      { type: 'iceArch', at: { zone: 'caves', toward: 'lake', dist: 10, face: 'lake' }, width: 6, height: 4.5 },
      { type: 'iceArch', at: { zone: 'caves', toward: 'peak', dist: 10, face: 'peak' }, width: 6, height: 4.5 },
      { type: 'iceArch', at: { zone: 'caves', e: 0, n: 0, face: 'peak' }, width: 7, height: 5 },
      { type: 'warmVent', at: { zone: 'caves', e: 4, n: 4 } },
      { type: 'warmVent', at: { zone: 'caves', e: -5, n: -2 } },
      { type: 'warmVent', at: { zone: 'caves', e: 3, n: -6 } },
      { type: 'iceSpikes', at: { zone: 'caves', e: -4, n: 6 } },
      { type: 'iceSpikes', at: { zone: 'caves', e: 6, n: -1 }, length: 2.8 },
      { type: 'iceSpikes', at: { zone: 'caves', e: -7, n: -6 } },
      { type: 'iceSpikes', at: { zone: 'lake', e: 14, n: -3 }, length: 1.8 },
      { type: 'iceSpikes', at: { zone: 'peak', e: -6, n: 6 }, length: 3 },
    ],
    melt: [
      { id: 'heaterIce', kind: 'shell', at: { zone: 'station', e: -3, n: 3 }, size: 2.3, hp: 4 },
      { id: 'leverIce1', kind: 'shell', at: { zone: 'lake', e: -8.7, n: 5 }, size: 1.5, hp: 3 },
      { id: 'leverIce2', kind: 'shell', at: { zone: 'lake', e: 8.7, n: 5 }, size: 1.5, hp: 3 },
      { id: 'leverIce3', kind: 'shell', at: { zone: 'lake', e: 0, n: -10 }, size: 1.5, hp: 3 },
      { id: 'lakeGate', kind: 'wall', at: { zone: 'caves', toward: 'lake', dist: 13 }, facing: 'lake', width: 8.5, height: 4, opensOn: 'lakeSolved',
        thickLine: 'Way too thick to melt. Something at the lake must open it.' },
      { id: 'coreIce', kind: 'shell', at: { zone: 'caves', e: 0, n: 1.5 }, size: 1.9, hp: 5, encases: 'core', anchor: 'core' },
      { id: 'exitIce', kind: 'wall', at: { zone: 'caves', toward: 'peak', dist: 13 }, facing: 'peak', width: 8.5, height: 4, hp: 6 },
      { id: 'cornice', kind: 'wall', at: { zone: 'peak', toward: 'station', dist: 14 }, facing: 'station', width: 9.5, height: 5.5, opensOn: 'cutsceneEnd:beacon',
        thickLine: 'A solid ice cliff. Nothing short of a mountain moving will open that.' },
    ],
    beacon: { at: { zone: 'peak', e: 0, n: 0 }, height: 7 },
    // Mirror Lake: three levers frozen on little snow islands; dark thin ice between them
    levers: {
      onSolved: 'lakeSolved',
      levers: [
        { at: { zone: 'lake', e: -8.7, n: 5 }, ice: 'leverIce1', yaw: 120 },
        { at: { zone: 'lake', e: 8.7, n: 5 }, ice: 'leverIce2', yaw: 240 },
        { at: { zone: 'lake', e: 0, n: -10 }, ice: 'leverIce3', yaw: 0 },
      ],
    },
    thinIce: {
      zone: 'lake', breakTime: 1.0, warmthLoss: 35,
      shore: { zone: 'lake', toward: 'station', dist: 16.5 },   // where you climb out
      patches: [
        { at: { zone: 'lake', e: 0, n: 6 }, radius: 3 },          // blocks the straight line between levers 1 and 2
        { at: { zone: 'lake', e: -3.5, n: -4.5 }, radius: 2.6 },
        { at: { zone: 'lake', e: 5, n: -4 }, radius: 2.6 },
        { at: { zone: 'lake', e: 12, n: -1 }, radius: 2.2 },
        { at: { zone: 'lake', e: -12, n: -1 }, radius: 2.2 },
        { at: { zone: 'lake', e: -4, n: 11 }, radius: 2 },
      ],
    },
    consoles: [
      { id: 'crewLog', prop: 'computer', anchor: 'console', prompt: 'Read the crew log', cutscene: 'log', once: true },
    ],
    anchors: {
      arrivalPortal: { at: { zone: 'drop', e: 0, n: -4 }, alt: 2.5 },
      dishTop: { at: { zone: 'station', e: 9, n: -5 }, alt: 7 },
    },
    // faster than you (11.2 vs 8 m/s) but starts 16 m behind: a clean run ends ~6 m ahead of it; any stop and it catches you
    avalanche: { from: 'peak', to: 'station', width: 22, speed: 11.2, accel: 6, startBack: 8,
      runStart: { zone: 'peak', toward: 'station', dist: 8 }, showOn: 'avalancheShow', startOn: 'cutsceneEnd:beacon' },
    lines: {
      cold40: '{worried}You\'re getting cold. Lanterns and warm vents will heat you up.',
      cold15: '{worried}{glitch}You\'re freezing! Find heat, now!',
      frozen: 'Your suit froze up. I\'ve pulled you back to the drop point. Keep near the lanterns.',
      buried: 'Buried! Again, from the top. Don\'t stop running!',
      leverFrozen: 'It is frozen solid. Shoot the ice off first.',
      leverPulled: '{n} of {total} levers pulled.',
      thinIce: 'That ice is cracking! Keep moving!',
      fell: 'Splash! I pulled you out, but that water nearly froze your suit.',
    },
  },

  itemTypes: {
    rifle: { model: 'rifle', scale: 1.3, equip: true, grip: { scale: 0.45, offset: [0.1, 0.03] } },
    beaconCore: { model: 'powercell', label: 'beacon core', scale: [0.6, 0.27, 0.6], carry: true, beam: true },
  },
  items: [
    { id: 'core', type: 'beaconCore', at: { zone: 'caves', e: 0, n: 1.5 } },
  ],
  sockets: [
    { id: 'beaconSocket', group: 'beacon', accepts: 'beaconCore', at: { zone: 'peak', toward: 'caves', dist: 2.8 } },
  ],
  walls: [
    { center: { zone: 'caves', e: 0, n: 0 }, radius: 13.5, gaps: [{ toward: 'lake', width: 8 }, { toward: 'peak', width: 8 }] },
    { center: { zone: 'peak', e: 0, n: 0 }, radius: 14.5, gaps: [{ toward: 'caves', width: 9 }, { toward: 'station', width: 10 }] },
  ],

  // ── Cutscenes ────────────────────────────────────────────────────────────
  cutscenes: {
    arrival: {
      trigger: 'start', delay: 2.5,
      shots: [
        { dur: 3.4, cam: 'overShoulder', subject: 'player', target: 'dishTop', say: 'Brr. Glacia. Minus ninety outside, and that\'s the warm side.' },
        { dur: 3.2, cam: 'medium', subject: 'arrivalPortal', target: 'player', size: 1.4, emit: 'portalClose', say: 'The portal is... closing. Well. We\'re not going back that way.' },
        { dur: 3.6, cam: 'overShoulder', subject: 'player', target: 'dishTop', say: "{glitch}That dish is sending a distress signal. Someone was here. Let's... let's find out who." },
      ],
      after: 'Follow the path to the station. And watch your warmth: stay near lanterns.',
    },
    log: {
      stage: { facing: 'console', dist: 2.2 },
      shots: [
        { dur: 4.2, cam: 'closeUp', subject: 'console', target: 'player', say: 'CREW LOG, DAY 41: "Storm took the dish relay. Rerouting the distress call through the beacon on the peak."' },
        { dur: 4.4, cam: 'overShoulder', subject: 'player', target: 'console', say: 'DAY 43: "Beacon core froze solid in the caves. The lake gate is jammed, so we can\'t reach it."' },
        { dur: 4.4, cam: 'closeUp', subject: 'console', target: 'player', say: 'DAY 44: "Snow on the peak is unstable. Evacuating by shuttle. If anyone reads this: light the beacon, then RUN."' },
      ],
      after: 'So: open the lake gate, free the core in the caves, light the beacon. And then... run. Got it.',
    },
    beacon: {
      trigger: 'filled:beacon', delay: 0.6,
      shots: [
        { dur: 3.2, cam: 'medium', subject: 'beacon', target: 'player', size: 1.8, emit: 'beaconLit', say: 'The beacon is lit! Signal is going out, and the ship has locked on.' },
        { dur: 4.6, cam: 'medium', subject: 'pad', target: 'player', size: 3.4, emit: 'shipArrive', say: 'There she is, landing at the station pad.' },
        { dur: 3.0, cam: 'overShoulder', subject: 'player', target: 'avalanche', emit: 'avalancheShow', say: 'What is that rumble...? AVALANCHE! Run for the ship! Down the old trail!' },
      ],
    },
  },

  eventLines: {
    heatOn: "{happy}The heater is running! Oh, that's better. I didn't want to say it, but I've been feeding my own power into your suit heater. Let's check that computer.",
    lakeSolved: 'All three levers! I heard the gate by the caves grind open!',
    'melted:coreIce': 'There\'s the beacon core! Melt the far wall first, though. You can\'t shoot while carrying.',
    escaped: "{happy}{glitch}It stopped at the station windbreak! We made it! Get to the ship!",
  },

  objective: (g) =>
    !g.flags.heatOn ? 'Reach Frostfall Station and thaw its heater (shoot the ice)'
    : !g.flags['cutsceneEnd:log'] ? 'Read the crew log on the station computer'
    : !g.flags.lakeSolved ? `Mirror Lake: melt the frozen levers and pull them (${g.levers}/${g.leverTotal}). Don't stop on dark ice!`
    : !g.flags['filled:beacon'] ? (g.carrying === 'beaconCore' ? 'Carry the beacon core to Beacon Peak' : 'Crystal Caves: melt the ice and take the beacon core')
    : !g.flags.escaped ? 'RUN! Down the trail to the station!'
    : 'Board the ship (E)',

  hintTarget: (g) =>
    !g.flags.heatOn ? 'anchor:heater'
    : !g.flags['cutsceneEnd:log'] ? 'anchor:console'
    : !g.flags.lakeSolved ? 'anchor:nextLever'
    : !g.flags['filled:beacon'] ? (g.carrying === 'beaconCore' ? 'socket' : 'anchor:core')
    : 'anchor:pad',

  scatter: [
    { zone: 'drop', models: ['pineSnow'], count: 5, scale: [0.9, 1.3], spacing: 4 },
    { zone: 'drop', models: ['pebble'], count: 6, scale: [0.5, 0.9], spacing: 1.5 },

    { zone: 'station', models: ['pineSnow', 'snowTree'], count: 5, scale: [1, 1.4], spacing: 5 },
    { zone: 'station', models: ['pebble'], count: 8, scale: [0.5, 0.9], spacing: 1.5 },


    { zone: 'caves', models: ['crystalA', 'crystalB'], count: 6, scale: [0.08, 0.14], spacing: 2.5 },
    { zone: 'caves', models: ['iceRock'], count: 4, scale: [0.35, 0.55], spacing: 3 },

    { zone: 'peak', models: ['pebble'], count: 10, scale: [0.6, 1.2], spacing: 1.8 },

    { zone: null, models: ['pineSnow'], count: 70, scale: [0.9, 1.6], spacing: 3.5 },
    { zone: null, models: ['pineSnowB'], count: 40, scale: [5, 7.5], spacing: 3 },
    { zone: null, models: ['snowTree'], count: 30, scale: [4.5, 6.5], spacing: 3 },
    { zone: null, models: ['snowRock'], count: 26, scale: [0.002, 0.0045], spacing: 3.5 },
    { zone: null, models: ['iceRock'], count: 10, scale: [0.4, 0.9], spacing: 4 },
    { zone: null, models: ['pebble'], count: 50, scale: [0.5, 1.1], spacing: 1.2 },
    { zone: null, models: ['crystalA', 'crystalB'], count: 8, scale: [0.06, 0.1], spacing: 3 },
  ],

  dialogue: {
    intro: [],
    zones: {
      station: { enter: 'Frostfall Station. No lights, no heat. The heater by the landers is frozen solid.', hint: (g) => g.flags.heatOn ? null : 'Shoot the ice off the heater. The blaster runs hot.' },
      lake:    { enter: 'Mirror Lake. Careful, it\'s slippery: you\'ll slide.', hint: (g) => g.flags.lakeSolved ? null : 'Three levers, frozen on those little islands. Melt them and pull them. And see the dark patches? Thin ice. Do not stop on them.' },
      caves:   { enter: 'Crystal Caves. It\'s even colder in here. The warm vents will help.', hint: (g) => g.flags['melted:coreIce'] ? null : 'The beacon core is frozen in the middle of the cave. Melt it out.' },
      peak:    { enter: 'Beacon Peak. Put the core into the socket by the mast.', hint: null },
      drop:    { enter: null, hint: null },
    },
    events: {
      firstCarry: 'Got the core. It\'s heavy: no jumping, and you can\'t shoot while carrying it. E puts it down.',
      noRoom: 'No room to put that down here.',
      dropped: 'You dropped it!',
      lavaDeath: null,
      rifle: null,
    },
    progress: [null],
    nextSignal: null,
    hint: 'Need a hand? Your next goal is {dir} of you, about {dist} meters away.',
    returnToShip: null,
    launch: [
      'Course plotted: Haven Station. The old repair yards. If anywhere can fix me, it is there.',
      "{sad}{glitch}I should tell you... I'm running on the last of my reserves. If I go quiet before we land, just keep flying. Promise me.",
    ],
  },
};
