import * as THREE from 'three';
import { clone as cloneSkinned } from 'three/addons/utils/SkeletonUtils.js';
import { sampleRock } from './world.js';

const _v = new THREE.Vector3(), _x = new THREE.Vector3(), _m = new THREE.Matrix4();

export const TUNING = {
  runSpeed: 8,
  walkSpeed: 3.6,
  carrySpeed: 4.2,   // carrying is slower and you can't jump
  rollTime: 0.95,    // dodge roll (Q): the whole 1.7 s Roll clip sped up to fit; invulnerable on combat planets
  rollSpeed: 10,
  jumpVelocity: 9,   // with gravity 22 → ~1.85 m jump height
  gravity: 22,
  radius: 0.45,
  rockStep: 0.3,     // edges of big rocks lower than this are stepped onto (crates: 0.5)
  pebbleTop: 0.8,    // rocks no taller than this are pebbles: you just walk over them
};

// Animation per movement mode: [idle, walk, run]
const ANIMS = {
  normal: ['Idle', 'Walk', 'Run'],
  carry:  ['BoxWalk', 'BoxWalk', 'BoxWalk'],
  gun:    ['Idle_Gun_Pointing', 'Run_Shoot', 'Run_Shoot'],   // arm stays up, aiming
  sword:  ['Idle_Sword', 'Walk', 'Run'],                      // fist closed around the grip
};

// ── Jump animation ──────────────────────────────────────────────────────────
// The model ships without a jump clip, so one is built once at load time, from the model's own rig:
// start from a base pose (idle, or the aiming pose), tuck the knees, and move each foot with its shin.
// (In this rig the feet are separate controller bones, children of Root, so they must be moved with
// the shin or the boot mesh would stretch.) The result is an ordinary AnimationClip, played like Walk or Run.
function buildJumpClip(scene, base, name) {
  const tmp = cloneSkinned(scene);
  tmp.position.set(0, 0, 0); tmp.quaternion.identity(); tmp.scale.set(1, 1, 1);
  const mixer = new THREE.AnimationMixer(tmp);
  const side = new THREE.Vector3(1, 0, 0);          // the character's knee-hinge axis (model faces +Z, up +Y)
  const b = (n) => tmp.getObjectByName(n);
  const legs = [['UpperLegL', 'LowerLegL', 'FootL', 1.1], ['UpperLegR', 'LowerLegR', 'FootR', 0.8]];
  const q = new THREE.Quaternion(), pq = new THREE.Quaternion(), local = new THREE.Vector3();
  const turn = (bone, angle) => {
    bone.parent.getWorldQuaternion(pq);
    local.copy(side).applyQuaternion(pq.invert());
    bone.quaternion.premultiply(q.setFromAxisAngle(local, angle));
    bone.updateMatrixWorld(true);
  };
  const pose = (tuck) => {
    mixer.stopAllAction();
    mixer.clipAction(base).reset().play();
    mixer.setTime(0);
    tmp.updateMatrixWorld(true);
    for (const [thighN, shinN, footN, lead] of legs) {
      const thigh = b(thighN), shin = b(shinN), foot = b(footN);
      if (!thigh || !shin || !foot) continue;
      const shinBefore = shin.matrixWorld.clone();
      turn(thigh, -0.85 * tuck * lead);             // knee comes up and forward
      turn(shin, 1.25 * tuck);                      // lower leg folds back
      // the foot moves rigidly with the shin, as if attached to it
      const follow = new THREE.Matrix4().multiplyMatrices(shin.matrixWorld, shinBefore.invert());
      const m = new THREE.Matrix4().multiplyMatrices(follow, foot.matrixWorld);
      m.premultiply(new THREE.Matrix4().copy(foot.parent.matrixWorld).invert());
      const s0 = foot.scale.clone();
      m.decompose(foot.position, foot.quaternion, foot.scale);
      foot.scale.copy(s0);
      foot.updateMatrixWorld(true);
    }
    // read every animated property back out
    return base.tracks.map(tr => {
      const { nodeName, propertyName } = THREE.PropertyBinding.parseTrackName(tr.name);
      const node = b(nodeName) ?? tmp;
      return node[propertyName].toArray();
    });
  };
  const start = pose(0.35), full = pose(1);
  const tracks = base.tracks.map((tr, i) => new tr.constructor(tr.name, [0, 0.18], [...start[i], ...full[i]]));
  return new THREE.AnimationClip(name, 0.18, tracks);
}

// ── Re-rig: attach the feet to the shins ──────────────────────────────────────
// In this model each foot is a separate controller bone parented to Root (left over from the IK rig it
// was animated with). When two clips blend, legs and feet are mixed independently, so the boot mesh
// (whose ankle vertices are shared by foot and shin) stretches. Fix, done once at load:
//   1. for every clip, resample the foot tracks so they are expressed relative to the shin,
//   2. re-parent each foot bone under its shin.
// The clips then look exactly the same, but a foot can no longer drift away from its leg in any blend.
const FEET = [['FootL', 'LowerLegL'], ['FootR', 'LowerLegR']];
function rigFeetToShins(scene, clips) {
  const tmp = cloneSkinned(scene);
  tmp.position.set(0, 0, 0); tmp.quaternion.identity(); tmp.scale.set(1, 1, 1);
  const mixer = new THREE.AnimationMixer(tmp);
  const rel = new THREE.Matrix4(), pos = new THREE.Vector3(), quat = new THREE.Quaternion(), scl = new THREE.Vector3();
  const out = clips.map(clip => {
    const footTracks = clip.tracks.filter(tr => FEET.some(([f]) => tr.name.startsWith(f + '.')));
    if (!footTracks.length) return clip;
    const fps = 30, n = Math.max(2, Math.ceil(clip.duration * fps) + 1);
    const times = [], data = Object.fromEntries(FEET.map(([f]) => [f, { p: [], q: [], s: [] }]));
    mixer.stopAllAction();
    const action = mixer.clipAction(clip);
    action.reset().setLoop(THREE.LoopOnce, 1).play();
    action.clampWhenFinished = true;
    for (let i = 0; i < n; i++) {
      const t = Math.min(clip.duration, (i / (n - 1)) * clip.duration);
      times.push(t);
      mixer.setTime(t);
      tmp.updateMatrixWorld(true);
      for (const [f, shinName] of FEET) {
        const foot = tmp.getObjectByName(f), shin = tmp.getObjectByName(shinName);
        rel.copy(shin.matrixWorld).invert().multiply(foot.matrixWorld);
        rel.decompose(pos, quat, scl);
        data[f].p.push(...pos.toArray()); data[f].q.push(...quat.toArray()); data[f].s.push(...scl.toArray());
      }
    }
    mixer.uncacheClip(clip);
    const kept = clip.tracks.filter(tr => !footTracks.includes(tr));
    for (const [f] of FEET) {
      kept.push(new THREE.VectorKeyframeTrack(f + '.position', times, data[f].p));
      kept.push(new THREE.QuaternionKeyframeTrack(f + '.quaternion', times, data[f].q));
      kept.push(new THREE.VectorKeyframeTrack(f + '.scale', times, data[f].s));
    }
    return new THREE.AnimationClip(clip.name, clip.duration, kept);
  });
  // finally move the real feet under their shins (attach() keeps them exactly where they are)
  scene.updateMatrixWorld(true);
  for (const [f, shinName] of FEET) {
    const foot = scene.getObjectByName(f), shin = scene.getObjectByName(shinName);
    if (foot && shin) shin.attach(foot);
  }
  return out;
}

// Third-person astronaut that walks on a sphere. "up" is always away from the planet centre.
export class Player {
  constructor(gltf, R, scale = 1) {
    this.R = R;
    this.root = new THREE.Group();
    this.model = gltf.scene;
    this.model.scale.setScalar(scale);
    this.model.traverse(o => { if (o.isMesh) { o.castShadow = true; o.frustumCulled = false; } });
    this.root.add(this.model);

    this.mixer = new THREE.AnimationMixer(this.model);
    this.airTime = 0;
    this.jumped = false;
    this.actions = {};
    // build the Jump clips (relaxed arms / blaster raised), then re-rig feet → shins for all clips at once
    const clips = [...gltf.animations];
    for (const [base, name] of [['Idle', 'Jump'], ['Idle_Gun_Pointing', 'Jump_Gun']]) {
      const clip = gltf.animations.find(c => c.name.split('|').pop() === base);
      if (clip) clips.push(buildJumpClip(gltf.scene, clip, name));
    }
    for (const clip of rigFeetToShins(gltf.scene, clips)) this.actions[clip.name.split('|').pop()] = this.mixer.clipAction(clip);
    this.current = null;
    this.lockTimer = 0;
    this.mode = 'normal';     // 'normal' | 'carry' | 'gun'
    this.override = null;     // short non-locking animation, e.g. shooting while running
    this.aimDir = new THREE.Vector3();
    this.aimTimer = 0;        // while > 0 the astronaut faces aimDir instead of the walk direction

    this.up = new THREE.Vector3(0, 1, 0);
    this.pos = new THREE.Vector3(0, R, 0);
    this.vel = new THREE.Vector3();
    this.facing = new THREE.Vector3(0, 0, 1);
    this.alt = 0;
    this.vy = 0;
    this.grounded = true;
    this.traction = 1;
    this.gravityScale = 1;
    this.roll = { t: 0, cd: 0, dir: new THREE.Vector3() };
    this.play('Idle');
  }

  play(name, fade = 0.2) {
    const a = this.actions[name];
    if (!a || this.current === a) return;
    a.reset().setLoop(THREE.LoopRepeat, Infinity).fadeIn(fade).play();
    if (this.current) this.current.fadeOut(fade);
    this.current = a;
  }

  // One-shot animation that freezes movement while it plays
  // fit: play the whole clip in exactly this many seconds (speeds it up), and lock for that long
  playOnce(name, lock, fit) {
    const a = this.actions[name];
    if (!a) return;
    a.reset().setLoop(THREE.LoopOnce, 1);
    a.timeScale = fit ? a.getClip().duration / fit : 1;
    if (fit) lock = fit;
    a.clampWhenFinished = true;
    a.fadeIn(0.15).play();
    if (this.current && this.current !== a) this.current.fadeOut(0.15);
    this.current = a;
    this.lockTimer = lock ?? a.getClip().duration;
  }

  playOverride(name, time) {
    if (this.actions[name]) this.override = { name, t: time };
  }

  aim(dir, time = 0.6) {
    this.aimDir.copy(dir);
    this.aimTimer = time;
  }

  spawn(dir, facing) {
    this.up.copy(dir).normalize();
    this.alt = 0;
    this.vy = 0;
    this.vel.set(0, 0, 0);
    this.lockTimer = 0;
    this.pos.copy(this.up).multiplyScalar(this.R);
    this.facing.copy(facing).addScaledVector(this.up, -facing.dot(this.up)).normalize();
    this.sync();
  }

  // Returns the rotation applied by walking over the curve, so the camera can follow it
  // dodge roll in the direction you're steering (or straight ahead)
  tryRoll(input, camFwd) {
    const r = this.roll;
    if (r.t > 0 || r.cd > 0 || !this.grounded || this.mode === 'carry' || this.lockTimer > 0) return false;
    const right = new THREE.Vector3().crossVectors(camFwd, this.up);
    const dir = new THREE.Vector3().addScaledVector(camFwd, input.y).addScaledVector(right, input.x);
    if (dir.lengthSq() < 0.01) dir.copy(this.facing);
    r.dir.copy(dir.normalize());
    r.t = TUNING.rollTime;
    r.cd = TUNING.rollTime + 0.3;
    this.playOnce('Roll', null, TUNING.rollTime);
    this.facing.copy(r.dir);
    return true;
  }

  update(dt, input, camFwd, colliders) {
    const R = this.R, up = this.up;
    const r = this.roll;
    r.cd -= dt;
    if (r.t > 0) {   // keep the roll's speed for its whole duration (overrides steering and ice)
      r.t -= dt;
      this.vel.copy(r.dir).multiplyScalar(TUNING.rollSpeed * Math.min(1, r.t / 0.3 + 0.2));
    }
    const locked = this.lockTimer > 0;
    if (locked) this.lockTimer -= dt;

    const right = _x.crossVectors(camFwd, up).normalize();
    const wish = new THREE.Vector3();
    if (!locked) wish.addScaledVector(camFwd, input.y).addScaledVector(right, input.x);
    if (wish.lengthSq() > 1) wish.normalize();
    wish.multiplyScalar(this.mode === 'carry' ? TUNING.carrySpeed : input.walk ? TUNING.walkSpeed : TUNING.runSpeed);
    // traction < 1 = ice: speeding up and stopping both take longer, so you slide
    this.vel.lerp(wish, 1 - Math.exp(-(this.grounded ? 10 * this.traction : 2.5) * dt));
    this.vel.addScaledVector(up, -this.vel.dot(up));

    if (!locked && input.jump && this.grounded && this.mode !== 'carry') {
      this.vy = TUNING.jumpVelocity;
      this.grounded = false;
      this.jumped = true;
    }
    this.vy -= TUNING.gravity * (this.gravityScale ?? 1) * dt;

    // move along the surface, then resolve collisions in surface space
    const newUp = up.clone().multiplyScalar(R).addScaledVector(this.vel, dt).normalize();
    let ground = 0;
    for (const c of colliders) {
      if (c.rock || c.dir.dot(newUp) < c.cull) continue;
      if (!c.stand && c.h !== Infinity && this.alt >= c.h) continue;   // above a low obstacle (e.g. thorns) → fly over it
      const d = _v.copy(newUp).sub(c.dir).length() * R;
      const minD = c.r + TUNING.radius;
      if (d >= minD) continue;
      if (c.stand && this.alt >= c.h - (c.step ?? 0.5)) {   // low edges are stepped over (rocks 0.3 m, crates 0.5 m)
        if (d < c.r + 0.15) ground = Math.max(ground, c.h);
        continue;
      }
      const away = _v.copy(newUp).sub(c.dir);
      away.addScaledVector(c.dir, -away.dot(c.dir));
      if (away.lengthSq() < 1e-10) away.copy(right);
      away.normalize();
      newUp.copy(c.dir).multiplyScalar(R).addScaledVector(away, minD).normalize();
      const vn = this.vel.dot(away);
      if (vn < 0) this.vel.addScaledVector(away, -vn);
    }

    // rocks: tallest rock surface under the feet. Too tall → blocked (slide along it), low enough → stand on it.
    // returns the tallest rock surface under a point; `rockAt.step` = how high you may step onto it
    // (pebbles: their whole height, big rocks: only low edges)
    const rockAt = (u) => {
      let h = -Infinity, top = null;
      for (const c of colliders) {
        if (!c.rock || c.dir.dot(u) < c.cull) continue;
        const v = sampleRock(c, u, R, TUNING.radius);
        if (v > h) { h = v; top = c; }
      }
      rockAt.top = top;
      return h;
    };
    // pebbles can always be walked onto. Big rocks: only edges ≤ rockStep above where you stand — and
    // standing on a pebble counts as ground level, so pebbles never become a staircase onto boulders.
    const fits = (h) => {
      const c = rockAt.top;
      if (!c) return true;
      if (c.h <= TUNING.pebbleTop) return true;
      const base = this.grounded && this.under?.h <= TUNING.pebbleTop && this.under !== c ? 0 : this.alt;
      return h <= base + TUNING.rockStep;
    };
    let rockH = rockAt(newUp);
    if (!fits(rockH) && fits(rockAt(up))) {
      // try sliding along each tangent axis on its own
      const fwd = new THREE.Vector3().crossVectors(up, right).normalize();
      let best = null;
      for (const axis of [right, fwd]) {
        const v = axis.clone().multiplyScalar(this.vel.dot(axis));
        const u = up.clone().multiplyScalar(R).addScaledVector(v, dt).normalize();
        const h = rockAt(u);
        if (fits(h) && (!best || v.lengthSq() > best.v.lengthSq())) best = { u, h, v };
      }
      if (best) { newUp.copy(best.u); rockH = best.h; this.vel.copy(best.v); }
      else { newUp.copy(up); rockH = rockAt(up); this.vel.set(0, 0, 0); }
    }
    rockAt(newUp);
    const underRock = rockAt.top;
    if (rockH > -Infinity && (fits(rockH) || !fits(rockAt(up)))) ground = Math.max(ground, rockH);   // (second case: spawned inside a rock → pop on top)

    const altBefore = this.alt;
    this.alt += this.vy * dt;
    if (this.alt <= ground) {
      // stepping up onto a pebble: snap the physics, but let the body rise smoothly
      if (this.grounded && ground - altBefore > 0.05) this.stepEase = (this.stepEase ?? 0) - (ground - altBefore);
      this.alt = ground;
      if (this.vy < 0) this.vy = 0;
      this.grounded = true;
      this.under = ground > 0.05 && underRock && ground === rockH ? underRock : null;   // the rock we stand on (if any)
    } else {
      this.grounded = false;
    }

    // parallel-transport everything that lives in the tangent plane
    const q = new THREE.Quaternion().setFromUnitVectors(up, newUp);
    this.vel.applyQuaternion(q);
    this.facing.applyQuaternion(q);
    up.copy(newUp);
    this.pos.copy(up).multiplyScalar(R + this.alt);

    const speed = this.vel.length();
    if (this.aimTimer > 0) {
      this.aimTimer -= dt;
      _v.copy(this.aimDir).addScaledVector(up, -this.aimDir.dot(up)).normalize();
      this.facing.lerp(_v, 1 - Math.exp(-20 * dt));
    } else if (speed > 0.4 && !locked) {
      _v.copy(this.vel).normalize();
      this.facing.lerp(_v, 1 - Math.exp(-12 * dt));
      if (this.facing.lengthSq() < 1e-4) this.facing.copy(_v);
    }
    this.facing.addScaledVector(up, -this.facing.dot(up)).normalize();
    this.sync();

    if (this.lockTimer <= 0) {
      if (this.override && (this.override.t -= dt) > 0) this.play(this.override.name, 0.1);
      else {
        this.override = null;
        const set = ANIMS[this.mode];
        if (this.grounded) {
          // gait with hysteresis: bumping into rocks makes the speed flicker, and every clip switch is a
          // blend (which this rig's separate foot controllers don't blend perfectly), so only switch on clear changes
          const g = this.gait ?? 0;
          this.gait = g === 0 ? (speed > 0.9 ? (speed > 5.5 ? 2 : 1) : 0)
                    : g === 1 ? (speed < 0.25 ? 0 : speed > 5.5 ? 2 : 1)
                    : (speed < 0.25 ? 0 : speed < 4.5 ? 1 : 2);
          this.play(set[this.gait], 0.12);
        }
        // a real jump, or a fall that lasts: the Jump clip. Tiny drops (stepping off a pebble) keep walking.
        else if (this.mode !== 'carry' && (this.jumped || this.airTime > 0.25)) this.playJump();
      }
      // carrying has no idle clip: freeze BoxWalk while standing still
      if (this.current) this.current.timeScale = this.mode === 'carry' && speed < 0.5 ? 0 : 1;
    }
    this.airTime = this.grounded ? 0 : this.airTime + dt;
    if (this.grounded) this.jumped = false;
    this.mixer.update(dt);
    return q;
  }

  // play the Jump clip once and hold its last frame (knees tucked) until landing
  playJump() {
    const a = this.actions[this.mode === 'gun' ? 'Jump_Gun' : 'Jump'];
    if (!a || this.current === a) return;
    a.reset().setLoop(THREE.LoopOnce, 1).fadeIn(0.12).play();
    a.clampWhenFinished = true;
    if (this.current) this.current.fadeOut(0.12);
    this.current = a;
  }

  sync() {
    _x.crossVectors(this.up, this.facing).normalize();
    _m.makeBasis(_x, this.up, this.facing);
    this.root.quaternion.setFromRotationMatrix(_m);
    this.root.position.copy(this.pos);
    if (this.stepEase) {   // smooth step-up onto pebbles
      this.root.position.addScaledVector(this.up, this.stepEase);
      this.stepEase *= 0.75;
      if (Math.abs(this.stepEase) < 0.005) this.stepEase = 0;
    }
  }
}
