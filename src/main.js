import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { createContext, buildPlanet, buildProps, makeAtmosphere, makeStars, makeSkyPlanets, makePlanetRing, placeOnSurface, angleBetween, FOLIAGE } from './world.js';
import { Player } from './player.js';
import { Nova } from './nova.js';
import { Mechanics } from './mechanics.js';
import { Combat } from './combat.js';
import { Frost } from './frost.js';
import { Progress, formatTime } from './progress.js';
import { openPuzzle15 } from './puzzle15.js';
import { Tutorial } from './tutorial.js';
import * as Platform from './platform.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const $ = (id) => document.getElementById(id);

// ?level=2 picks the planet
const LEVELS = { 1: ['./level1.js', 'LEVEL1'], 2: ['./level2.js', 'LEVEL2'], 3: ['./level3.js', 'LEVEL3'], 4: ['./level4.js', 'LEVEL4'], 5: ['./level5.js', 'LEVEL5'] };
const requested = Number(new URLSearchParams(location.search).get('level'));
const levelNo = LEVELS[requested] ? requested : 1;
let LEVEL, MODELS, R;
const SETTINGS = Progress.get().settings;   // from the main menu
const HIGH = SETTINGS.quality !== 'low';

// ── Renderer / scene ────────────────────────────────────────────────────────
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, HIGH ? 2 : 1));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = HIGH;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
document.body.prepend(renderer.domElement);

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(60, innerWidth / innerHeight, 0.1, 5000);

const hemi = new THREE.HemisphereLight();
const sun = new THREE.DirectionalLight();
sun.castShadow = true;
sun.shadow.mapSize.set(2048, 2048);
Object.assign(sun.shadow.camera, { left: -30, right: 30, top: 30, bottom: -30, near: 1, far: 160 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.04;
scene.add(hemi, sun, sun.target);

let composer = null;   // bloom (night levels): set up once the level's sky is known
addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer?.setSize(innerWidth, innerHeight);
});

// ── Load ────────────────────────────────────────────────────────────────────
async function loadModels() {
  const loader = new GLTFLoader();
  const keys = Object.keys(MODELS);
  const gltfs = {};
  let done = 0;
  // several keys can share one file (a kit): load each file once, then pull out the named `part`
  const files = {};
  await Promise.all(keys.map(k => (files[MODELS[k].url] ??= loader.loadAsync(encodeURI(MODELS[k].url))).then(g => {
    if (MODELS[k].part) {
      const node = g.scene.getObjectByName(MODELS[k].part);
      if (!node) throw new Error(`"${MODELS[k].part}" not found in ${MODELS[k].url}`);
      const piece = node.clone(true);
      piece.position.set(0, piece.position.y, 0);   // kits lay pieces out on a grid: bring this one to the origin
      const scene = new THREE.Group();
      scene.add(piece);
      gltfs[k] = { scene, animations: [] };
    } else gltfs[k] = g;
    $('loadbar').style.width = `${(++done / keys.length) * 100}%`;
  })));
  return gltfs;
}

// ── Energy cell visual ──────────────────────────────────────────────────────
function makeCell(cell) {
  const g = new THREE.Group();
  placeOnSurface(g, cell.dir, R + cell.alt);
  const core = new THREE.Mesh(new THREE.IcosahedronGeometry(0.5, 0),
    new THREE.MeshStandardMaterial({ color: '#9ff', emissive: '#22d3ff', emissiveIntensity: 2.5, flatShading: true }));
  const shell = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1),
    new THREE.MeshBasicMaterial({ color: '#5ef', wireframe: true, transparent: true, opacity: 0.35 }));
  const glow = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide };
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.9, 45, 12, 1, true),
    new THREE.MeshBasicMaterial({ color: '#3cf', opacity: 0.22, ...glow }));
  beam.position.y = 22.5 - cell.alt;
  const ring = new THREE.Mesh(new THREE.RingGeometry(1, 1.4, 32), new THREE.MeshBasicMaterial({ color: '#4df', opacity: 0.6, ...glow }));
  ring.rotation.x = -Math.PI / 2;
  ring.position.y = -cell.alt + 0.08;
  if (cell.on) ring.visible = false;
  const light = new THREE.PointLight('#3cf', 18, 10, 2);
  g.add(core, shell, beam, ring, light);
  return { ...cell, group: g, core, shell, beam, collected: false };
}

// ── Smoke from the wrecked ship ─────────────────────────────────────────────
function makeSmoke(ship) {
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const cx = cv.getContext('2d');
  const grd = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.8)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = grd;
  cx.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(cv);
  const up = ship.position.clone().normalize();
  const parts = [];
  for (let i = 0; i < 24; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: '#555', transparent: true, depthWrite: false }));
    s.userData.life = Math.random() * 4;
    parts.push(s);
    scene.add(s);
  }
  let active = true;
  return {
    stop() { active = false; },
    update(dt) {
      for (const s of parts) {
        s.userData.life += dt;
        if (s.userData.life > 4) {
          if (!active) { s.visible = false; continue; }
          s.userData.life = 0;
          s.userData.drift = new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(0.6);
        }
        const t = s.userData.life / 4;
        s.position.copy(ship.position).addScaledVector(up, 1.5 + t * 9).addScaledVector(s.userData.drift || new THREE.Vector3(), t * 6);
        s.scale.setScalar(1 + t * 5);
        s.material.opacity = 0.55 * (1 - t);
      }
    },
  };
}

// ── Main ────────────────────────────────────────────────────────────────────
async function main() {
  Platform.loadingStart();
  const [file, exportName] = LEVELS[levelNo];
  const mod = await import(file);
  LEVEL = mod[exportName];
  MODELS = mod.MODELS;
  R = LEVEL.radius;
  document.title = `Planets — ${LEVEL.name}`;
  document.querySelectorAll('.levelName').forEach(el => { el.textContent = LEVEL.name.toUpperCase(); });
  $('subtitle').textContent = LEVEL.subtitle;

  const sky = LEVEL.sky;
  scene.background = new THREE.Color(sky.background);
  hemi.color.set(sky.hemi[0]); hemi.groundColor.set(sky.hemi[1]); hemi.intensity = sky.hemi[2];
  sun.color.set(sky.sun[0]); sun.intensity = sky.sun[1];
  if (sky.bloom && HIGH) {
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), sky.bloom.strength, sky.bloom.radius, sky.bloom.threshold));
    composer.addPass(new OutputPass());
  }

  const gltfs = await loadModels();
  $('loadtext').textContent = 'Building planet…';
  await new Promise(r => setTimeout(r, 30));

  const ctx = createContext(LEVEL);
  scene.add(buildPlanet(ctx));
  const world = buildProps(ctx, gltfs, MODELS);
  scene.add(world.group);
  scene.add(makeAtmosphere(R, sky.atmosphere), makeStars(3000, 1800, sky.stars ?? 1), makeSkyPlanets(sky.planets));
  if (sky.ring) scene.add(makePlanetRing(R, sky.ring));
  console.log(`[level] ${world.count} props, ${world.colliders.length} colliders`);

  const ship = world.dynamic.ship;
  const smoke = LEVEL.shipWrecked ? makeSmoke(ship) : { stop() {}, update() {} };
  const cells = world.cells.map(makeCell);
  cells.forEach(c => scene.add(c.group));

  const player = new Player(gltfs.astronaut, R, LEVEL.playerScale);
  scene.add(player.root);
  const startDir = ctx.resolve(LEVEL.start);
  const towards = (from, to) => to.clone().addScaledVector(from, -to.dot(from)).normalize();
  const camFwd = towards(startDir, ctx.zoneById[LEVEL.startFacing].dir);
  player.spawn(startDir, camFwd);

  const nova = new Nova($('nova'), { fade: LEVEL.nova?.fade ?? 0 });
  const D = LEVEL.dialogue;
  const fill = (s, vars) => s.replace(/\{(\w+)\}/g, (_, k) => vars[k]);

  // ── State ─────────────────────────────────────────────────────────────────
  const input = { x: 0, y: 0, walk: false, jump: false };
  const keys = {};
  const cam = { pitch: 0.38, dist: 9, map: 0, mapOn: false };
  const startZone = LEVEL.start.zone;
  const state = { started: false, collected: 0, sinceProgress: 0, visited: new Set([startZone]), zone: startZone, launching: -1, time: 0, done: false };

  const mech = new Mechanics({ scene, ctx, level: LEVEL, gltfs, world, player, camera, camFwd, say: (line, opts) => nova.say(line, opts) });
  const frost = LEVEL.frost ? new Frost({ scene, ctx, level: LEVEL, gltfs, world, player, mech, camFwd, say: (line, opts) => nova.say(line, opts) }) : null;
  const combat = LEVEL.combat ? new Combat({ scene, ctx, level: LEVEL, gltfs, world, player, mech, camFwd, say: (line, opts) => nova.say(line, opts), finish: () => showComplete() }) : null;
  // ── inventory hotbar ──────────────────────────────────────────────────────
  const SLOTS = [
    { key: null, name: 'Hands', owned: () => true, icon: '<svg viewBox="0 0 32 32"><path d="M11 29c-3-1-6-6-7-9-.5-1.4.9-2.4 2-1.5l3 2.5V7a1.6 1.6 0 0 1 3.2 0v9h1V4.5a1.6 1.6 0 0 1 3.2 0V16h1V6a1.6 1.6 0 0 1 3.2 0v10h1V9a1.6 1.6 0 0 1 3.2 0v11c0 5-3 9-8 9z" fill="currentColor"/></svg>' },
    { key: 'rifle', name: 'Blaster', owned: () => mech.flags.rifle, icon: '<svg viewBox="0 0 32 32"><path d="M3 13h18l3-3h5v6h-6l-2 2h-5l-2 6H9l1-6H3z" fill="currentColor"/></svg>' },
    { key: 'sword', name: 'Sword', owned: () => mech.flags.sword, icon: '<svg viewBox="0 0 32 32"><path d="M26 3l3 3-14 14-3-3zM10 18l4 4-2 2-1-1-4 4-2-2 4-4-1-1z" fill="currentColor"/></svg>' },
  ];
  function renderHotbar() {
    const owned = SLOTS.filter(s => s.owned());
    $('hotbar').classList.toggle('hidden', owned.length < 2);
    $('hotbar').innerHTML = SLOTS.map((s, i) => !s.owned() ? '' :
      `<div class="slot ${mech.equipped === s.key ? 'on' : ''}"><span class="k">${i + 1}</span><span class="ic">${s.icon}</span><span class="n">${s.name}</span></div>`).join('');
  }
  mech.on('inventory', renderHotbar);
  renderHotbar();

  for (const [ev, f] of Object.entries(LEVEL.nova?.fadeOn ?? {})) mech.on(ev, () => nova.setFade(f));
  const status = () => ({ ...mech.status(), ...(combat?.status() ?? {}), ...(frost?.status() ?? {}), collected: state.collected, total: cells.length });

  // ── HUD ───────────────────────────────────────────────────────────────────
  const pips = $('pips');
  cells.forEach(() => pips.appendChild(Object.assign(document.createElement('span'), { className: 'pip' })));
  const labels = ctx.zones.map(z => {
    const el = Object.assign(document.createElement('div'), { className: 'maplabel', textContent: z.secret ? '???' : z.name });
    $('labels').appendChild(el);
    return { el, zone: z, pos: z.dir.clone().multiplyScalar(R + 3) };
  });
  const youLabel = Object.assign(document.createElement('div'), { className: 'maplabel you', textContent: '▼ YOU' });
  $('labels').appendChild(youLabel);
  const goalLabel = Object.assign(document.createElement('div'), { className: 'maplabel goal', textContent: '◆ NEXT' });
  $('labels').appendChild(goalLabel);

  const remaining = () => cells.filter(c => !c.collected);
  const nearestCell = () => remaining().sort((a, b) => angleBetween(player.up, a.dir) - angleBetween(player.up, b.dir))[0];

  function updateObjective() {
    pips.querySelectorAll('.pip').forEach((p, i) => p.classList.toggle('on', i < state.collected));
    if (LEVEL.objective) {
      $('objText').textContent = LEVEL.objective(status());
    } else if (state.collected < cells.length) {
      const n = nearestCell();
      $('objText').textContent = `Recover the energy cells (${state.collected}/${cells.length}) — nearest: ${ctx.zoneById[n.zone].name}`;
    } else {
      $('objText').textContent = 'Return to the ship';
    }
  }

  let toastTimer;
  function toast(text) {
    const el = $('zoneToast');
    el.textContent = text;
    el.classList.remove('show');
    void el.offsetWidth;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), 2800);
  }

  // ── Input ─────────────────────────────────────────────────────────────────
  const canvas = renderer.domElement;
  // tutorial: what the player has done so far (the cards tick off from this)
  const tut = { moved: 0, looked: 0, jumps: 0, mapOpened: 0, time: 0 };
  const tutorial = LEVEL.tutorial ? new Tutorial(LEVEL.tutorial, $('tutorial'), nova) : null;
  const lastPos = player.pos.clone();

  addEventListener('keydown', (e) => {
    keys[e.code] = true;
    if (!state.started) return;
    if (e.code === 'Space') { e.preventDefault(); if (mech.cinematic) { mech.skipCutscene(); return; } input.jump = true; tut.jumps++; }
    if (e.code === 'Enter') nova.skip();
    if (e.code === 'KeyM' && !mech.cinematic) { cam.mapOn = !cam.mapOn; if (cam.mapOn) tut.mapOpened++; }
    if (e.code === 'KeyE' && !mech.cinematic && !tryLaunch() && state.launching < 0) { if (combat?.interact() || frost?.interact() || mech.interact()) state.sinceProgress = 0; }
    if (e.code === 'KeyQ' && !mech.cinematic && !mech.carrying && mech.dying <= 0 && !state.paused) player.tryRoll(input, camFwd);   // every planet
    if (e.code === 'KeyR' && state.done) replayLevel();
    if (e.code === 'KeyN' && state.done && LEVEL.next) nextLevel();
    if (state.puzzleOpen) return;   // the puzzle screen handles its own keys
    if (e.code === 'KeyC' && !state.done && !mech.cinematic) { showControls(!state.controlsOpen); return; }
    if (state.controlsOpen && (e.code === 'Escape' || e.code === 'KeyP')) { showControls(false); return; }
    if ((e.code === 'Escape' || e.code === 'KeyP') && !state.done && !mech.cinematic) {
      if (document.pointerLockElement) { document.exitPointerLock(); setPaused(true); }   // (a real Esc releases the mouse by itself)
      else setPaused(!state.paused);
    }
    // designer shortcuts: 1–6 teleport to each zone
    const zi = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6'].indexOf(e.code);
    if (zi >= 0 && e.shiftKey && ctx.zones[zi]) teleport(ctx.zones[zi]);   // designer: Shift+1–6 teleport
    else if (zi >= 0 && zi < SLOTS.length && !mech.cinematic) mech.setEquipped(SLOTS[zi].key);   // inventory 1/2/3
    if (e.code === 'KeyH' && !mech.cinematic) mech.setEquipped(null);   // holster
  });
  addEventListener('keyup', (e) => { keys[e.code] = false; });

  const look = (dx, dy) => {
    if (state.paused) return;
    const k = SETTINGS.sensitivity ?? 1;
    camFwd.applyAxisAngle(player.up, -dx * 0.0028 * k);
    tut.looked += Math.abs(dx) + Math.abs(dy);
    cam.pitch = THREE.MathUtils.clamp(cam.pitch + dy * 0.002 * k * (SETTINGS.invertY ? -1 : 1), -0.25, 1.25);
  };
  let dragging = false;
  canvas.addEventListener('mousedown', (e) => {
    if (document.pointerLockElement === canvas) {
      if (cam.mapOn || mech.cinematic) return;
      if (e.button === 0) { if (mech.equipped === 'sword') combat?.trySwing(); else mech.shoot(); }
      if (e.button === 2) combat?.trySwing();
      return;
    }
    dragging = true;
    if (state.started && !state.done) canvas.requestPointerLock?.();
  });
  addEventListener('mouseup', () => { dragging = false; });
  canvas.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => { if (document.pointerLockElement === canvas || dragging) look(e.movementX, e.movementY); });
  addEventListener('wheel', (e) => { cam.dist = THREE.MathUtils.clamp(cam.dist + e.deltaY * 0.01, 4, 18); });

  // Designer teleport: drop in where the zone's first path enters it, looking at the zone centre
  function teleport(z) {
    const path = LEVEL.paths.find(p => p.includes(z.id));
    if (z.id === startZone) { player.spawn(startDir, towards(startDir, ctx.zoneById[LEVEL.startFacing].dir)); }
    else {
      const out = path ? towards(z.dir, ctx.zoneById[path.find(id => id !== z.id)].dir) : tangentNorth(z.dir);
      let dir;
      for (const k of [0.8, 0.95, 1.05, 1.15]) {   // land on safe ground (not in lava or a breach)
        dir = z.dir.clone().multiplyScalar(R).addScaledVector(out, z.radius * k).normalize();
        if (!mech.inLava(dir)) break;
      }
      player.spawn(dir, towards(dir, z.dir));
    }
    camFwd.copy(player.facing);
    player.alt = 2;
  }

  function tangentNorth(d) {
    const n = new THREE.Vector3(0, 1, 0).addScaledVector(d, -d.y);
    return n.lengthSq() > 1e-6 ? n.normalize() : new THREE.Vector3(0, 0, -1);
  }

  // Pull the camera in when a tree canopy or a wall sits between it and the player
  function cameraClearance(from, to) {
    const p = new THREE.Vector3(), d = new THREE.Vector3();
    for (let i = 1; i <= 10; i++) {
      const f = i / 10;
      p.lerpVectors(from, to, f);
      const alt = p.length() - R;
      d.copy(p).normalize();
      for (const c of world.colliders) {
        if (c.rock || d.dot(c.dir) < c.cull - 0.01) continue;
        if (c.canopy) { if (alt <= c.top && d.distanceTo(c.dir) * R < c.canopy) return Math.max(0.35, (i - 1) / 10); continue; }
        // walls, doors, buildings: anything taller than the camera's height at that point
        if (c.h > alt && c.h > 1.5 && c.tag !== 'wall' && d.distanceTo(c.dir) * R < c.r + 0.25) return Math.max(0.2, (i - 1) / 10);
      }
    }
    return 1;
  }

  // ── Gameplay events ───────────────────────────────────────────────────────
  function collect(cell) {
    cell.collected = true;
    state.collected++;
    state.sinceProgress = 0;
    player.playOnce('Interact', 0.9);
    const lines = [cell.line, D.progress[state.collected]];
    const next = nearestCell();
    if (next && D.nextSignal) lines.push(fill(D.nextSignal, { zone: ctx.zoneById[next.zone].name }));
    nova.say(lines, { interrupt: true });
    if (state.collected === cells.length) {
      smoke.stop();
      shipGlow.visible = true;
      mech.onAllCells();
    }
    updateObjective();
  }

  const shipGlow = new THREE.PointLight('#5cf', 30, 14, 2);
  shipGlow.position.copy(ship.position).addScaledVector(ship.position.clone().normalize(), 2);
  shipGlow.visible = false;
  scene.add(shipGlow);

  const nearShip = () => player.pos.distanceTo(ship.position) < 8.5;

  function tryLaunch() {
    if (LEVEL.exit === 'portal' || state.collected < cells.length || !nearShip() || state.launching >= 0) return false;
    if (LEVEL.launchRequires && !mech.flags[LEVEL.launchRequires]) return false;
    state.launching = 0;
    player.root.visible = false;
    $('prompt').classList.remove('show');
    nova.say(D.launch, { interrupt: true });
    cam.launchFrom = camera.position.clone();
    if (document.pointerLockElement) document.exitPointerLock();
    return true;
  }

  function checkZone() {
    const z = ctx.zoneAt(player.up);
    const id = z ? z.id : null;
    if (id === state.zone) return;
    state.zone = id;
    if (!z) return;
    toast(z.name);
    mech.onZoneEnter(z);
    mech.emit('enter:' + z.id);
    combat?.onZoneEnter(z);
    const zd = D.zones[z.id] || {};
    const cellHere = cells.find(c => c.zone === z.id && !c.collected);
    if (z.id === startZone && state.collected === cells.length) { nova.say(D.returnToShip); return; }
    if (!state.visited.has(z.id)) {
      state.visited.add(z.id);
      const label = labels.find(l => l.zone === z);
      if (label) label.el.textContent = z.name;
      const hint = typeof zd.hint === 'function' ? zd.hint(status()) : cellHere ? zd.hint : null;
      nova.say([zd.enter, hint]);
    }
  }

  // where the player should head next: the level's hint target, the nearest cell, or (all done) the ship
  function nextGoal() {
    const g = mech.hintDir() ?? nearestCell()?.dir;
    if (g) return g;
    if (LEVEL.exit !== 'portal' && state.collected === cells.length && (!LEVEL.launchRequires || mech.flags[LEVEL.launchRequires])) return world.byId.ship?.dir ?? null;
    return null;
  }

  function hint() {
    const goal = nextGoal();
    if (!goal) return;
    const c = { dir: goal };
    const to = c.dir.clone().addScaledVector(player.up, -c.dir.dot(player.up)).normalize();
    const right = new THREE.Vector3().crossVectors(camFwd, player.up);
    const f = to.dot(camFwd), r = to.dot(right);
    const dir = Math.abs(f) > Math.abs(r) ? (f > 0 ? 'ahead' : 'behind') : (r > 0 ? 'to the right' : 'to the left');
    nova.say(fill(D.hint, { dir, dist: Math.round(angleBetween(player.up, c.dir) * R) }));
  }

  // ── progress (saved in the browser, shown in the main menu) ───────────────
  let savedTime = 0;
  const saveTime = () => { Progress.addStat('playTime', state.time - savedTime); savedTime = state.time; };
  addEventListener('pagehide', saveTime);
  mech.on('respawn', () => Progress.addStat('deaths'));

  // level complete screen (after the ship launch, or walking through a portal)
  function showComplete() {
    if (state.done) return;
    state.done = true;
    if (document.pointerLockElement) document.exitPointerLock();
    saveTime();
    const result = Progress.completeLevel(levelNo, state.time, { cured: combat?.curedCount ?? 0, cells: state.collected });
    $('stats').textContent = `Time ${formatTime(state.time)}  ·  Best ${formatTime(result.bestTime)}`;
    $('newBest').classList.toggle('hidden', !result.newBest || !Progress.get().completed[levelNo] || Progress.get().completed[levelNo].times < 2);
    $('completeTitle').textContent = `${LEVEL.name.toUpperCase()} COMPLETE`;
    $('nextText').innerHTML = LEVEL.next ? `Next: <b>${LEVEL.next.name}</b> is unlocked` : `Planet ${levelNo + 1} is coming soon. Thanks for playing!`;
    $('btnNext').classList.toggle('hidden', !LEVEL.next);
    $('complete').classList.remove('hidden');
  }
  // leaving a finished level is the ad break (the SDK keeps ads at least 3 minutes apart).
  // The buttons stay blocked until the ad is over.
  let leaving = false;
  const leaveLevel = (go) => {
    if (leaving) return;
    leaving = true;
    document.querySelectorAll('#complete button, #complete a').forEach(b => { b.disabled = true; b.style.pointerEvents = 'none'; b.style.opacity = 0.5; });
    Platform.midgameAd().then(go);
  };
  const nextLevel = () => { if (LEVEL.next) leaveLevel(() => { location.href = `game.html?level=${LEVEL.next.level}`; }); };
  const replayLevel = () => leaveLevel(() => location.reload());
  $('btnNext').addEventListener('click', nextLevel);
  $('btnReplay').addEventListener('click', replayLevel);

  // pause: Esc (which also releases the mouse) opens the pause menu
  // the controls screen pauses the mission while it is open
  function showControls(on) {
    if (on === !!state.controlsOpen || !state.started || state.done || state.launching >= 0) return;
    state.controlsOpen = on;
    $('controlsScreen').classList.toggle('hidden', !on);
    if (on) {
      $('pause').classList.add('hidden');
      state.paused = true;
      if (document.pointerLockElement) document.exitPointerLock();
    } else {
      state.paused = false;
      canvas.requestPointerLock?.();
    }
  }
  $('btnControlsBack').addEventListener('click', () => showControls(false));
  $('btnControls').addEventListener('click', () => { state.paused = false; $('pause').classList.add('hidden'); showControls(true); });

  // terminals (the 15-puzzle): the game pauses while the screen is open
  mech.onTerminal = (t) => {
    if (state.puzzleOpen) return;
    state.puzzleOpen = true;
    state.paused = true;
    if (document.pointerLockElement) document.exitPointerLock();
    if (t.say) nova.say(t.say, { interrupt: true });
    const done = () => { state.puzzleOpen = false; state.paused = false; canvas.requestPointerLock?.(); };
    openPuzzle15({
      title: t.title ?? 'PUZZLE', subtitle: t.subtitle ?? '', moves: t.moves ?? 90,
      onSolve: () => { done(); mech.emit(t.onSolved); },
      onClose: done,
    });
  };

  function setPaused(on) {
    if (state.controlsOpen || state.puzzleOpen) return;
    if (on === !!state.paused || !state.started || state.done || state.launching >= 0) return;
    state.paused = on;
    $('pause').classList.toggle('hidden', !on);
    if (on) { saveTime(); $('pauseInfo').textContent = `${LEVEL.name} · ${formatTime(state.time)}`; }
    else canvas.requestPointerLock?.();
  }
  let wasLocked = false;
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === canvas;
    if (wasLocked && !locked && !mech.cinematic) setPaused(true);
    wasLocked = locked;
  });
  $('btnResume').addEventListener('click', () => setPaused(false));
  $('btnRestart').addEventListener('click', () => { saveTime(); location.reload(); });

  mech.onHitMarker = () => { const c = $('crosshair'); c.classList.remove('hit'); void c.offsetWidth; c.classList.add('hit'); };

  window.game = { frost, player, cells, state, world, ctx, nova, teleport, mech, combat, tut, tutorial };  // handy in the browser console

  // ── Start ─────────────────────────────────────────────────────────────────
  $('loading').classList.add('fadeout');   // (src/loading.js stops animating once it's hidden)
  setTimeout(() => $('loading').classList.add('hidden'), 650);
  $('start').classList.remove('hidden');
  Platform.loadingStop();
  $('start').addEventListener('click', () => {
    $('start').classList.add('hidden');
    $('hud').classList.remove('hidden');
    state.started = true;
    Progress.started(levelNo);
    canvas.requestPointerLock?.();
    player.playOnce('Wave', 1.8);
    nova.say(D.intro);
    for (const k of LEVEL.startWith ?? []) mech.giveEquip(k);
    mech.emit('start');
    updateObjective();
  }, { once: true });

  // ── Loop ──────────────────────────────────────────────────────────────────
  const clock = new THREE.Clock();
  const up = player.up;
  const tmp = new THREE.Vector3(), target = new THREE.Vector3(), follow = new THREE.Vector3(), mapPos = new THREE.Vector3();

  renderer.setAnimationLoop(() => {
    const rawDt = Math.min(clock.getDelta(), 0.05);
    const dt = state.paused ? 0 : rawDt;
    const t = clock.elapsedTime;
    Platform.setPlaying(state.started && !state.done && !state.paused && state.launching < 0);   // pause menus, controls, puzzles and the level end are breaks

    input.x = (keys.KeyD || keys.ArrowRight ? 1 : 0) - (keys.KeyA || keys.ArrowLeft ? 1 : 0);
    input.y = (keys.KeyW || keys.ArrowUp ? 1 : 0) - (keys.KeyS || keys.ArrowDown ? 1 : 0);
    input.walk = !!(keys.ShiftLeft || keys.ShiftRight);
    if (!state.started || state.launching >= 0 || cam.mapOn || mech.cinematic) { input.x = input.y = 0; input.jump = false; }

    // keep the camera heading in the tangent plane
    camFwd.addScaledVector(up, -camFwd.dot(up)).normalize();
    if (state.launching < 0) {
      const q = player.update(dt, input, camFwd, world.colliders);
      camFwd.applyQuaternion(q);
    }
    input.jump = false;

    if (state.started && !state.done) {
      state.time += dt;
      state.sinceProgress += dt;
      checkZone();
      if ((state.objTimer = (state.objTimer ?? 0) + dt) > 0.5) { state.objTimer = 0; updateObjective(); }
      if (state.sinceProgress > 60 && !nova.busy && state.collected < cells.length) { hint(); state.sinceProgress = 0; }
    }

    // cells
    for (const c of cells) {
      if (c.collected) {
        if (c.group.visible) {
          c.group.scale.multiplyScalar(1 - dt * 6);
          if (c.group.scale.x < 0.05) c.group.visible = false;
        }
        continue;
      }
      c.core.rotation.y += dt * 1.5;
      c.core.position.y = Math.sin(t * 2 + c.alt) * 0.15;
      c.shell.rotation.set(t * 0.4, -t * 0.7, 0);
      c.beam.material.opacity = 0.18 + Math.sin(t * 3) * 0.05;
      if (state.started && c.group.position.distanceTo(tmp.copy(player.pos).addScaledVector(up, 0.9)) < 1.9) collect(c);
    }

    // foliage tilts away from the player (the trail lags behind so plants ease back upright)
    tmp.copy(player.up).multiplyScalar(R);
    FOLIAGE.uPlayer.value.copy(tmp);
    FOLIAGE.uTrail.value.lerp(tmp, 1 - Math.exp(-4 * dt));
    FOLIAGE.uPush.value = player.root.visible ? 1 - THREE.MathUtils.smoothstep(player.alt, 0.4, 1.6) : 0;

    // E prompt: launch, or whatever the mechanics offer (pick up, insert, stack…)
    const canLaunch = LEVEL.exit !== 'portal' && state.collected === cells.length && state.launching < 0 && nearShip()
      && (!LEVEL.launchRequires || !!mech.flags[LEVEL.launchRequires]);
    const promptText = mech.cinematic ? null : canLaunch ? 'Launch the ship' : state.started && state.launching < 0 ? (combat?.prompt() ?? frost?.prompt() ?? mech.prompt()) : null;
    if (promptText) $('promptText').textContent = promptText;
    $('prompt').classList.toggle('show', !!promptText);
    $('crosshair').classList.toggle('hidden', mech.equipped !== 'rifle' || cam.mapOn || state.launching >= 0 || !!mech.carrying || !!mech.cinematic);
    if ((state.aimCheck = (state.aimCheck ?? 0) + rawDt) > 0.1) { state.aimCheck = 0; $('crosshair').classList.toggle('locked', mech.aimingAtTarget()); }
    smoke.update(dt);
    if (state.started) mech.update(dt, t);
    if (state.started) combat?.update(dt, t, input);
    if (state.started) frost?.update(dt, t);

    // launch cinematic
    if (state.launching >= 0) {
      state.launching += dt;
      const s = state.launching;
      const shipUp = ship.position.clone().normalize();
      const lift = s < 1 ? s * 0.6 : 0.6 + (s - 1) ** 2 * 6;
      ship.position.copy(world.byId.ship.dir).multiplyScalar(R - world.byId.ship.sink + lift);
      ship.rotateX(-dt * 0.06 * Math.min(s, 2));
      shipGlow.position.copy(ship.position).addScaledVector(shipUp, -1);
      if (s > 4.5) showComplete();
    }

    // tutorial cards (level 1)
    if (tutorial) {
      if (state.started && !state.paused) { tut.moved += lastPos.distanceTo(player.pos); tut.time += dt; }
      lastPos.copy(player.pos);
      tutorial.update(rawDt, { ...tut, mapOpen: cam.mapOn, collected: state.collected },
        !state.started || state.done || state.paused || state.launching >= 0 || !!mech.cinematic || state.controlsOpen);
    }

    // camera: third-person follow ↔ map view
    cam.map = THREE.MathUtils.damp(cam.map, cam.mapOn ? 1 : 0, 4, dt);
    // with the blaster out the camera moves over the right shoulder so the crosshair isn't on the astronaut
    cam.shoulder = THREE.MathUtils.damp(cam.shoulder ?? 0, mech.equipped === 'rifle' && !mech.carrying ? 1 : 0, 6, dt);
    const camRight = tmp.crossVectors(camFwd, up).normalize();
    const dist = cam.dist * (1 - 0.45 * cam.shoulder);
    target.copy(player.pos).addScaledVector(up, 1.4 + 0.3 * cam.shoulder).addScaledVector(camRight, 0.9 * cam.shoulder);
    // aiming: a flatter, closer camera, and the view centre pushed far ahead so the crosshair points at
    // things at the astronaut's height instead of the ground in front of him
    const pitch = cam.pitch * (1 - 0.65 * cam.shoulder) + 0.06 * cam.shoulder;
    follow.copy(target)
      .addScaledVector(camFwd, -Math.cos(pitch) * dist)
      .addScaledVector(up, Math.sin(pitch) * dist);
    const lookAhead = 12 * cam.shoulder;   // metres; much further and the planet's curve drops it below eye level
    cam.clear = THREE.MathUtils.damp(cam.clear ?? 1, cameraClearance(target, follow), 8, dt);
    follow.lerpVectors(target, follow, cam.clear);
    if (follow.length() < R + 0.7) follow.setLength(R + 0.7);
    mapPos.copy(up).multiplyScalar(R * 3.4).addScaledVector(camFwd, -R * 0.6);

    const cine = mech.cinematic;
    if (cine) {
      camera.position.copy(cine.pos);
      camera.up.copy(cine.up);
      camera.lookAt(cine.look);
      cam.map = 0;
      cam.mapOn = false;
    } else if (state.launching >= 0) {
      camera.position.copy(cam.launchFrom).addScaledVector(up, Math.min(state.launching, 3));
      camera.up.copy(up);
      camera.lookAt(ship.position);
    } else {
      camera.position.lerpVectors(follow, mapPos, cam.map);
      camera.up.copy(up).lerp(camFwd, cam.map).normalize();
      // look ahead along the curve: aim point = straight ahead at chest height, following the planet's surface
      const aim = tmp.copy(target);
      if (lookAhead > 0.01) {
        const ang = lookAhead / R, axis = camRight.clone().negate();
        aim.applyAxisAngle(axis, ang).addScaledVector(up, (cam.pitch - 0.38) * -lookAhead * 0.9);
        aim.lerpVectors(target, aim, cam.shoulder);
      }
      camera.lookAt(aim.multiplyScalar(1 - cam.map));
    }
    // rumble (avalanche)
    if (mech.cameraShake > 0 && !state.paused) camera.position.add(tmp.set(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(mech.cameraShake));

    // sun stays roughly overhead wherever the player is, with a slight angle for readable shadows
    tmp.set(0.6, 0.3, 0.45);
    tmp.addScaledVector(up, -tmp.dot(up)).multiplyScalar(0.9).add(up).normalize();
    sun.position.copy(player.pos).addScaledVector(tmp, 70);
    sun.target.position.copy(player.pos);
    hemi.position.copy(up);

    // map labels
    $('labels').classList.toggle('show', cam.map > 0.5);
    if (cam.map > 0.05) {
      const camDir = tmp.copy(camera.position).normalize();
      const place = (el, p) => {
        const visible = p.clone().normalize().dot(camDir) > 0.25;
        const s = p.clone().project(camera);
        el.style.display = visible ? 'block' : 'none';
        el.style.transform = `translate(-50%, -100%) translate(${(s.x * 0.5 + 0.5) * innerWidth}px, ${(-s.y * 0.5 + 0.5) * innerHeight}px)`;
      };
      labels.forEach(l => place(l.el, l.pos));
      place(youLabel, player.pos.clone().addScaledVector(up, 2.5));
      const goal = nextGoal();
      if (goal) place(goalLabel, goal.clone().multiplyScalar(R + 2)); else goalLabel.style.display = 'none';
    }

    nova.update(dt);
    if (composer) composer.render(); else renderer.render(scene, camera);
  });
}

main().catch((err) => {
  console.error(err);
  $('loadtext').textContent = `Failed to load: ${err.message}. Run through a local server (see README.md).`;
});
