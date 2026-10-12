// Save data: which planets are unlocked/completed, best times, totals and settings.
// Stored with the CrazyGames data module (follows the player across devices), or in this browser
// without it. Every access is guarded, so private windows still work.
import { ready, storage } from './platform.js';

export const MISSIONS = [
  { level: 1, name: 'Verdant', subtitle: 'Repair the ship: recover four energy cells', color: '#6fbf4a', glow: '#b6f27a' },
  { level: 2, name: 'Ember',   subtitle: 'Power the outpost, recover a nav core',      color: '#d4874f', glow: '#ffc08a' },
  { level: 3, name: 'Umbra',   subtitle: 'Help the locals and cure the blight',          color: '#7a4fd4', glow: '#c9a6ff' },
  { level: 4, name: 'Glacia',  subtitle: 'Answer the distress signal on a frozen moon',  color: '#8fd3ff', glow: '#eaf8ff' },
  { level: 5, name: 'Haven',   subtitle: 'Wake the old station and repair Nova',         color: '#7fb6ff', glow: '#d8e8ff' },
];

const KEY = 'planets.save.v1';

// importers (menu, game) wait here until the SDK has loaded the player's data
await ready;
// saves made before the SDK (or outside it) live in localStorage: carry them over once
try { const old = localStorage.getItem(KEY); if (old && !storage.getItem(KEY)) storage.setItem(KEY, old); } catch { /* no localStorage */ }
const DEFAULTS = () => ({
  unlocked: 1,               // highest planet you may start
  completed: {},             // level → { bestTime, times, firstCompleted }
  lastPlayed: null,
  stats: { playTime: 0, deaths: 0, cured: 0, cells: 0 },
  settings: { sensitivity: 1, invertY: false, quality: 'high' },
});

function read() {
  try {
    const raw = storage.getItem(KEY);
    if (!raw) return DEFAULTS();
    const d = JSON.parse(raw), def = DEFAULTS();
    return { ...def, ...d, stats: { ...def.stats, ...d.stats }, settings: { ...def.settings, ...d.settings }, completed: d.completed ?? {} };
  } catch { return DEFAULTS(); }
}

function write(d) {
  storage.setItem(KEY, JSON.stringify(d));
}

export const Progress = {
  get() { return read(); },

  hasSave() { const d = read(); return d.lastPlayed !== null || Object.keys(d.completed).length > 0; },

  // the planet "Continue" should open: the first unfinished one you've unlocked (or the last, if all are done)
  continueLevel() {
    const d = read();
    for (const m of MISSIONS) if (m.level <= d.unlocked && !d.completed[m.level]) return m.level;
    return Math.min(d.unlocked, MISSIONS.length);
  },

  started(level) {
    const d = read();
    d.lastPlayed = level;
    write(d);
  },

  completeLevel(level, time, extra = {}) {
    const d = read();
    const prev = d.completed[level];
    const newBest = !prev || time < prev.bestTime;
    d.completed[level] = {
      bestTime: newBest ? time : prev.bestTime,
      times: (prev?.times ?? 0) + 1,
      firstCompleted: prev?.firstCompleted ?? new Date().toISOString(),
    };
    d.unlocked = Math.max(d.unlocked, Math.min(level + 1, MISSIONS.length));
    d.stats.cured += extra.cured ?? 0;
    d.stats.cells += extra.cells ?? 0;
    write(d);
    return { newBest, bestTime: d.completed[level].bestTime };
  },

  addStat(key, amount = 1) {
    const d = read();
    d.stats[key] = (d.stats[key] ?? 0) + amount;
    write(d);
  },

  setSettings(patch) {
    const d = read();
    d.settings = { ...d.settings, ...patch };
    write(d);
    return d.settings;
  },

  reset() {
    const settings = read().settings;   // a new game keeps your settings
    write({ ...DEFAULTS(), settings });
  },
};

export const formatTime = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
