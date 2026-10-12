// ─────────────────────────────────────────────────────────────────────────────
//  LEVEL 3 — "UMBRA"
//  A bioluminescent night planet. The friendly local from Ember lives here; a blight
//  from the old ruins is turning its people hostile. Teaches: combat (cure, don't kill),
//  dodge roll, melee, bounce mushrooms. Ends through a portal instead of the ship.
//  Same placement rules as level1.js / level2.js. See LEVEL3_DESIGN.md for the reasoning.
// ─────────────────────────────────────────────────────────────────────────────

const L2 = 'models/level_two/';
const L3 = 'models/level_three/';

// ground: model's base floats above its origin → set it on the ground
export const MODELS = {
  astronaut:   { url: 'models/main_character/Astronaut V2.glb' },
  ship:        { url: 'Spaceship by Quaternius - u105mYHLHU.glb' },
  alien:       { url: L2 + 'enemy/Alien by Quaternius - RRliSQBP7r.glb' },
  enemyLarge:  { url: L3 + 'enemies/Enemy Large by Quaternius - UgBmRVnQ9h.glb' },
  rifle:       { url: 'Scifi Pistol by Quaternius - U0Q1BrKL1y.glb' },   // the blaster (a pistol)
  health:      { url: L3 + 'health/Pickup Health by Quaternius - cPLNFLykkf.glb' },

  eggs:        { url: L3 + 'eggs/Eggs by Dario Demi (D911C) - 8u4I9EhxWzT.glb', block: true },
  column:      { url: L3 + 'ruins/Column by Quaternius - wLubNpOTX4.glb', trunk: 0.55 },
  pedestalA:   { url: L3 + 'ruins/Pedestal by Quaternius - VE1kTjVgJf.glb', block: true },
  pedestalB:   { url: L3 + 'ruins/Pedestal by Quaternius - wUeoDKnFBF.glb', block: true },
  market:      { url: L3 + 'vilage/low_poly_sci_fi_market_building_2.glb', box: true },   // the village houses
  totem:       { url: L3 + 'vilage/totem.glb', trunk: 0.17 },   // × scale 4 ≈ 0.7 m, matches the drum's width

  alienPlants: { url: L3 + 'vegetation/Alien Plants by Alan Zimmerman - 9mt3W9nGky0.glb', bend: 0.3, glow: '#7a3cff' },
  glowCap:     { url: L3 + 'vegetation/glowing_mushroom_01.glb', ground: true, trunk: 0.3, glow: '#3cc8ff' },
  glowShroom:  { url: L3 + 'vegetation/glowy_mushroom.glb', bend: 0.3, glow: '#3cc8ff' },
  grass:       { url: L3 + 'vegetation/Grass by Quaternius - GyDYqHAByU.glb', bend: 1 },
  treeBlob:    { url: L3 + 'vegetation/Tree Blob by Quaternius - QHYRrAnKzW.glb', trunk: 0.4 },
  treeLava:    { url: L3 + 'vegetation/Tree Lava by Quaternius - 9gRfmVKx9W.glb', trunk: 0.25, glow: '#ff6a2a' },
  treeLight:   { url: L3 + 'vegetation/Tree Light by Quaternius - om4BJAL82T.glb', trunk: 0.3, glow: '#7af0ff' },
  treeSpikes:  { url: L3 + 'vegetation/Tree Spikes by Quaternius - YCCpJ6jvf4.glb', trunk: 0.3 },
  treeSpiralA: { url: L3 + 'vegetation/Tree Spiral by Quaternius - gI3kqnqg80.glb', trunk: 0.35 },
  treeSpiralB: { url: L3 + 'vegetation/Tree Spiral by Quaternius - poFJzEWCk8.glb', trunk: 0.35 },

  // reused from Ember
  rockA:       { url: L2 + 'rocks/Rock by Quaternius - 34W5ymEePk.glb', block: true },
  rockB:       { url: L2 + 'rocks/Rock by Quaternius - HtpdTh3Ld6.glb', block: true },
  rockC:       { url: L2 + 'rocks/Rock by Quaternius - R2UjZAX3By.glb', block: true },
  rubble:      { url: L2 + 'rocks/Rocks by Kay Lousberg - XVRCQ0j2AF.glb', block: true },
  crystalTall: { url: L2 + 'crystals/Crystal by iPoly3D - MlhTJAFuJY.glb', glow: '#c040ff' },
  crystalB:    { url: L2 + 'crystals/Crystal by iPoly3D - nyCeR6poJX.glb', glow: '#c040ff' },
  crystalC:    { url: L2 + 'crystals/Crystal by iPoly3D - Wj8Qjq38T8.glb', glow: '#c040ff' },
};

export const LEVEL3 = {
  name: 'Umbra',
  subtitle: 'Planet 3 · Help the locals and cure the blight',
  radius: 60,
  seed: 33,
  playerScale: 1,
  nova: { fade: 0.28 },   // Nova's damage on this planet
  next: { level: 4, name: 'Glacia' },
  shipWrecked: false,
  exit: 'portal',            // this level ends by walking through the portal, not by launching the ship
  startWith: ['rifle'],      // you kept the blaster from Ember
  groundSpark: '#8a7cff',

  ground: { base: '#3d3670', path: '#5a5f96', pathWidth: 1.7 },

  sky: {
    background: '#04020c',
    atmosphere: '#7a4dff',
    hemi: ['#a99cff', '#2a1d4a', 2.3],
    sun: ['#c2ccff', 1.9],          // moonlight
    stars: 0.55,                    // dimmer stars so the bloom doesn't blow them up
    bloom: { strength: 0.85, radius: 0.5, threshold: 0.6 },
    planets: [
      { color: '#e8e4ff', emissive: '#8a86b0', radius: 60, pos: [500, 380, -700] },     // moon
      { color: '#d4874f', emissive: '#4a2410', radius: 50, pos: [-900, 200, 700], ring: { inner: 70, outer: 95, color: '#e8c39a' } },   // Ember, far away
    ],
  },

  start: { zone: 'glade', e: 0, n: 1 },
  startFacing: 'village',

  zones: [
    { id: 'glade',   name: 'Landing Glade',    lat:  90, lon:   0, radius: 12, ground: '#40517a' },
    { id: 'village', name: 'Lumen Village',    lat:  50, lon:   0, radius: 16, ground: '#4a4f7c' },
    { id: 'forest',  name: 'Glowcap Forest',   lat:  15, lon:  60, radius: 22, ground: '#285a62', rotate: -45 },   // +e = toward the hive
    { id: 'hive',    name: 'Blighted Hive',    lat: -25, lon: 100, radius: 13.5, ground: '#55286c', rotate: 139 },  // +e = toward the forest
    { id: 'ruins',   name: 'Sunken Ruins',     lat: -60, lon:  30, radius: 12, ground: '#4a4670', rotate: 4 },     // +e = toward the hive. Inside the column ring, so entering = past the thorns
  ],

  paths: [
    ['glade', 'village'],
    ['village', 'forest'],
    ['forest', 'hive'],
    ['hive', 'ruins'],
  ],

  patches: [
    { at: { zone: 'glade', e: -7, n: 3 }, radius: 6, color: '#555a78' },
    { at: { zone: 'village', e: -5, n: -2 }, radius: 6, color: '#5e5078' },   // plaza around the campfire
    { at: { zone: 'hive', e: 0, n: 0 }, radius: 11, color: '#6a2a7c' },
    { at: { zone: 'ruins', e: 0, n: 0 }, radius: 10, color: '#585478' },
  ],

  clearings: [
    { at: { zone: 'village', e: -5, n: -2 }, radius: 7 },
    { at: { zone: 'hive', e: 0, n: 0 }, radius: 12 },        // the arena
    { at: { zone: 'hive', e: 19, n: 0 }, radius: 4 },        // run-up to the bounce pads
    { at: { zone: 'ruins', e: 0, n: 0 }, radius: 11 },
    { at: { zone: 'forest', e: 3, n: 0 }, radius: 3.5 },     // spore cloud on the path
    { at: { zone: 'forest', e: -4, n: 4 }, radius: 2.5 },    // practice pad
  ],

  props: [
    // LANDING GLADE
    { model: 'ship', id: 'ship', at: { zone: 'glade', e: -7, n: 3 }, scale: 1.2, yaw: 180, sink: -2.55, dynamic: true, collider: { r: 3.4 } },

    // LUMEN VILLAGE — the elder's hall, totems by the fire
    { model: 'market', at: { zone: 'village', e: -11, n: 7 }, scale: 0.6, yaw: 120 },      // the elder's hall
    { model: 'market', at: { zone: 'village', e: 8, n: 8 }, scale: 0.42, yaw: 225 },
    { model: 'market', at: { zone: 'village', e: -9.5, n: -10 }, scale: 0.4, yaw: 40 },
    { model: 'market', at: { zone: 'village', e: 2.5, n: -12 }, scale: 0.44, yaw: 350 },
    // totems stand around the fire, at least 4 m from every villager
    { model: 'totem', at: { zone: 'village', e: -5, n: 4 }, scale: 4 },
    { model: 'totem', at: { zone: 'village', e: 0.5, n: -2 }, scale: 4 },
    { model: 'totem', at: { zone: 'village', e: -10.5, n: -2 }, scale: 3.5 },
    { ring: 'glowShroom', at: { zone: 'village', e: -5, n: -2 }, radius: 6.5, count: 12, scale: [1.2, 1.8] },

    // GLOWCAP FOREST — a light-tree landmark by the practice pad
    { model: 'treeLight', at: { zone: 'forest', e: -6, n: 7 }, scale: 1.6 },

    // BLIGHTED HIVE — egg clusters around the arena
    { model: 'eggs', at: { zone: 'hive', e: -7, n: 6 }, scale: 0.8 },
    { model: 'eggs', at: { zone: 'hive', e: -8, n: -6 }, scale: 0.7 },
    { model: 'eggs', at: { zone: 'hive', e: 3, n: -9 }, scale: 0.6 },
    { model: 'eggs', at: { zone: 'hive', e: 2, n: 9 }, scale: 0.65 },

    // SUNKEN RUINS — a ring of columns, pedestals around the portal
    { ring: 'column', at: { zone: 'ruins', e: 0, n: 0 }, radius: 13, count: 22, scale: [0.9, 1.15] },
    { ring: 'pedestalA', at: { zone: 'ruins', e: 0, n: 0 }, radius: 7, count: 4, scale: [0.8, 0.8] },
    { model: 'treeLava', at: { zone: 'ruins', e: -9, n: 6 }, scale: 1.4 },
    { model: 'treeLava', at: { zone: 'ruins', e: -9, n: -6 }, scale: 1.2 },
  ],

  // built in code (generated.js)
  structures: [
    { type: 'campfire', at: { zone: 'village', e: -5, n: -2 } },
    { type: 'arch', at: { zone: 'ruins', e: -5, n: 8 }, yaw: 60, width: 3.6, height: 4 },
    { type: 'arch', at: { zone: 'ruins', e: -5, n: -8 }, yaw: -60, width: 3.6, height: 3.4 },
    { type: 'wall', at: { zone: 'ruins', e: 6, n: 9 }, yaw: 20, length: 5, height: 2.4 },
    { type: 'wall', at: { zone: 'ruins', e: 6, n: -9 }, yaw: -20, length: 6, height: 2 },
    { type: 'wall', at: { zone: 'ruins', e: -10, n: 0 }, yaw: 90, length: 4, height: 2.8 },
  ],

  // the ruins: a solid ring with one opening, sealed by blight thorns (like the hive's) until the hive is cleared
  walls: [{ center: { zone: 'ruins', e: 0, n: 0 }, radius: 13, gapToward: 'hive', gap: 7 }],

  // ── Planet 3 systems (combat.js) ──────────────────────────────────────────
  combat: {
    playerHp: 100,
    blight: '#8a2be2',
    padModel: 'glowCap',
    healthModel: 'health',
  },
  enemyTypes: {
    grunt:   { model: 'alien', height: 1.5, hp: 3, speed: 4.6, reach: 1.6, damage: 12, cooldown: 1.3, radius: 0.5 },
    spitter: { model: 'alien', height: 1.4, hp: 3, speed: 3.5, attack: 'spit', cooldown: 2.4, spitDamage: 10, radius: 0.5 },
    brute:   { model: 'enemyLarge', name: 'Blighted Brute', boss: true, height: 3.6, hp: 30, speed: 3.2, reach: 2.6, damage: 22, cooldown: 1.6,
               radius: 1.2, hitRadius: 1.4, slamRadius: 6, slamDamage: 18, spitDamage: 10, onCured: 'bossCured' },
  },
  encounters: [
    { id: 'hive', trigger: 'zone:hive', onClear: 'hiveCleared',
      intro: 'They\'re infected! Don\'t hurt them, cure them. Keep shooting until the purple leaves them.',
      waveLine: 'More of them! Watch the spitters and keep moving.',
      waves: [
        [{ type: 'grunt', at: { zone: 'hive', e: -4, n: 3 } }, { type: 'grunt', at: { zone: 'hive', e: -5, n: -3 } }, { type: 'grunt', at: { zone: 'hive', e: -1, n: -6 } }],
        [{ type: 'grunt', at: { zone: 'hive', e: -4, n: 4 } }, { type: 'grunt', at: { zone: 'hive', e: -2, n: -7 } },
         { type: 'spitter', at: { zone: 'hive', e: -9, n: 0 } }, { type: 'spitter', at: { zone: 'hive', e: 5, n: 4 } }],   // all clear of the egg clusters
      ] },
    { id: 'boss', trigger: 'spawnBoss', boss: true, waves: [[{ type: 'brute', from: 'portal', at: { zone: 'ruins', toward: 'hive', dist: 4.2, side: 1.2 } }]] },   // steps out of the portal, then walks here   // off to one side, so it doesn't vanish against the portal
  ],
  thorns: [
    { id: 'hive', center: { zone: 'hive', e: 0, n: 0 }, radius: 14.5, height: 3.2, opensOn: 'hiveCleared' },
    { id: 'ruinsGate', gate: { at: { zone: 'ruins', toward: 'hive', dist: 13.2 }, facing: 'hive', width: 8 }, height: 3.6, opensOn: 'hiveCleared' },
  ],
  pads: [
    { at: { zone: 'forest', e: -4, n: 4 }, power: 15 },     // practice: bounce straight up to the floating capsule
    { at: { zone: 'hive', e: 19, n: -1.8 }, power: 15 },    // over the thorns
    { at: { zone: 'hive', e: 19, n: 1.8 }, power: 15 },
  ],
  spores: [
    { at: { zone: 'forest', e: 3, n: 0 }, radius: 2.6, damage: 10 },
    { at: { zone: 'forest', e: 10, n: -6 }, radius: 3, damage: 10 },
    { at: { zone: 'forest', e: -12, n: -5 }, radius: 3, damage: 10 },
  ],
  healthPacks: [
    { at: { zone: 'forest', e: -4, n: 4 }, alt: 5.2 },      // above the practice pad
    { at: { zone: 'forest', e: 14, n: 4 } },
    { at: { zone: 'hive', e: 21, n: 4 } },                  // before the jump in
    { at: { zone: 'ruins', toward: 'hive', dist: 17, side: 3 } },
  ],
  villagers: [
    { model: 'alien', talk: 'elder', promptText: 'Talk to the elder', height: 1.75, at: { zone: 'village', e: -3, n: 0.5 } },
    { model: 'alien', at: { zone: 'village', e: -7, n: -4.5 } },
    { model: 'alien', at: { zone: 'village', e: -3.5, n: -5.5 }, height: 1.2 },
    { model: 'alien', at: { zone: 'village', e: -7.8, n: 1 }, anim: 'Yes' },
  ],
  talks: {
    elder: { cutscene: 'elder' },   // talking to the elder plays the 'elder' cutscene below
  },
  portal: { at: { zone: 'ruins', e: 0, n: 0, face: 'hive' }, radius: 2.2, activeOn: 'broken:blight' },
  breakables: [   // the blight crystal plugging the portal; shielded until the brute is cured
    { id: 'blight', at: { zone: 'ruins', e: 0, n: 0 }, hp: 6, radius: 1.7, centerAlt: 2.2, requires: 'bossCured',
      shieldedLine: 'The crystal is shielded. Something in here is feeding it.',
      brokenLine: 'The blight crystal is gone!',
      parts: [
        { model: 'crystalTall', e: 0, n: 0, scale: 0.3, yaw: 0 },
        { model: 'crystalB', e: -0.6, n: 0.4, scale: 0.28, yaw: 120 },
        { model: 'crystalC', e: 0.6, n: -0.3, scale: 0.26, yaw: 240 },
      ] },
  ],
  itemTypes: {
    rifle: { model: 'rifle', scale: 1.3, equip: true, grip: { scale: 0.45, offset: [0.1, 0.03] } },
  },

  // ── Cutscenes ────────────────────────────────────────────────────────────
  cutscenes: {
    // act: { elder: 'Wave' } animates the elder (Alien animations: Wave, Yes, No, Idle, Weapon, Punch, Duck, Jump)
    elder: {
      stage: { facing: 'elder', dist: 3.2 },   // the astronaut steps onto a mark 3.2 m from the elder
      shots: [
        { dur: 4.2, cam: 'twoShot', target: 'elder', act: { elder: 'Wave' }, player: 'Wave',
          say: 'Translating... "Sky-walker. You were kind to our little one on the red world. Be welcome."' },
        { dur: 4.4, cam: 'closeUp', subject: 'elder', act: { elder: 'No' },
          say: '"A sickness spreads from the old ruins. It turns our people angry, and purple."' },
        { dur: 4.6, cam: 'overShoulder', subject: 'player', target: 'elder', act: { elder: 'Idle' },
          say: '"The sick gather in the hive past the glowing forest. Thorns guard it, but the glowcaps will carry you over."' },
        { dur: 3.8, cam: 'medium', subject: 'elder', act: { elder: 'Weapon' },
          say: '"Your light-weapon can drive the sickness out. But do not harm our people. Free them."' },
        { dur: 3.6, cam: 'twoShot', target: 'elder', act: { elder: 'Yes' }, player: 'Interact',
          say: 'Understood. Every blaster hit pushes the blight out. Let\'s go free them.' },
        { dur: 4.6, cam: 'closeUp', subject: 'elder', act: { elder: 'No' },
          say: '{sad}"And sky-walker... the voice that travels with you. Its light is growing thin. Do not wait too long."' },
      ],
      after: "{sad}...He noticed. Let's not talk about it. Head through Glowcap Forest to the hive.",
    },
    intro: {
      trigger: 'start', delay: 4,
      npc: { model: 'alien', height: 1.5, at: { zone: 'glade', e: 0, n: -6 } },
      shots: [
        { dur: 2.8, cam: 'overShoulder', subject: 'player', target: 'spot', spawn: true, alien: ['Jump_Land', 'Idle'], say: 'Look who it is! Our friend from Ember.' },
        { dur: 3.0, cam: 'closeUp', subject: 'alien', alien: 'Wave', say: 'It didn\'t follow us. It lives here. This is its home world.' },
        { dur: 2.6, cam: 'medium', subject: 'alien', alien: 'No', say: 'It looks worried. Something is wrong at its village.' },
        { dur: 2.8, cam: 'follow', alien: 'Run', run: true, runToward: 'village', say: 'After it! Follow the path.' },
      ],
      after: 'Follow the path to the village.',
    },
    boss: {
      trigger: 'enter:ruins', delay: 0.3,
      shots: [
        { dur: 2.8, cam: 'medium', subject: 'portal', target: 'player', size: 1.4, say: 'The blight is pouring out of that portal...' },
        { dur: 4.2, cam: 'medium', subject: 'portal', target: 'player', size: 3, emit: 'spawnBoss', say: '{worried}Something is coming through!' },
        { dur: 3.0, cam: 'medium', subject: 'boss', target: 'player', size: 2.6, emit: 'bossRoar', say: 'It\'s infected too. Cure it, don\'t kill it. Roll away from its slam with Q!' },
      ],
    },
    ending: {
      trigger: 'broken:blight', delay: 1.2,
      npc: { model: 'alien', height: 1.5, at: { zone: 'ruins', e: 6, n: 3 } },
      shots: [
        { dur: 2.8, cam: 'medium', subject: 'portal', target: 'player', size: 1.4, emit: 'portalOn', say: 'The blight is gone, and the portal is clearing!' },
        { dur: 2.6, cam: 'overShoulder', subject: 'player', target: 'alien', spawn: true, alien: ['Jump_Land', 'Wave'], say: 'Our friend came to say goodbye.' },
        { dur: 2.8, cam: 'twoShot', alien: 'Yes', say: "{glitch}It's pointing at the portal. I can't map where it leads. My navigation is... never mind. It's the way forward." },
        { dur: 2.2, cam: 'follow', alien: 'Run', run: true, say: '{sad}Bye, little buddy. Remember us.' },
      ],
      after: 'Step through the portal when you\'re ready.',
    },
  },

  eventLines: {
    hiveCleared: 'That\'s all of them! The thorns are withering, and the ones sealing the ruins are dying back too.',
    bossCured: '{happy}It\'s cured! And the crystal\'s shield is down. Shatter it!',
  },

  objective: (g) =>
    !g.flags.metElder ? 'Follow the local to its village and talk to the elder'
    : !g.flags.hiveCleared ? (g.inFight ? `Cure the infected locals (${g.cured}/${g.toCure})` : 'Reach the Blighted Hive: bounce over the thorns with the glowcaps')
    : !g.flags.bossCured ? 'The thorns have withered. Go to the Sunken Ruins'
    : !g.flags['broken:blight'] ? 'Shatter the blight crystal in the portal'
    : 'Step through the portal',

  hintTarget: (g) =>
    !g.flags.metElder ? 'anchor:elder'
    : !g.flags.hiveCleared ? 'zone:hive'
    : !g.flags.bossCured ? 'zone:ruins'
    : !g.flags['broken:blight'] ? 'breakable:blight'
    : 'anchor:portal',

  scatter: [
    { zone: 'glade', models: ['grass', 'glowShroom'], count: 40, scale: [0.8, 1.4], spacing: 0.8 },
    { zone: 'glade', models: ['treeSpiralA', 'treeSpiralB', 'treeLight'], count: 5, scale: [0.9, 1.3], spacing: 5 },

    { zone: 'village', models: ['grass', 'glowShroom'], count: 45, scale: [0.8, 1.4], spacing: 0.8 },
    { zone: 'village', models: ['treeLight', 'treeBlob'], count: 4, scale: [0.9, 1.2], spacing: 6 },

    { zone: 'forest', models: ['treeBlob', 'treeSpiralA', 'treeSpiralB', 'treeLight', 'treeSpikes'], count: 55, scale: [0.9, 1.6], spacing: 3.2, pathClear: 4 },
    { zone: 'forest', models: ['glowCap'], count: 14, scale: [0.9, 1.6], spacing: 2.5 },
    { zone: 'forest', models: ['glowShroom'], count: 60, scale: [1, 2], spacing: 0.9 },
    { zone: 'forest', models: ['alienPlants'], count: 10, scale: [0.6, 1], spacing: 2.5 },
    { zone: 'forest', models: ['grass'], count: 70, scale: [0.8, 1.3], spacing: 0.7 },

    { zone: 'hive', models: ['glowShroom'], count: 25, scale: [0.8, 1.4], spacing: 1 },
    { zone: 'hive', models: ['treeSpikes'], count: 4, scale: [0.8, 1.1], spacing: 5 },

    { zone: 'ruins', models: ['rubble', 'rockB'], count: 10, scale: [0.4, 0.8], spacing: 2 },
    { zone: 'ruins', models: ['glowShroom', 'grass'], count: 25, scale: [0.8, 1.4], spacing: 0.9 },

    { zone: null, models: ['treeBlob', 'treeSpiralA', 'treeSpiralB', 'treeSpikes', 'treeLight', 'treeLava'], count: 60, scale: [0.8, 1.5], spacing: 4 },
    { zone: null, models: ['glowCap'], count: 20, scale: [0.8, 1.5], spacing: 3 },
    { zone: null, models: ['glowShroom'], count: 90, scale: [0.8, 1.8], spacing: 1 },
    { zone: null, models: ['alienPlants'], count: 12, scale: [0.6, 1], spacing: 3 },
    { zone: null, models: ['grass'], count: 220, scale: [0.8, 1.3], spacing: 0.7 },
    { zone: null, models: ['rockA', 'rockB', 'rockC'], count: 30, scale: [0.4, 1.2], spacing: 3 },
    { zone: null, models: ['rubble'], count: 30, scale: [0.4, 0.9], spacing: 1.5 },
  ],

  dialogue: {
    intro: [
      'Umbra. The night side never ends here. Everything glows.',
      "{glitch}Sorry, my vision just... dimmed for a second. It's the dark. Must be the dark.",
      'Wait, something is coming toward the ship...',
    ],
    zones: {
      village: { enter: 'A village! These are the locals. Look for the elder by the fire.', hint: null },
      forest:  { enter: 'Glowcap Forest. Those big mushrooms are springy. Run into one and see.', hint: null },
      hive:    { enter: null, hint: null },
      ruins:   { enter: null, hint: null },
      glade:   { enter: null, hint: null },
    },
    events: {
      firstBounce: 'Whee! Glowcaps launch you sky-high.',
      spores: 'Those spores burn! Go around them, or roll through with Q.',
      firstHealth: 'A health capsule. That patched you up.',
      firstCure: 'It worked! The blight is leaving it.',
      slamHint: 'Ground slam! Roll (Q) or jump to dodge the shockwave.',
      defeated: 'You\'re down! I\'ve pulled you back to the landing glade. The locals are still waiting.',
      lavaDeath: null,
      noRoom: '', stackLimit: '',
    },
    progress: [null],
    nextSignal: null,
    hint: 'Need a hand? Your next goal is {dir} of you, about {dist} meters away.',
    returnToShip: null,
    launch: [],
  },
};
