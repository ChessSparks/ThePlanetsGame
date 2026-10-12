import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';

const Y = new THREE.Vector3(0, 1, 0);
const deg = THREE.MathUtils.degToRad;

// ── Sphere math ─────────────────────────────────────────────────────────────

export function latLon(lat, lon) {
  const a = deg(lat), b = deg(lon);
  return new THREE.Vector3(Math.cos(a) * Math.sin(b), Math.sin(a), Math.cos(a) * Math.cos(b));
}

// East/north tangent directions at a point on the unit sphere
export function tangentBasis(up) {
  const north = Math.abs(up.y) > 0.999
    ? new THREE.Vector3(0, 0, -1)
    : Y.clone().addScaledVector(up, -up.y).normalize();
  const east = new THREE.Vector3().crossVectors(north, up).normalize();
  return { east, north };
}

export function offsetDir(center, e, n, R) {
  const { east, north } = tangentBasis(center);
  return center.clone().multiplyScalar(R).addScaledVector(east, e).addScaledVector(north, n).normalize();
}

export const angleBetween = (a, b) => Math.acos(THREE.MathUtils.clamp(a.dot(b), -1, 1));

// Angular distance from p to the great-circle arc a→b
function arcDistance(p, a, b) {
  const n = new THREE.Vector3().crossVectors(a, b).normalize();
  const s = p.dot(n);
  const q = p.clone().addScaledVector(n, -s);
  if (q.lengthSq() > 1e-9) {
    q.normalize();
    if (angleBetween(a, q) + angleBetween(q, b) <= angleBetween(a, b) + 1e-4) return Math.abs(Math.asin(THREE.MathUtils.clamp(s, -1, 1)));
  }
  return Math.min(angleBetween(p, a), angleBetween(p, b));
}

export function seededRandom(seed) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

function randomDirInCap(center, maxAngle, rand) {
  const z = 1 - rand() * (1 - Math.cos(maxAngle));
  const s = Math.sqrt(1 - z * z), phi = rand() * Math.PI * 2;
  const { east, north } = tangentBasis(center);
  return center.clone().multiplyScalar(z).addScaledVector(east, s * Math.cos(phi)).addScaledVector(north, s * Math.sin(phi)).normalize();
}

function randomDir(rand) {
  const z = rand() * 2 - 1, phi = rand() * Math.PI * 2, s = Math.sqrt(1 - z * z);
  return new THREE.Vector3(s * Math.cos(phi), z, s * Math.sin(phi));
}

// Orients an object so its local +Y points away from the planet centre
export function surfaceMatrix(dir, radius, yaw = 0, tiltX = 0, tiltZ = 0, scale = 1) {
  const q = new THREE.Quaternion().setFromUnitVectors(Y, dir)
    .multiply(new THREE.Quaternion().setFromAxisAngle(Y, yaw))
    .multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(tiltX, 0, tiltZ)));
  return new THREE.Matrix4().compose(dir.clone().multiplyScalar(radius), q, new THREE.Vector3(scale, scale, scale));
}

export function placeOnSurface(obj, dir, radius, yaw = 0) {
  surfaceMatrix(dir, radius, yaw).decompose(obj.position, obj.quaternion, obj.scale);
}

// ── Level context: resolves zone/lat-lon specs into directions ──────────────

export function createContext(level) {
  const R = level.radius;
  const zones = level.zones.map(z => ({ ...z, dir: latLon(z.lat, z.lon), ang: z.radius / R }));
  const zoneById = Object.fromEntries(zones.map(z => [z.id, z]));

  // { zone, e, n }  or  { zone, toward: 'otherZone', dist, side }  or  { lat, lon }
  const resolve = (spec) => {
    if (spec.lat !== undefined) return latLon(spec.lat, spec.lon);
    const z = zoneById[spec.zone];
    if (spec.toward) {
      const t = zoneById[spec.toward].dir;
      const f = t.clone().addScaledVector(z.dir, -t.dot(z.dir)).normalize();
      const side = new THREE.Vector3().crossVectors(f, z.dir);
      return z.dir.clone().multiplyScalar(R).addScaledVector(f, spec.dist || 0).addScaledVector(side, spec.side || 0).normalize();
    }
    // zone.rotate turns the zone's local grid, e.g. so +e points along the incoming path
    const a = THREE.MathUtils.degToRad(z.rotate || 0), e = spec.e || 0, n = spec.n || 0;
    return offsetDir(z.dir, e * Math.cos(a) - n * Math.sin(a), e * Math.sin(a) + n * Math.cos(a), R);
  };

  const arcs = level.paths.map(([a, b]) => [zoneById[a].dir, zoneById[b].dir]);

  // Meters from the centre line of the nearest path (with a gentle wobble so paths don't look ruler-straight)
  const pathDistance = (p) => {
    let d = Infinity;
    for (const [a, b] of arcs) d = Math.min(d, arcDistance(p, a, b));
    const wobble = 0.6 * Math.sin(p.x * 11 + p.z * 7) + 0.4 * Math.sin(p.y * 13 - p.x * 5);
    return d * R + wobble;
  };

  const zoneAt = (p) => zones.find(z => angleBetween(p, z.dir) < z.ang) || null;

  return { R, level, zones, zoneById, resolve, pathDistance, zoneAt };
}

// ── Planet ground mesh ──────────────────────────────────────────────────────

export function buildPlanet(ctx) {
  const { R, level, zones } = ctx;
  const geo = new THREE.IcosahedronGeometry(R, 30);
  const pos = geo.attributes.position;
  const colors = new Float32Array(pos.count * 3);
  const c = new THREE.Color(), tmp = new THREE.Color();
  const pathColor = new THREE.Color(level.ground.path);
  const patches = level.patches.map(p => ({ dir: ctx.resolve(p.at), ang: p.radius / R, color: new THREE.Color(p.color) }));
  const zoneColors = zones.map(z => new THREE.Color(z.ground));
  const v = new THREE.Vector3(), a = new THREE.Vector3();

  for (let i = 0; i < pos.count; i += 3) {
    v.set(0, 0, 0);
    for (let k = 0; k < 3; k++) v.add(a.fromBufferAttribute(pos, i + k));
    v.normalize();

    c.set(level.ground.base);
    zones.forEach((z, zi) => {
      const w = 1 - THREE.MathUtils.smoothstep(angleBetween(v, z.dir), z.ang * 0.7, z.ang * 1.15);
      if (w > 0) c.lerp(zoneColors[zi], w);
    });
    for (const p of patches) {
      const w = 1 - THREE.MathUtils.smoothstep(angleBetween(v, p.dir), p.ang * 0.6, p.ang);
      if (w > 0) c.lerp(p.color, w);
    }
    const pd = ctx.pathDistance(v);
    if (pd < level.ground.pathWidth) c.lerp(pathColor, pd < level.ground.pathWidth * 0.65 ? 1 : 0.55);

    // low-poly facet variation
    const h = Math.abs(Math.sin(v.x * 127.1 + v.y * 311.7 + v.z * 74.7) * 43758.5453) % 1;
    c.multiplyScalar(0.93 + h * 0.12);
    for (let k = 0; k < 3; k++) tmp.copy(c).toArray(colors, (i + k) * 3);
  }

  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ vertexColors: true, flatShading: true, roughness: 1 }));
  mesh.receiveShadow = true;
  return mesh;
}

// ── Foliage: plants tilt away from the player, pivoting on their root (rigid, no bending) ──

export const FOLIAGE = {
  uPlayer: { value: new THREE.Vector3() },   // player feet
  uTrail: { value: new THREE.Vector3() },    // lagging copy of the player position → plants ease back upright
  uPush: { value: 1 },                       // fades out while the player is in the air
};

const MAX_TILT = 0.7;   // radians (~40°) for a plant with bend: 1
const tiltCache = new Map();
function foliageMaterial(base, amount) {
  const key = base.uuid + amount;
  if (tiltCache.has(key)) return tiltCache.get(key);
  const m = base.clone();
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, FOLIAGE);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
        attribute vec3 aRoot;
        uniform float uPush;
        uniform vec3 uPlayer, uTrail;
        // direction away from a point, scaled by how close it is
        vec3 awayFrom(vec3 src, vec3 upN) {
          vec3 d = aRoot - src;
          d -= upN * dot(d, upN);
          float dist = length(d);
          return (d / max(dist, 0.001)) * (1.0 - smoothstep(0.3, 1.6, dist));
        }
        // rotate v around the plant's root so its top leans away from the player
        vec3 tiltPlant(vec3 v) {
          vec3 upN = normalize(aRoot);
          vec3 t = (awayFrom(uPlayer, upN) + awayFrom(uTrail, upN) * 0.5) * uPush;
          float len = length(t);
          if (len < 0.001) return v;
          float a = min(len, 1.0) * ${(MAX_TILT * amount).toFixed(3)};
          vec3 k = normalize(cross(upN, t / len));
          return v * cos(a) + cross(k, v) * sin(a) + k * dot(k, v) * (1.0 - cos(a));
        }`)
      .replace('#include <beginnormal_vertex>', `#include <beginnormal_vertex>
        objectNormal = tiltPlant(objectNormal);`)
      .replace('#include <begin_vertex>', `#include <begin_vertex>
        transformed = aRoot + tiltPlant(transformed - aRoot);`);
  };
  m.customProgramCacheKey = () => 'foliage-tilt' + amount;
  tiltCache.set(key, m);
  return m;
}

// ── Mesh colliders for rocks ────────────────────────────────────────────────
// Samples a model's triangles into a small height grid (model space, done once per model).
// Each placed rock keeps the grid; the player asks "how tall is the rock under my feet?" (see sampleRock).
const GRID = 7;   // cells across the model's footprint
function heightGrid(scene, box) {
  const size = box.getSize(new THREE.Vector3());
  const cell = Math.max(size.x, size.z) / GRID;
  const heights = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), p = new THREE.Vector3();
  const add = (v) => {
    const ix = Math.floor((v.x - box.min.x) / cell), iz = Math.floor((v.z - box.min.z) / cell);
    const k = ix + ',' + iz;
    if (!(heights.get(k) >= v.y)) heights.set(k, v.y);
  };
  scene.traverse(o => {
    if (!o.isMesh) return;
    const pos = o.geometry.attributes.position, idx = o.geometry.index;
    const count = idx ? idx.count : pos.count;
    const vert = (i, out) => out.fromBufferAttribute(pos, idx ? idx.getX(i) : i).applyMatrix4(o.matrixWorld);
    for (let t = 0; t < count; t += 3) {
      vert(t, a); vert(t + 1, b); vert(t + 2, c);
      const edge = Math.max(a.distanceTo(b), b.distanceTo(c), c.distanceTo(a));
      const n = Math.min(14, Math.max(1, Math.ceil(edge / (cell * 0.4))));
      for (let u = 0; u <= n; u++) for (let v = 0; v <= n - u; v++) {
        p.copy(a).addScaledVector(b.clone().sub(a), u / n).addScaledVector(c.clone().sub(a), v / n);
        add(p);
      }
    }
  });
  const grid = new Map();
  let top = 0;
  for (const [k, h] of heights) {
    const [ix, iz] = k.split(',').map(Number);
    grid.set(ix * 1000 + iz, h);
    top = Math.max(top, h);
  }
  return { cell, minX: box.min.x, minZ: box.min.z, grid, top };
}

// Height (above the ground) of a placed rock under a circle of radius `rad` around surface point `u`, or -Infinity
const _rp = new THREE.Vector3();
export function sampleRock(c, u, R, rad) {
  _rp.copy(u).multiplyScalar(R).applyMatrix4(c.inv);   // into the rock's model space
  const g = c.hgrid, rr = rad / c.scale;
  const x0 = Math.floor((_rp.x - rr - g.minX) / g.cell), x1 = Math.floor((_rp.x + rr - g.minX) / g.cell);
  const z0 = Math.floor((_rp.z - rr - g.minZ) / g.cell), z1 = Math.floor((_rp.z + rr - g.minZ) / g.cell);
  let h = -Infinity;
  for (let ix = x0; ix <= x1; ix++) for (let iz = z0; iz <= z1; iz++) {
    const v = g.grid.get(ix * 1000 + iz);
    if (v !== undefined && v > h) h = v;
  }
  return h === -Infinity ? h : h * c.scale - c.sink;
}

// ── Props: hand-placed, then scattered, then merged into few draw calls ─────

export function buildProps(ctx, gltfs, MODELS) {
  const { R, level } = ctx;
  const rand = seededRandom(level.seed);
  const info = {};
  for (const key of Object.keys(MODELS)) {
    if (key === 'astronaut') continue;
    const scene = gltfs[key].scene;
    if (MODELS[key].doubleSide) scene.traverse(o => { if (o.isMesh) o.material.side = THREE.DoubleSide; });   // single-sided kit pieces (walls): visible from inside too
    if (MODELS[key].glow) scene.traverse(o => {
      if (o.isMesh && o.material.emissive) { o.material.emissive.set(MODELS[key].glow); o.material.emissiveIntensity = 0.55; }
    });
    scene.updateMatrixWorld(true);
    let box = new THREE.Box3().setFromObject(scene);
    // some downloaded models sit far from their own origin (e.g. a rock pack exported 39 m to the side) → re-centre them
    const c = box.getCenter(new THREE.Vector3()), sz = box.getSize(new THREE.Vector3());
    if (Math.hypot(c.x, c.z) > Math.max(sz.x, sz.z, 1)) {
      console.warn(`[models] ${key} was ${Math.hypot(c.x, c.z).toFixed(1)} m off-centre, re-centred`);
      scene.children.forEach(ch => { ch.position.x -= c.x; ch.position.z -= c.z; });
      scene.updateMatrixWorld(true);
      box = new THREE.Box3().setFromObject(scene);
    }
    info[key] = { box, size: box.getSize(new THREE.Vector3()) };
    if (MODELS[key].block) info[key].grid = heightGrid(scene, box);
  }

  const instances = [], occupied = [], colliders = [], byId = {}, dynamic = {}, doors = [];
  const group = new THREE.Group();
  const surf = (dir) => dir.clone().multiplyScalar(R);
  const isFree = (dir, r) => { const p = surf(dir); return occupied.every(o => o.p.distanceTo(p) > o.r + r); };
  const footprint = (key, scale) => Math.max(info[key].size.x, info[key].size.z) * 0.5 * scale;
  const pickScale = (s) => Array.isArray(s) ? THREE.MathUtils.lerp(s[0], s[1], rand()) : (s ?? 1);
  const isSolid = (key) => MODELS[key].trunk || MODELS[key].block;

  function place(key, dir, opts = {}) {
    const scale = opts.scale ?? 1;
    // `ground` models have their base away from their origin (floating above, or buried below): sit them on the surface
    const sink = (opts.sink ?? 0.05) + (MODELS[key].ground ? info[key].box.min.y * scale : 0);
    const yaw = opts.yawRad ?? deg(opts.yaw ?? rand() * 360);
    const tilt = opts.tilt ?? [0, 0];
    const m = surfaceMatrix(dir, R - sink, yaw, deg(tilt[0]), deg(tilt[1]), scale);
    if (opts.offset) m.multiply(new THREE.Matrix4().makeTranslation(...opts.offset));   // model-space nudge
    const stretch = opts.stretch ?? 1;   // stretch along the model's X (wall length), to close gaps in wall rings
    if (stretch !== 1) m.multiply(new THREE.Matrix4().makeScale(stretch, 1, 1));
    const meta = MODELS[key], { box, size } = info[key];

    let col = null;
    const tag = opts.id;
    if (opts.noCollider) col = null;
    else if (opts.collider) col = { r: opts.collider.r, h: Infinity };
    else if (meta.trunk) col = { r: meta.trunk * scale, h: Infinity, canopy: Math.max(size.x, size.z) * 0.4 * scale, top: box.max.y * scale };
    else if (meta.block) {
      // rock: mesh-shaped height grid (see heightGrid / sampleRock)
      const g = info[key].grid, top = g.top * scale - sink;
      if (top >= 0.3) {   // pebble-sized rocks are walked over
        const r = Math.max(size.x, size.z) * 0.5 * scale;
        colliders.push({ rock: true, dir: dir.clone(), cull: Math.cos((r + 2) / R), r, h: top, hgrid: g, inv: m.clone().invert(), scale, sink, tag });
      }
      col = { h: top, multi: true };
    }
    else if (meta.box) {
      // rectangular footprint (buildings, crates): a row of circles along the long side, roof can be stood on
      const ax = new THREE.Vector3(), ay = new THREE.Vector3(), az = new THREE.Vector3();
      m.extractBasis(ax, ay, az);
      ax.normalize(); az.normalize();
      const w = size.x * scale * stretch, d = size.z * scale;
      const center = dir.clone().multiplyScalar(R)
        .addScaledVector(ax, (box.min.x + box.max.x) / 2 * scale * stretch)
        .addScaledVector(az, (box.min.z + box.max.z) / 2 * scale);
      const long = w > d ? ax : az, L = Math.max(w, d), S = Math.min(w, d);
      const n = Math.max(1, Math.round(L / S)), r = S / 2 * 0.95, h = Math.max(0.2, (box.max.y * scale - sink) * 0.95);
      for (let i = 0; i < n; i++) {
        const off = n === 1 ? 0 : -(L / 2 - r) + i * (L - 2 * r) / (n - 1);
        const cd = center.clone().addScaledVector(long, off).normalize();
        colliders.push({ dir: cd, cull: Math.cos((r + 2) / R), r, h, stand: true, tag });
      }
      col = { h, multi: true };
    }
    if (col && !col.multi) colliders.push({ dir: dir.clone(), cull: Math.cos((col.r + 2) / R), tag, ...col });

    if (opts.dynamic) {
      const obj = gltfs[key].scene.clone(true);
      m.decompose(obj.position, obj.quaternion, obj.scale);
      obj.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
      group.add(obj);
      dynamic[opts.id] = obj;
    } else {
      instances.push({ key, m });
    }
    const rec = { key, dir: dir.clone(), scale, sink, h: col?.h ?? box.max.y * scale };
    if (opts.id) byId[opts.id] = rec;
    return rec;
  }

  // yaw (radians) that turns a model's +X axis along `tangent` at `dir` (for walls and other aligned pieces)
  const yawAlong = (dir, tangent) => {
    const probe = new THREE.Object3D();
    surfaceMatrix(dir, R, 0).decompose(probe.position, probe.quaternion, probe.scale);
    probe.updateMatrixWorld(true);
    const local = probe.worldToLocal(dir.clone().multiplyScalar(R).add(tangent));
    return Math.atan2(-local.z, local.x);
  };
  const tangentTo = (from, to) => to.clone().addScaledVector(from, -to.dot(from)).normalize();
  // heading in a zone's e/n grid (degrees: 0 = +e, 90 = +n)
  const headingYaw = (at, dir, heading) => {
    const h = deg(heading), e = at.e || 0, n = at.n || 0;
    return yawAlong(dir, tangentTo(dir, ctx.resolve({ zone: at.zone, e: e + Math.cos(h), n: n + Math.sin(h) })));
  };

  const onPath = (dir, extra = 0) => ctx.pathDistance(dir) < level.ground.pathWidth + extra;

  // 1. hand-placed
  for (let spec of level.props) {
    if (spec.model) {
      const dir = ctx.resolve(spec.at);
      const keys = [].concat(spec.model);
      const yaw = spec.yaw ?? rand() * 360;
      if (spec.heading != null) spec = { ...spec, yawRad: headingYaw(spec.at, dir, spec.heading) };
      // extra models sit centred on top of the first one (e.g. a solar panel on its stand)
      const base = info[keys[0]].box, bc = base.getCenter(new THREE.Vector3());
      keys.forEach((k, i) => {
        if (i === 0) return place(k, dir, { ...spec, yaw });
        const b = info[k].box, c = b.getCenter(new THREE.Vector3());
        place(k, dir, { ...spec, yaw, noCollider: true, id: undefined, offset: [bc.x - c.x, base.max.y - b.min.y - 0.12, bc.z - c.z] });
      });
      occupied.push({ p: surf(dir), r: footprint(keys[0], spec.scale ?? 1) * 0.6 });
    } else if (spec.ring && spec.doors) {
      // a ring of walls with doorways: a doorway faces each listed zone, walls fill the arcs between them
      const c = spec.at, Rr = spec.radius;
      const posAt = (a) => ctx.resolve({ zone: c.zone, e: (c.e || 0) + Math.cos(a) * Rr, n: (c.n || 0) + Math.sin(a) * Rr });
      const tangentAt = (a) => tangentTo(posAt(a), posAt(a + 0.02));
      const doorAngles = spec.doors.map(d => {
        const want = ctx.resolve({ zone: c.zone, toward: typeof d === 'string' ? d : d.toward, dist: Rr });
        let best = 0, bd = Infinity;
        for (let i = 0; i < 720; i++) { const a = (i / 720) * Math.PI * 2, dd = posAt(a).angleTo(want); if (dd < bd) { bd = dd; best = a; } }
        return { a: best, spec: typeof d === 'string' ? { toward: d } : d };
      }).sort((x, y) => x.a - y.a);
      const half = 2 / Rr;   // a doorway piece is 4 m wide
      for (let i = 0; i < doorAngles.length; i++) {
        const a0 = doorAngles[i].a + half, a1 = (i + 1 < doorAngles.length ? doorAngles[i + 1].a : doorAngles[0].a + Math.PI * 2) - half;
        const wallLen = info[spec.ring].size.x;
        const n = Math.max(0, Math.round(((a1 - a0) * Rr) / wallLen));
        const step = (a1 - a0) / n, depth = info[spec.ring].size.z;
        // chord of each slot, plus enough overlap that the outer faces still touch on the curve
        const stretch = (2 * Rr * Math.sin(step / 2) + depth * step + 0.12) / wallLen;
        for (let k = 0; k < n; k++) {
          const a = a0 + (k + 0.5) * step, dir = posAt(a);
          place(spec.ring, dir, { yawRad: yawAlong(dir, tangentAt(a)), sink: 0.02, stretch });
          occupied.push({ p: surf(dir), r: 1.5 });
        }
      }
      for (const { a, spec: ds } of doorAngles) {
        const dir = posAt(a), t = tangentAt(a), yawRad = yawAlong(dir, t);
        place(spec.doorFrame, dir, { yawRad, sink: 0.02, noCollider: true });
        occupied.push({ p: surf(dir), r: 2.5 });
        const at = (off) => dir.clone().multiplyScalar(R).addScaledVector(t, off).normalize();
        for (const off of [-1.95, -1.4, 1.4, 1.95]) colliders.push({ dir: at(off), cull: Math.cos(2.3 / R), r: 0.32, h: Infinity });   // frame sides
        const door = gltfs[spec.door].scene.clone(true);
        door.traverse(o => { if (o.isMesh) { o.castShadow = true; o.receiveShadow = true; } });
        surfaceMatrix(dir, R - 0.02, yawRad).decompose(door.position, door.quaternion, door.scale);
        group.add(door);
        const lockTag = ds.lockedUntil ? 'doorLock:' + doors.length : null;
        if (lockTag) for (const off of [-0.55, 0, 0.55]) colliders.push({ dir: at(off), cull: Math.cos(2.3 / R), r: 0.38, h: Infinity, tag: lockTag });
        doors.push({ obj: door, dir, base: door.position.clone(), slide: t.clone(), lockedUntil: ds.lockedUntil, lockTag, open: 0 });
      }
    } else if (spec.ring) {
      const center = ctx.resolve(spec.at);
      const c = ctx.zoneById[spec.at.zone] ? spec.at : null;
      for (let i = 0; i < spec.count; i++) {
        if (spec.skip?.includes(i)) continue;
        const ang = (i / spec.count) * Math.PI * 2;
        const dir = c && !c.toward ? ctx.resolve({ zone: c.zone, e: (c.e || 0) + Math.cos(ang) * spec.radius, n: (c.n || 0) + Math.sin(ang) * spec.radius })
                      : offsetDir(center, Math.cos(ang) * spec.radius, Math.sin(ang) * spec.radius, R);
        if ((isSolid(spec.ring) || spec.skipPath) && onPath(dir, spec.skipPath ?? 1)) continue;
        const scale = pickScale(spec.scale);
        let yawRad;
        if (spec.tangent) {   // wall rings: each piece runs along the circle
          const a2 = ang + 0.02, nxt = c && !c.toward ? ctx.resolve({ zone: c.zone, e: (c.e || 0) + Math.cos(a2) * spec.radius, n: (c.n || 0) + Math.sin(a2) * spec.radius })
                                                      : offsetDir(center, Math.cos(a2) * spec.radius, Math.sin(a2) * spec.radius, R);
          yawRad = yawAlong(dir, tangentTo(dir, nxt)) + deg(spec.yaw ?? 0);
        }
        let stretch;
        if (spec.tangent) {
          const step = (Math.PI * 2) / spec.count, len = info[spec.ring].size.x * scale, depth = info[spec.ring].size.z * scale;
          stretch = Math.max(1, (2 * spec.radius * Math.sin(step / 2) + depth * step + 0.12) / len);
        }
        place(spec.ring, dir, { scale, sink: spec.sink, yawRad, yaw: spec.tangent ? undefined : spec.yaw, stretch });
        occupied.push({ p: surf(dir), r: footprint(spec.ring, scale) * 0.4 });
      }
    } else if (spec.line) {
      const a = ctx.resolve(spec.from), b = ctx.resolve(spec.to);
      for (let i = 0; i < spec.count; i++) {
        const t = spec.count === 1 ? 0.5 : i / (spec.count - 1);
        let dir = a.clone().lerp(b, t).normalize();
        const j = spec.jitter ?? 0;
        dir = offsetDir(dir, (rand() - 0.5) * 2 * j, (rand() - 0.5) * 2 * j, R);
        const scale = pickScale(spec.scale);
        place(spec.line, dir, { scale });
        occupied.push({ p: surf(dir), r: 0.3 });
      }
    }
  }

  // 2. cells + keep-clear areas
  const cells = (level.cells || []).map(c => c.on
    ? { ...c, dir: byId[c.on].dir.clone(), alt: byId[c.on].h + 1.1 }
    : { ...c, dir: ctx.resolve(c.at), alt: 1.2 });
  for (const c of cells) occupied.push({ p: surf(c.dir), r: 2.2 });
  occupied.push({ p: surf(ctx.resolve(level.start)), r: 3 });
  for (const it of level.items || []) if (it.at) occupied.push({ p: surf(ctx.resolve(it.at)), r: 1.5 });
  const clearings = (level.clearings || []).map(c => ({ dir: ctx.resolve(c.at), r: c.radius }));

  // 3. scatter
  for (const rule of level.scatter) {
    const zone = rule.zone ? ctx.zoneById[rule.zone] : null;
    const spacing = rule.spacing ?? 1;
    let placed = 0, tries = 0;
    while (placed < rule.count && tries++ < rule.count * 40) {
      const dir = zone ? randomDirInCap(zone.dir, zone.ang, rand) : randomDir(rand);
      if (!zone && ctx.zones.some(z => angleBetween(dir, z.dir) < z.ang + 2 / R)) continue;
      if (!rule.allowPath && onPath(dir, rule.pathClear ?? spacing * 0.5 + 0.4)) continue;
      const p = surf(dir);
      const key = rule.models[Math.floor(rand() * rule.models.length)];
      if (clearings.some(c => surf(c.dir).distanceTo(p) < c.r + (isSolid(key) ? spacing * 0.5 : 0))) continue;
      if (!isFree(dir, spacing * 0.5)) continue;
      place(key, dir, { scale: pickScale(rule.scale), tilt: [(rand() - 0.5) * 8, (rand() - 0.5) * 8] });
      occupied.push({ p, r: spacing * 0.5 });
      placed++;
    }
  }

  // 4. merge static props by material → a few dozen draw calls instead of thousands
  const buckets = new Map();
  const mw = new THREE.Matrix4();
  for (const inst of instances) {
    gltfs[inst.key].scene.traverse(o => {
      if (!o.isMesh || Array.isArray(o.material)) return;
      const g = o.geometry.clone().applyMatrix4(mw.multiplyMatrices(inst.m, o.matrixWorld));
      const bend = MODELS[inst.key].bend;
      if (bend) {
        const root = new THREE.Vector3().setFromMatrixPosition(inst.m);
        const arr = new Float32Array(g.attributes.position.count * 3);
        for (let i = 0; i < arr.length; i += 3) root.toArray(arr, i);
        g.setAttribute('aRoot', new THREE.BufferAttribute(arr, 3));
      }
      const k = o.material.uuid + '|' + Object.keys(g.attributes).sort().join(',') + (g.index ? '|i' : '');
      if (!buckets.has(k)) buckets.set(k, { material: bend ? foliageMaterial(o.material, bend) : o.material, bend, geos: [] });
      buckets.get(k).geos.push(g);
    });
  }
  for (const { material, bend, geos } of buckets.values()) {
    const mesh = new THREE.Mesh(mergeGeometries(geos, false), material);
    if (bend) mesh.customDepthMaterial = foliageMaterial(new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking }), bend);   // shadows slide too
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    group.add(mesh);
    geos.forEach(g => g.dispose());
  }

  return { group, colliders, byId, dynamic, cells, count: instances.length, info, doors };
}

// ── Sky ─────────────────────────────────────────────────────────────────────

export function makeAtmosphere(R, color = '#79c4ff') {
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(color) } },
    vertexShader: `varying vec3 vN; varying vec3 vV;
      void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vN = normalize(normalMatrix*normal); vV = normalize(-mv.xyz); gl_Position = projectionMatrix*mv; }`,
    fragmentShader: `uniform vec3 color; varying vec3 vN; varying vec3 vV;
      void main(){ float f = pow(1.0 - abs(dot(vN, vV)), 3.0); gl_FragColor = vec4(color, f * 0.7); }`,
    side: THREE.BackSide, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false,
  });
  return new THREE.Mesh(new THREE.SphereGeometry(R * 1.25, 64, 32), mat);
}

// Banded ring around the planet the player stands on
export function makePlanetRing(R, ring) {
  const mat = new THREE.ShaderMaterial({
    uniforms: { color: { value: new THREE.Color(ring.color) }, inner: { value: ring.inner * R }, outer: { value: ring.outer * R } },
    vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `uniform vec3 color; uniform float inner, outer; varying vec2 vP;
      void main(){
        float t = (length(vP) - inner) / (outer - inner);
        float bands = 0.55 + 0.45 * sin(t * 40.0) * sin(t * 13.0 + 1.3);
        float edge = smoothstep(0.0, 0.08, t) * smoothstep(1.0, 0.85, t);
        gl_FragColor = vec4(color * (0.8 + 0.4 * bands), edge * bands * 0.55);
      }`,
    transparent: true, side: THREE.DoubleSide, depthWrite: false,
  });
  const mesh = new THREE.Mesh(new THREE.RingGeometry(ring.inner * R, ring.outer * R, 160, 1), mat);
  mesh.rotation.set(deg(90 + (ring.tilt ?? 20)), deg(ring.yaw ?? 0), 0);
  return mesh;
}

export function makeStars(count = 3000, radius = 1800, brightness = 1) {
  const rand = seededRandom(99);
  const pos = new Float32Array(count * 3), col = new Float32Array(count * 3);
  const c = new THREE.Color();
  for (let i = 0; i < count; i++) {
    randomDir(rand).multiplyScalar(radius).toArray(pos, i * 3);
    c.setHSL(0.55 + rand() * 0.15, 0.4, (0.6 + rand() * 0.4) * brightness).toArray(col, i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  // round dots (a soft disc texture) rather than square pixels
  const cv = document.createElement('canvas');
  cv.width = cv.height = 32;
  const cx = cv.getContext('2d');
  const grd = cx.createRadialGradient(16, 16, 0, 16, 16, 16);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.5, 'rgba(255,255,255,0.6)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  cx.fillStyle = grd;
  cx.fillRect(0, 0, 32, 32);
  return new THREE.Points(geo, new THREE.PointsMaterial({ size: 2.4, sizeAttenuation: false, vertexColors: true, map: new THREE.CanvasTexture(cv), transparent: true, depthWrite: false }));
}

// Other planets hanging in the sky (the previous / next levels)
export function makeSkyPlanets(list = []) {
  const g = new THREE.Group();
  for (const p of list) {
    const planet = new THREE.Group();
    planet.add(new THREE.Mesh(new THREE.IcosahedronGeometry(p.radius, 3),
      new THREE.MeshLambertMaterial({ color: p.color, emissive: p.emissive ?? '#000000', flatShading: true })));
    if (p.ring) {
      const ring = new THREE.Mesh(new THREE.RingGeometry(p.ring.inner, p.ring.outer, 64),
        new THREE.MeshBasicMaterial({ color: p.ring.color, transparent: true, opacity: 0.35, side: THREE.DoubleSide }));
      ring.rotation.set(deg(70), deg(15), 0);
      planet.add(ring);
    }
    planet.position.fromArray(p.pos);
    g.add(planet);
  }
  return g;
}
