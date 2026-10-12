import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { makeAtmosphere, makeStars, makeSkyPlanets, placeOnSurface, seededRandom } from './world.js';
import { Progress, MISSIONS, formatTime } from './progress.js';

// ── Main menu: a tiny planet turning under the running astronaut ────────────
const $ = (id) => document.getElementById(id);
// new players go straight into the first planet (one click to start); the menu is for coming back
if (!Progress.hasSave()) location.replace('game.html?level=1');
const settings = Progress.get().settings;
const high = settings.quality !== 'low';

const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, high ? 2 : 1));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = high;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
$('scene').appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color('#050616');
const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 3000);

scene.add(new THREE.HemisphereLight('#cfe8ff', '#2a3a2a', 1.2));
const sun = new THREE.DirectionalLight('#fff1d8', 2.8);
sun.position.set(12, 20, 10);
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024);
Object.assign(sun.shadow.camera, { left: -12, right: 12, top: 12, bottom: -12, near: 1, far: 60 });
sun.shadow.bias = -0.0005;
scene.add(sun);
const rim = new THREE.DirectionalLight('#7aa8ff', 1.2);
rim.position.set(-15, 5, -10);
scene.add(rim);

let composer = null;
if (high) {
  composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.6, 0.75));
  composer.addPass(new OutputPass());
}

// the planet: low-poly, flat shaded, with a dirt path where the astronaut runs (the great circle x = 0)
const R = 7;
const planet = new THREE.Group();
scene.add(planet);
{
  const geo = new THREE.IcosahedronGeometry(R, 14);
  const pos = geo.attributes.position, colors = new Float32Array(pos.count * 3);
  const v = new THREE.Vector3(), a = new THREE.Vector3(), c = new THREE.Color();
  for (let i = 0; i < pos.count; i += 3) {
    v.set(0, 0, 0);
    for (let k = 0; k < 3; k++) v.add(a.fromBufferAttribute(pos, i + k));
    v.normalize();
    const n = Math.sin(v.x * 9 + v.y * 4) * 0.5 + Math.sin(v.z * 7 - v.x * 3) * 0.5;
    c.set(n > 0.35 ? '#7ab64e' : '#64a344');
    if (Math.abs(v.x) * R < 0.75 + Math.sin(v.z * 6) * 0.15) c.set('#c9a46b');   // the path
    c.multiplyScalar(0.92 + (Math.abs(Math.sin(v.x * 127.1 + v.y * 311.7 + v.z * 74.7) * 43758.5) % 1) * 0.12);
    for (let k = 0; k < 3; k++) c.toArray(colors, (i + k) * 3);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const ground = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  ground.receiveShadow = true;
  planet.add(ground);
}
scene.add(makeAtmosphere(R, '#79c4ff'));
scene.add(makeStars(2500, 900));
scene.add(makeSkyPlanets([   // the other missions, hanging in the sky
  { color: '#d4874f', emissive: '#4a2410', radius: 9, pos: [-70, 26, -95], ring: { inner: 12, outer: 17, color: '#e8c39a' } },
  { color: '#7a4fd4', emissive: '#2a1060', radius: 14, pos: [-120, -40, -170] },
  { color: '#cfe6f7', emissive: '#3a5068', radius: 6, pos: [-40, 48, -120] },
]));

// ── models ──────────────────────────────────────────────────────────────────
const L1 = 'models/level_one/';
const MODELS = {
  astronaut: 'models/main_character/Astronaut V2.glb',
  ship: 'Spaceship by Quaternius - u105mYHLHU.glb',
  tree: L1 + 'Tree by Quaternius - aVOxaHRPWe.glb',
  tree2: L1 + 'Tree by Quaternius - t9KbsfYdXz.glb',
  pine: L1 + 'Pine by Quaternius - 699sFuLCN2.glb',
  rock: L1 + 'Rock Medium by Quaternius - KZdEP3uUpa.glb',
  bush: L1 + 'Bush with Flowers by Quaternius - U1ymDy8tbY.glb',
  flowers: L1 + 'Flower Group by Quaternius - hfPzQAedOe.glb',
  grass: L1 + 'Tall Grass by Quaternius - JSIYtscPmP.glb',
  mushroom: L1 + 'Mushroom by Quaternius - aOW08oSrd4.glb',
};

let astro = null, mixer = null, actions = {};
const loader = new GLTFLoader();
Promise.all(Object.entries(MODELS).map(([k, url]) => loader.loadAsync(encodeURI(url)).then(g => [k, g])))
  .then(list => {
    const g = Object.fromEntries(list);
    const rand = seededRandom(4);
    const put = (key, dir, scale, lift = 0) => {
      const obj = g[key].scene.clone(true);
      obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      obj.scale.setScalar(scale);
      obj.position.y = lift;
      const holder = new THREE.Group();
      holder.add(obj);
      placeOnSurface(holder, dir.normalize(), R - 0.05, rand() * Math.PI * 2);
      planet.add(holder);
    };
    // scatter, keeping the path (|x| small) clear
    const kinds = [['tree', 0.28, 7], ['tree2', 0.3, 6], ['pine', 0.3, 7], ['rock', 0.3, 6], ['bush', 0.45, 10], ['flowers', 0.45, 18], ['grass', 0.5, 26], ['mushroom', 0.7, 10]];
    for (const [key, scale, count] of kinds) {
      for (let i = 0; i < count; i++) {
        let d;
        do { d = new THREE.Vector3(rand() * 2 - 1, rand() * 2 - 1, rand() * 2 - 1); } while (d.lengthSq() > 1 || Math.abs(d.clone().normalize().x) * R < 1.6);
        put(key, d, scale * (0.8 + rand() * 0.4));
      }
    }
    // the ship's origin is 2.18 units above its belly: lift it so it stands on the ground
    put('ship', new THREE.Vector3(0.75, -0.2, 0.6), 0.32, 2.18 * 0.32 + 0.05);

    // the astronaut stays on top and runs; the planet turns under him
    astro = g.astronaut.scene;
    astro.scale.setScalar(0.62);
    astro.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    astro.position.set(0, R - 0.02, 0);
    astro.rotation.y = Math.PI;   // facing −Z, the way the ground moves past
    scene.add(astro);
    mixer = new THREE.AnimationMixer(astro);
    for (const clip of g.astronaut.animations) actions[clip.name.split('|').pop()] = mixer.clipAction(clip);
    actions.Run.play();
    document.body.classList.add('loaded');
  })
  .catch(err => { console.error(err); $('hint').textContent = 'Could not load the 3D scene. Run the game through a local server (see README.md).'; });

// click the astronaut → he waves
const ray = new THREE.Raycaster();
renderer.domElement.addEventListener('click', (e) => {
  if (!astro || waving) return;
  ray.setFromCamera(new THREE.Vector2((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1), camera);
  if (ray.intersectObject(astro, true).length) wave();
});
let waving = false;
function wave() {
  waving = true;
  const w = actions.Wave;
  w.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.2).play();
  w.clampWhenFinished = true;
  actions.Run.fadeOut(0.2);
  setTimeout(() => { actions.Run.reset().fadeIn(0.3).play(); w.fadeOut(0.3); waving = false; }, 1800);
}

// ── camera framing: planet on the right, menu on the left (centred on narrow screens) ──
const mouse = new THREE.Vector2();
addEventListener('mousemove', (e) => mouse.set(e.clientX / innerWidth - 0.5, e.clientY / innerHeight - 0.5));
// Frame the shot around the menu: wide screens put the astronaut in the free space right of the menu,
// tall screens put him just below the menu. Works out where he lands on screen, then shifts the view to the target.
const BASE = new THREE.Vector3(19, 9.5, 6), LOOK = new THREE.Vector3(0, 4.6, 0);
let camDist = 1;
function frame() {
  const W = innerWidth, H = innerHeight, aspect = W / H;
  camera.aspect = aspect;
  const tall = aspect <= 1;
  camDist = tall ? 1 + (1 - aspect) * 0.9 : 0.68;   // wide: close up, about half the planet in view; narrow: pull back so it fits the width
  camera.clearViewOffset();
  camera.position.copy(BASE).multiplyScalar(camDist);
  camera.lookAt(LOOK);
  camera.updateProjectionMatrix();
  camera.updateMatrixWorld();
  const p = new THREE.Vector3(0, R + 0.6, 0).project(camera);   // the astronaut, mid-body
  const px = (p.x * 0.5 + 0.5) * W, py = (-p.y * 0.5 + 0.5) * H;
  const ui = document.getElementById('ui'), nav = document.querySelector('nav');
  let tx, ty;
  if (tall) {
    tx = W / 2;
    ty = Math.min(nav.getBoundingClientRect().bottom + H * 0.08, H * 0.8);
  } else {
    const menuRight = Math.min(nav.getBoundingClientRect().right + 40, W * 0.55);
    tx = menuRight + (W - menuRight) * 0.42;
    ty = H * 0.2;
  }
  camera.setViewOffset(W, H, px - tx, py - ty, W, H);
  camera.updateProjectionMatrix();
  renderer.setSize(W, H);
  composer?.setSize(W, H);
}
addEventListener('resize', frame);
frame();

const clock = new THREE.Clock();
renderer.setAnimationLoop(() => {
  const dt = Math.min(clock.getDelta(), 0.05), t = clock.elapsedTime;
  planet.rotation.x += dt * (waving ? 0.05 : 0.32);   // ground slides back under his feet
  if (mixer) mixer.update(dt);
  camera.position.lerp(BASE.clone().multiplyScalar(camDist).add(new THREE.Vector3(-mouse.y * 1.5, -mouse.y * 1.2, mouse.x * 3)), 0.05);
  camera.lookAt(LOOK.x, LOOK.y + Math.sin(t * 0.3) * 0.2, LOOK.z);
  if (composer) composer.render(); else renderer.render(scene, camera);
});

// ── menu ────────────────────────────────────────────────────────────────────
const go = (level) => {
  document.body.classList.add('leaving');
  setTimeout(() => { location.href = `game.html?level=${level}`; }, 600);
};

function refresh() {
  const d = Progress.get();
  const has = Progress.hasSave();
  const next = MISSIONS.find(m => m.level === Progress.continueLevel());
  $('btnContinue').classList.toggle('hidden', !has);
  $('continueSub').textContent = `Planet ${next.level} · ${next.name}`;
  $('btnNew').querySelector('.t').textContent = has ? 'New Game' : 'Start Game';
  $('btnNew').classList.toggle('primary', !has);

  // progress strip
  const done = Object.keys(d.completed).length;
  $('progressText').textContent = `${done}/${MISSIONS.length} planets · ${d.stats.cured} locals cured · ${formatTime(d.stats.playTime)} played`;
  $('progressBar').innerHTML = MISSIONS.map(m => `<span style="--c:${m.color}" class="${d.completed[m.level] ? 'done' : m.level <= d.unlocked ? 'open' : ''}"></span>`).join('');

  // mission cards
  $('missionList').innerHTML = MISSIONS.map(m => {
    const c = d.completed[m.level], open = m.level <= d.unlocked;
    const status = c ? `<span class="badge done">✓ Completed</span><span class="best">Best ${formatTime(c.bestTime)}</span>`
      : open ? '<span class="badge open">Available</span>' : '<span class="badge locked">Locked</span>';
    return `<button class="mission ${open ? '' : 'locked'}" data-level="${m.level}" ${open ? '' : 'disabled'} style="--c:${m.color};--g:${m.glow}">
      <span class="orb"></span>
      <span class="info"><span class="num">Planet ${m.level}</span><span class="name">${m.name}</span><span class="sub">${open ? m.subtitle : 'Finish planet ' + (m.level - 1) + ' to unlock'}</span></span>
      <span class="status">${status}</span>
    </button>`;
  }).join('');
  document.querySelectorAll('.mission:not(.locked)').forEach(b => b.addEventListener('click', () => go(Number(b.dataset.level))));

  // settings
  $('sens').value = d.settings.sensitivity;
  $('sensVal').textContent = `${Number(d.settings.sensitivity).toFixed(1)}×`;
  $('invert').checked = d.settings.invertY;
  document.querySelectorAll('[name=quality]').forEach(r => { r.checked = r.value === d.settings.quality; });
}

function openPanel(id) {
  document.querySelectorAll('.panel').forEach(p => p.classList.toggle('open', p.id === id));
  document.body.classList.toggle('panel-open', !!id);
}

$('btnContinue').addEventListener('click', () => go(Progress.continueLevel()));
$('btnNew').addEventListener('click', () => { if (Progress.hasSave()) openPanel('confirmPanel'); else { Progress.reset(); go(1); } });
$('btnMissions').addEventListener('click', () => openPanel('missionsPanel'));
$('btnSettings').addEventListener('click', () => openPanel('settingsPanel'));
$('btnCredits').addEventListener('click', () => openPanel('creditsPanel'));
document.querySelectorAll('.close').forEach(b => b.addEventListener('click', () => openPanel(null)));
addEventListener('keydown', (e) => { if (e.code === 'Escape') openPanel(null); });
$('confirmYes').addEventListener('click', () => { Progress.reset(); go(1); });
$('confirmNo').addEventListener('click', () => openPanel(null));

$('sens').addEventListener('input', (e) => { Progress.setSettings({ sensitivity: Number(e.target.value) }); $('sensVal').textContent = `${Number(e.target.value).toFixed(1)}×`; });
$('invert').addEventListener('change', (e) => Progress.setSettings({ invertY: e.target.checked }));
document.querySelectorAll('[name=quality]').forEach(r => r.addEventListener('change', () => { Progress.setSettings({ quality: r.value }); $('qualityNote').classList.remove('hidden'); }));
$('resetProgress').addEventListener('click', () => openPanel('confirmPanel'));

refresh();
frame();                                   // the menu's size is final now (Continue button, saved progress)
document.fonts?.ready.then(frame);         // …and again once the web font has loaded
