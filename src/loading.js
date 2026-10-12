import { MISSIONS } from './progress.js';

// The loading screen for each planet: that planet turning slowly in its own colours, its name and
// mission, a progress bar in its colour, and rotating tips. Runs on its own (no three.js), so it
// shows straight away while the engine and the models download. main.js fills the bar (#loadbar,
// #loadtext) and fades this out (#loading.fadeout) when the planet is built.

const LOOKS = {
  1: { colors: ['#2f6a2a', '#4f9a3f', '#7fc25a', '#c9a46b'], atmo: '#79c4ff', spots: null, light: [1, 1, 1],
       tips: ['Energy cells glow with a blue beam you can see from far away.', 'The planet is small: walk in any direction and you\'ll come back around.', 'Jump onto the smaller rocks to reach high places.'] },
  2: { colors: ['#6a2e1a', '#a8582e', '#d98c52', '#efc896'], atmo: '#ff9a5a', spots: '#ff6a1a', ring: '#f0cfa0', light: [1, 0.9, 0.8],
       tips: ['Geysers fire in a rhythm: watch the warning glow, then run.', 'Stack two crates to climb onto a roof.', 'Lava is instant: Nova will pull you back, but your cell goes home.'] },
  3: { colors: ['#1a1430', '#2e2258', '#4b3580', '#7a4fd4'], atmo: '#b48cff', spots: '#c46bff', light: [0.85, 0.8, 1],
       tips: ['Shoot the blighted creatures to cure them, not hurt them.', 'Q dodge-rolls through attacks.', 'Spore clouds hurt: go around them, or roll through fast.'] },
  4: { colors: ['#7fa8c8', '#a8cbe4', '#d6ebf8', '#ffffff'], atmo: '#bfe8ff', spots: null, light: [0.9, 0.95, 1],
       tips: ['Watch your warmth: stand by a heater or a warm vent to thaw out.', 'Ice is slippery. Start turning early.', 'Thin ice cracks under you: keep moving.'] },
  5: { colors: ['#2e3842', '#4f5d6a', '#4f7a4a', '#8592a0'], atmo: '#7fb6ff', spots: '#9fd0ff', light: [0.9, 0.95, 1],
       tips: ['Inside the repair bay the gravity is weak: your jumps go much further.', 'Fall through the breach and Nova reels you back in, but it costs health.', 'The memory puzzle: slide the blocks back into order, 1 to 15.'] },
};
const GENERAL = ['Press C any time to see the controls.', 'M opens the map. ◆ NEXT marks where to go.', 'Enter skips Nova\'s current line.', 'Q is a dodge roll, on every planet.', 'Lost? If you wander, Nova will point you the right way.'];

const params = new URLSearchParams(location.search);
const level = LOOKS[+params.get('level')] ? +params.get('level') : 1;
const look = LOOKS[level];
const mission = MISSIONS.find(m => m.level === level) ?? MISSIONS[0];
const $ = (id) => document.getElementById(id);

document.documentElement.style.setProperty('--planet', mission.color);
document.documentElement.style.setProperty('--planetGlow', mission.glow);
$('loadNum').textContent = `PLANET ${level}`;
document.querySelectorAll('.levelName').forEach(el => { el.textContent = mission.name.toUpperCase(); });
$('loadSub').textContent = mission.subtitle;

// tips: one planet tip, then a general one, alternating
const tips = [];
for (let i = 0; i < Math.max(look.tips.length, GENERAL.length); i++) {
  if (look.tips[i]) tips.push(look.tips[i]);
  if (GENERAL[i]) tips.push(GENERAL[i]);
}
let tipIndex = Math.floor(Math.random() * look.tips.length) * 2;
const tipEl = $('loadTip');
function nextTip() {
  tipEl.classList.remove('show');
  setTimeout(() => { tipEl.textContent = 'TIP · ' + tips[tipIndex++ % tips.length]; tipEl.classList.add('show'); }, 350);
}
nextTip();
const tipTimer = setInterval(nextTip, 4800);

// ── the planet: a small per-pixel sphere, scaled up (soft, cheap) ─────────────
const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const pal = look.colors.map(hex), atmo = hex(look.atmo), spot = look.spots ? hex(look.spots) : null;
const planetCv = $('loadPlanet'), pc = planetCv.getContext('2d');
const N = 150;   // sphere resolution
const buf = document.createElement('canvas');
buf.width = buf.height = N;
const bc = buf.getContext('2d');
const img = bc.createImageData(N, N);

function surface(lon, lat) {
  // layered waves on the sphere: continents / bands / craters, depending on the palette
  const n = Math.sin(lon * 3 + Math.sin(lat * 4) * 1.5) * 0.45 + Math.sin(lat * 6 + lon * 2) * 0.3
          + Math.sin(lon * 9 - lat * 5) * 0.15 + Math.sin(lon * 17 + lat * 13) * 0.08;
  const k = (n + 1) / 2;
  const i = Math.min(pal.length - 1, Math.floor(k * pal.length));
  // glowing veins along the edges between regions (lava cracks, blight, station lights)
  return { c: pal[i], hot: !!spot && Math.abs(n - 0.12) < 0.035 };
}

function drawPlanet(t) {
  const d = img.data, rot = t * 0.12;
  const L = [-0.55, 0.35, 0.76];   // light from the upper left
  for (let y = 0; y < N; y++) for (let x = 0; x < N; x++) {
    const i = (y * N + x) * 4;
    const nx = (x + 0.5) / N * 2 - 1, ny = 1 - (y + 0.5) / N * 2;
    const r2 = nx * nx + ny * ny;
    if (r2 > 1) { d[i + 3] = 0; continue; }
    const nz = Math.sqrt(1 - r2);
    const lat = Math.asin(ny), lon = Math.atan2(nx, nz) + rot;
    const s = surface(lon, lat);
    const lit = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]);
    const shade = 0.12 + 0.95 * lit;
    const rim = Math.pow(1 - nz, 2.2);   // atmosphere at the edge
    for (let c = 0; c < 3; c++) {
      let v = s.c[c] * shade * look.light[c];
      if (s.hot) v = v * 0.3 + spot[c] * (0.7 + 0.3 * (1 - lit));   // glowing spots show on the night side too
      v = v * (1 - rim * 0.6) + atmo[c] * rim * (0.35 + lit * 0.9);
      d[i + c] = Math.min(255, v);
    }
    d[i + 3] = 255;
  }
  bc.putImageData(img, 0, 0);

  const W = planetCv.width, H = planetCv.height, R = W * (look.ring ? 0.27 : 0.36);
  pc.clearRect(0, 0, W, H);
  // glow behind
  const g = pc.createRadialGradient(W / 2, H / 2, R * 0.9, W / 2, H / 2, R * 1.45);
  g.addColorStop(0, `rgba(${atmo.join(',')},0.35)`);
  g.addColorStop(1, `rgba(${atmo.join(',')},0)`);
  pc.fillStyle = g;
  pc.fillRect(0, 0, W, H);
  if (look.ring) ring(W / 2, H / 2, R, false);
  pc.imageSmoothingEnabled = true;
  pc.drawImage(buf, W / 2 - R, H / 2 - R, R * 2, R * 2);
  if (look.ring) ring(W / 2, H / 2, R, true);
  // a tiny ship on its way in
  const a = t * 0.55;
  const sx = W / 2 + Math.cos(a) * R * 1.32, sy = H / 2 + Math.sin(a) * R * 0.42;
  const front = Math.sin(a) > 0;
  if (front || Math.hypot(sx - W / 2, sy - H / 2) > R) {
    pc.fillStyle = '#fff';
    pc.beginPath(); pc.arc(sx, sy, 2.4, 0, Math.PI * 2); pc.fill();
    pc.fillStyle = `rgba(${hex(mission.glow).join(',')},0.5)`;
    pc.beginPath(); pc.arc(sx, sy, 5.5, 0, Math.PI * 2); pc.fill();
  }
}

function ring(x, y, R, front) {
  pc.save();
  pc.translate(x, y);
  pc.rotate(-0.35);
  pc.scale(1, 0.28);
  pc.beginPath();
  if (front) pc.arc(0, 0, R * 1.62, 0, Math.PI); else pc.arc(0, 0, R * 1.62, Math.PI, Math.PI * 2);
  pc.lineWidth = R * 0.32;
  pc.strokeStyle = `rgba(${hex(look.ring).join(',')},0.45)`;
  pc.stroke();
  pc.lineWidth = R * 0.06;
  pc.strokeStyle = `rgba(${hex(look.ring).join(',')},0.7)`;
  pc.stroke();
  pc.restore();
}

// ── the star field behind it all ───────────────────────────────────────────────
const starCv = $('loadStars'), sc = starCv.getContext('2d');
const stars = [...Array(220)].map(() => ({ x: Math.random(), y: Math.random(), s: Math.random() * 1.4 + 0.3, tw: Math.random() * 6, sp: Math.random() * 0.006 + 0.002 }));
function sizeStars() { starCv.width = innerWidth; starCv.height = innerHeight; }
sizeStars();
addEventListener('resize', sizeStars);

const loading = $('loading');
const t0 = performance.now();
function tick(now) {
  if (loading.classList.contains('hidden')) { clearInterval(tipTimer); return; }
  const t = (now - t0) / 1000;
  sc.clearRect(0, 0, starCv.width, starCv.height);
  for (const s of stars) {
    const x = ((s.x - t * s.sp) % 1 + 1) % 1;
    sc.fillStyle = `rgba(210,225,255,${0.25 + 0.5 * Math.sin(t * 1.5 + s.tw) ** 2})`;
    sc.fillRect(x * starCv.width, s.y * starCv.height, s.s, s.s);
  }
  drawPlanet(t);
  requestAnimationFrame(tick);
}
requestAnimationFrame(tick);
