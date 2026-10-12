import * as THREE from 'three';
import { soft } from './mechanics.js';

// Props built in code (no model files): campfire, portal, ruins pieces, alien domes, thorns, spore clouds.
// Every builder returns { group, colliders: [{ x, z, r, h }] in the group's local space, update?(dt, t) }.

const GLOW = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
const stone = new THREE.MeshStandardMaterial({ color: '#5d6078', roughness: 0.95, flatShading: true });
const stoneDark = new THREE.MeshStandardMaterial({ color: '#43445a', roughness: 1, flatShading: true });
const rune = new THREE.MeshStandardMaterial({ color: '#b48cff', emissive: '#9b5cff', emissiveIntensity: 1.6 });
const shadowed = (m) => { m.castShadow = true; m.receiveShadow = true; return m; };

// ── campfire: logs, a stone ring, flickering flames and rising embers ────────
export function makeCampfire() {
  const g = new THREE.Group();
  const wood = new THREE.MeshStandardMaterial({ color: '#5a3a22', roughness: 1, flatShading: true });
  for (let i = 0; i < 4; i++) {
    const log = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.1, 6), wood));
    log.rotation.set(Math.PI / 2 - 0.35, (i / 4) * Math.PI * 2, 0, 'YXZ');
    log.position.y = 0.22;
    g.add(log);
  }
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    const st = shadowed(new THREE.Mesh(new THREE.DodecahedronGeometry(0.18 + Math.random() * 0.06, 0), stoneDark));
    st.position.set(Math.cos(a) * 0.75, 0.1, Math.sin(a) * 0.75);
    st.rotation.set(Math.random() * 3, Math.random() * 3, 0);
    g.add(st);
  }
  const flames = [];
  const colors = ['#ff4a12', '#ff8a1e', '#ffd25a'];
  for (let i = 0; i < 3; i++) {
    const f = new THREE.Mesh(new THREE.ConeGeometry(0.32 - i * 0.08, 1.1 - i * 0.25, 7, 1, true), new THREE.MeshBasicMaterial({ color: colors[i], side: THREE.DoubleSide, ...GLOW }));
    f.position.y = 0.6 - i * 0.05;
    g.add(f);
    flames.push(f);
  }
  const embers = [];
  for (let i = 0; i < 14; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: '#ffb050', ...GLOW }));
    s.userData.life = Math.random();
    s.userData.drift = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5);
    g.add(s);
    embers.push(s);
  }
  const light = new THREE.PointLight('#ff8a3a', 14, 12, 1.6);
  light.position.y = 1;
  g.add(light);
  return {
    group: g,
    colliders: [{ x: 0, z: 0, r: 0.8, h: Infinity }],
    update(dt, t) {
      flames.forEach((f, i) => {
        const k = 1 + Math.sin(t * (9 + i * 3) + i) * 0.12 + Math.sin(t * 23 + i * 2) * 0.06;
        f.scale.set(1 / Math.sqrt(k), k, 1 / Math.sqrt(k));
        f.rotation.y = t * (1.5 + i);
      });
      light.intensity = 12 + Math.sin(t * 13) * 2 + Math.sin(t * 31) * 1.2;
      for (const s of embers) {
        s.userData.life += dt * 0.6;
        if (s.userData.life > 1) s.userData.life = 0;
        const l = s.userData.life;
        s.position.set(s.userData.drift.x * l * 0.8, 0.5 + l * 2.4, s.userData.drift.y * l * 0.8);
        s.scale.setScalar(0.12 * (1 - l) + 0.03);
        s.material.opacity = 1 - l;
      }
    },
  };
}

// ── portal: a standing stone ring with a swirling surface. Blighted (purple) until activated (cyan) ──
export function makePortal(radius = 2.2) {
  const g = new THREE.Group();
  const ring = shadowed(new THREE.Mesh(new THREE.TorusGeometry(radius, 0.32, 10, 36), stone));
  ring.position.y = radius + 0.35;
  g.add(ring);
  for (let i = 0; i < 12; i++) {   // glowing runes around the ring
    const a = (i / 12) * Math.PI * 2;
    const r = new THREE.Mesh(new THREE.BoxGeometry(0.16, 0.16, 0.7), rune);
    r.position.set(Math.cos(a) * radius, radius + 0.35 + Math.sin(a) * radius, 0);
    r.lookAt(0, radius + 0.35, 0);
    g.add(r);
  }
  const base = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radius * 0.9, radius * 1.1, 0.4, 10), stoneDark));
  base.position.y = 0.2;
  base.scale.z = 0.45;
  g.add(base);
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 }, colorA: { value: new THREE.Color('#5a1aa8') }, colorB: { value: new THREE.Color('#d06bff') }, isOn: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float time, isOn; uniform vec3 colorA, colorB; varying vec2 vUv;
      void main(){
        vec2 p = vUv - 0.5; float r = length(p) * 2.0; float a = atan(p.y, p.x);
        float swirl = sin(a * 5.0 + r * 10.0 - time * (2.0 + isOn * 2.0)) * 0.5 + 0.5;
        float core = smoothstep(1.0, 0.0, r);
        vec3 c = mix(colorA, colorB, swirl * core);
        gl_FragColor = vec4(c * (0.6 + core), smoothstep(1.0, 0.85, r) * (0.75 + 0.25 * swirl));
      }`,
    ...GLOW, side: THREE.DoubleSide,
  });
  const surface = new THREE.Mesh(new THREE.CircleGeometry(radius - 0.15, 48), mat);
  surface.position.y = radius + 0.35;
  g.add(surface);
  const light = new THREE.PointLight('#b05cff', 16, 14, 1.5);
  light.position.set(0, radius + 0.35, 0.8);
  g.add(light);
  return {
    group: g,
    center: new THREE.Vector3(0, radius + 0.35, 0),
    colliders: [{ x: -radius, z: 0, r: 0.5, h: Infinity }, { x: radius, z: 0, r: 0.5, h: Infinity }],
    setActive(on) {
      mat.uniforms.isOn.value = on ? 1 : 0;
      mat.uniforms.colorA.value.set(on ? '#0a5a8a' : '#5a1aa8');
      mat.uniforms.colorB.value.set(on ? '#7ef6ff' : '#d06bff');
      light.color.set(on ? '#5cf' : '#b05cff');
    },
    update(dt, t) { mat.uniforms.time.value = t; surface.rotation.z = t * 0.2; },
  };
}

// ── ruins: an arch and a broken wall of stacked blocks with glowing runes ────
export function makeArch({ width = 4, height = 4.5 } = {}) {
  const g = new THREE.Group();
  for (const x of [-width / 2, width / 2]) {
    for (let y = 0; y < height; y += 0.9) {
      const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.86, 0.9), Math.random() < 0.2 ? stoneDark : stone));
      b.position.set(x + (Math.random() - 0.5) * 0.08, y + 0.43, (Math.random() - 0.5) * 0.08);
      b.rotation.y = (Math.random() - 0.5) * 0.12;
      g.add(b);
    }
  }
  const lintel = shadowed(new THREE.Mesh(new THREE.BoxGeometry(width + 1.4, 0.8, 1.0), stone));
  lintel.position.y = Math.ceil(height / 0.9) * 0.9 + 0.4;
  g.add(lintel);
  const glyph = new THREE.Mesh(new THREE.BoxGeometry(width * 0.6, 0.12, 0.05), rune);
  glyph.position.set(0, lintel.position.y, 0.53);
  g.add(glyph);
  return { group: g, colliders: [{ x: -width / 2, z: 0, r: 0.6, h: Infinity }, { x: width / 2, z: 0, r: 0.6, h: Infinity }] };
}

export function makeWall({ length = 6, height = 2.6 } = {}) {
  const g = new THREE.Group();
  const cols = Math.round(length / 1.2), colliders = [];
  for (let i = 0; i < cols; i++) {
    const x = -length / 2 + (i + 0.5) * (length / cols);
    const rows = Math.max(1, Math.round((height / 0.8) * (0.4 + Math.random() * 0.6)));   // broken top
    for (let j = 0; j < rows; j++) {
      const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.78, 0.8), Math.random() < 0.25 ? stoneDark : stone));
      b.position.set(x + (Math.random() - 0.5) * 0.06, j * 0.8 + 0.39, (Math.random() - 0.5) * 0.06);
      b.rotation.y = (Math.random() - 0.5) * 0.1;
      g.add(b);
      if (j === 1 && Math.random() < 0.3) {
        const r = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.04), rune);
        r.position.set(x, j * 0.8 + 0.39, 0.42);
        g.add(r);
      }
    }
    colliders.push({ x, z: 0, r: 0.6, h: rows * 0.8, stand: true });
  }
  // a few fallen blocks (with colliders, so the player, enemies and cutscene camera know they're there)
  for (let i = 0; i < 3; i++) {
    const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.75, 0.8), stone));
    b.position.set((Math.random() - 0.5) * length, 0.3, 1.2 + Math.random());
    b.rotation.set(Math.random() * 0.4, Math.random() * 3, Math.random() * 0.4);
    g.add(b);
    colliders.push({ x: b.position.x, z: b.position.z, r: 0.6, h: 0.75, stand: true });
  }
  return { group: g, colliders };
}

// ── village dome hut ────────────────────────────────────────────────────────
export function makeDome({ radius = 2.6, color = '#6a5a9a' } = {}) {
  const g = new THREE.Group();
  const shell = new THREE.MeshStandardMaterial({ color, roughness: 0.8, flatShading: true });
  const dome = shadowed(new THREE.Mesh(new THREE.SphereGeometry(radius, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), shell));
  g.add(dome);
  const band = shadowed(new THREE.Mesh(new THREE.TorusGeometry(radius * 0.98, 0.12, 6, 24), stoneDark));
  band.rotation.x = Math.PI / 2;
  band.position.y = 0.3;
  g.add(band);
  const door = new THREE.Mesh(new THREE.CircleGeometry(0.7, 12, 0, Math.PI), new THREE.MeshStandardMaterial({ color: '#1a1030', emissive: '#ffb050', emissiveIntensity: 0.25 }));
  door.position.set(0, 0.05, radius - 0.02);
  g.add(door);
  for (let i = 0; i < 5; i++) {   // glowing windows
    const a = (i / 5) * Math.PI * 2 + 0.6;
    const w = new THREE.Mesh(new THREE.CircleGeometry(0.18, 8), new THREE.MeshBasicMaterial({ color: '#ffd27a' }));
    w.position.set(Math.cos(a) * radius * 0.82, radius * 0.5, Math.sin(a) * radius * 0.82);
    w.lookAt(Math.cos(a) * radius * 2, radius * 0.5, Math.sin(a) * radius * 2);
    g.add(w);
  }
  return { group: g, colliders: [{ x: 0, z: 0, r: radius * 0.95, h: radius, stand: true }] };
}

// ── thorn cluster (blight) ──────────────────────────────────────────────────
const thornMat = new THREE.MeshStandardMaterial({ color: '#2a1238', emissive: '#7a1fd0', emissiveIntensity: 0.5, roughness: 0.6, flatShading: true });
export function makeThorns(height = 3) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const h = height * (0.5 + Math.random() * 0.6);
    const c = shadowed(new THREE.Mesh(new THREE.ConeGeometry(0.18 + Math.random() * 0.15, h, 5), thornMat));
    c.position.set((Math.random() - 0.5) * 1.2, h / 2 - 0.1, (Math.random() - 0.5) * 0.9);
    c.rotation.set((Math.random() - 0.5) * 0.6, 0, (Math.random() - 0.5) * 0.6);
    g.add(c);
  }
  return { group: g };
}

// ── spore cloud: drifting glowing motes ─────────────────────────────────────
export function makeSporeCloud(radius = 3, color = '#c46bff') {
  const g = new THREE.Group();
  const motes = [];
  for (let i = 0; i < 26; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, ...GLOW, opacity: 0.7 }));
    s.userData.seed = Math.random() * 100;
    s.userData.base = new THREE.Vector3((Math.random() - 0.5) * 2 * radius, 0.3 + Math.random() * 2.6, (Math.random() - 0.5) * 2 * radius);
    s.scale.setScalar(0.25 + Math.random() * 0.4);
    g.add(s);
    motes.push(s);
  }
  const haze = new THREE.Mesh(new THREE.CircleGeometry(radius, 24), new THREE.MeshBasicMaterial({ color, opacity: 0.18, ...GLOW }));
  haze.rotation.x = -Math.PI / 2;
  haze.position.y = 0.05;
  g.add(haze);
  return {
    group: g,
    update(dt, t) {
      for (const s of motes) {
        const k = s.userData.seed;
        s.position.copy(s.userData.base).add(new THREE.Vector3(Math.sin(t * 0.7 + k) * 0.6, Math.sin(t * 0.9 + k * 2) * 0.4, Math.cos(t * 0.6 + k) * 0.6));
        s.material.opacity = 0.45 + Math.sin(t * 2 + k) * 0.25;
      }
    },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
//  Planet 4 (Glacia) pieces
// ═════════════════════════════════════════════════════════════════════════════
const iceMat = new THREE.MeshStandardMaterial({ color: '#bfe6ff', emissive: '#2a6c9a', emissiveIntensity: 0.25, roughness: 0.15, metalness: 0.05, transparent: true, opacity: 0.88, flatShading: true });
const iceDeep = new THREE.MeshStandardMaterial({ color: '#8fcaf0', emissive: '#1d4f7a', emissiveIntensity: 0.3, roughness: 0.1, transparent: true, opacity: 0.8, flatShading: true });
const snowMat = new THREE.MeshStandardMaterial({ color: '#f2f7ff', roughness: 0.95, flatShading: true });
export const ICE = { iceMat, iceDeep, snowMat };

// a cluster of icicles hanging DOWN from y = 0 (attach under a ledge or roof)
export function makeIcicles({ count = 7, length = 1.2, spread = 1.4 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < count; i++) {
    const l = length * (0.35 + Math.random() * 0.75);
    const c = new THREE.Mesh(new THREE.ConeGeometry(0.05 + Math.random() * 0.07, l, 5), iceMat);
    c.rotation.x = Math.PI;               // point down
    c.position.set((Math.random() - 0.5) * spread, -l / 2, (Math.random() - 0.5) * spread * 0.35);
    c.castShadow = true;
    g.add(c);
  }
  return { group: g };
}

// an ice arch (cave entrance / tunnel rib) with icicles hanging from it
export function makeIceArch({ width = 5, height = 4.2 } = {}) {
  const g = new THREE.Group();
  const colliders = [];
  for (const x of [-width / 2, width / 2]) {
    for (let y = 0; y < height; y += 1) {
      const b = shadowed(new THREE.Mesh(new THREE.DodecahedronGeometry(0.75 + Math.random() * 0.2, 0), Math.random() < 0.5 ? iceMat : iceDeep));
      b.position.set(x + (Math.random() - 0.5) * 0.25, y + 0.6, (Math.random() - 0.5) * 0.3);
      b.rotation.set(Math.random() * 3, Math.random() * 3, 0);
      b.scale.set(1, 1.3, 0.9);
      g.add(b);
    }
    colliders.push({ x, z: 0, r: 0.9, h: Infinity });
  }
  const top = height + 0.6;
  for (let i = 0; i <= 6; i++) {   // the span
    const t = i / 6, x = -width / 2 + t * width, y = top + Math.sin(t * Math.PI) * 0.9;
    const b = shadowed(new THREE.Mesh(new THREE.DodecahedronGeometry(0.8, 0), i % 2 ? iceMat : iceDeep));
    b.position.set(x, y, 0);
    b.scale.set(1.2, 0.8, 1);
    g.add(b);
    if (i > 0 && i < 6) { const ic = makeIcicles({ count: 4, length: 1.3, spread: 0.9 }); ic.group.position.set(x, y - 0.55, 0); g.add(ic.group); }
  }
  return { group: g, colliders };
}

// a wall of jagged ice slabs across an opening; melt(k) shrinks it (k: 0 = whole, 1 = gone)
export function makeIceWall({ width = 7, height = 3.6, thickness = 1.2 } = {}) {
  const g = new THREE.Group();
  const n = Math.max(3, Math.round(width / 1.1));
  for (let i = 0; i < n; i++) {
    const h = height * (0.75 + Math.random() * 0.4);
    const s = shadowed(new THREE.Mesh(new THREE.BoxGeometry(width / n + 0.25, h, thickness * (0.8 + Math.random() * 0.4)), Math.random() < 0.6 ? iceMat : iceDeep));
    s.position.set(-width / 2 + (i + 0.5) * (width / n), h / 2 - 0.1, (Math.random() - 0.5) * 0.3);
    s.rotation.set((Math.random() - 0.5) * 0.15, (Math.random() - 0.5) * 0.25, (Math.random() - 0.5) * 0.12);
    s.userData.h = h;
    g.add(s);
  }
  const colliders = [];
  for (let x = -width / 2 + 0.5; x <= width / 2 - 0.4; x += 0.8) colliders.push({ x, z: 0, r: 0.6, h: Infinity });
  return {
    group: g, colliders, center: new THREE.Vector3(0, height * 0.5, 0),
    melt(k) {
      g.children.forEach(c => { c.scale.y = Math.max(0.02, 1 - k); c.position.y = (c.userData.h * (1 - k)) / 2 - 0.1; });
      g.visible = k < 0.98;
    },
  };
}

// a block of clear ice frozen around something (heater, beacon core); shoot it to free what is inside
export function makeIceShell({ size = 1.6 } = {}) {
  const g = new THREE.Group();
  for (let i = 0; i < 5; i++) {
    const s = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(size * (0.55 + Math.random() * 0.2), 0), i % 2 ? iceMat : iceDeep));
    s.position.set((Math.random() - 0.5) * size * 0.5, size * 0.55 + (Math.random() - 0.5) * size * 0.3, (Math.random() - 0.5) * size * 0.5);
    s.rotation.set(Math.random() * 3, Math.random() * 3, Math.random() * 3);
    g.add(s);
  }
  return { group: g, center: new THREE.Vector3(0, size * 0.6, 0), melt(k) { g.scale.setScalar(Math.max(0.02, 1 - k)); g.visible = k < 0.98; } };
}

// a push block for the lake puzzle
export function makeIceBlock(size = 1.9) {
  const g = new THREE.Group();
  const b = shadowed(new THREE.Mesh(new THREE.BoxGeometry(size, size, size), iceMat));
  b.position.y = size / 2;
  const core = new THREE.Mesh(new THREE.BoxGeometry(size * 0.55, size * 0.55, size * 0.55), new THREE.MeshBasicMaterial({ color: '#d9f4ff', transparent: true, opacity: 0.35 }));
  core.position.y = size / 2;
  const cap = shadowed(new THREE.Mesh(new THREE.BoxGeometry(size * 1.02, 0.18, size * 1.02), snowMat));
  cap.position.y = size + 0.05;
  g.add(b, core, cap);
  return { group: g };
}

// a pressure plate: a rune ring that turns green when something heavy sits on it
export function makePressurePlate(radius = 1.0) {
  const g = new THREE.Group();
  const base = new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.1, 0.15, 24), new THREE.MeshStandardMaterial({ color: '#3a4a5c', metalness: 0.5, roughness: 0.5 }));
  base.position.y = 0.07;
  const ringMat = new THREE.MeshBasicMaterial({ color: '#ff9a3d' });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(radius * 0.8, 0.07, 8, 32), ringMat);
  ring.rotation.x = Math.PI / 2;
  ring.position.y = 0.17;
  const light = new THREE.PointLight('#ff9a3d', 4, 5, 2);
  light.position.y = 0.6;
  g.add(base, ring, light);
  return { group: g, setOn(on) { ringMat.color.set(on ? '#5dff9a' : '#ff9a3d'); light.color.set(on ? '#5dff9a' : '#ff9a3d'); } };
}

// a warm vent: a glowing crack with rising heat shimmer (a safe place to warm up)
export function makeWarmVent({ radius = 1.2 } = {}) {
  const g = new THREE.Group();
  const rim = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(radius, radius * 1.3, 0.35, 9), stoneDark));
  rim.position.y = 0.1;
  const glow = new THREE.Mesh(new THREE.CircleGeometry(radius * 0.7, 16), new THREE.MeshBasicMaterial({ color: '#ffb35a' }));
  glow.rotation.x = -Math.PI / 2;
  glow.position.y = 0.29;
  const light = new THREE.PointLight('#ff9a4a', 10, 8, 1.6);
  light.position.y = 1;
  g.add(rim, glow, light);
  const puffs = [];
  for (let i = 0; i < 10; i++) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: '#ffd9b0', ...GLOW, opacity: 0 }));
    s.userData.life = Math.random();
    s.userData.drift = new THREE.Vector2(Math.random() - 0.5, Math.random() - 0.5);
    g.add(s);
    puffs.push(s);
  }
  return {
    group: g, colliders: [], heat: true,
    update(dt, t) {
      light.intensity = 9 + Math.sin(t * 3) * 1.5;
      for (const s of puffs) {
        s.userData.life += dt * 0.45;
        if (s.userData.life > 1) s.userData.life = 0;
        const l = s.userData.life;
        s.position.set(s.userData.drift.x * l, 0.4 + l * 3, s.userData.drift.y * l);
        s.scale.setScalar(0.5 + l * 1.4);
        s.material.opacity = 0.35 * Math.sin(l * Math.PI);
      }
    },
  };
}

// the station heater: a metal cabinet with a glowing grille (off until thawed)
export function makeHeater() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#5a6470', metalness: 0.6, roughness: 0.45 });
  const body = shadowed(new THREE.Mesh(new THREE.BoxGeometry(1.4, 1.6, 1), metal));
  body.position.y = 0.8;
  const grilleMat = new THREE.MeshStandardMaterial({ color: '#331a10', emissive: '#ff6a1a', emissiveIntensity: 0 });
  for (let i = 0; i < 4; i++) {
    const bar = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.1, 0.05), grilleMat);
    bar.position.set(0, 0.55 + i * 0.22, 0.52);
    g.add(bar);
  }
  const pipe = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 1.4, 8), metal));
  pipe.position.set(0.45, 2.2, -0.2);
  const light = new THREE.PointLight('#ff8a3a', 0, 14, 1.4);
  light.position.set(0, 1.3, 1);
  g.add(body, pipe, light);
  return {
    group: g, colliders: [{ x: 0, z: 0, r: 0.8, h: 1.6, stand: true }],
    setOn(on) { grilleMat.emissiveIntensity = on ? 2.2 : 0; light.intensity = on ? 22 : 0; },
  };
}

// the beacon on the peak: a lattice mast with a lamp; light() fires a beam into the sky
export function makeBeaconTower({ height = 7 } = {}) {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#7a8590', metalness: 0.7, roughness: 0.35 });
  for (const [x, z] of [[-0.7, -0.7], [0.7, -0.7], [0.7, 0.7], [-0.7, 0.7]]) {
    const leg = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.1, height, 6), metal));
    leg.position.set(x * 0.7, height / 2, z * 0.7);
    leg.rotation.set(-z * 0.06, 0, x * 0.06);
    g.add(leg);
  }
  for (let y = 1; y < height; y += 1.2) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.55 - y * 0.02, 0.04, 4, 4), metal);
    ring.rotation.set(Math.PI / 2, 0, Math.PI / 4);
    ring.position.y = y;
    g.add(ring);
  }
  const lampMat = new THREE.MeshStandardMaterial({ color: '#334', emissive: '#7ef6ff', emissiveIntensity: 0 });
  const lamp = shadowed(new THREE.Mesh(new THREE.IcosahedronGeometry(0.55, 1), lampMat));
  lamp.position.y = height + 0.4;
  const light = new THREE.PointLight('#7ef6ff', 0, 40, 1.2);
  light.position.y = height + 0.4;
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 1.4, 160, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#7ef6ff', transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide }));
  beam.position.y = height + 80;
  g.add(lamp, light, beam);
  let on = 0;
  return {
    group: g, colliders: [{ x: 0, z: 0, r: 0.9, h: Infinity }], top: new THREE.Vector3(0, height + 0.4, 0),
    light() { on = 1; },
    update(dt, t) {
      if (!on) return;
      lampMat.emissiveIntensity = 3 + Math.sin(t * 6) * 0.8;
      light.intensity = 60;
      beam.material.opacity = Math.min(0.35, beam.material.opacity + dt * 0.3);
    },
  };
}

// a curved sheet of ice that hugs the planet (the frozen lake): a spherical cap, so it never cuts into the ground
export function makeIceSheet(R, radius) {
  const theta = radius / R;
  const geo = new THREE.SphereGeometry(R + 0.04, 72, 12, 0, Math.PI * 2, 0, theta);
  const mat = new THREE.ShaderMaterial({
    vertexShader: 'varying vec3 vP; varying vec3 vN; varying vec3 vV; void main(){ vP = position; vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `varying vec3 vP; varying vec3 vN; varying vec3 vV;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        vec2 p = vP.xz * 0.6;
        vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(float(x), float(y)); vec2 o = vec2(h(i + g), h(i + g + 7.0));
          float d = length(g + o - f);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
        }
        float crack = smoothstep(0.05, 0.0, d2 - d1) * 0.7;
        float fres = pow(1.0 - max(dot(vN, vV), 0.0), 3.0);
        vec3 col = mix(vec3(0.42, 0.68, 0.86), vec3(0.88, 0.96, 1.0), fres);
        col += crack * vec3(0.9, 0.97, 1.0);
        gl_FragColor = vec4(col, 0.82);
      }`,
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 1;
  return mesh;
}

// falling snow around the player (a box of flakes that wraps around as you move)
export function makeSnowfall(count = 1400, size = 44) {
  const pos = new Float32Array(count * 3), speed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    pos[i * 3] = (Math.random() - 0.5) * size; pos[i * 3 + 1] = Math.random() * 22 - 2; pos[i * 3 + 2] = (Math.random() - 0.5) * size;
    speed[i] = 1.2 + Math.random() * 1.6;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const pts = new THREE.Points(geo, new THREE.PointsMaterial({ map: soft(), size: 0.16, color: '#ffffff', transparent: true, opacity: 0.9, depthWrite: false }));
  pts.frustumCulled = false;
  const group = new THREE.Group();
  group.add(pts);
  return {
    group,
    // follow a point on the planet, with `up` as local up
    update(dt, t, at, up, wind = 0.6) {
      group.position.copy(at);
      group.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
      for (let i = 0; i < count; i++) {
        pos[i * 3 + 1] -= speed[i] * dt;
        pos[i * 3] += Math.sin(t * 0.7 + i) * dt * 0.4 + wind * dt;
        if (pos[i * 3 + 1] < -2) { pos[i * 3 + 1] = 20; pos[i * 3] = (Math.random() - 0.5) * size; pos[i * 3 + 2] = (Math.random() - 0.5) * size; }
        if (pos[i * 3] > size / 2) pos[i * 3] -= size;
      }
      geo.attributes.position.needsUpdate = true;
    },
  };
}

// the aurora: soft moving curtains of green, teal and violet light painted on a sky dome
export function makeAurora(radius = 900) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { time: { value: 0 } },
    vertexShader: 'varying vec3 vD; void main(){ vD = normalize(position); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float time; varying vec3 vD;
      float band(vec3 d, vec3 n, float w, float speed, float seed){
        float x = dot(d, n);
        vec3 t1 = normalize(cross(n, vec3(0.0, 1.0, 0.01)));
        vec3 t2 = cross(n, t1);
        float along = atan(dot(d, t2), dot(d, t1));
        float wave = sin(along * 2.0 + time * speed + seed) * 0.06 + sin(along * 5.0 - time * speed * 1.3 + seed) * 0.02;
        float off = x - wave;
        // a curtain: sharp lower edge, long soft fade upward, faint vertical streaks
        float k = off < 0.0 ? exp(-pow(off / (w * 0.35), 2.0)) : exp(-off / (w * 1.6));
        float rays = 0.85 + 0.15 * sin(along * 90.0 + time * 0.4 + seed * 3.0);
        float fade = 0.5 + 0.5 * sin(along * 1.3 + time * 0.1 + seed);
        return k * rays * fade;
      }
      void main(){
        float a = band(vD, normalize(vec3(0.3, 0.2, 1.0)), 0.06, 0.25, 1.0);
        float b = band(vD, normalize(vec3(-0.6, 0.5, 0.4)), 0.045, 0.18, 4.0);
        float c = band(vD, normalize(vec3(0.8, -0.3, 0.2)), 0.05, 0.21, 9.0);
        vec3 col = a * vec3(0.25, 1.0, 0.6) + b * vec3(0.3, 0.8, 1.0) + c * vec3(0.7, 0.4, 1.0);
        gl_FragColor = vec4(col * 0.45, 1.0);
      }`,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.SphereGeometry(radius, 64, 32), mat);
  return { mesh, update(t) { mat.uniforms.time.value = t; } };
}

// placing generated structures on the planet (used by frost.js)
export function buildStructures({ ctx, mech, list, builders, updaters, place }) {
  const made = {};
  for (const s of list || []) {
    const m = builders[s.type](s);
    place(m.group, s.at, s.yaw);
    const k = s.scale ?? 1;
    if (s.scale) m.group.scale.setScalar(k);
    m.group.updateMatrixWorld(true);
    for (const c of m.colliders || []) {
      const d = m.group.localToWorld(new THREE.Vector3(c.x, 0, c.z)).normalize();
      mech.addCollider({ dir: d, r: c.r * k, h: c.h * k, stand: !!c.stand, tag: s.id });
    }
    if (m.update) updaters.push(m.update);
    if (s.id) made[s.id] = m;
  }
  return made;
}

// a lever on a post: pull(k) swings the handle (0 = up, 1 = down); the lamp goes red → green
export function makeLever() {
  const g = new THREE.Group();
  const metal = new THREE.MeshStandardMaterial({ color: '#6a7480', metalness: 0.6, roughness: 0.4 });
  const post = shadowed(new THREE.Mesh(new THREE.BoxGeometry(0.5, 1.1, 0.5), metal));
  post.position.y = 0.55;
  const pivot = new THREE.Group();
  pivot.position.set(0, 1.1, 0);
  const arm = shadowed(new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 1, 8), metal));
  arm.position.y = 0.5;
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.12, 10, 8), new THREE.MeshStandardMaterial({ color: '#d33', roughness: 0.4 }));
  knob.position.y = 1;
  pivot.add(arm, knob);
  pivot.rotation.x = -0.6;
  const lampMat = new THREE.MeshBasicMaterial({ color: '#ff5040' });
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.09, 8, 6), lampMat);
  lamp.position.set(0, 0.9, 0.27);
  const light = new THREE.PointLight('#ff5040', 3, 4, 2);
  light.position.set(0, 1.2, 0.4);
  g.add(post, pivot, lamp, light);
  return {
    group: g,
    setPull(k) { pivot.rotation.x = THREE.MathUtils.lerp(-0.6, 0.9, k); const c = k >= 1 ? '#5dff9a' : '#ff5040'; lampMat.color.set(c); light.color.set(c); },
  };
}

// a low rounded heap of snow (the little islands the levers stand on)
export function makeSnowMound(radius = 2) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(radius, 14, 6, 0, Math.PI * 2, 0, Math.PI / 2), snowMat);
  m.scale.y = 0.18;
  m.receiveShadow = true;
  const g = new THREE.Group();
  g.add(m);
  return g;
}

// a patch of dark, thin ice on the lake (a spherical cap just above the lake sheet); setCrack(0..1) spreads white cracks
export function makeThinIceSheet(R, radius) {
  const geo = new THREE.SphereGeometry(R + 0.07, 48, 6, 0, Math.PI * 2, 0, radius / R);
  const mat = new THREE.ShaderMaterial({
    uniforms: { crack: { value: 0 }, maxA: { value: radius / R } },
    vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
    fragmentShader: `uniform float crack, maxA; varying vec3 vP;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
      void main(){
        float a = acos(clamp(normalize(vP).y, -1.0, 1.0)) / maxA;      // 0 centre → 1 edge
        vec2 p = vP.xz * 1.4;
        vec2 i = floor(p), f = fract(p); float d1 = 9.0, d2 = 9.0;
        for (int y = -1; y <= 1; y++) for (int x = -1; x <= 1; x++) {
          vec2 g = vec2(float(x), float(y)); vec2 o = vec2(h(i + g), h(i + g + 7.0));
          float d = length(g + o - f);
          if (d < d1) { d2 = d1; d1 = d; } else if (d < d2) { d2 = d; }
        }
        float edgeLine = smoothstep(0.06, 0.0, d2 - d1);
        float spread = smoothstep(crack * 1.2, crack * 1.2 - 0.25, a);   // cracks grow outward from the centre
        vec3 dark = vec3(0.06, 0.14, 0.24);
        vec3 col = mix(dark, vec3(0.92, 0.97, 1.0), edgeLine * (0.25 + 0.75 * spread));
        float alpha = 0.78 * smoothstep(1.0, 0.85, a);
        gl_FragColor = vec4(col, alpha);
      }`,
    transparent: true, depthWrite: false,
  });
  const mesh = new THREE.Mesh(geo, mat);
  mesh.renderOrder = 2;
  return { mesh, setCrack(k) { mat.uniforms.crack.value = k; } };
}

// a glass dome with metal ribs; `lift` raises its rim to the top of the walls it sits on
export function makeGlassDome({ radius = 13, height = 6, lift = 3, tint = '#9fd8ff' } = {}) {
  const g = new THREE.Group();
  const glass = new THREE.ShaderMaterial({
    uniforms: { tint: { value: new THREE.Color(tint) } },
    vertexShader: 'varying vec3 vN; varying vec3 vV; void main(){ vec4 w = modelMatrix * vec4(position,1.0); vN = normalize(mat3(modelMatrix) * normal); vV = normalize(cameraPosition - w.xyz); gl_Position = projectionMatrix * viewMatrix * w; }',
    fragmentShader: `uniform vec3 tint; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 2.5); gl_FragColor = vec4(mix(tint * 0.5, vec3(1.0), f * 0.6), 0.08 + f * 0.45); }`,
    transparent: true, depthWrite: false, side: THREE.DoubleSide,
  });
  const shell = new THREE.Mesh(new THREE.SphereGeometry(radius, 48, 16, 0, Math.PI * 2, 0, Math.PI / 2), glass);
  shell.scale.y = height / radius;
  shell.position.y = lift;
  shell.renderOrder = 3;
  g.add(shell);
  const metal = new THREE.MeshStandardMaterial({ color: '#8a96a6', metalness: 0.7, roughness: 0.35 });
  const ribs = 12;
  for (let i = 0; i < ribs; i++) {   // meridian ribs
    const a = (i / ribs) * Math.PI * 2, pts = [];
    for (let k = 0; k <= 12; k++) { const th = (k / 12) * Math.PI / 2; pts.push(new THREE.Vector3(Math.cos(a) * Math.sin(th) * radius, Math.cos(th) * height + lift, Math.sin(a) * Math.sin(th) * radius)); }
    const rib = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 24, 0.09, 5), metal);
    rib.castShadow = true;
    g.add(rib);
  }
  for (const k of [0.35, 0.7]) {      // two rings
    const th = k * Math.PI / 2, rr = Math.sin(th) * radius;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(rr, 0.08, 5, 48), metal);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = Math.cos(th) * height + lift;
    g.add(ring);
  }
  const rim = new THREE.Mesh(new THREE.TorusGeometry(radius, 0.18, 6, 64), metal);
  rim.rotation.x = Math.PI / 2;
  rim.position.y = lift;
  g.add(rim);
  return { group: g, colliders: [] };
}
