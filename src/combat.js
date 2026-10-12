import * as THREE from 'three';
import { placeOnSurface } from './world.js';
import { modelInstance, skinnedInstance, towards, soft } from './mechanics.js';
import { makeCampfire, makePortal, makeArch, makeWall, makeDome, makeThorns, makeSporeCloud, makeGlassDome } from './generated.js';

// Planet 3 systems: health, dodge roll, sword, infected aliens (cured, not killed), the boss,
// bounce mushrooms, spore clouds, health packs, villagers you can talk to, thorn walls, the portal exit.
// Everything is driven by the level data; a level without `combat` gets none of it.

const GLOW = { transparent: true, blending: THREE.AdditiveBlending, depthWrite: false };
const _v = new THREE.Vector3();
const $ = (id) => document.getElementById(id);

export class Combat {
  constructor({ scene, ctx, level, gltfs, world, player, mech, camFwd, say, finish }) {
    Object.assign(this, { scene, ctx, level, gltfs, world, player, mech, camFwd, say, finish });
    this.R = ctx.R;
    const C = level.combat;
    this.maxHp = C.playerHp ?? 100;
    this.hp = this.maxHp;
    this.sinceHurt = 99;
    this.roll = player.roll;   // the roll lives in player.js; while it runs you can't be hurt
    this.sword = null;
    this.swing = null;
    this.enemies = [];
    this.projectiles = [];
    this.fx = [];
    this.updaters = [];
    this.curedCount = 0;
    this.encounters = (level.encounters || []).map(e => ({ ...e, wave: -1, done: false, active: false }));

    this.buildStructures();
    this.villagers = (level.villagers || []).map(v => this.makeVillager(v));
    this.pads = (level.pads || []).map(p => this.makePad(p));
    this.spores = (level.spores || []).map(s => this.makeSpores(s));
    this.packs = (level.healthPacks || []).map(h => this.makePack(h));
    this.thorns = (level.thorns || []).map(t => this.makeThornRing(t));
    if (level.portal) this.makePortalExit(level.portal);

    mech.targets.push(() => this.enemies.filter(e => !e.cured).map(e => ({
      center: e.root.position.clone().addScaledVector(e.dir, e.type.height * 0.55),
      radius: e.type.hitRadius ?? e.type.height * 0.35,
      hit: (pt) => this.damageEnemy(e, 1, pt),
    })));
    mech.on('respawn', () => { this.hp = this.maxHp; });
    mech.on('breachFall', () => { this.hp = Math.max(1, this.hp - (C.breachDamage ?? 20)); this.updateHud(); });
    mech.on('cutsceneEnd:elder', () => mech.emit('metElder'));
    mech.on('inventory', () => { if (this.sword && !this.swing) this.sword.visible = mech.equipped === 'sword'; });
    for (const enc of this.encounters) if (enc.trigger && !enc.trigger.startsWith('zone:')) mech.on(enc.trigger, () => this.startEncounter(enc));
    for (const [ev, fn] of Object.entries(this.eventHandlers())) mech.on(ev, fn);

    $('health')?.classList.remove('hidden');
    this.updateHud();
  }

  // level-specific named events (kept small; the level data says when they fire)
  eventHandlers() {
    return {
      giveSword: () => this.giveSword(),
      // put the sword in the astronaut's hand (also during a cutscene, where the hotbar keys are locked)
      equipSword: () => { if (!this.sword) this.giveSword(); this.mech.equipped = 'sword'; this.player.mode = 'sword'; this.mech.gun && (this.mech.gun.visible = false); this.mech.emit('inventory'); },
      portalOn: () => this.portal?.setActive(true),
      bossRoar: () => { const b = this.enemies.find(e => e.type.boss); if (b) this.playEnemy(b, 'Weapon', true); },
    };
  }

  status() {
    const enc = this.encounters.find(e => e.active);
    return { hp: this.hp, cured: this.curedCount, toCure: this.encounters.filter(e => !e.boss).reduce((n, e) => n + e.waves.flat().length, 0), inFight: !!enc };
  }

  // ── placing things on the planet ──────────────────────────────────────────
  place(obj, spec, yawDeg) {
    const dir = this.ctx.resolve(spec);
    let yaw = THREE.MathUtils.degToRad(yawDeg ?? 0);
    if (spec.face) {   // turn the object's +Z toward a zone / anchor
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

  addLocalColliders(group, list, tag) {
    group.updateMatrixWorld(true);
    for (const c of list) {
      const d = group.localToWorld(new THREE.Vector3(c.x, 0, c.z)).normalize();
      this.mech.addCollider({ dir: d, r: c.r, h: c.h, stand: !!c.stand, tag });
    }
  }

  buildStructures() {
    const build = { campfire: makeCampfire, portalRing: makePortal, arch: makeArch, wall: makeWall, dome: makeDome, glassDome: makeGlassDome };
    for (const s of this.level.structures || []) {
      const made = build[s.type](s);
      this.place(made.group, s.at, s.yaw);
      if (s.scale) made.group.scale.setScalar(s.scale);
      this.addLocalColliders(made.group, (made.colliders || []).map(c => s.scale ? { ...c, x: c.x * s.scale, z: c.z * s.scale, r: c.r * s.scale, h: c.h * s.scale } : c), s.id);
      if (made.update) this.updaters.push(made.update);
    }
  }

  // ── player health ─────────────────────────────────────────────────────────
  hurt(amount, line) {
    if (this.roll.t > 0 || this.mech.dying > 0 || this.mech.cinematic) return;
    this.hp = Math.max(0, this.hp - amount);
    this.sinceHurt = 0;
    const v = $('hurt');
    if (v) { v.classList.remove('hit'); void v.offsetWidth; v.classList.add('hit'); }
    if (this.player.lockTimer <= 0) this.player.playOverride('HitRecieve', 0.25);
    if (line) this.mech.sayOnce('hurt:' + line, line);
    if (this.hp <= 0) this.mech.die(this.level.dialogue.events.defeated);
    this.updateHud();
  }

  heal(amount) {
    this.hp = Math.min(this.maxHp, this.hp + amount);
    this.updateHud();
  }

  updateHud() {
    const bar = $('healthFill');
    if (bar) bar.style.width = `${(this.hp / this.maxHp) * 100}%`;
    $('health')?.classList.toggle('low', this.hp < this.maxHp * 0.3);
  }

  // ── dodge roll (Q): quick, invulnerable ───────────────────────────────────
  tryRoll(input) {
    if (this.mech.carrying || this.mech.dying > 0) return;
    this.player.tryRoll(input, this.camFwd);
  }

  // ── sword (right click) ───────────────────────────────────────────────────
  giveSword() {
    if (!this.level.combat.sword) return;   // this level has no sword
    const p = this.player;
    const gltf = this.gltfs[this.level.combat.sword.model];
    const sword = gltf.scene.clone(true);
    sword.traverse(o => { if (o.isMesh) o.castShadow = true; });
    sword.scale.setScalar(this.level.combat.sword.scale ?? 0.5);
    const wrist = p.model.getObjectByName('WristR'), knuckle = p.model.getObjectByName('Index1R');
    if (!wrist || !knuckle) return;
    wrist.add(sword);

    // Fit the sword to the fist in the model's own sword-holding pose (Idle_Sword), then let it ride on the hand.
    // Blade (+Y of the model) points forward and up at 40°, the grip (model origin) sits in the closed fist.
    const pose = p.actions.Idle_Sword;
    const saved = p.mixer._actions.filter(a => a.isRunning()).map(a => [a, a.getEffectiveWeight(), a.time]);
    p.mixer.stopAllAction();
    pose.reset().setEffectiveWeight(1).play();
    p.mixer.update(0.001);
    p.root.updateMatrixWorld(true);
    const w = wrist.getWorldPosition(new THREE.Vector3());
    const hand = knuckle.getWorldPosition(new THREE.Vector3()).sub(w).normalize();
    const lift = THREE.MathUtils.degToRad(this.level.combat.sword.angle ?? 40);
    const blade = p.facing.clone().multiplyScalar(Math.cos(lift)).addScaledVector(p.up, Math.sin(lift)).normalize();
    const flat = new THREE.Vector3().crossVectors(blade, p.up).normalize();          // edge faces sideways
    const edge = new THREE.Vector3().crossVectors(flat, blade).normalize();
    const worldQ = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(flat, blade, edge));
    sword.quaternion.copy(wrist.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(worldQ));
    const grip = w.clone().addScaledVector(hand, 0.09);                              // middle of the closed fist
    sword.position.copy(wrist.worldToLocal(grip.addScaledVector(blade, -0.04)));
    // put the previous animation back
    pose.stop();
    for (const [a, wt, t] of saved) { a.play(); a.time = t; a.setEffectiveWeight(wt); }
    sword.visible = false;
    this.sword = sword;
    this.mech.flags.sword = true;
    this.mech.emit('inventory');
  }

  trySwing() {
    const p = this.player;
    if (!this.sword || this.swing || this.mech.carrying || this.mech.dying > 0 || this.roll.t > 0) return;
    this.swing = { t: 0, hit: false };
    this.sword.visible = true;
    if (this.mech.gun) this.mech.gun.visible = false;
    if (this.mech.equipped === 'rifle') this.player.mode = 'sword';
    p.playOnce('Sword_Slash', 0.55);
    p.aim(this.camFwd, 0.55);
  }

  updateSwing(dt) {
    const s = this.swing;
    if (!s) return;
    s.t += dt;
    const p = this.player;
    if (!s.hit && s.t > 0.22) {
      s.hit = true;
      for (const e of this.enemies) {
        if (e.cured) continue;
        const to = e.dir.clone().multiplyScalar(this.R).sub(p.up.clone().multiplyScalar(this.R));
        const d = to.length();
        if (d < 2.4 + (e.type.radius ?? 0.5) && to.normalize().dot(p.facing) > 0.2) this.damageEnemy(e, this.level.combat.sword.damage ?? 2, e.root.position.clone().addScaledVector(e.dir, 1));
      }
    }
    if (s.t > 0.55) {
      this.swing = null;
      this.sword.visible = this.mech.equipped === 'sword';
      this.player.mode = this.mech.handMode();
      if (this.mech.equipped === 'rifle') { if (this.mech.gun && this.mech.gunGrip?.done) this.mech.gun.visible = true; }
    }
  }

  // ── enemies ───────────────────────────────────────────────────────────────
  spawnEnemy(spec) {
    const type = this.level.enemyTypes[spec.type];
    const inst = skinnedInstance(this.gltfs[type.model], type.height);
    const { root, model, mixer } = inst;
    // `anims` renames clips for models with different names (robots: Punch → Attack); missing clips fall back to Idle
    const clip = (n) => inst.clip(type.anims?.[n] ?? n) ?? inst.clip('Idle');
    const mats = [];
    model.traverse(o => {
      if (!o.isMesh) return;
      o.material = o.material.clone();
      mats.push({ m: o.material, color: o.material.color.clone(), emissive: o.material.emissive?.clone() });
    });
    const dir = this.ctx.resolve(spec.at);
    const e = {
      type, root, model, mixer, clip, mats, dir, home: dir.clone(), facing: towards(dir, this.player.up),
      hp: type.hp, maxHp: type.hp, cured: false, t: 0, attackCd: 1 + Math.random(), stun: 0, current: null, pending: [], slamCd: 4, spitCd: 3,
      alt: 3, vy: 0,
    };
    this.setInfection(e, 1);
    this.scene.add(root);
    if (!this.enemyCanStand(e, e.dir)) {   // spawn point blocked (eggs, rocks, another enemy): use the nearest clear spot
      search: for (const r of [1, 1.8, 2.6, 3.5, 4.5]) for (let k = 0; k < 12; k++) {
        const a = (k / 12) * Math.PI * 2, f = towards(dir, this.player.up), side = new THREE.Vector3().crossVectors(f, dir);
        const d = dir.clone().multiplyScalar(this.R).addScaledVector(f, Math.cos(a) * r).addScaledVector(side, Math.sin(a) * r).normalize();
        if (this.enemyCanStand(e, d)) { e.dir = d; e.home = d.clone(); break search; }
      }
    }
    if (spec.from === 'portal' && this.portal) {
      // emerge from the portal: start small at its face, grow while stepping out, then walk to `at`
      const out = towards(this.portal.dir, this.ctx.zoneById[this.portal.at.face ?? this.level.zones[0].id].dir);
      const start = this.portal.dir.clone().multiplyScalar(this.R).addScaledVector(out, 2.4).normalize();
      e.enter = { to: dir.clone(), t: 0 };
      e.dir = start;
      e.facing = out.clone();
      e.alt = 0;
      root.scale.setScalar(0.2);
      this.portalBurst();
      this.playEnemy(e, 'Walk');
    } else this.playEnemy(e, 'Jump_Land', true);
    this.enemies.push(e);
    this.updateEnemy(e, 0, true);   // put it in place right away (a cutscene may frame it this very frame)
    this.puff(dir.clone().multiplyScalar(this.R + 0.4), '#b25cff');
    if (type.boss) { this.mech.anchors.boss = () => e.dir.clone().multiplyScalar(this.R); /* where it stands, not mid-drop */ $('bossbar')?.classList.remove('hidden'); $('bossName').textContent = type.name ?? 'Boss'; this.updateBossBar(e); }
    return e;
  }

  setInfection(e, k) {   // 1 = fully blighted (purple glow), 0 = their real colours
    if (e.type.destroy) return;   // machines aren't infected: keep their own colours
    const tint = new THREE.Color(this.level.combat.blight ?? '#8a2be2');
    for (const { m, color, emissive } of e.mats) {
      m.color.copy(color).lerp(tint, 0.5 * k);
      if (m.emissive) { m.emissive.copy(emissive ?? new THREE.Color(0)).lerp(tint, k); m.emissiveIntensity = 0.15 + 0.5 * k; }
    }
  }

  playEnemy(e, name, once = false, then = null) {
    const c = e.clip(name);
    if (!c) return;
    const a = e.mixer.clipAction(c);
    if (e.current === a && !once) return;
    a.reset().setLoop(once ? THREE.LoopOnce : THREE.LoopRepeat, Infinity).fadeIn(0.15).play();
    a.clampWhenFinished = once;
    if (e.current && e.current !== a) e.current.fadeOut(0.15);
    e.current = a;
    e.onceUntil = once ? e.t + c.duration * 0.9 : 0;
    e.then = then;
  }

  damageEnemy(e, amount, point) {
    if (e.cured || this.mech.cinematic) return;
    e.hp -= amount;
    e.flash = 1;
    this.sparks(point, '#d79bff', 5);
    if (e.type.boss) this.updateBossBar(e);
    if (e.hp <= 0) return this.cure(e);
    if (!e.type.boss || Math.random() < 0.15) { e.stun = 0.35; this.playEnemy(e, 'HitReact', true); }
  }

  cure(e) {
    e.cured = true;
    e.cureT = 0;
    this.curedCount++;
    this.playEnemy(e, 'Death', true);
    if (e.type.destroy) {   // a machine: blown apart, not cured
      const at = e.root.position.clone().addScaledVector(e.dir, e.type.height * 0.5);
      this.sparks(at, '#ffd27a', 14);
      this.sparks(at, '#ff7a3a', 8);
      this.puff(at, '#4a4a4a');
      const flash = new THREE.PointLight('#ffb05a', 30, 8, 2);
      flash.position.copy(at);
      this.scene.add(flash);
      this.fx.push({ obj: flash, t: 0, life: 0.35, update: (dt, k) => { flash.intensity = 30 * (1 - k); } });
    }
    if (e.type.boss) { $('bossbar')?.classList.add('hidden'); this.mech.emit(e.type.onCured ?? 'bossCured'); }
    const ev = this.level.dialogue.events;
    if (!e.type.boss && ev.firstCure) this.mech.sayOnce('firstCure', ev.firstCure);
  }

  updateBossBar(e) {
    const f = $('bossFill');
    if (f) f.style.width = `${Math.max(0, e.hp / e.maxHp) * 100}%`;
  }

  // can an enemy stand here? (not inside rocks, walls, other enemies)
  enemyCanStand(e, dir) {
    if (!e.type.hover && this.mech.inLava(dir)) return false;   // walkers keep out of lava and breaches
    if (!this.mech.isClear(dir.clone().multiplyScalar(this.R + 0.9), e.type.radius ?? 0.5)) return false;
    for (const o of this.enemies) if (o !== e && !o.cured && o.dir.angleTo(dir) * this.R < (o.type.radius ?? 0.5) + (e.type.radius ?? 0.5)) return false;
    return true;
  }

  moveEnemy(e, toward, speed, dt) {
    const want = towards(e.dir, toward);
    for (const deg of [0, 40, -40, 80, -80]) {
      const d = want.clone().applyAxisAngle(e.dir, THREE.MathUtils.degToRad(deg));
      const next = e.dir.clone().multiplyScalar(this.R).addScaledVector(d, speed * dt).normalize();
      if (this.enemyCanStand(e, next)) { e.dir.copy(next); e.facing.lerp(d, 1 - Math.exp(-10 * dt)).normalize(); return true; }
    }
    return false;
  }

  updateEnemy(e, dt, paused) {
    e.t += dt;
    const p = this.player, T = e.type, R = this.R;
    // drop-in on spawn
    if (e.alt > 0) { e.vy += 20 * dt; e.alt = Math.max(0, e.alt - e.vy * dt); }
    // stepping out of the portal (runs during cutscenes too)
    if (e.enter) {
      const en = e.enter;
      en.t += dt;
      e.root.scale.setScalar(Math.min(1, 0.2 + en.t * 0.9));
      const d = e.dir.angleTo(en.to) * R;
      if (d > 0.3 && en.t < 8) {
        const step = Math.min(d, (en.t < 0.9 ? 0.8 : 1.3) * dt);   // a slow, heavy walk out of the portal
        const f = towards(e.dir, en.to);
        e.dir = e.dir.clone().multiplyScalar(R).addScaledVector(f, step).normalize();
        e.facing.lerp(f, 1 - Math.exp(-4 * dt)).normalize();
      } else {
        e.root.scale.setScalar(1);
        e.enter = null;
        this.playEnemy(e, 'Idle');
      }
    }
    e.flash = Math.max(0, (e.flash ?? 0) - dt * 5);

    if (e.cured && T.destroy) {
      // destroyed machine: falls (death clip), smokes, then sinks into the ground and is gone
      e.cureT += dt;
      if (e.cureT < 2 && Math.random() < dt * 6) this.puff(e.root.position.clone().addScaledVector(e.dir, T.height * 0.4), '#3a3a3a');
      if (T.hover) e.alt = Math.max(-T.hover, e.alt - dt * 6);   // drones drop out of the air
      if (e.cureT > 2.6) e.alt -= dt * 0.9;
      if (e.cureT > 4.2) { e.gone = true; this.scene.remove(e.root); }
    } else if (e.cured) {
      e.cureT += dt;
      const k = Math.max(0, 1 - e.cureT / 2.2);
      this.setInfection(e, k);
      if (e.cureT < 2.2 && Math.random() < dt * 12) this.wisp(e);
      if (e.cureT > 2.4 && !e.stood) { e.stood = true; this.playEnemy(e, T.boss ? 'Yes' : 'Wave', false); }
      if (e.cureT > 4.2 && !T.boss) {   // wander off, then vanish
        if (!e.leaving) {
          e.leaving = true; this.playEnemy(e, 'Walk');
          e.leaveTo = e.dir.clone().multiplyScalar(R).addScaledVector(towards(e.dir, p.up).negate(), 12).normalize();
        }
        if (!this.moveEnemy(e, e.leaveTo, 1.6, dt)) this.playEnemy(e, 'Idle');   // walks around eggs and rocks, never through them
        if (e.cureT > 7) { e.gone = true; this.puff(e.root.position.clone().addScaledVector(e.dir, 0.6), '#d8c0ff'); this.scene.remove(e.root); }
      } else if (!e.leaving) e.facing.lerp(towards(e.dir, p.up), 1 - Math.exp(-4 * dt)).normalize();
    } else if (!paused) {
      if (!T.destroy) for (const { m } of e.mats) if (m.emissive) m.emissiveIntensity = 0.5 + Math.sin(e.t * 4) * 0.15 + e.flash * 2;
      if (e.enter) { /* still walking out of the portal */ }
      else {
      e.attackCd -= dt; e.stun -= dt; e.slamCd -= dt; e.spitCd -= dt;
      const dist = e.dir.angleTo(p.up) * R;
      const busy = e.t < e.onceUntil;
      if (e.stun <= 0 && !busy && this.mech.dying <= 0) {
        if (T.attack === 'spit') this.spitterAI(e, dist, dt);
        else if (T.boss) this.bossAI(e, dist, dt);
        else this.meleeAI(e, dist, dt);
      }
      if (!busy && e.stun <= 0 && e.current === e.mixer.clipAction(e.clip('HitReact'))) this.playEnemy(e, 'Idle');
      }
    }
    // scheduled hits (land a moment into the attack animation)
    for (let i = e.pending.length - 1; i >= 0; i--) {
      const h = e.pending[i];
      if (e.t >= h.at) { e.pending.splice(i, 1); if (!e.cured) h.fn(); }
    }
    const x = new THREE.Vector3().crossVectors(e.dir, e.facing).normalize();
    e.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, e.dir, e.facing));
    e.root.position.copy(e.dir).multiplyScalar(R + e.alt + (T.hover ? T.hover + Math.sin(e.t * 2) * 0.15 : 0));
    e.mixer.update(dt);
  }

  meleeAI(e, dist, dt) {
    const T = e.type, p = this.player;
    if (dist > T.reach) {
      if (this.moveEnemy(e, p.up, T.speed, dt)) this.playEnemy(e, 'Run'); else this.playEnemy(e, 'Idle');
    } else {
      e.facing.lerp(towards(e.dir, p.up), 1 - Math.exp(-10 * dt)).normalize();
      if (e.attackCd <= 0) {
        e.attackCd = T.cooldown;
        this.playEnemy(e, 'Punch', true);
        e.pending.push({ at: e.t + 0.35, fn: () => { if (e.dir.angleTo(p.up) * this.R < T.reach + 0.7 && p.alt < 1.5) this.hurt(T.damage); } });
      } else this.playEnemy(e, 'Idle');
    }
  }

  spitterAI(e, dist, dt) {
    const T = e.type, p = this.player;
    if (dist > 11) { if (this.moveEnemy(e, p.up, T.speed, dt)) this.playEnemy(e, 'Run'); }
    else if (dist < 6) { const away = e.dir.clone().multiplyScalar(2).sub(p.up).normalize(); if (this.moveEnemy(e, away, T.speed * 0.8, dt)) this.playEnemy(e, 'Walk'); }
    else this.playEnemy(e, 'Idle');
    e.facing.lerp(towards(e.dir, p.up), 1 - Math.exp(-6 * dt)).normalize();
    if (dist < 14 && e.attackCd <= 0) {
      e.attackCd = T.cooldown;
      this.playEnemy(e, 'Weapon', true);
      e.pending.push({ at: e.t + 0.45, fn: () => this.spit(e, 0) });
    }
  }

  bossAI(e, dist, dt) {
    const T = e.type, p = this.player;
    const rage = e.hp < e.maxHp * 0.5 ? 1.35 : 1;
    // ground slam: leap, land, shockwave (roll or jump to avoid)
    if (e.slamCd <= 0 && dist < 11) {
      e.slamCd = 7 / rage;
      this.playEnemy(e, 'Jump', true);
      e.pending.push({ at: e.t + 0.8, fn: () => { this.playEnemy(e, 'Jump_Land', true); this.shockwave(e, T.slamRadius ?? 6, T.slamDamage ?? 18); } });
      this.mech.sayOnce('slamHint', this.level.dialogue.events.slamHint);
      return;
    }
    if (dist > 8 && e.spitCd <= 0) {   // volley of blight spit
      e.spitCd = 5 / rage;
      this.playEnemy(e, 'Weapon', true);
      for (const [k, at] of [[-1, 0.4], [0, 0.55], [1, 0.7]]) e.pending.push({ at: e.t + at, fn: () => this.spit(e, k * 0.18) });
      return;
    }
    this.meleeAI(e, dist, dt * rage);
  }

  spit(e, spread) {
    const p = this.player;
    const from = e.root.position.clone().addScaledVector(e.dir, e.type.height * 0.7).addScaledVector(e.facing, 0.6);
    const to = p.pos.clone().addScaledVector(p.up, 1.0);
    const vel = to.sub(from).normalize();
    vel.applyAxisAngle(e.dir, spread).multiplyScalar(e.type.spitSpeed ?? 12);
    const orb = new THREE.Mesh(new THREE.SphereGeometry(0.22, 10, 8), new THREE.MeshBasicMaterial({ color: '#d36bff' }));
    const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: '#b040ff', ...GLOW }));
    halo.scale.setScalar(1.1);
    orb.add(halo);
    orb.position.copy(from);
    this.scene.add(orb);
    this.projectiles.push({ obj: orb, vel, life: 3, damage: e.type.spitDamage ?? 10 });
  }

  shockwave(e, radius, damage) {
    const center = e.root.position.clone();
    const ring = new THREE.Mesh(new THREE.RingGeometry(0.8, 1.2, 40), new THREE.MeshBasicMaterial({ color: '#c46bff', side: THREE.DoubleSide, ...GLOW }));
    placeOnSurface(ring, e.dir, this.R + 0.15);
    ring.rotateX(-Math.PI / 2);
    this.scene.add(ring);
    let hit = false;
    this.fx.push({ obj: ring, t: 0, life: 0.55, update: (dt, k) => {
      const r = radius * k;
      ring.scale.setScalar(Math.max(0.01, r));
      ring.material.opacity = 1 - k;
      const d = this.player.pos.distanceTo(center);
      if (!hit && Math.abs(d - r) < 0.9 && this.player.alt < 0.6) { hit = true; this.hurt(damage); }
    } });
    this.puff(center.clone().addScaledVector(e.dir, 0.3), '#b25cff');
  }

  // ── encounters (waves of infected) ────────────────────────────────────────
  onZoneEnter(z) {
    for (const enc of this.encounters) if (enc.trigger === 'zone:' + z.id) this.startEncounter(enc);
  }

  startEncounter(enc) {
    if (enc.active || enc.done) return;
    enc.active = true;
    if (enc.intro) this.say(enc.intro, { interrupt: true });
    this.nextWave(enc);
  }

  nextWave(enc) {
    enc.wave++;
    const wave = enc.waves[enc.wave];
    if (!wave) {
      enc.active = false;
      enc.done = true;
      if (enc.onClear) this.mech.emit(enc.onClear);
      if (enc.clearLine) this.say(enc.clearLine, { interrupt: true });
      return;
    }
    enc.members = wave.map(spec => this.spawnEnemy(spec));
    if (enc.wave > 0 && enc.waveLine) this.say(enc.waveLine);
  }

  // ── villagers ─────────────────────────────────────────────────────────────
  makeVillager(v) {
    const { root, mixer, clip } = skinnedInstance(this.gltfs[v.model], v.height ?? 1.5);
    const dir = this.ctx.resolve(v.at);
    this.scene.add(root);
    const a = mixer.clipAction(clip(v.anim ?? 'Idle'));
    a.play();
    const vil = { ...v, root, mixer, clip, dir, facing: towards(dir, this.ctx.zoneById[v.at.zone].dir), current: a, talked: false };
    if (v.talk) {
      this.mech.anchors[v.talk] = () => dir.clone().multiplyScalar(this.R);
      this.mech.actors[v.talk] = (anim) => this.villagerAnim(vil, anim);
      this.mech.on('cutsceneEnd:' + v.talk, () => this.villagerAnim(vil, v.anim ?? 'Idle'));
    }
    this.mech.addCollider({ dir: dir.clone(), r: 0.5, h: Infinity, tag: 'villager' });
    return vil;
  }

  // switch a villager's looping animation (cross-fade)
  villagerAnim(v, name) {
    const c = v.clip(name);
    if (!c) return;
    const a = v.mixer.clipAction(c);
    if (a === v.current) return;
    a.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(0.25).play();
    v.current.fadeOut(0.25);
    v.current = a;
  }

  updateVillager(v, dt) {
    const p = this.player;
    const near = v.dir.angleTo(p.up) * this.R < 6;
    if (near) v.facing.lerp(towards(v.dir, p.up), 1 - Math.exp(-4 * dt)).normalize();
    if (near && !v.greeted && !v.talk) {
      v.greeted = true;
      const w = v.mixer.clipAction(v.clip('Wave'));
      w.reset().setLoop(THREE.LoopRepeat, 2).fadeIn(0.2).play();
      v.current.fadeOut(0.2);
      setTimeout(() => { v.current.reset().fadeIn(0.3).play(); w.fadeOut(0.3); }, 2600);
    }
    const x = new THREE.Vector3().crossVectors(v.dir, v.facing).normalize();
    v.root.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(x, v.dir, v.facing));
    v.root.position.copy(v.dir).multiplyScalar(this.R);
    v.mixer.update(dt);
  }

  nearTalker() {
    return this.villagers.find(v => v.talk && !v.talked && v.dir.angleTo(this.player.up) * this.R < 2.8);
  }

  // ── bounce mushrooms, spores, health packs ────────────────────────────────
  makePad(spec) {
    const obj = modelInstance(this.gltfs[spec.model ?? this.level.combat.padModel], spec.scale ?? [2.2, 1.2, 2.2]);
    const dir = this.place(obj, spec.at, Math.random() * 360);
    const ring = new THREE.Mesh(new THREE.RingGeometry(1.3, 1.7, 32), new THREE.MeshBasicMaterial({ color: '#7ef6ff', side: THREE.DoubleSide, ...GLOW, opacity: 0.6 }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = 0.06;
    obj.add(ring);
    return { ...spec, obj, ring, dir, squash: 0 };
  }

  makeSpores(spec) {
    const cloud = makeSporeCloud(spec.radius);
    const dir = this.place(cloud.group, spec.at);
    this.updaters.push(cloud.update);
    return { ...spec, dir };
  }

  makePack(spec) {
    const obj = modelInstance(this.gltfs[this.level.combat.healthModel], spec.scale ?? 3);
    const holder = new THREE.Group();
    holder.add(obj);
    const dir = this.place(holder, spec.at);
    obj.position.y = spec.alt ?? 0.8;
    const light = new THREE.PointLight('#5dff8a', 6, 5, 2);
    light.position.y = (spec.alt ?? 0.8) + 0.3;
    holder.add(light);
    return { ...spec, holder, obj, dir, taken: false };
  }

  // ── thorn walls: block until an event withers them ────────────────────────
  makeThornRing(spec) {
    const c = spec.center ? this.ctx.resolve(spec.center) : null;
    const group = new THREE.Group();
    this.scene.add(group);
    const tag = 'thorns:' + spec.id;
    const points = [];
    if (spec.gate) {   // a straight wall across an opening, with a little depth so it reads as a thicket
      const g = this.ctx.resolve(spec.gate.at), f = towards(g, this.ctx.zoneById[spec.gate.facing].dir);
      const side = new THREE.Vector3().crossVectors(f, g), w = spec.gate.width;
      for (let k = -w / 2; k <= w / 2 + 0.01; k += 0.85)
        for (const depth of [0, 0.9]) points.push(g.clone().multiplyScalar(this.R).addScaledVector(side, k + depth * 0.4).addScaledVector(f, depth).normalize());
      this.mech.anchors['thorns:' + spec.id] = () => g.clone().multiplyScalar(this.R);
    } else {
      const step = 1.1, n = Math.round((Math.PI * 2 * spec.radius) / step);
      const probe = new THREE.Object3D();
      placeOnSurface(probe, c, this.R, 0);
      probe.updateMatrixWorld(true);
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2;
        points.push(probe.localToWorld(new THREE.Vector3(Math.cos(a) * spec.radius, 0, Math.sin(a) * spec.radius)).normalize());
      }
    }
    for (const d of points) {
      const t = makeThorns(spec.height ?? 3.2);
      placeOnSurface(t.group, d, this.R, Math.random() * 6.28);
      group.add(t.group);
      this.mech.addCollider({ dir: d, r: 0.6, h: (spec.height ?? 3.2), tag });
    }
    const ring = { ...spec, group, tag, wither: 0, open: false };
    if (spec.opensOn) this.mech.on(spec.opensOn, () => { ring.open = true; this.mech.removeColliders(tag); });
    return ring;
  }

  // ── the portal: exit once active ──────────────────────────────────────────
  makePortalExit(spec) {
    const portal = makePortal(spec.radius ?? 2.2);
    const dir = this.place(portal.group, spec.at, spec.yaw);
    this.addLocalColliders(portal.group, portal.colliders, 'portal');
    this.updaters.push(portal.update);
    this.portal = { ...portal, ...spec, dir, active: false };
    this.mech.anchors.portal = () => portal.group.localToWorld(portal.center.clone());
    this.mech.on(spec.activeOn, () => { this.portal.active = true; portal.setActive(true); });
  }

  // ── E key / prompts ───────────────────────────────────────────────────────
  interact() {
    const v = this.nearTalker();
    if (!v) return false;
    v.talked = true;
    const talk = this.level.talks[v.talk];
    if (talk.cutscene) {   // a proper conversation: letterbox, camera shots, the elder gestures as he speaks
      this.mech.startCutscene(talk.cutscene);
      return true;
    }
    this.say(talk.lines, { interrupt: true });
    const w = v.mixer.clipAction(v.clip('Yes'));
    w.reset().setLoop(THREE.LoopRepeat, 3).fadeIn(0.2).play();
    v.current.fadeOut(0.2);
    setTimeout(() => { v.current.reset().fadeIn(0.3).play(); w.fadeOut(0.3); }, 3000);
    for (const ev of [].concat(talk.emit ?? [])) this.mech.emit(ev);
    return true;
  }

  prompt() {
    const v = this.nearTalker();
    if (v) return v.promptText ?? 'Talk';
    if (this.portal?.active && this.portal.dir.angleTo(this.player.up) * this.R < 3) return 'Enter the portal';
    return null;
  }

  // ── effects ───────────────────────────────────────────────────────────────
  puff(at, color = '#d8b090') {
    for (let i = 0; i < 10; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, transparent: true, depthWrite: false }));
      s.position.copy(at);
      const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(3);
      this.scene.add(s);
      this.fx.push({ obj: s, t: 0, life: 0.8, update: (dt, k) => { s.position.addScaledVector(vel, dt); s.scale.setScalar(1 + k * 2); s.material.opacity = 0.7 * (1 - k); } });
    }
  }

  sparks(at, color, n) {
    const up = at.clone().normalize();
    for (let i = 0; i < n; i++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color, ...GLOW }));
      s.position.copy(at);
      s.scale.setScalar(0.35);
      const vel = new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).normalize().multiplyScalar(4).addScaledVector(up, 2);
      this.scene.add(s);
      this.fx.push({ obj: s, t: 0, life: 0.4, update: (dt, k) => { s.position.addScaledVector(vel, dt); s.material.opacity = 1 - k; } });
    }
  }

  // a flash of blight light from the portal (something is coming through)
  portalBurst() {
    if (!this.portal) return;
    const at = this.mech.anchors.portal();
    const light = new THREE.PointLight('#c46bff', 60, 18, 1.5);
    light.position.copy(at);
    this.scene.add(light);
    this.fx.push({ obj: light, t: 0, life: 1.4, update: (dt, k) => { light.intensity = 60 * (1 - k); } });
    this.puff(at, '#b25cff');
    this.puff(at.clone().addScaledVector(at.clone().normalize(), -1.5), '#8a2be2');
  }

  // blight leaving a cured alien
  wisp(e) {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: soft(), color: this.level.combat.wispColor ?? '#b040ff', ...GLOW }));
    s.position.copy(e.root.position).addScaledVector(e.dir, e.type.height * (0.2 + Math.random() * 0.6)).add(new THREE.Vector3(Math.random() - 0.5, Math.random() - 0.5, Math.random() - 0.5).multiplyScalar(0.6));
    s.scale.setScalar(0.4 + Math.random() * 0.3);
    const up = e.dir.clone();
    this.scene.add(s);
    this.fx.push({ obj: s, t: 0, life: 1.4, update: (dt, k) => { s.position.addScaledVector(up, dt * 1.5); s.material.opacity = 0.9 * (1 - k); } });
  }

  // ── per frame ─────────────────────────────────────────────────────────────
  update(dt, t, input) {
    const p = this.player, ev = this.level.dialogue.events;
    const paused = !!this.mech.cinematic;
    for (const u of this.updaters) u(dt, t);

    // health regen
    this.sinceHurt += dt;
    if (this.sinceHurt > 4 && this.hp < this.maxHp && this.mech.dying <= 0) { this.heal(dt * 6); }

    this.updateSwing(dt);

    for (const e of this.enemies) if (!e.gone) this.updateEnemy(e, dt, paused);
    this.enemies = this.enemies.filter(e => !e.gone);
    for (const enc of this.encounters) if (enc.active && enc.members.every(m => m.cured)) this.nextWave(enc);

    for (const v of this.villagers) this.updateVillager(v, dt);

    // projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const pr = this.projectiles[i];
      pr.life -= dt;
      if (!paused) pr.obj.position.addScaledVector(pr.vel, dt);
      const chest = _v.copy(p.pos).addScaledVector(p.up, 1.0);
      let done = pr.life <= 0 || pr.obj.position.length() < this.R + 0.1;
      if (!done && pr.obj.position.distanceTo(chest) < 0.8) { done = true; this.hurt(pr.damage); }
      if (done) { this.scene.remove(pr.obj); this.projectiles.splice(i, 1); }
    }

    // bounce mushrooms
    for (const pad of this.pads) {
      pad.squash = Math.max(0, pad.squash - dt * 4);
      const s = pad.scale ?? [2.2, 1.2, 2.2];
      pad.obj.userData.inner.scale.set(s[0] * (1 + pad.squash * 0.25), s[1] * (1 - pad.squash * 0.35), s[2] * (1 + pad.squash * 0.25));
      pad.ring.material.opacity = 0.4 + Math.sin(t * 4) * 0.2;
      if (p.vy <= 1 && p.alt < 1.8 && pad.dir.angleTo(p.up) * this.R < 1.5) {
        p.vy = pad.power ?? 15;
        p.grounded = false;
        if (p.vel.length() < 6) p.vel.copy(p.facing).multiplyScalar(6);
        pad.squash = 1;
        this.mech.sayOnce('firstBounce', ev.firstBounce);
      }
    }

    // spores hurt while you stand in them
    for (const s of this.spores) {
      if (s.dir.angleTo(p.up) * this.R < s.radius && p.alt < 3) {
        this.sporeTick = (this.sporeTick ?? 0) + dt;
        if (this.sporeTick > 0.5) { this.sporeTick = 0; this.hurt((s.damage ?? 8) * 0.5, ev.spores); }
      }
    }

    // health packs
    const chest = _v.copy(p.pos).addScaledVector(p.up, 0.9);
    for (const h of this.packs) {
      if (h.taken) continue;
      h.obj.rotation.y += dt * 2;
      h.obj.position.y = (h.alt ?? 0.8) + Math.sin(t * 2.5) * 0.12;
      if (h.obj.getWorldPosition(new THREE.Vector3()).distanceTo(chest) < 1.5) {
        h.taken = true;
        h.holder.visible = false;
        this.heal(h.heal ?? 40);
        this.mech.sayOnce('firstHealth', ev.firstHealth);
      }
    }

    // thorns shrink away once opened
    for (const r of this.thorns) {
      if (!r.open || r.wither >= 1) continue;
      r.wither = Math.min(1, r.wither + dt * 0.7);
      r.group.children.forEach(c => c.scale.setScalar(Math.max(0.01, 1 - r.wither)));
      if (r.wither >= 1) r.group.visible = false;
    }

    // portal exit
    if (this.portal?.active && !this.finished && this.portal.dir.angleTo(p.up) * this.R < 1.6) {
      this.finished = true;
      this.finish();
    }

    for (let i = this.fx.length - 1; i >= 0; i--) {
      const f = this.fx[i];
      f.t += dt;
      const k = Math.min(1, f.t / f.life);
      f.update?.(dt, k);
      if (k >= 1) { this.scene.remove(f.obj); this.fx.splice(i, 1); }
    }
  }
}
