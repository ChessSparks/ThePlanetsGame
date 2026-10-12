import * as THREE from 'three';
import { placeOnSurface } from './world.js';
import { modelInstance, towards, soft } from './mechanics.js';
import {
  makePortal, makeIceArch, makeIceWall, makeIceShell, makeLever, makeSnowMound, makeThinIceSheet, makeWarmVent, makeHeater,
  makeBeaconTower, makeIceSheet, makeSnowfall, makeAurora, makeIcicles, buildStructures, ICE,
} from './generated.js';

// Planet 4 systems: warmth (cold meter + heat sources), slippery ice, meltable ice, ice gates,
// frozen levers and thin ice, consoles, the beacon + ship pickup, and the avalanche escape.
// Everything is driven by `level.frost`; a level without it gets none of this.

const $ = (id) => document.getElementById(id);
const GLOW = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };

export class Frost {
  constructor({ scene, ctx, level, gltfs, world, player, mech, camFwd, say }) {
    Object.assign(this, { scene, ctx, level, gltfs, world, player, mech, camFwd, say });
    this.R = ctx.R;
    this.F = level.frost;
    this.updaters = [];
    this.fx = [];
    this.heat = [];          // { dir, radius, on() }
    this.warmth = 100;
    this.warned = {};

    // sky + weather
    this.aurora = makeAurora();
    scene.add(this.aurora.mesh);
    this.snow = makeSnowfall();
    scene.add(this.snow.group);

    // generated structures (arches, spikes, vents, arrival portal…)
    const builders = {
      iceArch: makeIceArch, warmVent: makeWarmVent, portalRing: (s) => { const p = makePortal(s.radius ?? 2.2); p.setActive(true); return p; },
      iceSpikes: (s) => { const ic = makeIcicles({ count: s.count ?? 6, length: s.length ?? 2.2, spread: s.spread ?? 1.6 }); ic.group.rotation.x = Math.PI; return { group: wrap(ic.group), colliders: [{ x: 0, z: 0, r: 0.7, h: Infinity }] }; },
    };
    const wrap = (g) => { const w = new THREE.Group(); w.add(g); return w; };
    this.made = buildStructures({ scene, ctx, mech, list: this.F.structures, builders, updaters: this.updaters, place: (o, at, yaw) => this.place(o, at, yaw) });
    for (const s of this.F.structures ?? []) if (s.type === 'warmVent') this.heat.push({ dir: ctx.resolve(s.at), radius: s.heatRadius ?? 3.2, on: () => true });

    for (const l of this.F.lanterns ?? []) this.makeLantern(l);
    for (const a of this.F.iceAreas ?? []) this.makeIceArea(a);
    this.melts = (this.F.melt ?? []).map(m => this.makeMeltable(m));
    if (this.F.heater) this.makeStationHeater(this.F.heater);
    if (this.F.beacon) this.makeBeacon(this.F.beacon);
    this.consoles = (this.F.consoles ?? []).map(c => this.makeConsole(c));
    if (this.F.levers) this.makeLevers(this.F.levers);
    if (this.F.thinIce) this.makeThinIce(this.F.thinIce);
    for (const [name, spec] of Object.entries(this.F.anchors ?? {})) {
      const d = ctx.resolve(spec.at ?? spec);
      mech.anchors[name] = () => d.clone().multiplyScalar(this.R + (spec.alt ?? 1));
    }
    this.setupShip();
    if (this.F.avalanche) this.setupAvalanche(this.F.avalanche);

    mech.targets.push(() => this.melts.filter(m => !m.gone).map(m => ({
      center: m.center, radius: m.radius,
      hit: (pt) => this.hitIce(m, pt),
    })));
    mech.on('respawn', () => { this.warmth = 100; this.warned = {}; });
    mech.on('portalClose', () => this.closePortal());
    $('warmth')?.classList.remove('hidden');
  }

  // ── placement helpers ────────────────────────────────────────────────────
  place(obj, spec, yawDeg) {
    const dir = this.ctx.resolve(spec);
    let yaw = THREE.MathUtils.degToRad(yawDeg ?? 0);
    if (spec.face) {   // turn the object's +Z toward a zone
      const target = this.ctx.zoneById[spec.face]?.dir;
      if (target) {
        const probe = new THREE.Object3D();
        placeOnSurface(probe, dir, this.R, 0);
        const local = probe.worldToLocal(target.clone().multiplyScalar(this.R));
        yaw = Math.atan2(local.x, local.z);
      }
    }
    placeOnSurface(obj, dir, this.R - (spec.sink ?? 0), yaw);
    this.scene.add(obj);
    return dir;
  }

  // a wall-like thing across a path: centred at `at`, spanning sideways relative to the direction to `facing`
  placeAcross(obj, spec) {
    const dir = this.ctx.resolve(spec.at);
    const f = towards(dir, this.ctx.zoneById[spec.facing].dir);
    const side = new THREE.Vector3().crossVectors(f, dir);
    obj.position.copy(dir).multiplyScalar(this.R);
    obj.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(side, dir, f.clone().negate()));
    this.scene.add(obj);
    return { dir, side, f };
  }

  surfDist(a, b) { return a.angleTo(b) * this.R; }

  // ── heat ─────────────────────────────────────────────────────────────────
  makeLantern(spec) {
    const obj = modelInstance(this.gltfs[this.F.lanternModel], spec.scale ?? 1.6);
    const dir = this.place(obj, spec.at);
    const light = new THREE.PointLight('#ffb05a', 9, 9, 1.6);
    light.position.y = 1.2;
    obj.add(light);
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: '#ffb05a', ...GLOW, opacity: 0.5 }));
    halo.position.y = 1.1;
    halo.scale.setScalar(1.6);
    obj.add(halo);
    this.mech.addCollider({ dir: dir.clone(), r: 0.35, h: Infinity, tag: 'lantern' });
    this.heat.push({ dir, radius: spec.radius ?? 3.6, on: () => true });
    this.updaters.push((dt, t) => { light.intensity = 8 + Math.sin(t * 9 + dir.x * 10) * 0.8; });
  }

  makeStationHeater(spec) {
    const h = makeHeater();
    const dir = this.place(h.group, spec.at, spec.yaw);
    h.group.updateMatrixWorld(true);
    this.mech.addCollider({ dir: dir.clone(), r: 0.8, h: 1.6, stand: true, tag: 'heater' });
    this.mech.anchors.heater = () => dir.clone().multiplyScalar(this.R + 1);
    const zoneDir = this.ctx.resolve(spec.zoneCenter ?? spec.at);
    this.heat.push({ dir: zoneDir, radius: spec.radius ?? 14, on: () => !!this.mech.flags.heatOn });
    this.mech.on(spec.onEvent ?? 'melted:heaterIce', () => { h.setOn(true); this.mech.emit('heatOn'); });
  }

  warmthAt(up) {
    return this.heat.some(h => h.on() && this.surfDist(up, h.dir) < h.radius);
  }

  // ── slippery ice ─────────────────────────────────────────────────────────
  makeIceArea(spec) {
    const dir = this.ctx.resolve(spec.at ?? { zone: spec.zone });
    const sheet = makeIceSheet(this.R, spec.radius);
    sheet.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
    this.scene.add(sheet);
    (this.iceAreas ??= []).push({ dir, radius: spec.radius, traction: spec.traction ?? 0.14 });
  }

  // ── meltable ice (walls, shells around things) and unmeltable gates ──────
  makeMeltable(spec) {
    let made, dir, center, radius;
    if (spec.kind === 'shell') {
      made = makeIceShell({ size: spec.size ?? 1.6 });
      dir = this.place(made.group, spec.at);
      made.group.updateMatrixWorld(true);
      center = made.group.localToWorld(made.center.clone());
      radius = (spec.size ?? 1.6) * 0.8;
      this.mech.addCollider({ dir: dir.clone(), r: (spec.size ?? 1.6) * 0.6, h: Infinity, tag: 'ice:' + spec.id });
    } else {
      made = makeIceWall({ width: spec.width ?? 7, height: spec.height ?? 3.6 });
      const b = this.placeAcross(made.group, spec);
      dir = b.dir;
      made.group.updateMatrixWorld(true);
      center = made.group.localToWorld(made.center.clone());
      radius = (spec.width ?? 7) * 0.45;
      for (const c of made.colliders) {
        const d = made.group.localToWorld(new THREE.Vector3(c.x, 0, c.z)).normalize();
        this.mech.addCollider({ dir: d, r: c.r, h: c.h, tag: 'ice:' + spec.id });
      }
    }
    const m = { ...spec, made, dir, center, radius, hp: spec.hp ?? null, maxHp: spec.hp ?? 1, melt: 0, melting: false, gone: false };
    if (spec.encases) {
      const it = this.mech.items.find(i => i.id === spec.encases);
      if (it) { it.locked = true; m.item = it; }
    }
    if (spec.opensOn) this.mech.on(spec.opensOn, () => this.startMelt(m));
    if (spec.anchor) this.mech.anchors[spec.anchor] = () => center.clone();
    return m;
  }

  hitIce(m, pt) {
    if (m.gone || m.melting) return;
    if (m.hp == null) {   // a gate: too thick to melt
      this.puff(pt, '#e8f6ff', 4);
      if (m.thickLine) this.mech.sayOnce('thick:' + m.id, m.thickLine);
      return;
    }
    m.hp--;
    this.puff(pt, '#ffffff', 5);
    this.steam(pt);
    m.made.melt(0.12 * (1 - m.hp / m.maxHp));
    if (m.hp <= 0) this.startMelt(m);
  }

  startMelt(m) {
    if (m.melting || m.gone) return;
    m.melting = true;
    this.mech.removeColliders('ice:' + m.id);
    for (let i = 0; i < 6; i++) setTimeout(() => this.steam(m.center.clone().add(new THREE.Vector3((Math.random() - 0.5) * 2, 0, (Math.random() - 0.5) * 2))), i * 120);
  }

  // ── the beacon on the peak ───────────────────────────────────────────────
  makeBeacon(spec) {
    const b = makeBeaconTower({ height: spec.height ?? 7 });
    const dir = this.place(b.group, spec.at);
    this.mech.addCollider({ dir: dir.clone(), r: 0.9, h: Infinity, tag: 'beacon' });
    this.updaters.push(b.update);
    this.beacon = { ...b, dir };
    this.mech.anchors.beacon = () => dir.clone().multiplyScalar(this.R + 3);
    this.mech.anchors.beaconTop = () => b.group.localToWorld(b.top.clone());
    this.mech.on('beaconLit', () => b.light());
  }

  // ── the ship stays away until the beacon calls it ────────────────────────
  setupShip() {
    const ship = this.world.dynamic.ship, rec = this.world.byId.ship;
    if (!ship || !rec) return;
    this.ship = { obj: ship, rec, landed: false, t: -1 };
    ship.visible = false;
    this.mech.removeColliders('ship');
    this.mech.anchors.pad = () => rec.dir.clone().multiplyScalar(this.R + 2);
    this.mech.on('shipArrive', () => { this.ship.t = 0; ship.visible = true; });
  }

  updateShip(dt) {
    const s = this.ship;
    if (!s || s.t < 0 || s.landed) return;
    s.t += dt;
    const k = Math.min(1, s.t / 4.5), e = 1 - Math.pow(1 - k, 3);
    const h = (1 - e) * 45;
    s.obj.position.copy(s.rec.dir).multiplyScalar(this.R - s.rec.sink + h);
    if (k >= 1) {
      s.landed = true;
      this.mech.addCollider({ dir: s.rec.dir.clone(), r: 3.4, h: Infinity, tag: 'ship' });
      this.puff(s.obj.position.clone(), '#f2f7ff', 14);
    }
  }

  closePortal() {
    const p = this.made.arrivalPortal;
    if (!p) return;
    let k = 0;
    this.updaters.push((dt) => { if (k >= 1) return; k = Math.min(1, k + dt * 0.33); p.group.scale.setScalar(Math.max(0.01, 1 - k)); if (k >= 1) p.group.visible = false; });
    this.mech.removeColliders('arrivalPortal');
  }

  // ── consoles (crew logs) ───────────────────────────────
  makeConsole(spec) {
    const rec = this.world.byId[spec.prop];
    const dir = rec ? rec.dir.clone() : this.ctx.resolve(spec.at);
    if (spec.anchor) this.mech.anchors[spec.anchor] = () => dir.clone().multiplyScalar(this.R + 1.2);
    const screen = new THREE.PointLight('#5cf', 4, 4, 2);
    screen.position.copy(dir).multiplyScalar(this.R + 1.6);
    this.scene.add(screen);
    return { ...spec, dir, used: false };
  }

  nearConsole() {
    return this.consoles.find(c => !(c.once && c.used) && (!c.requires || this.mech.flags[c.requires]) && this.surfDist(this.player.up, c.dir) < 2.4);
  }

  // ── Mirror Lake: frozen levers + thin ice ────────────────────────────────
  // Each lever is frozen in a block of ice (a `melt` shell). Melt it, then pull it (E). All pulled → onSolved.
  makeLevers(L) {
    this.levers = L.levers.map((spec, i) => {
      const lv = makeLever();
      const dir = this.place(lv.group, spec.at, spec.yaw ?? 0);
      const mound = makeSnowMound(2.2);
      this.place(mound, spec.at);
      this.mech.addCollider({ dir: dir.clone(), r: 0.45, h: Infinity, tag: 'lever' });
      return { ...spec, ...lv, dir, i, pulled: false, pull: 0 };
    });
    this.leverSpec = L;
    this.mech.anchors.nextLever = () => {
      const left = this.levers.filter(l => !l.pulled);
      left.sort((a, b) => a.dir.angleTo(this.player.up) - b.dir.angleTo(this.player.up));
      return (left[0] ?? this.levers[0]).dir.clone().multiplyScalar(this.R + 1);
    };
  }

  leverFree(l) { return !l.ice || this.mech.flags['melted:' + l.ice]; }

  nearLever() {
    return this.levers?.find(l => !l.pulled && this.surfDist(this.player.up, l.dir) < 2.2);
  }

  pullLever(l) {
    if (!this.leverFree(l)) { this.mech.sayOnce('leverFrozen', this.F.lines?.leverFrozen); return; }
    l.pulled = true;
    this.player.playOnce('Interact', 0.8);
    const n = this.levers.filter(x => x.pulled).length;
    this.mech.emit('lever:' + n);
    if (n === this.levers.length) this.mech.emit(this.leverSpec.onSolved ?? 'leversDone');
    else this.say((this.F.lines?.leverPulled ?? '{n} of {total} levers.').replace('{n}', n).replace('{total}', this.levers.length));
  }

  // dark patches that crack while you stand on them; stay too long and you fall in (climb out at the shore, colder)
  makeThinIce(T) {
    this.thin = T.patches.map(spec => {
      const dir = this.ctx.resolve(spec.at);
      const sheet = makeThinIceSheet(this.R, spec.radius);
      sheet.mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir);
      this.scene.add(sheet.mesh);
      return { ...spec, dir, sheet, crack: 0 };
    });
    this.thinSpec = T;
    this.fall = null;
  }

  updateThinIce(dt) {
    if (!this.thin) return;
    const p = this.player;
    for (const t of this.thin) {
      const on = !this.fall && !this.mech.cinematic && p.alt < 0.3 && this.surfDist(p.up, t.dir) < t.radius;
      t.crack = on ? t.crack + dt / (this.thinSpec.breakTime ?? 1.0) : Math.max(0, t.crack - dt * 0.6);
      t.sheet.setCrack(Math.min(1, t.crack));
      if (on && t.crack > 0.35) this.mech.sayOnce('thinIce', this.F.lines?.thinIce);
      if (on && t.crack >= 1) this.fallThrough(t);
    }
    if (this.fall) {
      this.fall.t += dt;
      p.vel.set(0, 0, 0);
      p.alt = -1.6 * Math.min(1, this.fall.t / 0.4);   // sink into the water
      const fade = $('fade');
      if (fade) fade.style.opacity = THREE.MathUtils.clamp((this.fall.t - 0.3) / 0.4, 0, 1);
      if (this.fall.t > 1.2) {
        const shore = this.ctx.resolve(this.thinSpec.shore);
        p.spawn(shore, towards(shore, this.ctx.zoneById[this.thinSpec.zone].dir));
        this.camFwd.copy(p.facing);
        if (fade) fade.style.opacity = 0;
        this.fall = null;
      }
    }
  }

  fallThrough(t) {
    this.fall = { t: 0 };
    t.crack = 0;
    this.warmth = Math.max(5, this.warmth - (this.thinSpec.warmthLoss ?? 35));
    const at = this.player.pos.clone();
    this.puff(at, '#cfe8ff', 12, 1.3);
    this.player.playOnce('HitRecieve', 0.6);
    this.say(this.F.lines?.fell);
  }

  // ── avalanche ────────────────────────────────────────────────────────────
  setupAvalanche(A) {
    const from = this.ctx.zoneById[A.from].dir.clone(), to = this.ctx.zoneById[A.to].dir.clone();
    const axis = new THREE.Vector3().crossVectors(from, to).normalize();
    const L = from.angleTo(to) * this.R;
    const group = new THREE.Group();
    group.visible = false;
    this.scene.add(group);
    const chunks = [];
    const W = A.width ?? 22;
    for (let i = 0; i < 46; i++) {
      const size = 1.2 + Math.random() * 2.4;
      const m = new THREE.Mesh(new THREE.IcosahedronGeometry(size, 0), ICE.snowMat);
      m.castShadow = true;
      const x = (Math.random() * 2 - 1) * W, z = Math.random() * 10;
      const y = size * 0.6 + Math.random() * (7 - Math.abs(x) / W * 4) * (1 - z / 14);
      m.userData = { x, y, z, spin: new THREE.Vector3(Math.random(), Math.random(), Math.random()).multiplyScalar(3) };
      group.add(m);
      chunks.push(m);
    }
    for (let i = 0; i < 40; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: '#f4f8ff', transparent: true, depthWrite: false, opacity: 0.75 }));
      const sc = 5 + Math.random() * 6;
      s.scale.setScalar(sc);
      s.userData = { x: (Math.random() * 2 - 1) * W * 1.1, y: 2 + Math.random() * 8, z: -1 + Math.random() * 12, sprite: true, phase: Math.random() * 6 };
      group.add(s);
      chunks.push(s);
    }
    const startDir = this.ctx.resolve(A.runStart);
    this.av = { A, from, to, axis, L, group, chunks, s: -(A.startBack ?? 14), speed: 0, state: 'idle', startDir, delay: 0 };
    this.mech.anchors.avalanche = () => this.avFrontPos(this.av.s).addScaledVector(this.avFrontDir(this.av.s), 5);
    this.mech.on(A.showOn ?? 'avalancheShow', () => { this.av.group.visible = true; this.placeAvalanche(); });
    this.mech.on(A.startOn ?? 'avalancheStart', () => this.startAvalanche());
    this.mech.on('respawn', () => {
      if (this.av.state !== 'running') return;
      this.av.s = -(A.startBack ?? 14);
      this.av.speed = 0;
      this.av.delay = 1.6;   // a moment to get your bearings before it comes again
      this.placeAvalanche();
    });
  }

  avFrontDir(s) { return this.av.from.clone().applyAxisAngle(this.av.axis, s / this.R); }
  avFrontPos(s) { return this.avFrontDir(s).multiplyScalar(this.R); }

  // along-path and sideways distance of a point on the planet
  avCoords(up) {
    const { from, axis } = this.av;
    const lat = Math.asin(THREE.MathUtils.clamp(up.dot(axis), -1, 1)) * this.R;
    const proj = up.clone().addScaledVector(axis, -up.dot(axis)).normalize();
    const s = Math.atan2(new THREE.Vector3().crossVectors(from, proj).dot(axis), from.dot(proj)) * this.R;
    return { s, lat };
  }

  startAvalanche() {
    const av = this.av;
    av.state = 'running';
    av.group.visible = true;
    av.s = -(av.A.startBack ?? 14);
    av.speed = 0;
    av.delay = 0.6;
    const p = this.player;
    this.mech.checkpoint = { dir: av.startDir.clone(), facing: towards(av.startDir, av.to) };
    p.spawn(av.startDir, towards(av.startDir, av.to));
    this.camFwd.copy(p.facing);
    $('avalancheWarn')?.classList.add('show');
  }

  placeAvalanche(t = 0) {
    const av = this.av;
    const up = this.avFrontDir(av.s), fwd = new THREE.Vector3().crossVectors(av.axis, up).normalize();
    const base = up.clone().multiplyScalar(this.R);
    for (const c of av.chunks) {
      const u = c.userData;
      const wob = c.userData.sprite ? Math.sin(t * 2 + u.phase) * 0.6 : 0;
      c.position.copy(base).addScaledVector(av.axis, u.x).addScaledVector(fwd, -u.z + wob).addScaledVector(up, u.y + wob * 0.5);
      if (!u.sprite) { c.rotation.x += u.spin.x * 0.02; c.rotation.z += u.spin.z * 0.02; }
    }
  }

  updateAvalanche(dt, t) {
    const av = this.av;
    if (!av || av.state === 'idle') return;
    const A = av.A, p = this.player;
    if (av.state === 'running') {
      if (av.delay > 0) av.delay -= dt;
      else {
        av.speed = Math.min(A.speed ?? 7.2, av.speed + dt * (A.accel ?? 4));
        av.s += av.speed * dt;
      }
      const me = this.avCoords(p.up);
      const gap = me.s - av.s;
      this.mech.cameraShake = THREE.MathUtils.clamp(1 - gap / 28, 0.15, 1) * 0.35;
      // caught?
      if (gap < 0.8 && Math.abs(me.lat) < (A.width ?? 22) + 4 && this.mech.dying <= 0) this.mech.die(this.F.lines?.buried);
      // safe at the station: the avalanche runs out of steam at the windbreak
      const stationEdge = av.L - this.ctx.zoneById[A.to].radius;
      if (this.surfDist(p.up, av.to) < this.ctx.zoneById[A.to].radius - 1) {
        av.state = 'stopping';
        av.stopAt = Math.min(av.s + 6, stationEdge - 4);
        this.mech.checkpoint = { dir: p.up.clone(), facing: p.facing.clone() };
        $('avalancheWarn')?.classList.remove('show');
        this.mech.emit('escaped');
      }
    } else if (av.state === 'stopping') {
      av.speed = Math.max(0, av.speed - dt * 6);
      av.s = Math.min(av.stopAt, av.s + av.speed * dt);
      this.mech.cameraShake = av.speed / 30;
      if (av.speed <= 0) {
        av.state = 'done';
        this.mech.cameraShake = 0;
        for (const c of av.chunks) if (c.userData.sprite) c.material.opacity = 0.35;
      }
    }
    this.placeAvalanche(t);
    // powder spray
    if (av.state === 'running' && Math.random() < dt * 20) this.puff(this.avFrontPos(av.s).addScaledVector(av.axis, (Math.random() * 2 - 1) * (A.width ?? 22)).addScaledVector(this.avFrontDir(av.s), 1 + Math.random() * 3), '#ffffff', 1, 2.2);
  }

  status() { return { levers: this.levers?.filter(l => l.pulled).length ?? 0, leverTotal: this.levers?.length ?? 0 }; }

  // ── E key / prompts ──────────────────────────────────────────────────────
  interact() {
    if (this.mech.dying > 0) return false;
    const c = this.nearConsole();
    if (c && !this.mech.carrying) {
      c.used = true;
      if (c.cutscene) this.mech.startCutscene(c.cutscene);
      else if (c.lines) this.say(c.lines, { interrupt: true });
      for (const ev of [].concat(c.emit ?? [])) this.mech.emit(ev);
      return true;
    }
    const lv = !this.mech.carrying && this.nearLever();
    if (lv) { this.pullLever(lv); return true; }
    return false;
  }

  prompt() {
    if (this.mech.dying > 0) return null;
    const c = this.nearConsole();
    if (c && !this.mech.carrying) return c.prompt ?? 'Use';
    const lv = !this.mech.carrying && this.nearLever();
    if (lv) return this.leverFree(lv) ? 'Pull the lever' : 'Frozen: melt the ice first';
    return null;
  }

  // ── effects ──────────────────────────────────────────────────────────────
  puff(at, color = '#ffffff', n = 6, size = 1) {
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, transparent: true, depthWrite: false }));
      s.position.copy(at);
      const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(3);
      this.scene.add(s);
      this.fx.push({ obj: s, t: 0, life: 0.9, update: (dt, k) => { s.position.addScaledVector(vel, dt); s.scale.setScalar(size * (1 + k * 2)); s.material.opacity = 0.7 * (1 - k); } });
    }
  }

  steam(at) {
    const up = at.clone().normalize();
    for (let i = 0; i < 4; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: '#ffffff', transparent: true, depthWrite: false, opacity: 0.6 }));
      s.position.copy(at).add(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).multiplyScalar(0.8));
      this.scene.add(s);
      this.fx.push({ obj: s, t: 0, life: 1.4, update: (dt, k) => { s.position.addScaledVector(up, dt * 1.8); s.scale.setScalar(0.6 + k * 2.2); s.material.opacity = 0.55 * (1 - k); } });
    }
  }

  // ── per frame ────────────────────────────────────────────────────────────
  update(dt, t) {
    const p = this.player, F = this.F;
    for (const u of this.updaters) u(dt, t);
    this.aurora.update(t);
    this.snow.update(dt, t, p.pos, p.up);

    // ice under your feet
    const onIce = (this.iceAreas ?? []).find(a => this.surfDist(p.up, a.dir) < a.radius);
    p.traction = onIce && p.alt < 0.3 ? onIce.traction : 1;

    // warmth
    const paused = this.mech.cinematic || this.mech.dying > 0 || this.av?.state === 'running' || this.av?.state === 'stopping' || this.av?.state === 'done';
    if (!paused) {
      const zone = this.ctx.zoneAt(p.up)?.id;
      if (this.warmthAt(p.up)) this.warmth = Math.min(100, this.warmth + dt * 30);
      else this.warmth -= dt * (F.cold.zoneDrain?.[zone] ?? F.cold.drain);
      if (this.warmth > 80) this.warned = {};
      if (this.warmth < 40 && !this.warned.a) { this.warned.a = true; this.say(F.lines?.cold40); }
      if (this.warmth < 15 && !this.warned.b) { this.warned.b = true; this.say(F.lines?.cold15); }
      if (this.warmth <= 0) { this.warmth = 0; this.mech.die(F.lines?.frozen); }
    }
    const fill = $('warmthFill');
    if (fill) fill.style.width = `${Math.max(0, this.warmth)}%`;
    $('warmth')?.classList.toggle('low', this.warmth < 30);
    const frost = $('frostOverlay');
    if (frost) frost.style.opacity = Math.pow(1 - Math.max(0, this.warmth) / 100, 1.6).toFixed(3);

    // melting ice
    for (const m of this.melts) {
      if (!m.melting || m.gone) continue;
      m.melt = Math.min(1, m.melt + dt * 0.9);
      m.made.melt(m.melt);
      if (m.melt >= 1) {
        m.gone = true;
        if (m.item) m.item.locked = false;
        this.mech.emit('melted:' + m.id);
        if (m.meltedLine) this.say(m.meltedLine);
      }
    }

    this.updateThinIce(dt);
    for (const l of this.levers ?? []) if (l.pulled && l.pull < 1) { l.pull = Math.min(1, l.pull + dt * 3); l.setPull(l.pull); }
    this.updateShip(dt);
    this.updateAvalanche(dt, t);

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      f.update?.(dt, k);
      if (k >= 1) { this.scene.remove(f.obj); this.fx.splice(i, 1); }
    }
  }
}
