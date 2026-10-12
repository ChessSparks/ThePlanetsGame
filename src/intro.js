// Studio intro: "SPARKS DEVELOPMENT STUDIO", ~10 s, before the main menu.
// One spark ignites, bursts, and its embers fly together into the word SPARKS; the letters catch
// fire, the studio line appears, then everything blows away as embers and the menu fades in.
// Plays once per browser session (sessionStorage). Any key / click / tap skips it.
// Plain 2D canvas, no libraries, so it starts instantly while the menu's 3D scene loads behind it.

(() => {
  const KEY = 'planets.introSeen';
  let seen = false;
  try { seen = sessionStorage.getItem(KEY) === '1' || new URLSearchParams(location.search).has('nointro'); } catch { /* storage blocked: play it */ }
  const body = document.body;
  if (seen) { body.classList.remove('intro'); return; }
  try { sessionStorage.setItem(KEY, '1'); } catch { /* fine */ }
  body.classList.add('intro');

  const root = document.createElement('div');
  root.id = 'studioIntro';
  root.innerHTML = '<canvas></canvas><div class="skip">Press any key to skip</div>';
  body.appendChild(root);
  const cv = root.querySelector('canvas'), cx = cv.getContext('2d');
  let W = 0, H = 0, DPR = 1;

  const TOTAL = 10.2;
  const rand = (a, b) => a + Math.random() * (b - a);
  const clamp01 = (x) => Math.max(0, Math.min(1, x));
  const ease = (x) => { x = clamp01(x); return x * x * (3 - 2 * x); };
  const easeOut = (x) => 1 - (1 - clamp01(x)) ** 3;

  // ── layout: sample the word into target points ─────────────────────────────
  let targets = [], fontSize = 100, textY = 0, subY = 0, maskCv = null;
  const sweepCv = document.createElement('canvas'), sweepCx = sweepCv.getContext('2d');
  function layout() {
    DPR = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    cv.width = W * DPR; cv.height = H * DPR;
    cv.style.width = W + 'px'; cv.style.height = H + 'px';
    cx.setTransform(DPR, 0, 0, DPR, 0, 0);
    fontSize = Math.min(W * 0.17, H * 0.24, 230);
    textY = H * 0.47;
    subY = textY + fontSize * 0.62;
    const off = document.createElement('canvas');
    off.width = Math.ceil(W); off.height = Math.ceil(H);
    const o = off.getContext('2d');
    o.fillStyle = '#fff';
    o.textAlign = 'center';
    o.textBaseline = 'middle';
    o.font = `700 ${fontSize}px Rajdhani, 'Segoe UI', sans-serif`;
    if ('letterSpacing' in o) o.letterSpacing = `${fontSize * 0.06}px`;
    o.fillText('SPARKS', W / 2, textY);
    maskCv = off;
    sweepCv.width = off.width; sweepCv.height = off.height;
    const img = o.getImageData(0, 0, off.width, off.height).data;
    const step = Math.max(3, Math.round(fontSize / 34));
    targets = [];
    for (let y = 0; y < off.height; y += step) for (let x = 0; x < off.width; x += step) {
      if (img[(y * off.width + x) * 4 + 3] > 128) targets.push({ x: x + rand(-0.6, 0.6), y: y + rand(-0.6, 0.6) });
    }
    // shuffle, keep a sensible amount
    for (let i = targets.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [targets[i], targets[j]] = [targets[j], targets[i]]; }
    targets.length = Math.min(targets.length, 2600);
  }
  layout();

  // ── particles ──────────────────────────────────────────────────────────────
  const cx0 = () => W / 2, cy0 = () => H * 0.47;
  const parts = targets.map((t) => ({
    tx: t.x, ty: t.y, x: cx0(), y: cy0(), vx: 0, vy: 0,
    delay: rand(0, 0.9), heat: 1, size: rand(0.8, 1.9), seed: Math.random() * 100, released: false,
  }));
  const free = [];   // loose embers: sputter, crackles, drift
  function ember(x, y, vx, vy, life, size = rand(0.8, 2), heat = 1) { free.push({ x, y, vx, vy, life, age: 0, size, heat }); }

  // hot white → yellow → orange → deep red, by heat 1 → 0
  function fire(h, a) {
    h = clamp01(h);
    const r = 255, g = Math.round(90 + 165 * Math.min(1, h * 1.3)), b = Math.round(Math.max(0, h - 0.55) * 2.2 * 230 + 20);
    return `rgba(${r},${g},${b},${a})`;
  }

  // background: deep space with a faint warm haze and a slow star field
  const stars = [...Array(140)].map(() => ({ x: Math.random(), y: Math.random(), s: rand(0.3, 1.3), tw: rand(0, 6) }));

  let t0 = null, done = false, burst = false, flashT = -1, lastCrackle = 0;
  function frame(now) {
    if (done) return;
    if (t0 === null) t0 = now;
    const t = (now - t0) / 1000;
    const dt = Math.min(0.05, (now - (frame.last ?? now)) / 1000);
    frame.last = now;

    // background
    cx.globalCompositeOperation = 'source-over';
    cx.globalAlpha = 1;
    const bg = cx.createRadialGradient(W / 2, H * 0.47, 0, W / 2, H * 0.47, Math.max(W, H) * 0.75);
    const warm = ease((t - 1.3) / 2.5) * (1 - ease((t - 8.4) / 1.4));
    bg.addColorStop(0, `rgb(${18 + 30 * warm},${10 + 10 * warm},${16})`);
    bg.addColorStop(1, '#030308');
    cx.fillStyle = bg;
    cx.fillRect(0, 0, W, H);
    for (const s of stars) {
      cx.fillStyle = `rgba(200,210,255,${(0.15 + 0.25 * Math.sin(t * 2 + s.tw) ** 2) * (1 - warm * 0.5)})`;
      cx.fillRect(s.x * W, s.y * H, s.s, s.s);
    }

    cx.globalCompositeOperation = 'lighter';

    // A. 0–1.4 s: a single spark sputters to life
    if (t < 1.45) {
      const k = ease(t / 1.2);
      const fl = 0.6 + 0.4 * Math.sin(t * 47) * Math.sin(t * 13);
      const r = (3 + 10 * k) * (0.8 + fl * 0.4);
      glow(cx0(), cy0(), r * 6, fire(1, 0.25 * k));
      glow(cx0(), cy0(), r * 2, fire(1, 0.8 * k));
      if (Math.random() < 0.5 * k + 0.1) { const a = rand(0, Math.PI * 2), sp = rand(40, 180) * k; ember(cx0(), cy0(), Math.cos(a) * sp, Math.sin(a) * sp - 30, rand(0.3, 0.8)); }
    }
    // B. the burst
    if (t >= 1.4 && !burst) {
      burst = true;
      flashT = t;
      for (const p of parts) {
        const a = rand(0, Math.PI * 2), sp = rand(120, 900);
        p.vx = Math.cos(a) * sp; p.vy = Math.sin(a) * sp * 0.75;
      }
      for (let i = 0; i < 160; i++) { const a = rand(0, Math.PI * 2), sp = rand(200, 1100); ember(cx0(), cy0(), Math.cos(a) * sp, Math.sin(a) * sp, rand(0.5, 1.3), rand(1, 2.6)); }
    }
    if (flashT >= 0 && t - flashT < 0.6) {
      const k = 1 - (t - flashT) / 0.6;
      glow(cx0(), cy0(), Math.max(W, H) * 0.6 * (1 - k * 0.5), `rgba(255,220,170,${0.55 * k})`);
    }

    // C/D/E. the word
    if (burst) {
      const gather = t - 2.0;       // springs pull the embers onto the letters
      const release = t - 8.3;      // …and let them go
      for (const p of parts) {
        if (release > 0 && !p.released && Math.random() < dt * 3.2 + release * 0.08) {
          p.released = true;
          p.vx = rand(-60, 60) + (p.tx - W / 2) * 0.25; p.vy = rand(-260, -60);
        }
        if (p.released) {
          p.vx += Math.sin(p.seed + t * 3) * 40 * dt + 30 * dt;
          p.vy -= 120 * dt;
          p.vx *= 0.99; p.vy *= 0.99;
          p.heat = Math.max(0, p.heat - dt * 0.7);
        } else if (gather > p.delay) {
          const k = easeOut((gather - p.delay) / 1.4);
          const sx = 18 + 160 * k;                       // spring stiffness grows
          p.vx += ((p.tx - p.x) * sx - p.vx * (6 + 10 * k)) * dt;
          p.vy += ((p.ty - p.y) * sx - p.vy * (6 + 10 * k)) * dt;
          // a little life once they've landed
          const settle = clamp01((gather - p.delay - 1.4) / 1);
          p.heat = 1 - 0.55 * settle + 0.25 * settle * Math.max(0, Math.sin(t * 3 + p.seed));
        } else {
          p.vx *= 1 - 2.6 * dt; p.vy *= 1 - 2.6 * dt;
          p.vy += 30 * dt;
          p.heat = Math.max(0.5, p.heat - dt * 0.4);
        }
        p.x += p.vx * dt; p.y += p.vy * dt;
        const a = p.released ? p.heat : 1;
        if (a <= 0.01) continue;
        const sp = Math.hypot(p.vx, p.vy);
        if (sp > 60) {   // fast ones are streaks
          const l = Math.min(26, sp * 0.03);
          cx.strokeStyle = fire(p.heat, 0.8 * a);
          cx.lineWidth = p.size;
          cx.beginPath();
          cx.moveTo(p.x, p.y);
          cx.lineTo(p.x - (p.vx / sp) * l, p.y - (p.vy / sp) * l);
          cx.stroke();
        } else {
          cx.fillStyle = fire(p.heat, 0.85 * a);
          cx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
        }
      }

      // the solid word: fades in under the embers once they've arrived
      const solid = ease((t - 4.0) / 1.2) * (1 - ease((t - 8.2) / 1.0));
      if (solid > 0.01) {
        cx.globalCompositeOperation = 'source-over';
        cx.save();
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        cx.font = `700 ${fontSize}px Rajdhani, 'Segoe UI', sans-serif`;
        if ('letterSpacing' in cx) cx.letterSpacing = `${fontSize * 0.06}px`;
        const grd = cx.createLinearGradient(0, textY - fontSize / 2, 0, textY + fontSize / 2);
        grd.addColorStop(0, '#fff6d8');
        grd.addColorStop(0.45, '#ffc46a');
        grd.addColorStop(1, '#ff5a1e');
        cx.shadowColor = 'rgba(255,120,40,0.9)';
        cx.shadowBlur = fontSize * 0.25;
        cx.globalAlpha = solid;
        cx.fillStyle = grd;
        cx.fillText('SPARKS', W / 2, textY);
        // a bright sweep across the letters (a flint strike)
        cx.restore();
        const sweep = (t - 5.0) / 0.9;
        if (sweep > 0 && sweep < 1) {
          // light the letters only: a gradient band, cut to the word's shape, added on top
          const sx = W * 0.15 + W * 0.7 * sweep;
          sweepCx.globalCompositeOperation = 'copy';
          sweepCx.drawImage(maskCv, 0, 0);
          sweepCx.globalCompositeOperation = 'source-in';
          const sg = sweepCx.createLinearGradient(sx - fontSize * 0.8, 0, sx + fontSize * 0.8, 0);
          sg.addColorStop(0, 'rgba(255,255,255,0)');
          sg.addColorStop(0.5, 'rgba(255,250,235,0.95)');
          sg.addColorStop(1, 'rgba(255,255,255,0)');
          sweepCx.fillStyle = sg;
          sweepCx.fillRect(0, 0, maskCv.width, maskCv.height);
          cx.globalCompositeOperation = 'lighter';
          cx.globalAlpha = solid;
          cx.drawImage(sweepCv, 0, 0, W, H);
          cx.globalAlpha = 1;
        }

        // studio line, letter by letter
        cx.save();
        cx.globalCompositeOperation = 'source-over';
        cx.textAlign = 'center';
        cx.textBaseline = 'middle';
        const subSize = Math.max(12, fontSize * 0.16);
        cx.font = `500 ${subSize}px Rajdhani, 'Segoe UI', sans-serif`;
        if ('letterSpacing' in cx) cx.letterSpacing = `${subSize * 0.55}px`;
        const line = 'DEVELOPMENT STUDIO';
        const shown = Math.floor(clamp01((t - 5.3) / 1.1) * line.length);
        cx.globalAlpha = solid * 0.9;
        cx.fillStyle = '#ffd9b0';
        cx.shadowColor = 'rgba(255,140,60,0.6)';
        cx.shadowBlur = 10;
        cx.fillText(line.slice(0, shown).padEnd(line.length, ' '), W / 2, subY);
        // thin rules either side
        const rw = Math.min(W * 0.18, fontSize * 1.1) * ease((t - 5.2) / 1.0);
        cx.fillStyle = 'rgba(255,170,90,0.7)';
        cx.fillRect(W / 2 - fontSize * 2.0 - rw, subY - 0.5, rw, 1);
        cx.fillRect(W / 2 + fontSize * 2.0, subY - 0.5, rw, 1);
        cx.restore();
        cx.globalCompositeOperation = 'lighter';

        // the mark: a four-point spark above the word, slowly turning
        const mk = ease((t - 4.4) / 0.8) * (1 - ease((t - 8.2) / 0.8));
        if (mk > 0.01) star(W / 2, textY - fontSize * 0.78, fontSize * 0.2 * (1 + 0.08 * Math.sin(t * 4)), t * 0.6, mk);
      }

      // crackles: sparks jumping off the letters while they burn
      if (t > 4.2 && t < 8.3 && t - lastCrackle > 0.05) {
        lastCrackle = t;
        const p = parts[Math.floor(Math.random() * parts.length)];
        for (let i = 0; i < 4; i++) ember(p.tx, p.ty, rand(-90, 90), rand(-220, -60), rand(0.3, 0.7), rand(0.8, 1.6));
      }
      // drifting embers rising from below the whole time
      if (Math.random() < 0.35) ember(rand(0, W), H + 5, rand(-15, 15), rand(-90, -40), rand(3, 6), rand(0.8, 1.8), rand(0.4, 0.8));
    }

    // loose embers
    for (let i = free.length - 1; i >= 0; i--) {
      const e = free[i];
      e.age += dt;
      if (e.age > e.life) { free.splice(i, 1); continue; }
      e.vx *= 1 - 1.4 * dt; e.vy = e.vy * (1 - 1.4 * dt) + 160 * dt * (e.life < 2 ? 1 : -0.1);
      e.x += e.vx * dt; e.y += e.vy * dt;
      const k = 1 - e.age / e.life;
      cx.fillStyle = fire(e.heat * k, k);
      cx.fillRect(e.x, e.y, e.size, e.size);
    }

    // fade out into the menu
    const out = ease((t - 9.2) / 1.0);
    if (out > 0) {
      cx.globalCompositeOperation = 'source-over';
      cx.fillStyle = `rgba(3,3,8,${out})`;
      cx.fillRect(0, 0, W, H);
    }
    if (t >= TOTAL) return finish();
    requestAnimationFrame(frame);
  }

  function glow(x, y, r, color) {
    const g = cx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, color);
    g.addColorStop(1, 'rgba(0,0,0,0)');
    cx.fillStyle = g;
    cx.fillRect(x - r, y - r, r * 2, r * 2);
  }

  function star(x, y, r, rot, a) {
    glow(x, y, r * 3, `rgba(255,160,70,${0.35 * a})`);
    cx.save();
    cx.translate(x, y);
    cx.rotate(rot);
    cx.fillStyle = `rgba(255,236,190,${a})`;
    cx.beginPath();
    for (let i = 0; i < 8; i++) {
      const rr = i % 2 === 0 ? r : r * 0.18, ang = (i / 8) * Math.PI * 2;
      cx.lineTo(Math.cos(ang) * rr, Math.sin(ang) * rr);
    }
    cx.closePath();
    cx.fill();
    cx.restore();
  }

  function finish() {
    if (done) return;
    done = true;
    root.classList.add('out');
    body.classList.remove('intro');
    setTimeout(() => root.remove(), 700);
    removeEventListener('keydown', skip);
    removeEventListener('pointerdown', skip);
  }
  function skip(e) { if (e.type === 'keydown' && ['Shift', 'Control', 'Alt', 'Meta'].includes(e.key)) return; finish(); }
  addEventListener('keydown', skip);
  addEventListener('pointerdown', skip);
  addEventListener('resize', () => { if (done) return; const old = targets; layout(); parts.forEach((p, i) => { const t = targets[i % targets.length]; if (t) { p.tx = t.x; p.ty = t.y; } }); void old; });

  // wait for the font so the letters are sampled from Rajdhani, not a fallback (but never longer than 0.6 s)
  const go = () => { layout(); parts.forEach((p, i) => { const t = targets[i % targets.length]; p.tx = t.x; p.ty = t.y; p.x = cx0(); p.y = cy0(); }); requestAnimationFrame(frame); };
  Promise.race([document.fonts?.load(`700 100px Rajdhani`) ?? Promise.resolve(), new Promise(r => setTimeout(r, 600))]).then(go, go);
})();
