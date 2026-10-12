// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 5 — "HAVEN"
//  An old research station on a garden moon. Nova is at her weakest; the station's repair pod can
//  patch her up. Callbacks to every planet (carry cells, robots to reboot, a guardian), plus the new
//  idea: a repair bay with a breached floor and broken gravity — long, floaty jumps over open space —
//  and, at the pod, a calm puzzle: put Nova's scrambled memory blocks back in order (1–15).
//  The repair only partly heals Nova and points to the next planet (the Forge), so the story goes on.
//  Same placement rules as the other levels. See LEVEL5_DESIGN.md for the reasoning.
// ─────────────────────────────────────────────────────────────────────────────

const L1 = 'models/level_one/';
const L2 = 'models/level_two/';
const L3 = 'models/level_three/';
const L5 = 'models/level_five/';
const KIT = L5 + 'sci-fi-kit/Scifi Kit by Quaternius - b6otgtfVoe.glb';   // one file, many named pieces (`part`)

export const MODELS = {
  astronaut:   { url: 'models/main_character/Astronaut V2.glb' },
  ship:        { url: 'Spaceship by Quaternius - u105mYHLHU.glb' },
  rifle:       { url: 'Scifi Pistol by Quaternius - U0Q1BrKL1y.glb' },
  powercell:   { url: L2 + 'props/powercell.glb' },
  health:      { url: L3 + 'health/Pickup Health by Quaternius - cPLNFLykkf.glb' },

  // station kit
  wallPlain:   { url: KIT, part: 'Wall_1', box: true, doubleSide: true },
  wallWindow:  { url: KIT, part: 'LongWindow_Wall_SideA', box: true, doubleSide: true },
  wallThree:   { url: KIT, part: 'ThreeWindows_Wall_SideA', box: true, doubleSide: true },
  wallDoor:    { url: KIT, part: 'DoorSingle_Wall_SideA', box: true, doubleSide: true },
  door:        { url: KIT, part: 'Door_Single', doubleSide: true },
  column:      { url: KIT, part: 'Column_3', trunk: 0.65 },
  columnSlim:  { url: KIT, part: 'Column_2', trunk: 0.32 },
  tile:        { url: KIT, part: 'FloorTile_Basic' },
  tile2:       { url: KIT, part: 'FloorTile_Basic2' },
  tileVent:    { url: KIT, part: 'RoofTile_Vents' },
  base:        { url: KIT, part: 'Props_Base', box: true },
  pod:         { url: KIT, part: 'Props_Pod', box: true },
  capsule:     { url: KIT, part: 'Props_Capsule', box: true },
  laser:       { url: KIT, part: 'Props_Laser', box: true },
  teleporter:  { url: KIT, part: 'Props_Teleporter_2' },
  computer:    { url: KIT, part: 'Props_Computer', box: true },
  computerSm:  { url: KIT, part: 'Props_ComputerSmall', box: true },
  crate:       { url: KIT, part: 'Props_Crate', box: true },
  crateLong:   { url: KIT, part: 'Props_CrateLong', box: true },
  container:   { url: KIT, part: 'Props_ContainerFull', box: true },
  shelf:       { url: KIT, part: 'Props_Shelf_Tall', box: true },
  statue:      { url: KIT, part: 'Props_Statue', trunk: 0.5 },
  vessel:      { url: KIT, part: 'Props_Vessel_Tall' },

  // robots
  robot:       { url: L5 + 'drones_and_robots/Robot Enemy by Quaternius - 1gNo5ezvmr.glb' },
  robotGun:    { url: L5 + 'drones_and_robots/Robot Enemy Legs Gun by Quaternius - lFZfDh2hzP.glb' },
  robotFly:    { url: L5 + 'drones_and_robots/Robot Enemy Flying by Quaternius - lF3jeRJwiH.glb' },

  // garden
  coffee:      { url: L5 + 'plants/Coffee plant by Poly by Google - dam5c-OPC8w.glb', trunk: 0.3 },
  fiddle:      { url: L5 + 'plants/Fiddle-leaf Plant by Poly by Google - 2ag6_uuqsnb.glb', trunk: 0.3 },
  potA:        { url: L5 + 'plants/Flower Pot by Zsky - Kgt363WkKd.glb', ground: true, trunk: 0.3 },
  potB:        { url: L5 + 'plants/Flower Pot by Zsky - XOT4ajEFjU.glb', ground: true, trunk: 0.3 },
  houseplant:  { url: L5 + 'plants/Houseplant by Quaternius - bfLOqIV5uP.glb', bend: 0.4 },
  shelfPlants: { url: L5 + 'plants/Plants - Assorted shelf plants by Jakers_H - 5COCzyz489J.glb', ground: true, box: true },
  potPlant:    { url: L5 + 'plants/Pot Plant by Nick Slough - pgRbBrjze0.glb', bend: 0.3 },
  grass:       { url: L1 + 'Tall Grass by Quaternius - JSIYtscPmP.glb', bend: 1 },
  bush:        { url: L1 + 'Bush with Flowers by Quaternius - U1ymDy8tbY.glb', bend: 0.35 },
  flowers:     { url: L1 + 'Flower Group by Quaternius - hfPzQAedOe.glb', bend: 1 },

  // the moon outside
  rockA:       { url: L2 + 'rocks/Rock by Quaternius - 34W5ymEePk.glb', block: true },
  rockB:       { url: L2 + 'rocks/Rock by Quaternius - HtpdTh3Ld6.glb', block: true },
  crystal:     { url: L2 + 'crystals/Crystal by iPoly3D - dxCmHfpqc5.glb', glow: '#6fb8ff', block: true },
};

// ── layout helpers (the level is plain data; these just save typing) ────────
// a disc of floor tiles in a zone (2 m grid, aligned to the zone's e/n axes)
const tiles = (zone, radius, { e0 = 0, n0 = 0, toward } = {}) => {
  const out = [];
  for (let e = -radius; e <= radius; e += 2) for (let n = -radius; n <= radius; n += 2) {
    if (e * e + n * n > radius * radius) continue;
    const pick = (Math.abs(e * 7 + n * 13) % 5 === 0) ? 'tileVent' : (Math.abs(e + n) % 4 === 0 ? 'tile2' : 'tile');
    out.push({ model: pick, at: { zone, e: e0 + e, n: n0 + n }, heading: 0, sink: 0.02 });
  }
  return out;
};

const BAY_LOW_G = 15.5;   // metres from the bay centre with broken gravity

export const LEVEL5 = {
  name: 'Haven',
  subtitle: 'Planet 5 · Bring the old station back to life and repair Nova',
  radius: 58,
  seed: 55,
  playerScale: 1,
  next: null,                       // planet 6 (the Forge) is set up by the story, not built yet
  shipWrecked: false,
  startWith: ['rifle'],
  launchRequires: 'novaRepaired',
  groundSpark: '#bcd6ff',
  boltColor: '#5ef2ff',
  nova: { fade: 0.5, fadeOn: { novaRepaired: 0.1 } },   // her worst yet — until the repair pod

  ground: { base: '#4f5d6a', path: '#8592a0', pathWidth: 1.8 },

  sky: {
    background: '#03040c',
    atmosphere: '#7fb6ff',
    hemi: ['#c4d6ff', '#2a3348', 1.4],
    sun: ['#e8f0ff', 2.0],
    stars: 0.8,
    bloom: { strength: 0.55, radius: 0.5, threshold: 0.72 },
    planets: [
      { color: '#b8d8f0', emissive: '#2a4058', radius: 40, pos: [700, 300, 800] },                                   // Glacia, behind us
      { color: '#d2502c', emissive: '#6a1a08', radius: 150, pos: [-900, 380, -1100], ring: { inner: 200, outer: 280, color: '#ffb07a' } },   // the Forge, ahead
    ],
  },

  start: { zone: 'dock', e: 0, n: 1 },
  startFacing: 'atrium',

  zones: [
    { id: 'dock',   name: 'Docking Pad',  lat:  90, lon:   0, radius: 10, ground: '#5c6773' },
    { id: 'atrium', name: 'The Atrium',   lat:  52, lon:   0, radius: 14, ground: '#56626e' },
    { id: 'garden', name: 'Garden Dome',  lat:  18, lon:  62, radius: 12.5, ground: '#4f7a4a' },
    { id: 'hangar', name: 'Hangar',       lat:  18, lon: -62, radius: 12.5, ground: '#5d5953' },
    { id: 'bay',    name: 'Repair Bay',   lat: -18, lon:   0, radius: 17, ground: '#3e4652' },
  ],

  paths: [
    ['dock', 'atrium'],
    ['atrium', 'garden'],
    ['atrium', 'hangar'],
    ['atrium', 'bay'],
  ],

  patches: [
    { at: { zone: 'dock', e: -6, n: 3 }, radius: 6, color: '#6a7480' },
    { at: { zone: 'garden', e: 0, n: 0 }, radius: 11, color: '#3f6a3a' },
  ],

  clearings: [
    { at: { zone: 'atrium', e: 0, n: 0 }, radius: 13.5 },
    { at: { zone: 'bay', e: 0, n: 0 }, radius: 19.5 },
    { at: { zone: 'dock', e: -6, n: 3 }, radius: 6 },
    { at: { zone: 'hangar', e: 0, n: 0 }, radius: 5 },
  ],

  anchors: {
    station:   { at: { zone: 'atrium', e: 0, n: 0 }, alt: 4 },
    generator: { at: { zone: 'atrium', e: 0, n: 0 }, alt: 1 },
    pod:       { at: { zone: 'bay', e: 0, n: 0 }, alt: 2 },
    shipPad:   { at: { zone: 'dock', e: -6, n: 3 }, alt: 1 },
  },

  props: [
    // DOCKING PAD
    { model: 'ship', id: 'ship', at: { zone: 'dock', e: -6, n: 3 }, scale: 1.2, yaw: 180, sink: -2.55, dynamic: true, collider: { r: 3.4 } },
    ...tiles('dock', 5, { e0: -6, n0: 3 }),
    { model: 'crate', at: { zone: 'dock', e: 1.5, n: 5 }, scale: 1.2 },
    { model: 'crateLong', at: { zone: 'dock', e: 2.6, n: 6.4 }, scale: 1.2, yaw: 30 },
    { model: 'container', at: { zone: 'dock', e: -11, n: -2 }, scale: 1.3, yaw: 70 },

    // THE ATRIUM — a round hall of window walls, doorways where the walkways come in
    ...tiles('atrium', 8),
    { ring: 'wallWindow', at: { zone: 'atrium', e: 0, n: 0 }, radius: 13, doors: ['dock', 'garden', 'hangar', 'bay'], doorFrame: 'wallDoor', door: 'door' },
    { ring: 'columnSlim', at: { zone: 'atrium', e: 0, n: 0 }, radius: 9.5, count: 8, scale: [1, 1], skipPath: 1.5 },
    { model: 'laser', id: 'generator', at: { zone: 'atrium', e: 0, n: 0 }, scale: 1.2, heading: 0 },   // the main generator
    { model: 'statue', at: { zone: 'atrium', e: -6, n: 6 }, scale: 1.3 },
    { model: 'computer', at: { zone: 'atrium', e: 6, n: 6.5 }, scale: 1.2, yaw: 200 },
    { model: 'computerSm', at: { zone: 'atrium', e: 7.2, n: 5.2 }, scale: 1.2, yaw: 230 },
    { model: 'teleporter', at: { zone: 'atrium', e: -7, n: -5 }, scale: 1.3 },
    { model: 'capsule', at: { zone: 'atrium', e: 6.5, n: -6 }, scale: 1.3 },

    // GARDEN DOME — a broken glass dome, overgrown
    { ring: 'wallThree', at: { zone: 'garden', e: 0, n: 0 }, radius: 13, doors: ['atrium'], doorFrame: 'wallDoor', door: 'door' },
    { model: 'base', at: { zone: 'garden', e: 0, n: 0 }, scale: 1.4, heading: 0 },
    { ring: 'coffee', at: { zone: 'garden', e: 0, n: 0 }, radius: 5.5, count: 4, scale: [0.28, 0.34] },
    { ring: 'fiddle', at: { zone: 'garden', e: 0, n: 0 }, radius: 8.5, count: 5, scale: [0.3, 0.38] },
    { ring: 'shelfPlants', at: { zone: 'garden', e: 0, n: 0 }, radius: 11, count: 6, scale: [1.2, 1.4], tangent: true, skipPath: 2 },

    // HANGAR — cargo, a pod, a laser rig; the second cell on a platform in the middle
    ...tiles('hangar', 7),
    { model: 'base', at: { zone: 'hangar', e: 0, n: 0 }, scale: 1.4, heading: 0 },
    { model: 'pod', at: { zone: 'hangar', e: -7, n: 5 }, scale: 1.3 },
    { model: 'laser', at: { zone: 'hangar', e: 7, n: 6 }, scale: 1.2, yaw: 40 },
    { model: 'shelf', at: { zone: 'hangar', e: -9, n: -3 }, scale: 1.2, heading: 90 },
    { model: 'shelf', at: { zone: 'hangar', e: -9, n: -6 }, scale: 1.2, heading: 90 },
    { model: 'container', at: { zone: 'hangar', e: 6, n: -7 }, scale: 1.3, yaw: 15 },
    { model: 'crate', at: { zone: 'hangar', e: 8.5, n: -4 }, scale: 1.3 },
    { model: 'crate', at: { zone: 'hangar', e: 9.3, n: -2.8 }, scale: 1.1 },
    { model: 'crateLong', at: { zone: 'hangar', e: 3, n: 9 }, scale: 1.3, yaw: 80 },
    // a closed room: a ring of walls, one sliding door back to the atrium, a glass dome on top
    { ring: 'wallPlain', at: { zone: 'hangar', e: 0, n: 0 }, radius: 13, doors: ['atrium'], doorFrame: 'wallDoor', door: 'door' },
    { ring: 'columnSlim', at: { zone: 'hangar', e: 0, n: 0 }, radius: 11.4, count: 8, scale: [1, 1], skipPath: 1.5 },

    // REPAIR BAY — a ring of walls, a breached floor (open space below), stepping platforms, the pod in the middle
    { ring: 'wallPlain', at: { zone: 'bay', e: 0, n: 0 }, radius: 18.5, doors: [{ toward: 'atrium', lockedUntil: 'power' }], doorFrame: 'wallDoor', door: 'door' },
    ...tiles('bay', 5),
    { model: 'pod', id: 'pod', at: { zone: 'bay', e: 0, n: 0 }, scale: 1.4, heading: 0 },
    { model: 'computer', at: { zone: 'bay', toward: 'atrium', dist: 3.4, side: 2.6 }, scale: 1.2, heading: 0 },   // the pod console
    { model: 'base', at: { zone: 'bay', toward: 'atrium', dist: 10, side: 0 }, scale: 1.7, heading: 0 },
    { model: 'base', at: { zone: 'bay', toward: 'atrium', dist: 0, side: 10 }, scale: 1.7, heading: 0 },
    { model: 'base', at: { zone: 'bay', toward: 'atrium', dist: 0, side: -10 }, scale: 1.7, heading: 0 },
    { model: 'base', at: { zone: 'bay', toward: 'atrium', dist: -10, side: 0 }, scale: 1.7, heading: 0 },
    { ring: 'columnSlim', at: { zone: 'bay', e: 0, n: 0 }, radius: 16.3, count: 8, scale: [1, 1], skipPath: 1.5 },
  ],

  // ── mechanics ──────────────────────────────────────────────────────────
  itemTypes: {
    rifle: { model: 'rifle', scale: 1.3, equip: true, grip: { scale: 0.45, offset: [0.1, 0.03] } },
    powercell: { model: 'powercell', label: 'power cell', scale: [0.74, 0.28, 0.74], carry: true, beam: true },
  },
  items: [
    { id: 'cellGarden', type: 'powercell', at: { zone: 'garden', e: 0, n: 0.2 } },
    { id: 'cellHangar', type: 'powercell', at: { zone: 'hangar', e: 0, n: 0.2 } },
  ],
  sockets: [
    { id: 'gen1', group: 'generator', accepts: 'powercell', at: { zone: 'atrium', e: -3.2, n: 2.2 } },
    { id: 'gen2', group: 'generator', accepts: 'powercell', at: { zone: 'atrium', e: 3.2, n: 2.2 } },
  ],
  walls: [   // invisible: you can't jump over the bay walls in low gravity
    { center: { zone: 'bay', e: 0, n: 0 }, radius: 18.9, gapToward: 'atrium', gap: 4.5 },
  ],
  // glass domes resting on the wall rings (rim height = wall top, lowered by the planet's curve: 4.4 − 13²/(2·58))
  structures: [
    { type: 'glassDome', at: { zone: 'garden', e: 0, n: 0 }, radius: 13.1, height: 7, lift: 2.95, tint: '#a8f0c0' },
    { type: 'glassDome', at: { zone: 'atrium', e: 0, n: 0 }, radius: 13.1, height: 6, lift: 2.95 },
    { type: 'glassDome', at: { zone: 'hangar', e: 0, n: 0 }, radius: 13.1, height: 6.5, lift: 2.95, tint: '#c8d4e0' },
    // repair bay: wider ring (18.5 m), so the curve lowers its rim more: 4.4 − 18.5²/(2·58) ≈ 1.45.
    // Tall enough (top ≈ 9.5 m) that a low-gravity jump (≈ 5.4 m) never touches it.
    { type: 'glassDome', at: { zone: 'bay', e: 0, n: 0 }, radius: 18.6, height: 8, lift: 1.45, tint: '#9fc8ff' },
  ],
  hazards: [
    // the breached floor: a ring of open space between the walkway and the central island
    { type: 'breach', at: { zone: 'bay', e: 0, n: 0 }, inner: 6.6, outer: 14, respawn: { zone: 'bay', toward: 'atrium', dist: 16.4 },
      line: '{worried}Careful! You floated right out. I reeled you back in by your suit line.' },
  ],
  lowGravity: [
    { at: { zone: 'bay', e: 0, n: 0 }, radius: BAY_LOW_G, scale: 0.6,   // ~3 m high, ~11 m long jumps: floaty, not flying
      line: 'The gravity plating in here is weak. You\'re lighter: your jumps will carry you further.' },
  ],
  eventLights: [{ on: 'podOn', anchor: 'pod', color: '#5cf' }],

  // the pod's console: put Nova's memory blocks back in order (the 15-puzzle)
  terminals: [
    { id: 'podConsole', at: { zone: 'bay', toward: 'atrium', dist: 3.4, side: 1.6 }, requires: 'power', onSolved: 'podCalibrated', anchor: 'console',
      prompt: 'Restore Nova\'s memory blocks', moves: 90,
      title: 'MEMORY MAP', subtitle: 'Slide the blocks back into order, 1 to 15. The empty slot goes last.',
      say: '{worried}Those are my memory blocks. Put them back in order, 1 to 15, and the pod can rebuild me.' },
  ],

  // ── combat: hostile security robots, destroyed when shot (destroy: true) ──
  combat: {
    playerHp: 100,
    healthModel: 'health',
    breachDamage: 20,
  },
  enemyTypes: {
    sentry:  { model: 'robot', height: 1.8, hp: 3, speed: 4.2, reach: 1.7, damage: 12, cooldown: 1.3, radius: 0.55, destroy: true,
               anims: { Punch: 'Attack', Weapon: 'Shoot', Jump_Land: 'Idle', HitReact: 'Idle', Wave: 'Idle', Yes: 'Idle' } },
    gunner:  { model: 'robotGun', height: 1.9, hp: 3, speed: 3.2, attack: 'spit', cooldown: 2.3, spitDamage: 10, radius: 0.6, destroy: true,
               anims: { Punch: 'Attack', Weapon: 'Shoot', Jump_Land: 'Idle', HitReact: 'Idle', Wave: 'Idle', Yes: 'Idle' } },
    drone:   { model: 'robotFly', height: 1.1, hover: 1.6, hp: 2, speed: 4, attack: 'spit', cooldown: 2.0, spitDamage: 8, radius: 0.5, destroy: true,
               anims: { Punch: 'Attack', Weapon: 'Shoot', Death: 'Dead', Jump_Land: 'Idle', HitReact: 'Idle', Wave: 'Idle', Yes: 'Idle' } },
  },
  encounters: [
    { id: 'hangar', trigger: 'zone:hangar', onClear: 'hangarClear',
      intro: '{worried}Security robots! The station thinks we\'re intruders, and they\'re not listening. Take them down!',
      waveLine: 'More of them! The flying ones shoot. Keep moving.',
      clearLine: '{happy}That\'s the last of them. Grab that cell.',
      waves: [
        [{ type: 'sentry', at: { zone: 'hangar', e: -6, n: 2 } }, { type: 'sentry', at: { zone: 'hangar', e: 5, n: 4 } }, { type: 'sentry', at: { zone: 'hangar', e: 2, n: -6 } }],
        [{ type: 'gunner', at: { zone: 'hangar', e: -5, n: -6 } }, { type: 'gunner', at: { zone: 'hangar', e: 6, n: 2 } }, { type: 'drone', at: { zone: 'hangar', e: 0, n: 7 } }],
      ] },
  ],
  healthPacks: [
    { at: { zone: 'hangar', e: -3, n: -9 } },
    { at: { zone: 'atrium', e: -4, n: -4 } },
    { at: { zone: 'bay', toward: 'atrium', dist: 16.4, side: 3 } },
    { at: { zone: 'bay', toward: 'atrium', dist: 16.4, side: -3 } },
  ],

  // ── cutscenes ────────────────────────────────────────────────────────────
  cutscenes: {
    arrival: {
      trigger: 'start', delay: 2,
      shots: [
        { dur: 3.4, cam: 'overShoulder', subject: 'player', target: 'station', say: '{glitch}Haven Station. I... I m-made it. We made it.' },
        { dur: 3.6, cam: 'medium', subject: 'station', target: 'player', size: 2.2, say: '{worried}It\'s dark. No power anywhere. If the repair bay is dead too...' },
        { dur: 3.2, cam: 'overShoulder', subject: 'player', target: 'station', say: '{sad}{glitch}No. Don\'t think like that. Let\'s wake this place up.' },
      ],
      after: 'Follow the walkway to the atrium.',
    },
    bay: {
      trigger: 'enter:bay', delay: 0.3,
      shots: [
        { dur: 3.2, cam: 'medium', subject: 'pod', target: 'player', size: 2, say: '{happy}The repair pod! It\'s right there.' },
        { dur: 4.0, cam: 'medium', subject: 'pod', target: 'player', size: 2.6,
          say: '{worried}{glitch}But its memory map is scrambled. Those are my memory blocks... all out of order.' },
        { dur: 3.6, cam: 'overShoulder', subject: 'player', target: 'pod',
          say: 'Get to the console by the pod. And mind the gaps: that\'s open space down there, and the gravity is off.' },
      ],
    },
    repair: {
      trigger: 'podCalibrated', delay: 1.2,
      shots: [
        { dur: 3.2, cam: 'medium', subject: 'pod', target: 'player', size: 2, emit: 'podOn', say: 'The pod\'s online. Okay. Here goes...' },
        { dur: 3.8, cam: 'closeUp', subject: 'pod', target: 'player', size: 2, emit: 'novaRepaired', say: '{happy}Oh. OH. I can see. Everything is so sharp. I\'d forgotten.' },
        { dur: 4.2, cam: 'overShoulder', subject: 'player', target: 'pod', say: '{worried}It\'s only a patch, though. My core is still cracked. It won\'t hold forever.' },
        { dur: 4.8, cam: 'medium', subject: 'pod', target: 'player', size: 2, say: 'But the station logs mention "the Forge": the shipyard where ships like ours were built. Where I was built.' },
        { dur: 3.6, cam: 'overShoulder', subject: 'player', target: 'pod', say: '{happy}If anyone can make me whole, it\'s there. And look: you can see it from here. The red one.' },
      ],
      after: '{happy}Back to the ship. We finally have a heading.',
    },
  },

  eventLines: {
    podCalibrated: '{happy}That\'s it, every block in place! The pod is waking up...',
  },

  objective: (g) =>
    !g.flags.power ? (g.carrying === 'powercell' ? 'Carry the power cell to the atrium generator' : `Restore power: bring 2 power cells to the atrium generator (${g.socketsFilled}/2)`)
    : !g.flags.podCalibrated ? 'Reach the repair pod (Repair Bay, south) and put Nova\'s memory blocks in order at its console'
    : !g.flags.novaRepaired ? 'Repairing Nova...'
    : 'Return to the ship (E)',

  hintTarget: (g) =>
    !g.flags.power ? (g.carrying === 'powercell' ? 'socket' : 'item:powercell')
    : !g.flags.podCalibrated ? 'anchor:console'
    : 'anchor:shipPad',

  scatter: [
    { zone: 'garden', models: ['grass'], count: 80, scale: [0.8, 1.4], spacing: 0.6 },
    { zone: 'garden', models: ['bush', 'flowers'], count: 30, scale: [0.9, 1.4], spacing: 1.2 },
    { zone: 'garden', models: ['houseplant', 'potA', 'potB', 'potPlant'], count: 18, scale: [1.2, 2.2], spacing: 1.4 },

    { zone: 'hangar', models: ['crate', 'crateLong'], count: 6, scale: [1, 1.4], spacing: 2.5 },
    { zone: 'hangar', models: ['vessel'], count: 8, scale: [1.2, 1.8], spacing: 1.2 },

    { zone: 'dock', models: ['grass'], count: 12, scale: [0.7, 1], spacing: 0.8 },

    { zone: null, models: ['rockA', 'rockB'], count: 40, scale: [0.3, 1.1], spacing: 2.8 },
    { zone: null, models: ['crystal'], count: 14, scale: [0.06, 0.12], spacing: 3 },
    { zone: null, models: ['grass'], count: 120, scale: [0.6, 1.1], spacing: 0.8 },
    { zone: null, models: ['bush'], count: 20, scale: [0.7, 1.1], spacing: 1.6 },
    { zone: null, models: ['crate', 'container', 'crateLong'], count: 14, scale: [0.9, 1.3], spacing: 2.5 },
  ],

  dialogue: {
    intro: [],
    zones: {
      atrium: { enter: 'The Atrium. Dead quiet.',
                hint: (g) => g.flags.power ? null : 'That machine in the middle is the generator. Two empty cell sockets. I\'m reading cells in the garden dome and the hangar.' },
      garden: { enter: '{happy}A garden! Someone loved this place. It kept growing without them.', hint: null },
      hangar: { enter: 'The hangar. Lots of cargo... and something moving.', hint: null },
      bay:    { enter: null, hint: null },
      dock:   { enter: null, hint: null },
    },
    events: {
      firstCarry: 'Got the cell. Heavy: no jumping or shooting while you carry it. E puts it down.',
      socket: ['One cell in. One more.', null],
      power: '{happy}Power is back! Lights everywhere. And the Repair Bay door just opened, south of here.',
      doorLocked: 'The Repair Bay door is sealed. No power, no entry.',
      noRoom: 'No room to put that down here.',
      dropped: 'You dropped it!',
      firstCure: 'One down! Keep moving.',
      firstHealth: 'A med capsule. Better.',
      defeated: '{worried}You\'re down! I\'ve pulled you back to the docking pad.',
      lavaDeath: null,
      rifle: null,
    },
    progress: [null],
    nextSignal: null,
    hint: 'Need a hand? Your next goal is {dir} of you, about {dist} meters away.',
    returnToShip: null,
    launch: ['{happy}Course set: the Forge.', '{happy}And... thank you. For not leaving me behind.'],
  },
};
