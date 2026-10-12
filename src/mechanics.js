import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { placeOnSurface, sampleRock } from './world.js';

// Level mechanics introduced on planet 2. Everything is data-driven: a level only gets the
// systems it defines (items, sockets, fields, hazards, breakables, npc).

const _v = new THREE.Vector3(), _w = new THREE.Vector3();
export const towards = (from, to) => to.clone().addScaledVector(from, -to.dot(from)).normalize();
const GLOW = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

let softTexture;
export function soft() {
  if (softTexture) return softTexture;
  const cv = document.createElement('canvas');
  cv.width = cv.height = 64;
  const cx = cv.getContext('2d');
  const grd = cx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,0.9)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = grd;
  cx.fillRect(0, 0, 64, 64);
  return (softTexture = new THREE.CanvasTexture(cv));
}

// A model clone whose base sits at y = 0
export function modelInstance(gltf, scale, { ownMaterials = false } = {}) {
  const inner = gltf.scene.clone(true);
  if (Array.isArray(scale)) inner.scale.set(...scale); else inner.scale.setScalar(scale);
  inner.updateMatrixWorld(true);
  const box = new THREE.Box3().setFromObject(inner);
  inner.position.y = -box.min.y;
  inner.traverse(o => {
    if (!o.isMesh) return;
    o.castShadow = true;
    o.receiveShadow = true;
    if (ownMaterials) o.material = o.material.clone();
  });
  const g = new THREE.Group();
  g.add(inner);
  g.userData.inner = inner;
  g.userData.height = box.max.y - box.min.y;
  g.userData.size = box.getSize(new THREE.Vector3());
  return g;
}

export function makeBeam(height = 40, color = '#3cf') {
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.7, height, 10, 1, true),
    new THREE.MeshBasicMaterial({ color, opacity: 0.2, side: THREE.DoubleSide, ...GLOW }));
  beam.position.y = height / 2;
  return beam;
}

// Skinned characters: the scale/offset that makes a model `height` tall with its feet at y = 0 (cached per model)
const skinCache = new Map();
export function skinnedInstance(gltf, height) {
  const key = gltf.scene.uuid + ':' + height;
  if (!skinCache.has(key)) {
    const probe = cloneSkinned(gltf.scene);
    probe.updateMatrixWorld(true);
    probe.traverse(o => { if (o.isSkinnedMesh) { o.skeleton.update(); o.computeBoundingBox(); } });
    const box = new THREE.Box3().setFromObject(probe);
    const h = box.max.y - box.min.y;
    const scale = h > 0.01 && h < 1000 ? height / h : 1;
    skinCache.set(key, { scale, offset: -box.min.y * scale });
  }
  const { scale, offset } = skinCache.get(key);
  const model = cloneSkinned(gltf.scene);
  model.scale.multiplyScalar(scale);
  model.position.y = offset;
  model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
  const root = new THREE.Group();
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const clip = (name) => gltf.animations.find(x => x.name.split('|').pop() === name);
  return { root, model, mixer, clip };
}

export class Mechanics {
  constructor({ scene, ctx, level, gltfs, world, player, camera, camFwd, say }) {
    Object.assign(this, { scene, ctx, level, gltfs, world, player, camera, camFwd, say });
    this.R = ctx.R;
    this.flags = { power: false, rifle: false };
    this.equipped = null;  // inventory slot in hand: null (empty hands) | 'rifle' | 'sword'
    this.listeners = {};
    this.anchors = {};     // name → () => world position (used by cutscenes and hints)
    this.actors = {};      // name → (animation) => void  (characters a cutscene shot can animate, e.g. the elder)
    this.targets = [];     // extra shootable things: () => [{ center, radius, hit(point) }]
    this.cineQueue = [];
    // cutscenes by name. (Old single-cutscene levels: `cutscene` + `npc` → one cutscene played after the last cell.)
    const css = level.cutscenes ?? (level.cutscene ? { local: { ...level.cutscene, npc: level.npc, trigger: 'allCells', delay: 2.2 } } : {});
    this.cutscenes = Object.fromEntries(Object.entries(css).map(([k, v]) => [k, { ...v }]));
    for (const [ev, line] of Object.entries(level.eventLines ?? {})) this.on(ev, () => this.say(line, { interrupt: true }));
    this.once = new Set();
    this.carrying = null;
    this.checkpoint = { dir: player.up.clone(), facing: player.facing.clone() };
    this.dying = 0;
    this.hitCooldown = 0;
    this.shootCooldown = 0;
    this.fx = [];   // short-lived effects: { obj, t, life, update }

    this.items = (level.items || []).map(spec => this.makeItem(spec));
    this.sockets = (level.sockets || []).map(spec => this.makeSocket(spec));
    this.fields = (level.fields || []).map(spec => this.makeField(spec));
    (level.walls || []).forEach(spec => this.makeWall(spec));
    this.hazards = (level.hazards || []).map(spec => spec.type === 'lava' ? this.makeLava(spec) : spec.type === 'breach' ? this.makeBreach(spec) : this.makeGeyser(spec));
    this.lowGravity = (level.lowGravity || []).map(g => ({ ...g, dir: this.ctx.resolve(g.at) }));
    for (const [name, spec] of Object.entries(level.anchors ?? {})) {
      const d = this.ctx.resolve(spec.at ?? spec);
      this.anchors[name] = () => d.clone().multiplyScalar(this.R + (spec.alt ?? 1));
    }
    for (const l of level.eventLights ?? []) this.on(l.on, () => this.lightUp(l));
    // terminals: walk up, press E → main.js opens the terminal's screen (this.onTerminal). Done once solved.
    this.terminals = (level.terminals || []).map(t => ({ ...t, dir: this.ctx.resolve(t.at), done: false }));
    for (const t of this.terminals) { this.on(t.onSolved, () => { t.done = true; }); if (t.anchor) this.anchors[t.anchor] = () => t.dir.clone().multiplyScalar(this.R + 1); }
    for (const d of world.doors ?? []) if (d.lockedUntil) this.on(d.lockedUntil, () => { d.unlocked = true; this.removeColliders(d.lockTag); });
    this.breakables = (level.breakables || []).map(spec => this.makeBreakable(spec));
    this.makeTowerBeacon();
  }

  // ── events: flags, fields, cutscenes and listeners all hang off these ─────
  emit(name) {
    this.flags[name] = true;
    for (const f of this.fields) if (f.opensOn === name && !f.open) this.openField(f);
    for (const fn of this.listeners[name] ?? []) fn();
    for (const [key, cs] of Object.entries(this.cutscenes)) {
      if (cs.trigger !== name || cs.played) continue;
      cs.played = true;
      setTimeout(() => this.startCutscene(key), (cs.delay ?? 0) * 1000);
    }
  }

  on(name, fn) { (this.listeners[name] ??= []).push(fn); }

  sayOnce(key, line) {
    if (this.once.has(key)) return;
    this.once.add(key);
    this.say(line ?? key);
  }

  status() {
    return {
      flags: this.flags,
      socketsFilled: this.sockets.filter(s => s.filled).length,
      carrying: this.carrying?.kind ?? null,
    };
  }

  // ── colliders ─────────────────────────────────────────────────────────────
  addCollider(c) {
    this.world.colliders.push({ cull: Math.cos((c.r + 2) / this.R), ...c });
  }
  removeColliders(tag) {
    const cs = this.world.colliders;
    for (let i = cs.length - 1; i >= 0; i--) if (cs[i].tag === tag) cs.splice(i, 1);
  }
  surfDist(a, b) { return a.angleTo(b) * this.R; }

  // ── items: carryables (energy cells, crates) and equipables (rifle) ───────
  makeItem(spec) {
    const type = this.level.itemTypes[spec.type];
    const obj = modelInstance(this.gltfs[type.model], type.scale);
    let dir, alt = 0;
    if (spec.on) { const rec = this.world.byId[spec.on]; dir = rec.dir.clone(); alt = rec.h; }
    else dir = this.ctx.resolve(spec.at);
    const it = { id: spec.id, kind: spec.type, type, obj, dir, alt, home: { dir: dir.clone(), alt }, state: 'ground', yaw: Math.random() * 360, above: null, below: null };
    if (type.beam) { it.beam = makeBeam(); obj.add(it.beam); }
    this.scene.add(obj);
    this.placeItem(it);
    return it;
  }

  placeItem(it) {
    if (it.obj.parent !== this.scene) this.scene.add(it.obj);
    placeOnSurface(it.obj, it.dir, this.R + it.alt + (it.type.float ?? 0), THREE.MathUtils.degToRad(it.yaw));
    if (it.beam) { it.beam.visible = it.state === 'ground'; it.beam.position.y = 20 - it.alt - (it.type.float ?? 0); }
    if (it.type.stack && it.state === 'ground') {
      this.removeColliders(it.id);
      this.addCollider({ dir: it.dir.clone(), r: it.type.size / 2 + 0.05, h: it.alt + it.type.size, stand: true, tag: it.id });
    }
  }

  canPick(it) {
    const p = this.player;
    if (it.state !== 'ground' || !it.type.carry || it.above || it.locked) return false;
    if (Math.abs(p.alt - it.alt) > 1.5) return false;
    const d = this.surfDist(p.up, it.dir);
    if (it.type.stack && d < 0.8 && p.alt >= it.alt + it.type.size - 0.1) return false;   // standing on it
    return d < 1.8;
  }

  nearestPickable() {
    let best = null, bd = Infinity;
    for (const it of this.items) {
      if (!this.canPick(it)) continue;
      const d = this.surfDist(this.player.up, it.dir);
      if (d < bd) { bd = d; best = it; }
    }
    return best;
  }

  pickUp(it) {
    const p = this.player;
    this.removeColliders(it.id);
    if (it.below) { it.below.above = null; it.below = null; }
    it.state = 'carried';
    if (it.beam) it.beam.visible = false;
    p.root.add(it.obj);
    it.obj.quaternion.identity();
    this.holdCarried();
    this.carrying = it;
    p.mode = 'carry';
    p.playOnce('BoxPickUp', 0.45);
    if (this.gun) this.gun.visible = false;
    this.sayOnce('firstCarry', this.level.dialogue.events.firstCarry);
  }

  releaseCarry() {
    const it = this.carrying;
    this.carrying = null;
    this.player.mode = this.handMode();
    if (this.gun) this.gun.visible = this.equipped === 'rifle' && !!this.gunGrip?.done;
    return it;
  }

  nearSocket(kind) {
    return this.sockets.find(s => !s.filled && s.accepts === kind && this.surfDist(this.player.up, s.dir) < 2.4);
  }

  // where a drop would land: on top of a crate stack, or on the ground in front of the player
  dropTarget(it) {
    const p = this.player;
    const dir = p.up.clone().multiplyScalar(this.R).addScaledVector(p.facing, 1.3).normalize();
    if (it.type.stack) {
      let best = null;
      for (const o of this.items) {
        if (o === it || !o.type.stack || o.state !== 'ground' || o.above) continue;
        const maxAlt = it.type.size * ((it.type.maxStack ?? 3) - 1) - 0.01;
        if (this.surfDist(o.dir, dir) < 1.0 && o.alt < maxAlt && (!best || o.alt > best.alt)) best = o;
      }
      if (best) return { dir: best.dir.clone(), alt: best.alt + it.type.size, on: best };
    }
    const blocked = this.world.colliders.some(c => c.tag !== it.id && c.h > 0.4 && this.surfDist(c.dir, dir) < c.r + 0.5)
      || this.inLava(dir);
    return blocked ? null : { dir, alt: 0, on: null };
  }

  putDown() {
    const it = this.carrying;
    const socket = this.nearSocket(it.kind);
    if (socket) { this.releaseCarry(); this.fillSocket(socket, it); this.player.playOnce('BoxPutDown', 0.45); return; }
    const target = this.dropTarget(it);
    if (!target) {
      const fullStack = it.type.stack && this.items.some(o => o !== it && o.below && o.state === 'ground' && this.surfDist(o.dir, this.player.up) < 2.2);
      this.say(fullStack ? this.level.dialogue.events.stackLimit : this.level.dialogue.events.noRoom);
      return;
    }
    this.releaseCarry();
    it.state = 'ground';
    it.dir = target.dir;
    it.alt = target.alt;
    if (target.on) { target.on.above = it; it.below = target.on; it.yaw = target.on.yaw; }
    this.placeItem(it);
    this.player.playOnce('BoxPutDown', 0.45);
  }

  // knocked out of your hands (geyser): falls where you stand, or goes home if that's lava
  dropForced() {
    const it = this.releaseCarry();
    if (!it) return;
    const dir = this.player.up.clone();
    const lost = this.inLava(dir);
    it.state = 'ground';
    it.dir = lost ? it.home.dir.clone() : dir;
    it.alt = lost ? it.home.alt : 0;
    this.placeItem(it);
    this.say(this.level.dialogue.events.dropped);
  }

  returnHome(it) {
    if (this.carrying === it) this.releaseCarry();
    it.state = 'ground';
    it.dir = it.home.dir.clone();
    it.alt = it.home.alt;
    this.placeItem(it);
  }

  // ── sockets (generator) ───────────────────────────────────────────────────
  makeSocket(spec) {
    const dir = this.ctx.resolve(spec.at);
    const g = new THREE.Group();
    placeOnSurface(g, dir, this.R);
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 0.9, 0.25, 20),
      new THREE.MeshStandardMaterial({ color: '#3a3a42', metalness: 0.6, roughness: 0.45 }));
    base.position.y = 0.12;
    base.receiveShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 8, 32), new THREE.MeshBasicMaterial({ color: '#ff8a3d' }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.27;
    const light = new THREE.PointLight('#ff8a3d', 5, 5, 2);
    light.position.y = 0.8;
    g.add(base, ring, light);
    this.scene.add(g);
    return { ...spec, dir, mesh: g, ring, light, filled: null };
  }

  fillSocket(s, it) {
    s.filled = it;
    it.state = 'socketed';
    it.dir = s.dir.clone();
    it.alt = 0.25;
    this.placeItem(it);
    s.ring.material.color.set('#3cf');
    s.light.color.set('#3cf');
    const group = this.sockets.filter(o => o.group === s.group);
    const n = group.filter(o => o.filled).length;
    const ev = this.level.dialogue.events;
    if (n < group.length) { if (ev?.socket?.[n - 1]) this.say(ev.socket[n - 1]); return; }
    if (s.group === 'generator') this.powerOn();
    this.emit('filled:' + s.group);
  }

  powerOn() {
    this.flags.power = true;
    const gen = this.world.byId.generator;
    if (gen) {
      const light = new THREE.PointLight('#5cf', 25, 16, 2);
      light.position.copy(gen.dir).multiplyScalar(this.R + 5);
      this.scene.add(light);
    }
    if (this.beacon) this.beacon.userData.powered = true;
    this.say(this.level.dialogue.events.power);
    this.emit('power');
  }

  // ── force fields ──────────────────────────────────────────────────────────
  makeField(spec) {
    const center = this.ctx.resolve(spec.at);
    const f = towards(center, this.ctx.zoneById[spec.facing].dir);
    const side = new THREE.Vector3().crossVectors(f, center);
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, opacity: { value: 1 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float time, opacity; varying vec2 vUv;
        void main(){
          float lines = smoothstep(0.85, 1.0, sin(vUv.y * 60.0 - time * 4.0) * 0.5 + 0.5);
          float hex = smoothstep(0.9, 1.0, sin(vUv.x * 50.0 + sin(vUv.y * 30.0)) * 0.5 + 0.5);
          float edge = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.7, vUv.y);
          float a = (0.18 + lines * 0.5 + hex * 0.25) * edge * opacity;
          gl_FragColor = vec4(vec3(0.35, 0.8, 1.0), a);
        }`,
      side: THREE.DoubleSide, ...GLOW,
    });
    const mesh = new THREE.Mesh(new THREE.PlaneGeometry(spec.width, spec.height), mat);
    mesh.position.copy(center).multiplyScalar(this.R).addScaledVector(center, spec.height / 2);
    mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, center, f));
    this.scene.add(mesh);
    const tag = 'field:' + spec.id;
    for (let k = -spec.width / 2; k <= spec.width / 2; k += 0.6) {
      this.addCollider({ dir: center.clone().multiplyScalar(this.R).addScaledVector(side, k).normalize(), r: 0.45, h: Infinity, tag });
    }
    return { ...spec, center, mesh, mat, tag, open: false, fade: 1 };
  }

  // invisible ring wall with one opening (e.g. a crater rim whose only way in is the gate)
  makeWall(spec) {
    const c = this.ctx.resolve(spec.center);
    // openings: gapToward/gap (one), or gaps: [{ toward, width }] (several)
    const gaps = spec.gaps ?? [{ toward: spec.gapToward, width: spec.gap }];
    const f = towards(c, this.ctx.zoneById[gaps[0].toward].dir);
    const side = new THREE.Vector3().crossVectors(f, c);
    const angleOf = (zone) => { const t = towards(c, this.ctx.zoneById[zone].dir); return Math.atan2(t.dot(side), t.dot(f)); };
    const open = gaps.map(g => ({ at: angleOf(g.toward), half: (g.width / 2) / spec.radius }));
    const step = 0.8 / spec.radius;
    for (let a = -Math.PI; a < Math.PI; a += step) {
      if (open.some(o => Math.abs(Math.atan2(Math.sin(a - o.at), Math.cos(a - o.at))) < o.half)) continue;
      const d = c.clone().multiplyScalar(this.R)
        .addScaledVector(f, Math.cos(a) * spec.radius)
        .addScaledVector(side, Math.sin(a) * spec.radius).normalize();
      this.addCollider({ dir: d, r: 0.5, h: Infinity, tag: 'wall' });
    }
  }

  openField(f) {
    f.open = true;
    this.removeColliders(f.tag);
  }

  // ── hazards ───────────────────────────────────────────────────────────────
  makeLava(spec) {
    const dir = this.ctx.resolve(spec.at);
    const shape = new THREE.Shape();
    const N = 28, seed = Math.random() * 10;
    for (let i = 0; i <= N; i++) {
      const a = (i / N) * Math.PI * 2;
      const r = spec.radius * (0.85 + 0.15 * Math.sin(a * 3 + seed) + 0.08 * Math.sin(a * 7 + seed * 2));
      i === 0 ? shape.moveTo(Math.cos(a) * r, Math.sin(a) * r) : shape.lineTo(Math.cos(a) * r, Math.sin(a) * r);
    }
    const geo = new THREE.ShapeGeometry(shape, 4);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({ color: '#ff6a1a', emissive: '#ff3c00', emissiveIntensity: 1.6, roughness: 0.35 });
    const mesh = new THREE.Mesh(geo, mat);
    placeOnSurface(mesh, dir, this.R + 0.05);
    const light = new THREE.PointLight('#ff5a10', 10, spec.radius * 3, 2);
    light.position.copy(dir).multiplyScalar(this.R + 1);
    this.scene.add(mesh, light);
    return { ...spec, dir, mat, phase: Math.random() * 6 };
  }

  // a hole in the station floor: a ring (inner..outer metres from its centre) showing open space below.
  // Stepping in doesn't kill you: you float back up to `respawn`, losing some health (combat planets).
  makeBreach(spec) {
    const dir = this.ctx.resolve(spec.at), R = this.R;
    const geo = new THREE.SphereGeometry(R + 0.03, 96, 6, 0, Math.PI * 2, spec.inner / R, (spec.outer - spec.inner) / R);
    const mat = new THREE.ShaderMaterial({
      uniforms: { time: { value: 0 }, inner: { value: spec.inner / R }, outer: { value: spec.outer / R } },
      vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
      fragmentShader: `uniform float time, inner, outer; varying vec3 vP;
        float h(vec2 p){ return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
        void main(){
          vec3 n = normalize(vP);
          float a = acos(clamp(n.y, -1.0, 1.0));
          float k = (a - inner) / (outer - inner);                     // 0 inner edge → 1 outer edge
          vec2 sp = vec2(atan(n.z, n.x) * 40.0, a * 400.0);
          vec2 cell = floor(sp); float st = step(0.985, h(cell)) * (0.5 + 0.5 * sin(time * 2.0 + h(cell + 3.0) * 20.0));
          vec3 col = vec3(0.01, 0.015, 0.05) + st * vec3(0.9, 0.95, 1.0);
          float edge = max(smoothstep(0.1, 0.0, k), smoothstep(0.9, 1.0, k));
          col += edge * vec3(0.25, 0.7, 1.0) * (0.8 + 0.2 * sin(time * 9.0 + atan(n.z, n.x) * 30.0));
          gl_FragColor = vec4(col, 1.0);
        }`,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    mesh.renderOrder = 1;
    this.scene.add(mesh);
    return { ...spec, dir, mat };
  }

  inBreach(dir) {
    return this.hazards.some(h => h.type === 'breach' && (d => d > h.inner + 0.25 && d < h.outer - 0.25)(this.surfDist(dir, h.dir)));
  }

  // floated out of a breach: back to its edge, a little hurt
  fallThroughBreach(h) {
    if (this.dying > 0) return;
    this.dying = 1.0;
    this.breachFall = h;
    this.player.playOnce('HitRecieve', 0.6);
    this.emit('breachFall');
    if (h.line) this.sayOnce('breach', h.line);
  }

  // event light: a glow and a beam at an anchor (e.g. the repair pod coming online)
  lightUp(l) {
    const at = this.anchors[l.anchor]?.();
    if (!at) return;
    const up = at.clone().normalize();
    const light = new THREE.PointLight(l.color ?? '#5cf', 30, 16, 1.5);
    light.position.copy(at).addScaledVector(up, 1);
    const beam = makeBeam(30, l.color ?? '#5cf');
    const holder = new THREE.Group();
    holder.add(beam);
    holder.position.copy(at).addScaledVector(up, -1);
    holder.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), up);
    this.scene.add(light, holder);
  }

  inLava(dir) {
    if (this.inBreach(dir)) return true;
    return this.hazards.some(h => h.type === 'lava' && this.surfDist(dir, h.dir) < h.radius * 0.8);
  }

  makeGeyser(spec) {
    const dir = this.ctx.resolve(spec.at);
    const g = new THREE.Group();
    placeOnSurface(g, dir, this.R);
    const size = spec.size ?? 1;   // scales the vent, the steam column and the blast radius
    g.scale.setScalar(size);
    const vent = new THREE.Mesh(new THREE.CylinderGeometry(0.75, 1.1, 0.4, 10),
      new THREE.MeshStandardMaterial({ color: '#3b2a26', roughness: 1, flatShading: true }));
    vent.position.y = 0.1;
    const glow = new THREE.Mesh(new THREE.CircleGeometry(0.55, 16), new THREE.MeshBasicMaterial({ color: '#ff7a3a' }));
    glow.rotation.x = -Math.PI / 2;
    glow.position.y = 0.31;
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 1.0, 9, 12, 1, true),
      new THREE.MeshBasicMaterial({ color: '#fff4ea', transparent: true, opacity: 0, depthWrite: false, side: THREE.DoubleSide }));
    column.position.y = 4.5;
    g.add(vent, glow, column);
    const puffs = [];
    for (let i = 0; i < 12; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: '#fff', transparent: true, depthWrite: false, opacity: 0 }));
      s.userData.life = Math.random();
      s.userData.drift = new THREE.Vector3((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8);
      g.add(s);
      puffs.push(s);
    }
    this.scene.add(g);
    return { ...spec, size, dir, group: g, glow, column, puffs, state: 'idle' };
  }

  // ── breakable crystal shell ───────────────────────────────────────────────
  makeBreakable(spec) {
    const dir = this.ctx.resolve(spec.at);
    const g = new THREE.Group();
    placeOnSurface(g, dir, this.R);
    const parts = spec.parts.map(p => {
      const m = modelInstance(this.gltfs[p.model], p.scale, { ownMaterials: true });
      m.position.set(p.e, 0, -p.n);
      m.rotation.y = THREE.MathUtils.degToRad(p.yaw ?? 0);
      g.add(m);
      return m;
    });
    this.scene.add(g);
    const tag = 'break:' + spec.id;
    this.addCollider({ dir: dir.clone(), r: spec.radius, h: Infinity, tag });
    return { ...spec, dir, group: g, parts, hp: spec.hp, tag, flash: 0, broken: false, center: dir.clone().multiplyScalar(this.R + (spec.centerAlt ?? 1.2)) };
  }

  hitBreakable(b, point) {
    if (b.requires && !this.flags[b.requires]) {   // still shielded
      this.spawnShards(point, '#888899', 3);
      if (b.shieldedLine) this.sayOnce('shielded:' + b.id, b.shieldedLine);
      return;
    }
    b.hp--;
    b.flash = 1;
    this.spawnShards(point, '#c48bff', 4);
    if (b.hp > 0) return;
    b.broken = true;
    this.removeColliders(b.tag);
    for (const p of b.parts) {
      p.userData.vel = new THREE.Vector3(p.position.x, 2 + Math.random() * 2, p.position.z).normalize().multiplyScalar(5 + Math.random() * 3);
      p.userData.spin = new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(6);
    }
    this.spawnShards(point, '#c48bff', 14);
    if (b.brokenLine ?? this.level.dialogue.events.shellBroken) this.say(b.brokenLine ?? this.level.dialogue.events.shellBroken);
    this.emit('broken:' + b.id);
  }

  spawnShards(point, color, n) {
    const up = point.clone().normalize();
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.TetrahedronGeometry(0.05 + Math.random() * 0.07),
        new THREE.MeshStandardMaterial({ color, emissive: color, emissiveIntensity: 1 }));
      m.position.copy(point);
      const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(4).addScaledVector(up, 3);
      this.scene.add(m);
      this.fx.push({ obj: m, t: 0, life: 0.9, update: (dt) => { vel.addScaledVector(up, -12 * dt); m.position.addScaledVector(vel, dt); m.rotation.x += dt * 8; } });
    }
  }

  // ── rifle ─────────────────────────────────────────────────────────────────
  // start a level already holding an equipable (e.g. the blaster you found on Ember)
  giveEquip(typeKey) {
    this.equip({ state: 'ground', type: this.level.itemTypes[typeKey], obj: new THREE.Object3D() }, { quiet: true });
  }

  // animation set for what's in hand
  handMode() { return this.equipped === 'rifle' ? 'gun' : this.equipped === 'sword' ? 'sword' : 'normal'; }

  // switch what's in hand (keys 1/2/3). Owning an item is a flag; holding it is `equipped`.
  setEquipped(slot) {
    if (this.carrying || this.cine || this.dying > 0) return false;
    if (slot === 'rifle' && !this.flags.rifle) return false;
    if (slot === 'sword' && !this.flags.sword) return false;
    this.equipped = slot;
    this.player.mode = this.handMode();
    if (this.gun) this.gun.visible = slot === 'rifle' && !!this.gunGrip?.done;
    this.emit('inventory');
    return true;
  }

  equip(it, { quiet = false } = {}) {
    it.state = 'taken';
    this.scene.remove(it.obj);
    this.flags.rifle = true;
    const type = it.type;
    const grip = type.grip ?? {};
    // the loader strips dots from bone names ('Wrist.R' → 'WristR')
    const boneName = grip.bone ?? 'Wrist.R', model = this.player.model;
    const bone = model.getObjectByName(boneName) ?? model.getObjectByName(THREE.PropertyBinding.sanitizeNodeName(boneName)) ?? this.player.root;
    const gun = this.gltfs[type.model].scene.clone(true);
    gun.traverse(o => { if (o.isMesh) o.castShadow = true; });
    this.player.model.updateMatrixWorld(true);
    const s = bone.getWorldScale(new THREE.Vector3()).x || 1;
    gun.scale.setScalar((grip.scale ?? 0.55) / s);
    bone.add(gun);
    this.gun = gun;
    this.gunGrip = { bone, scale: grip.scale ?? 0.55, offset: grip.offset };
    gun.visible = false;   // shown once aligned in the Idle_Gun pose (see alignGun)
    this.equipped = 'rifle';
    if (!this.carrying) this.player.mode = 'gun';
    else gun.visible = false;
    this.emit('inventory');
    if (!quiet) this.player.playOnce('Interact', 0.8);
    document.getElementById('crosshair')?.classList.add('show');
    if (!quiet) this.say(this.level.dialogue.events.rifle);
  }

  // Keep the carried item between the astronaut's hands (wrists are ~0.9 m apart in the BoxWalk pose)
  holdCarried() {
    const it = this.carrying, p = this.player;
    if (!it) return;
    const L = p.model.getObjectByName('WristL'), Rw = p.model.getObjectByName('WristR');
    if (!L || !Rw) { it.obj.position.set(0, 0.8, 0.6); return; }
    p.root.updateMatrixWorld(true);
    const a = p.root.worldToLocal(L.getWorldPosition(new THREE.Vector3()));
    const b = p.root.worldToLocal(Rw.getWorldPosition(new THREE.Vector3()));
    const mid = a.add(b).multiplyScalar(0.5);
    const size = it.obj.userData.size;
    it.obj.position.set(mid.x, mid.y - size.y / 2, Math.max(mid.z + 0.08, size.z / 2 + 0.12));
  }

  // Line the blaster up with the pointing right hand (Idle_Gun_Pointing): barrel along the hand, grip in the palm
  alignGun() {
    const g = this.gunGrip, p = this.player;
    if (!g || g.done || this.carrying || this.equipped !== 'rifle') return;
    const a = p.current;
    if (!a || !a.getClip().name.endsWith('Idle_Gun_Pointing') || a.getEffectiveWeight() < 0.99) return;
    const knuckle = p.model.getObjectByName('Index1R');
    if (!knuckle) return;
    p.root.updateMatrixWorld(true);
    const wrist = g.bone.getWorldPosition(new THREE.Vector3());
    const hand = knuckle.getWorldPosition(new THREE.Vector3()).sub(wrist).normalize();
    const up = p.up.clone().addScaledVector(hand, -p.up.dot(hand)).normalize();
    const side = new THREE.Vector3().crossVectors(hand, up);
    const worldQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(hand, up, side));   // gun +X = barrel
    // offset: [metres along the hand, metres up] from the wrist to the model's origin
    const [along, lift] = g.offset ?? [0.07 + 0.35 * g.scale, -0.06];
    const worldPos = wrist.clone().addScaledVector(hand, along).addScaledVector(up, lift);
    this.gun.quaternion.copy(g.bone.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldQ));
    this.gun.position.copy(g.bone.worldToLocal(worldPos));
    this.gun.visible = true;
    g.done = true;
  }

  shoot() {
    if (this.equipped !== 'rifle' || this.carrying || this.dying > 0 || this.shootCooldown > 0) return;
    this.shootCooldown = 0.22;
    const p = this.player, cam = this.camera;
    const origin = cam.position.clone();
    const dir = cam.getWorldDirection(new THREE.Vector3());
    const raySphere = (c, r) => {
      const oc = _v.copy(origin).sub(c);
      const b = oc.dot(dir), cc = oc.lengthSq() - r * r, h = b * b - cc;
      return h < 0 ? -1 : -b - Math.sqrt(h);
    };
    let tHit = 60, target = null;
    const candidates = this.shootables();
    for (const c of candidates) {
      const t = raySphere(c.center, c.radius);
      if (t > 0 && t < tHit) { tHit = t; target = c; }
    }
    const tPlanet = raySphere(_w.set(0, 0, 0), this.R);
    if (tPlanet > 0 && tPlanet < tHit) { tHit = tPlanet; target = null; }
    let hit = origin.clone().addScaledVector(dir, tHit);
    // aim assist: a near miss snaps onto the closest target to the crosshair
    if (!target) {
      const a = this.aimAssist(origin, dir);
      if (a) { target = a; hit = a.center.clone(); dir.copy(hit).sub(origin).normalize(); }
    }
    if (target) this.onHitMarker?.();

    p.aim(dir, 0.7);
    p.playOverride(p.vel.length() > 0.5 ? 'Run_Shoot' : 'Idle_Gun_Shoot', 0.3);

    const muzzle = this.gun ? this.gun.getWorldPosition(new THREE.Vector3()).addScaledVector(p.facing, 0.6) : p.pos.clone().addScaledVector(p.up, 1.3);
    this.fireBolt(muzzle, hit, () => {
      if (target) target.hit(hit);
      else this.spawnShards(hit, this.level.groundSpark ?? '#b08060', 4);
    });
  }

  shootables() {
    const list = this.breakables.filter(b => !b.broken).map(b => ({ center: b.center, radius: b.radius, hit: (pt) => this.hitBreakable(b, pt) }));
    for (const provider of this.targets) list.push(...provider());
    return list;
  }

  // the target closest to the crosshair, within a few degrees (more forgiving up close), with a clear line of sight
  aimAssist(origin, dir) {
    let best = null, bestA = Infinity;
    for (const c of this.shootables()) {
      const to = c.center.clone().sub(origin), d = to.length();
      if (d > 45) continue;
      const a = to.normalize().angleTo(dir);
      const allow = Math.atan((c.radius + 0.6) / d) + THREE.MathUtils.degToRad(this.level.aimAssist ?? 4);
      if (a < allow && a < bestA && this.lineClear(origin.clone().addScaledVector(dir, 2), c.center.clone().addScaledVector(to, -c.radius))) { best = c; bestA = a; }
    }
    return best;
  }

  // is the crosshair currently on (or assist-close to) something shootable?
  aimingAtTarget() {
    if (this.equipped !== 'rifle') return false;
    const origin = this.camera.position.clone(), dir = this.camera.getWorldDirection(new THREE.Vector3());
    return !!this.aimAssist(origin, dir);
  }

  // a glowing energy bolt that flies to `to`, then bursts and calls onHit
  fireBolt(from, to, onHit) {
    const color = this.level.boltColor ?? '#5ef2ff';
    const dir = to.clone().sub(from), dist = dir.length();
    dir.normalize();
    const bolt = new THREE.Group();
    const core = new THREE.Mesh(new THREE.CapsuleGeometry(0.06, 0.7, 4, 8), new THREE.MeshBasicMaterial({ color: '#eaffff' }));
    core.rotation.x = Math.PI / 2;   // capsule along the flight direction
    const glow = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, ...GLOW }));
    glow.scale.set(0.9, 0.9, 1);
    const tail = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, ...GLOW, opacity: 0.5 }));
    tail.scale.set(0.6, 0.6, 1);
    tail.position.z = -0.6;
    const light = new THREE.PointLight(color, 8, 5, 2);
    bolt.add(core, glow, tail, light);
    bolt.position.copy(from);
    bolt.lookAt(to);
    this.scene.add(bolt);
    // muzzle flash
    const flash = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, ...GLOW }));
    flash.position.copy(from);
    flash.scale.setScalar(1.2);
    this.scene.add(flash);
    this.fx.push({ obj: flash, t: 0, life: 0.1, update: (dt, k) => { flash.material.opacity = 1 - k; } });
    const speed = 70, life = Math.max(0.02, dist / speed);
    this.fx.push({ obj: bolt, t: 0, life, update: (dt, k) => {
      bolt.position.copy(from).addScaledVector(dir, dist * k);
      if (k >= 1) {
        onHit();
        const burst = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, ...GLOW }));
        burst.position.copy(to);
        const bl = new THREE.PointLight(color, 12, 4, 2);
        burst.add(bl);
        this.scene.add(burst);
        this.fx.push({ obj: burst, t: 0, life: 0.25, update: (dt, k2) => { burst.scale.setScalar(0.4 + k2 * 1.6); burst.material.opacity = 1 - k2; bl.intensity = 12 * (1 - k2); } });
      }
    } });
  }

  // ── tower beacon + alien teaser ───────────────────────────────────────────
  makeTowerBeacon() {
    const tower = this.world.byId.radioTower;
    if (!tower) return;
    const b = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 8), new THREE.MeshBasicMaterial({ color: '#ff3030' }));
    b.position.copy(tower.dir).multiplyScalar(this.R + tower.h + 0.3);
    const light = new THREE.PointLight('#ff3030', 0, 30, 1.5);
    b.add(light);
    this.scene.add(b);
    this.beacon = b;
  }

  // ── the local (alien) ─────────────────────────────────────────────────────
  spawnAlien() {
    const npc = this.cs?.npc;
    if (!npc || (this.alien && !this.alien.gone)) return;
    const { root, mixer, clip } = skinnedInstance(this.gltfs[npc.model], npc.height);
    this.scene.add(root);
    const act = (name) => { const c = clip(name); return c && mixer.clipAction(c); };
    const at = this.spot ?? this.ctx.resolve(npc.at);
    const a = { root, mixer, dir: at.clone(), facing: towards(at, this.player.up), current: null, run: false, alt: npc.drop ?? 2.5, vy: 0, runTime: 0 };
    // play('Wave') loops; play(['Jump_Land', 'Idle']) plays the first once, then loops the second
    a.play = (anim) => {
      const [first, then] = [].concat(anim);
      const x = act(first);
      if (!x || a.current === x) return;
      x.reset().setLoop(then ? THREE.LoopOnce : THREE.LoopRepeat, Infinity).fadeIn(0.15).play();
      x.clampWhenFinished = !!then;
      a.current?.fadeOut(0.15);
      a.current = x;
      a.next = then ? { action: x, anim: then } : null;
    };
    mixer.addEventListener('finished', (e) => { if (a.next && e.action === a.next.action) { const n = a.next.anim; a.next = null; a.play(n); } });
    this.alien = a;
    this.updateAlien(0);
  }

  updateAlien(dt) {
    const a = this.alien;
    if (!a || a.gone) return;
    if (a.alt > 0) {
      a.vy += 20 * dt;
      a.alt = Math.max(0, a.alt - a.vy * dt);
      if (a.alt === 0) this.puff(a.dir.clone().multiplyScalar(this.R + 0.3));
    }
    if (a.run) {
      a.runTime += dt;
      a.facing = towards(a.dir, a.runDir ?? a.facing);
      a.dir = a.dir.clone().multiplyScalar(this.R).addScaledVector(a.facing, 5 * dt).normalize();
      if (a.runTime > 1.4) { this.removeAlien(); return; }   // out of sight → poof
    } else {
      a.facing.lerp(towards(a.dir, this.player.up), 1 - Math.exp(-8 * dt)).normalize();
    }
    const x = new THREE.Vector3().crossVectors(a.dir, a.facing).normalize();
    a.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, a.dir, a.facing));
    a.root.position.copy(a.dir).multiplyScalar(this.R + a.alt);
    a.mixer.update(dt);
  }

  removeAlien() {
    const a = this.alien;
    if (!a || a.gone) return;
    a.gone = true;
    this.puff(a.root.position.clone().addScaledVector(a.dir, 0.6));
    this.scene.remove(a.root);
  }

  // ── cutscene ──────────────────────────────────────────────────────────────
  // While a cutscene runs, main.js reads this.cinematic for the camera and freezes the player.
  get cinematic() { return this.cine ? this.cine.cam : null; }

  startCutscene(name) {
    const cs = this.cutscenes[name];
    if (!cs) return;
    if (this.cine) { this.cineQueue.push(name); return; }
    const p = this.player;
    this.cs = cs;
    this.csName = name;
    this.alien = null;
    this.spot = cs.npc ? (cs.npc.fixed ? this.ctx.resolve(cs.npc.at) : this.findAlienSpot()) : null;
    if (cs.stage) {   // stand the astronaut on a mark: `dist` m from an anchor, facing it
      const a = this.anchors[cs.stage.facing]?.().normalize();
      if (a) {
        const away = towards(a, p.up).lengthSq() > 0.5 ? towards(a, p.up) : towards(a, this.ctx.zones[0].dir);
        const mark = a.clone().multiplyScalar(this.R).addScaledVector(away, cs.stage.dist ?? 3).normalize();
        p.spawn(mark, towards(mark, a));
        this.camFwd.copy(p.facing);
      }
    }
    this.cine = { shots: cs.shots, i: -1, t: 0, cam: { pos: new THREE.Vector3(), look: new THREE.Vector3(), up: new THREE.Vector3() } };
    this.cine.prevMode = p.mode;
    p.mode = 'normal';   // lower the blaster for the scene
    if (this.gun) this.gun.visible = false;
    document.body.classList.add('cinematic');
    this.nextShot();
  }

  nextShot() {
    const c = this.cine;
    c.i++;
    c.t = 0;
    const shot = c.shots[c.i];
    if (!shot) return this.endCutscene();
    if (shot.emit) this.emit(shot.emit);
    if (shot.spawn) this.spawnAlien();
    if (shot.alien && this.alien && !this.alien.gone) this.alien.play(shot.alien);
    if (this.alien && shot.run && !this.alien.run) {
      this.alien.run = true;
      this.alien.runDir = shot.runToward ? this.ctx.zoneById[shot.runToward].dir.clone() : this.findRunDir();
    }
    if (shot.player) this.player.playOnce(shot.player, shot.dur);
    for (const [name, anim] of Object.entries(shot.act ?? {})) this.actors[name]?.(anim);
    if (shot.say) this.say(shot.say, { interrupt: true });
    c.frame = this.frameShot(shot);
  }

  // world position of the cutscene's "other" character: the npc, its spot, or a named anchor
  focusPos(shot) {
    if (this.alien && !this.alien.gone) return this.alien.dir.clone().multiplyScalar(this.R);
    if (this.spot) return this.spot.clone().multiplyScalar(this.R);
    for (const k of [shot?.subject, shot?.target]) { const f = this.anchors[k]; if (f) return f(); }
    return this.player.pos.clone().addScaledVector(this.player.facing, 5);
  }

  // ── keeping the camera (and the alien) out of rocks, trees and walls ──────
  isClear(pos, rad = 0.4) {
    const R = this.R, d = pos.clone().normalize(), alt = pos.length() - R;
    if (alt < 0.3) return false;
    for (const c of this.world.colliders) {
      if (c.tag === 'villager' || c.dir.dot(d) < c.cull) continue;   // characters are handled by the framing's body check
      if (c.rock) { if (sampleRock(c, d, R, rad) > alt - 0.3) return false; continue; }
      if (d.distanceTo(c.dir) * R < c.r + rad && (c.h === Infinity || alt < c.h + 0.3)) return false;
    }
    // big decorative props without colliders (crystals): keep a little distance from their bases
    return true;
  }

  lineClear(a, b) {
    const p = new THREE.Vector3();
    for (let i = 1; i < 10; i++) if (!this.isClear(p.lerpVectors(a, b, i / 10), 0.15)) return false;
    return true;
  }

  // a clear spot ~5 m from the player, inside the crater, preferably in front of them
  findAlienSpot() {
    const p = this.player, R = this.R, up = p.up;
    const fwd = p.facing.clone(), right = new THREE.Vector3().crossVectors(fwd, up);
    const crater = this.ctx.zoneById[this.cs.npc.at.zone];
    const head = p.pos.clone().addScaledVector(up, 1.4);
    for (const dist of [5.5, 4.5, 6.5]) {
      for (const deg of [0, 30, -30, 60, -60, 90, -90, 120, -120, 150, -150, 180]) {
        const a = THREE.MathUtils.degToRad(deg);
        const dir = up.clone().multiplyScalar(R).addScaledVector(fwd, Math.cos(a) * dist).addScaledVector(right, Math.sin(a) * dist).normalize();
        if (crater && dir.angleTo(crater.dir) * R > crater.radius * 0.7) continue;
        const body = dir.clone().multiplyScalar(R + 1);
        if (!this.isClear(body, 1.0) || !this.lineClear(head, body)) continue;
        if (this.items.some(it => it.state !== 'taken' && this.surfDist(it.dir, dir) < 1.5)) continue;
        if (this.blocksView(head, body)) continue;
        return dir;
      }
    }
    return this.ctx.resolve(this.cs.npc.at);
  }

  // true if a landmark (portal, boss…) sits on or right behind the actor as seen from the player
  blocksView(head, body) {
    for (const [name, f] of Object.entries(this.anchors)) {
      if (name === 'elder') continue;
      const a = f();
      if (body.distanceTo(a) < 4.5) return true;
      const ab = body.clone().sub(head), t = THREE.MathUtils.clamp(a.clone().sub(head).dot(ab) / ab.lengthSq(), 0, 1.6);
      if (head.clone().addScaledVector(ab, t).distanceTo(a) < 3) return true;   // in line with it (in front or just behind)
    }
    return false;
  }

  // a direction the alien can run 6 m without hitting anything, preferably away from the player
  findRunDir() {
    const a = this.alien, R = this.R, up = a.dir;
    const away = towards(up, this.player.up).negate(), side = new THREE.Vector3().crossVectors(away, up);
    for (const deg of [0, 35, -35, 70, -70, 105, -105]) {
      const r = THREE.MathUtils.degToRad(deg);
      const d = away.clone().multiplyScalar(Math.cos(r)).addScaledVector(side, Math.sin(r));
      let ok = true;
      for (let k = 1; k <= 6 && ok; k++) ok = this.isClear(up.clone().multiplyScalar(R).addScaledVector(d, k).normalize().multiplyScalar(R + 0.8), 0.5);
      if (ok) return up.clone().multiplyScalar(R).addScaledVector(d, 6).normalize();
    }
    return up.clone().multiplyScalar(R).addScaledVector(away, 6).normalize();
  }

  // where the camera starts/ends for a shot (a slow dolly between the two); tries several framings, keeps the first clear one
  frameShot(shot) {
    if (shot.cam === 'follow') return { follow: true };
    const p = this.player;
    const P = p.pos.clone();
    const A = this.focusPos(shot);
    const pick = (k) => (k === 'player' ? P : this.anchors[k] ? this.anchors[k]() : A).clone();
    const upAt = (v) => v.clone().normalize();
    const flat = (v, up) => v.addScaledVector(up, -v.dot(up)).normalize();
    const subj = shot.subject ?? 'player';
    const S = pick(subj), T = pick(shot.target ?? (subj === 'player' ? 'alien' : 'player'));
    const up = upAt(S);
    const toT = flat(T.clone().sub(S), up);
    const right = new THREE.Vector3().crossVectors(toT, up);
    const mid = P.clone().add(A).multiplyScalar(0.5), mUp = upAt(mid);
    const across = flat(A.clone().sub(P), mUp), mSide = new THREE.Vector3().crossVectors(across, mUp);
    const gap = P.distanceTo(A);
    const candidates = [];
    const sz = shot.size ?? 1;
    for (const side of [1, -1]) for (const k of [1, 0.75, 0.55]) for (const lift of [0, 0.9, 2]) {
      const at = (o, back, sideOff, h) => o.clone().addScaledVector(toT, back * k * sz).addScaledVector(right, sideOff * side * sz).addScaledVector(up, h * sz + lift);
      switch (shot.cam) {
        case 'overShoulder': candidates.push({ from: at(S, -2.8, 0.9, 1.9), to: at(S, -2.2, 0.8, 1.8), look: T.clone().addScaledVector(upAt(T), 1.0) }); break;
        case 'medium': candidates.push({ from: at(S, 4.5, 1.2, 1.3), to: at(S, 3.6, 0.9, 1.2), look: S.clone().addScaledVector(up, 0.8 * sz) }); break;
        case 'closeUp': candidates.push({ from: at(S, 2.3, 0.5, 1.1), to: at(S, 1.9, 0.4, 1.1), look: S.clone().addScaledVector(up, 1.0 * sz) }); break;
        case 'twoShot':
          // both characters side by side: orbit the pair at several angles until there's a clear view
          for (const deg of [90, 65, 115, 45, 135]) {
            const r = THREE.MathUtils.degToRad(deg), d = gap * (0.8 + 0.3 * (2 - k));
            const dir = across.clone().multiplyScalar(Math.cos(r)).addScaledVector(mSide, side * Math.sin(r));
            candidates.push({
              from: mid.clone().addScaledVector(dir, d).addScaledVector(mUp, 1.5 + lift * 0.6),
              to: mid.clone().addScaledVector(dir, d * 0.9).addScaledVector(mUp, 1.4 + lift * 0.6),
              look: mid.clone().addScaledVector(mUp, 0.9) });
          }
          break;
      }
    }
    // a two-shot that can't find room falls back to looking over the player's shoulder at the alien (still shows both)
    if (shot.cam === 'twoShot') {
      const pUp = upAt(P), pTo = flat(A.clone().sub(P), pUp), pRight = new THREE.Vector3().crossVectors(pTo, pUp);
      for (const side of [1, -1]) for (const back of [3.2, 2.4]) candidates.push({
        from: P.clone().addScaledVector(pTo, -back).addScaledVector(pRight, 1.4 * side).addScaledVector(pUp, 2.0),
        to: P.clone().addScaledVector(pTo, -back + 0.4).addScaledVector(pRight, 1.3 * side).addScaledVector(pUp, 1.9),
        look: mid.clone().addScaledVector(mUp, 0.9) });
    }
    // a two-shot must keep its distance from both characters and have both in frame
    const bodies = [P, A].map(b => b.clone().addScaledVector(upAt(b), 1.0));
    const unblocked = (c) => bodies.every(b => {
      if (b.distanceTo(c.look) < 1.2) return true;                       // that's who we're looking at
      for (const from of [c.from, c.to]) {
        if (from.distanceTo(b) < 3.2) return false;                         // too close: they'd fill the foreground
        const d = c.look.clone().sub(from), t = THREE.MathUtils.clamp(b.clone().sub(from).dot(d) / d.lengthSq(), 0, 1);
        if (t > 0.02 && from.clone().addScaledVector(d, t).distanceTo(b) < 1.1) return false;   // bodies + horns
      }
      return true;
    });
    const framesBoth = (c) => {
      if (!unblocked(c)) return false;
      if (shot.cam !== 'twoShot') return true;
      const toP = P.clone().sub(c.from), toA = A.clone().sub(c.from);
      const sep = toP.angleTo(toA);
      return toP.length() > 2.6 && toA.length() > 2.6 && sep < THREE.MathUtils.degToRad(50) && sep > THREE.MathUtils.degToRad(14)   // both in frame, side by side
        && this.lineClear(c.from, P.clone().addScaledVector(upAt(P), 1)) && this.lineClear(c.from, A.clone().addScaledVector(upAt(A), 0.9));
    };
    for (const c of candidates) if (framesBoth(c) && this.isClear(c.from) && this.isClear(c.to) && this.lineClear(c.from, c.look) && this.lineClear(c.to, c.look)) return c;
    // fallback: high up on the side the subject is facing (behind the player, in front of anyone else)
    const high = S.clone().addScaledVector(toT, (shot.subject === 'player' ? -4.5 : 4.5) * sz).addScaledVector(up, 3.2 * sz);
    return { from: high, to: high.clone().addScaledVector(up, -0.5), look: S.clone().addScaledVector(up, 0.8 * sz) };
  }

  updateCutscene(dt) {
    const c = this.cine;
    if (!c) return;
    const p = this.player;
    c.t += dt;
    const shot = c.shots[c.i];
    // the astronaut keeps looking at whatever is happening
    const A = this.focusPos(shot).normalize();
    p.aim(towards(p.up, A), 0.3);
    const f = c.frame;
    if (f.follow) {
      const P = p.pos, up = p.up.clone();
      const Apos = A.clone().multiplyScalar(this.R);
      const toA = Apos.clone().sub(P).addScaledVector(up, -Apos.clone().sub(P).dot(up)).normalize();
      const right = new THREE.Vector3().crossVectors(toA, up);
      const look = Apos.clone().addScaledVector(A, 0.8);
      if (!f.pos) {   // choose once, then hold (a steady shot reads better than a jittery one)
        for (const [back, side, h] of [[-2.8, 1.0, 2.0], [-2.8, -1.0, 2.0], [-2.0, 0.8, 3.0], [-1.5, 0, 4.5]]) {
          const pos = P.clone().addScaledVector(toA, back).addScaledVector(right, side).addScaledVector(up, h);
          if (this.isClear(pos) && this.lineClear(pos, look)) { f.pos = pos; break; }
        }
        f.pos ??= P.clone().addScaledVector(up, 5);
      }
      c.cam.pos.lerp(f.pos, c.t < 0.05 ? 1 : 1 - Math.exp(-6 * dt));
      c.cam.look.lerp(look, c.t < 0.05 ? 1 : 1 - Math.exp(-4 * dt));
    } else {
      const k = Math.min(1, c.t / shot.dur), e = k * k * (3 - 2 * k);
      c.cam.pos.lerpVectors(f.from, f.to, e);
      c.cam.look.copy(f.look);
    }
    c.cam.up.copy(c.cam.look).normalize();
    if (c.t >= shot.dur) this.nextShot();
  }

  endCutscene() {
    const c = this.cine;
    if (!c) return;
    this.removeAlien();
    this.player.mode = this.handMode();   // whatever is in hand now (a cutscene may have handed you something)
    this.player.lockTimer = 0;
    if (this.gun) this.gun.visible = this.equipped === 'rifle' && !!this.gunGrip?.done && !this.carrying;
    document.body.classList.remove('cinematic');
    this.cine = null;
    const cs = this.cs;
    if (cs?.after) this.say(cs.after, { interrupt: true });
    this.emit('cutsceneEnd:' + this.csName);
    if (this.cineQueue.length) this.startCutscene(this.cineQueue.shift());
  }

  // skipping still fires the events of the shots you skipped (they may open doors, land ships, start avalanches…)
  skipCutscene() {
    const c = this.cine;
    if (!c) return;
    for (let i = c.i + 1; i < c.shots.length; i++) {
      const s = c.shots[i];
      if (s.emit) this.emit(s.emit);
      for (const [name, anim] of Object.entries(s.act ?? {})) this.actors[name]?.(anim);
    }
    this.endCutscene();
  }

  puff(at) {
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: '#d8b090', transparent: true, depthWrite: false }));
      s.position.copy(at);
      const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(3);
      this.scene.add(s);
      this.fx.push({ obj: s, t: 0, life: 0.8, update: (dt, k) => { s.position.addScaledVector(vel, dt); s.scale.setScalar(1 + k * 2); s.material.opacity = 0.7 * (1 - k); } });
    }
  }

  // ── events from main ──────────────────────────────────────────────────────
  onZoneEnter() {}

  // (unused) remember the last spot that was safe to stand on. Deaths now send you back to the level start
  // (this.checkpoint is set once, in the constructor, from the player's spawn point).
  trackSafeSpot(dt) {
    const p = this.player;
    this.safeTimer = (this.safeTimer ?? 0) - dt;
    if (this.safeTimer > 0 || this.dying > 0 || !p.grounded || p.alt > 0.1) return;
    this.safeTimer = 0.5;
    const nearHazard = this.hazards.some(h => this.surfDist(p.up, h.dir) < (h.type === 'lava' ? h.radius + 1.5 : 2.5 * (h.size ?? 1)));
    if (!nearHazard) this.checkpoint = { dir: p.up.clone(), facing: p.facing.clone() };
  }

  onAllCells() { this.emit('allCells'); }

  nearTerminal() {
    return this.terminals.find(t => !t.done && this.surfDist(this.player.up, t.dir) < 2.6);
  }

  // E key. Returns true if it did something.
  interact() {
    if (this.dying > 0) return false;
    const term = !this.carrying && this.nearTerminal();
    if (term) {
      if (term.requires && !this.flags[term.requires]) { if (term.lockedLine) this.say(term.lockedLine); return true; }
      this.onTerminal?.(term);
      return true;
    }
    if (this.carrying) { this.putDown(); return true; }
    const it = this.nearestPickable();
    if (it) { this.pickUp(it); return true; }
    return false;
  }

  prompt() {
    if (this.dying > 0) return null;
    const term = !this.carrying && this.nearTerminal();
    if (term) return term.prompt ?? 'Use the console';
    if (this.carrying) {
      if (this.nearSocket(this.carrying.kind)) return `Insert ${this.carrying.type.label ?? 'energy cell'}`;
      const t = this.dropTarget(this.carrying);
      return t?.on ? 'Stack crate' : 'Put down';
    }
    const it = this.nearestPickable();
    return it ? `Pick up ${it.type.label ?? (it.kind === 'powercell' ? 'energy cell' : it.kind)}` : null;
  }

  hintDir() {
    const key = this.level.hintTarget?.({ ...this.status() });
    if (!key || key === 'cell') return null;
    if (key === 'socket') return this.sockets.find(s => !s.filled)?.dir ?? null;
    if (key.startsWith('zone:')) return this.ctx.zoneById[key.slice(5)]?.dir ?? null;
    if (key.startsWith('anchor:')) return this.anchors[key.slice(7)]?.().normalize() ?? null;
    if (key.startsWith('breakable:')) return this.breakables.find(b => b.id === key.slice(10))?.dir ?? null;
    const kind = key.split(':')[1];
    const list = this.items.filter(i => i.kind === kind && i.state === 'ground');
    list.sort((a, b) => a.dir.angleTo(this.player.up) - b.dir.angleTo(this.player.up));
    return list[0]?.dir ?? null;
  }

  die(line = this.level.dialogue.events.lavaDeath) {
    if (this.dying > 0) return;
    this.dying = 1.8;
    this.player.playOnce('Death', 1.8);
    if (this.carrying) this.returnHome(this.carrying);
    if (line) this.sayOnce('death:' + line, line);
  }

  // ── per frame ─────────────────────────────────────────────────────────────
  update(dt, t) {
    const p = this.player, ev = this.level.dialogue.events;
    this.hitCooldown -= dt;
    this.shootCooldown -= dt;
    const fade = document.getElementById('fade');

    // death → fade → respawn at checkpoint
    if (this.dying > 0) {
      this.dying -= dt;
      if (fade) fade.style.opacity = THREE.MathUtils.clamp((1.8 - this.dying - 0.9) / 0.6, 0, 1);
      if (this.dying <= 0) {
        if (this.breachFall) {   // a breach: back to its safe edge, not the start of the level
          const h = this.breachFall, at = this.ctx.resolve(h.respawn);
          this.breachFall = null;
          p.spawn(at, towards(at, h.dir));
          this.camFwd.copy(p.facing);
        } else {
          p.spawn(this.checkpoint.dir, this.checkpoint.facing);
          this.camFwd.copy(this.checkpoint.facing);
          this.emit('respawn');
        }
        if (fade) fade.style.opacity = 0;
      }
    }

    // items: bob/spin, auto-equip
    const chest = _v.copy(p.pos).addScaledVector(p.up, 0.9);
    for (const it of this.items) {
      if (it.beam) it.beam.material.opacity = 0.16 + Math.sin(t * 3) * 0.05;
      if (it.state !== 'ground') continue;
      if (it.type.float) it.obj.userData.inner.rotation.y += dt * 1.5;
      if (it.type.equip && it.obj.getWorldPosition(_w).distanceTo(chest) < 1.7) this.equip(it);
    }

    // sockets pulse while empty
    for (const s of this.sockets) if (!s.filled) s.light.intensity = 3 + Math.sin(t * 4) * 2;

    // fields
    for (const f of this.fields) {
      f.mat.uniforms.time.value = t;
      if (f.open) {
        f.fade = Math.max(0, f.fade - dt);
        f.mat.uniforms.opacity.value = f.fade;
        f.mesh.visible = f.fade > 0;
      } else if (this.surfDist(p.up, f.center) < 6) this.sayOnce('fieldClosed', ev.fieldClosed);
    }

    // hazards
    for (const h of this.hazards) {
      if (h.type === 'breach') {
        h.mat.uniforms.time.value = t;
        const d = this.surfDist(p.up, h.dir);
        if (p.alt < 0.3 && d > h.inner + 0.25 && d < h.outer - 0.25 && !this.cinematic && this.dying <= 0) this.fallThroughBreach(h);
        continue;
      }
      if (h.type === 'lava') {
        h.mat.emissiveIntensity = 1.4 + Math.sin(t * 2 + h.phase) * 0.35;
        if (p.alt < 0.3 && this.surfDist(p.up, h.dir) < h.radius * 0.8) this.die();
        continue;
      }
      const ph = ((t / h.period + h.offset) % 1) * h.period;
      const activeAt = h.period - h.active, warnAt = activeAt - h.warn;
      h.state = ph >= activeAt ? 'active' : ph >= warnAt ? 'warn' : 'idle';
      const k = h.state === 'active' ? Math.min(1, (ph - activeAt) / 0.15) * Math.min(1, (h.period - ph) / 0.25) : 0;
      h.column.scale.set(1, Math.max(0.01, k), 1);
      h.column.position.y = 4.5 * k;
      h.column.material.opacity = 0.5 * k;
      h.glow.material.color.setHSL(0.06, 1, h.state === 'warn' ? 0.5 + Math.sin(t * 30) * 0.15 : h.state === 'active' ? 0.75 : 0.4);
      const speed = h.state === 'active' ? 12 : h.state === 'warn' ? 1.8 : 0.5;
      for (const s of h.puffs) {
        s.userData.life += dt * (h.state === 'active' ? 2.2 : 0.7);
        if (s.userData.life > 1) s.userData.life = 0;
        const l = s.userData.life;
        s.position.set(0, 0.4 + l * speed * (h.state === 'active' ? 0.7 : 1.2), 0).addScaledVector(s.userData.drift, l);
        s.scale.setScalar((h.state === 'active' ? 1.5 : 0.6) + l * 2);
        s.material.opacity = (h.state === 'idle' ? 0.12 : 0.5) * (1 - l);
      }
      if (h.state === 'active' && this.hitCooldown <= 0 && this.dying <= 0 && p.alt < 7 * h.size && this.surfDist(p.up, h.dir) < 1.4 * h.size) {
        this.hitCooldown = 1.2;
        let away = p.up.clone().multiplyScalar(this.R).sub(h.dir.clone().multiplyScalar(this.R));
        away.addScaledVector(p.up, -away.dot(p.up));
        if (away.lengthSq() < 1e-4) away = p.facing.clone().negate();
        away.normalize();
        // thrown back the way you came (not sideways into lava)
        const back = p.vel.clone().addScaledVector(p.up, -p.vel.dot(p.up));
        if (back.lengthSq() > 0.25) away.copy(back.normalize().negate());
        p.vy = 10;
        p.grounded = false;
        p.vel.copy(away).multiplyScalar(6);
        p.playOnce('HitRecieve', 0.5);
        if (this.carrying) this.dropForced();
        this.sayOnce('geyserHit', ev.geyserHit);
      }
    }

    // breakables
    for (const b of this.breakables) {
      if (b.broken) {
        for (const part of b.parts) {
          if (!part.visible) continue;
          const v = part.userData.vel;
          v.y -= 14 * dt;
          part.position.addScaledVector(v, dt);
          part.rotation.x += part.userData.spin.x * dt;
          part.rotation.z += part.userData.spin.z * dt;
          part.scale.multiplyScalar(1 - dt * 1.2);
          if (part.scale.x < 0.02) part.visible = false;
        }
        continue;
      }
      b.flash = Math.max(0, b.flash - dt * 4);
      for (const part of b.parts) part.traverse(o => { if (o.isMesh && o.material.emissive) o.material.emissiveIntensity = 0.55 + b.flash * 3; });
      b.group.position.copy(b.dir).multiplyScalar(this.R).addScaledVector(p.facing, Math.sin(t * 60) * 0.05 * b.flash);
      if (!this.flags.rifle && this.surfDist(p.up, b.dir) < 4.5) this.sayOnce('shellNoGun', ev.shellNoGun);
    }

    // tower beacon blinks; brighter once the outpost has power
    if (this.beacon) {
      const on = Math.sin(t * 3) > 0.3;
      this.beacon.visible = on || !this.beacon.userData.powered;
      this.beacon.children[0].intensity = this.beacon.userData.powered && on ? 40 : 0;
    }

    // sliding doors
    for (const d of this.world.doors ?? []) {
      const locked = d.lockedUntil && !d.unlocked;
      const near = this.surfDist(p.up, d.dir) < 4.2;
      if (locked && near) this.sayOnce('locked:' + d.lockTag, this.level.dialogue.events.doorLocked);
      d.open += ((near && !locked ? 1 : 0) - d.open) * Math.min(1, dt * 6);
      d.obj.position.copy(d.base).addScaledVector(d.slide, d.open * 1.75);
    }
    this.updateAlien(dt);
    // low gravity areas (eases in and out so jumps don't snap)
    const lg = this.lowGravity.find(g => this.surfDist(p.up, g.dir) < g.radius);
    const want = lg ? lg.scale : 1;
    p.gravityScale += (want - p.gravityScale) * Math.min(1, dt * 3);
    if (lg && lg.line) this.sayOnce('lowg:' + lg.radius, lg.line);
    this.updateCutscene(dt);
    this.alignGun();
    this.holdCarried();

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      f.update?.(dt, k);
      if (k >= 1) { this.scene.remove(f.obj); this.fx.splice(i, 1); }
    }
  }
}
