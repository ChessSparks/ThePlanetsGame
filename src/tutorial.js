// On-screen tutorial: one card at a time ("[W][A][S][D] Move"), ticked off when you actually do it.
// Steps come from the level (`tutorial: [...]`):
//   { keys: ['M'], text: 'Open the map', after: s => ..., line: 'Nova says this when the step appears', done: s => ... }
// `after` (optional) holds a step back until it's true; `s` is a snapshot from main.js
// (moved, looked, jumps, mapOpen, mapOpened, collected, time, ...).
export class Tutorial {
  constructor(steps, el, nova) {
    this.steps = steps ?? [];
    this.i = 0;
    this.el = el;
    this.nova = nova;
    this.shown = false;
    this.doneTimer = 0;
  }

  get finished() { return this.i >= this.steps.length; }

  show(step) {
    this.el.querySelector('.keys').innerHTML = step.keys.map(k => `<kbd>${k}</kbd>`).join('');
    this.el.querySelector('.text').textContent = step.text;
    this.el.classList.remove('done');
    this.el.classList.add('show');
    this.shown = true;
    if (step.line) this.nova.say(step.line);
  }

  // hidden: true while a cutscene / pause / launch is on
  update(dt, s, hidden) {
    this.el.classList.toggle('hold', !!hidden);
    if (this.finished || hidden) return;
    const step = this.steps[this.i];
    if (this.doneTimer > 0) {   // a moment with the tick before the next card
      if ((this.doneTimer -= dt) <= 0) { this.el.classList.remove('show'); this.shown = false; this.i++; this.wait = 0.5; }
      return;
    }
    if ((this.wait = (this.wait ?? 0) - dt) > 0) return;
    if (!this.shown) {
      if (step.after && !step.after(s)) return;
      if (this.nova.busy && !step.line) return;   // let Nova finish talking first
      this.show(step);
    }
    if (step.done(s)) { this.el.classList.add('done'); this.doneTimer = 0.9; }
  }
}
