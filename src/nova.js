// Nova — the ship AI. An abstract droplet of living light (drawn in code, no image) + a speech bubble with typewriter text.
// She was damaged in the crash and is slowly fading: `fade` (0 healthy → 1 almost gone) makes her
// portrait flicker and split, and her words stutter. Each level sets a base fade; lines can raise it.
//
// A line may start with tags:  "{worried}" "{happy}" "{sad}" "{glitch}"  e.g. "{worried}{glitch}I'm... fine."
//   mood tags tint the hologram; {glitch} makes that one line break up badly.

const CHARS_PER_SEC = 48;
const MOODS = {
  calm:    { main: [79, 216, 255], soft: [160, 235, 255] },
  happy:   { main: [110, 255, 190], soft: [190, 255, 225] },
  worried: { main: [255, 184, 90], soft: [255, 222, 170] },
  sad:     { main: [150, 160, 255], soft: [205, 210, 255] },
};
const GLYPHS = '▓▒░#%&@$*/\\|<>';

export class Nova {
  constructor(root, { fade = 0 } = {}) {
    this.root = root;
    this.text = root.querySelector('.text');
    this.canvas = root.querySelector('canvas');
    this.ctx = this.canvas.getContext('2d');
    this.queue = [];
    this.current = null;
    this.idle = 0;
    this.baseFade = fade;
    this.mood = 'calm';
    this.colour = [...MOODS.calm.main];
    this.t = 0;
    this.mouth = 0;
  }

  setFade(f) { this.baseFade = f; }

  say(lines, { interrupt = false } = {}) {
    lines = [].concat(lines).filter(Boolean);
    if (interrupt) { this.queue = []; this.current = null; }
    this.queue.push(...lines);
  }

  get busy() { return !!this.current || this.queue.length > 0; }

  // Enter: finish the line instantly, or skip to the next one
  skip() {
    if (!this.current) return;
    if (this.current.shown < this.current.line.length) this.current.t = 999;
    else this.current = null;
  }

  parse(raw) {
    let line = raw, mood = 'calm', glitch = false, m;
    while ((m = line.match(/^\{(\w+)\}/))) {
      const tag = m[1];
      if (tag === 'glitch') glitch = true; else if (MOODS[tag]) mood = tag;
      line = line.slice(m[0].length);
    }
    return { line, mood, glitch };
  }

  // the fade level right now (higher while a {glitch} line plays)
  get fade() { return Math.min(1, this.baseFade + (this.current?.glitch ? 0.45 : 0)); }

  // a typed-out string with the occasional corrupted character / stutter, depending on fade
  corrupt(s) {
    const f = this.fade;
    if (f < 0.05) return s;
    let out = '';
    for (let i = 0; i < s.length; i++) {
      const c = s[i];
      if (c !== ' ' && Math.random() < f * 0.05) out += GLYPHS[(Math.random() * GLYPHS.length) | 0];
      else out += c;
    }
    return out;
  }

  update(dt) {
    this.t += dt;
    if (!this.current && this.queue.length) {
      const p = this.parse(this.queue.shift());
      // stutter: sometimes repeat the first syllable ("Sys-sys-systems") when she's weak
      if (Math.random() < this.baseFade * 0.6 + (p.glitch ? 0.5 : 0)) {
        const w = p.line.match(/^[A-Za-z]{2,4}/);
        if (w) p.line = `${w[0]}-${w[0].toLowerCase()}-${p.line[0].toLowerCase()}${p.line.slice(1)}`;
      }
      this.current = { ...p, t: 0, shown: 0, hold: 0 };
      this.mood = p.mood;
      this.root.classList.add('visible');
      this.idle = 0;
    }
    if (!this.current) {
      this.idle += dt;
      if (this.idle > 0.6) this.root.classList.remove('visible');
      this.mouth += (0 - this.mouth) * Math.min(1, dt * 12);
      this.draw(dt, false);
      return;
    }
    const c = this.current;
    c.t += dt;
    const n = Math.min(c.line.length, Math.floor(c.t * CHARS_PER_SEC));
    const typing = n < c.line.length;
    // re-render every frame while weak, so corrupted characters flicker; otherwise only when it changes
    if (n !== c.shown || (this.fade > 0.1 && Math.random() < 0.3)) {
      c.shown = n;
      const shown = c.line.slice(0, n);
      this.text.textContent = typing || this.fade > 0.25 ? this.corrupt(shown) : shown;
    }
    this.root.classList.toggle('talking', typing);
    const target = typing ? 0.35 + 0.65 * Math.abs(Math.sin(this.t * 22)) : 0;
    this.mouth += (target - this.mouth) * Math.min(1, dt * 20);
    if (!typing) {
      c.hold += dt;
      if (c.hold > 1.8 + c.line.length * 0.035) { this.current = null; this.text.textContent = c.line; }
    }
    this.draw(dt, typing);
  }

  // ── the hologram face ────────────────────────────────────────────────────
  draw(dt) {
    const g = this.ctx, W = this.canvas.width, H = this.canvas.height, cx = W / 2, cy = H / 2;
    const f = this.fade, t = this.t;
    const want = MOODS[this.mood].main;
    for (let i = 0; i < 3; i++) this.colour[i] += (want[i] - this.colour[i]) * Math.min(1, dt * 4);
    const [r, gr, b] = this.colour.map(Math.round);
    const col = (a) => `rgba(${r},${gr},${b},${a})`;

    // flicker / blackout when weak
    const flicker = f > 0.05 && Math.random() < f * 0.08;
    g.clearRect(0, 0, W, H);
    g.fillStyle = '#04101e';
    g.fillRect(0, 0, W, H);
    if (flicker && Math.random() < 0.5) return;

    const glow = g.createRadialGradient(cx, cy, 4, cx, cy, W * 0.55);
    glow.addColorStop(0, col(0.35));
    glow.addColorStop(1, col(0));
    g.fillStyle = glow;
    g.fillRect(0, 0, W, H);

    g.save();
    // A living droplet of light: layered, slowly morphing outlines around a bright heart, and a voice
    // waveform running through the middle while she talks. No face, no figure.
    // Mood: calm = slow round · happy = bouncy and bright · worried = spiky jitter · sad = slumped and dim.
    const m = this.mood, talk = this.mouth;
    const speed = m === 'happy' ? 1.6 : m === 'sad' ? 0.45 : m === 'worried' ? 1.3 : 0.9;
    const spike = m === 'worried' ? 0.07 : 0;
    const sag = m === 'sad' ? 0.12 : 0;
    const bright = m === 'sad' ? 0.6 : m === 'happy' ? 1.1 : 0.9;
    this.phase = (this.phase ?? 0) + dt * speed;
    const ph = this.phase, R0 = W * 0.3;
    const blob = (k, scale) => {   // one morphing outline
      g.beginPath();
      for (let i = 0; i <= 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        let r = 1 + 0.09 * Math.sin(a * 3 + ph * 1.3 + k) + 0.06 * Math.sin(a * 5 - ph * 1.7 + k * 2)
              + spike * Math.sin(a * 11 + ph * 6) + talk * 0.07 * Math.sin(a * 7 + t * 14);
        r *= R0 * scale;
        const y = Math.sin(a) * r * (1 - sag * 0.5) + (Math.sin(a) > 0 ? sag * r * 0.6 : 0);
        const x = Math.cos(a) * r * (1 + sag * 0.3);
        i ? g.lineTo(cx + x, cy + y) : g.moveTo(cx + x, cy + y);
      }
      g.closePath();
    };
    g.shadowColor = col(1);
    g.shadowBlur = 14;
    // soft filled body
    const body = g.createRadialGradient(cx, cy - R0 * 0.2, 0, cx, cy, R0 * 1.2);
    body.addColorStop(0, `rgba(255,255,255,${0.55 * bright})`);
    body.addColorStop(0.35, col(0.45 * bright));
    body.addColorStop(1, col(0.05));
    g.fillStyle = body;
    blob(0, 1);
    g.fill();
    // layered outlines
    for (let k = 0; k < 3; k++) {
      g.lineWidth = 1.6 - k * 0.4;
      g.strokeStyle = col((0.85 - k * 0.25) * bright);
      blob(k * 1.7, 1 + k * 0.14);
      g.stroke();
    }
    // voice waveform through the heart
    g.lineWidth = 2;
    g.strokeStyle = `rgba(255,255,255,${0.9 * bright})`;
    g.beginPath();
    for (let i = 0; i <= 40; i++) {
      const u = i / 40, x = cx - R0 * 0.8 + u * R0 * 1.6;
      const env = Math.sin(u * Math.PI);
      const y = cy + env * (talk * R0 * 0.35 * Math.sin(u * 18 + t * 20) + R0 * 0.03 * Math.sin(u * 6 + ph * 2));
      i ? g.lineTo(x, y) : g.moveTo(x, y);
    }
    g.stroke();
    // a few motes drifting up out of it
    for (let i = 0; i < 5; i++) {
      const life = (ph * 0.25 + i / 5) % 1;
      g.fillStyle = col((1 - life) * 0.8 * bright);
      g.beginPath();
      g.arc(cx + Math.sin(i * 2.3 + ph) * R0 * 0.7, cy + R0 * 0.6 - life * R0 * 1.9, 1.6, 0, Math.PI * 2);
      g.fill();
    }
    g.restore();

    // scanlines
    g.fillStyle = 'rgba(0,0,0,0.18)';
    for (let y = (t * 30) % 4; y < H; y += 4) g.fillRect(0, y, W, 1);

    // damage: slice offsets and a red/cyan split
    if (f > 0.05) {
      const slices = Math.floor(f * 6 + (Math.random() < f ? 3 : 0));
      for (let i = 0; i < slices; i++) {
        if (Math.random() > 0.5 + f * 0.4) continue;
        const y = Math.random() * H, h = 2 + Math.random() * 8 * f, dx = (Math.random() - 0.5) * 24 * f;
        try { g.drawImage(this.canvas, 0, y, W, h, dx, y, W, h); } catch { /* canvas copying itself is fine in all browsers we target */ }
      }
      if (Math.random() < f * 0.5) {
        g.globalCompositeOperation = 'lighter';
        g.globalAlpha = 0.35 * f;
        g.drawImage(this.canvas, 3 * f * 4, 0);
        g.globalAlpha = 1;
        g.globalCompositeOperation = 'source-over';
      }
    }
    this.root.style.setProperty('--nova', `rgb(${r},${gr},${b})`);
  }
}
