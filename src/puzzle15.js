// The 15-puzzle: slide numbered tiles into the empty space until they read 1–15 in order.
// Shown as an overlay; the caller pauses the game while it's open. Progress is kept if you walk away.

const SIZE = 4;
const solved = () => [...Array(15)].map((_, i) => i + 1).concat(0);   // 0 = the empty space

// a random but always-solvable layout: start solved, make random legal moves (never undoing the last one)
function shuffled(moves) {
  const b = solved();
  let empty = 15, last = -1;
  for (let i = 0; i < moves; i++) {
    const r = Math.floor(empty / SIZE), c = empty % SIZE;
    const options = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]
      .filter(([y, x]) => y >= 0 && y < SIZE && x >= 0 && x < SIZE)
      .map(([y, x]) => y * SIZE + x)
      .filter(p => p !== last);
    const pick = options[Math.floor(Math.random() * options.length)];
    b[empty] = b[pick]; b[pick] = 0;
    last = empty; empty = pick;
  }
  return b;
}

let state = null;   // the board survives closing the overlay

export function openPuzzle15({ title, subtitle, moves = 90, onSolve, onClose }) {
  state ??= { board: shuffled(moves), count: 0 };
  const isSolved = () => state.board.every((v, i) => v === solved()[i]);
  if (isSolved()) state = { board: shuffled(moves), count: 0 };

  const root = document.createElement('div');
  root.id = 'puzzle15';
  root.innerHTML = `
    <div class="p15-panel">
      <div class="p15-title">${title}</div>
      <div class="p15-sub">${subtitle}</div>
      <div class="p15-grid"></div>
      <div class="p15-foot"><span class="p15-moves"></span><span><b>Click</b> a tile next to the gap · <b>Arrows</b> slide · <b>Esc</b> leave</span></div>
    </div>`;
  document.body.appendChild(root);
  const grid = root.querySelector('.p15-grid'), movesEl = root.querySelector('.p15-moves');
  let finished = false;

  const render = () => {
    grid.innerHTML = '';
    state.board.forEach((v, i) => {
      const t = document.createElement('button');
      t.className = 'p15-tile' + (v === 0 ? ' empty' : '') + (v && v === i + 1 ? ' home' : '');
      t.textContent = v || '';
      t.onclick = () => tryMove(i);
      grid.appendChild(t);
    });
    movesEl.textContent = `Moves: ${state.count}`;
  };

  const tryMove = (i) => {
    if (finished) return;
    const e = state.board.indexOf(0);
    const adjacent = (Math.abs(i - e) === SIZE) || (Math.abs(i - e) === 1 && Math.floor(i / SIZE) === Math.floor(e / SIZE));
    if (!adjacent) return;
    state.board[e] = state.board[i]; state.board[i] = 0;
    state.count++;
    render();
    if (isSolved()) {
      finished = true;
      root.classList.add('solved');
      setTimeout(() => { close(); state = null; onSolve?.(); }, 1300);
    }
  };

  // arrows move a tile INTO the gap (→ moves the tile left of the gap to the right, etc.)
  const onKey = (ev) => {
    const e = state.board.indexOf(0), r = Math.floor(e / SIZE), c = e % SIZE;
    const from = { ArrowRight: c > 0 ? e - 1 : -1, ArrowLeft: c < SIZE - 1 ? e + 1 : -1, ArrowDown: r > 0 ? e - SIZE : -1, ArrowUp: r < SIZE - 1 ? e + SIZE : -1 }[ev.code];
    if (from !== undefined) { ev.preventDefault(); ev.stopPropagation(); if (from >= 0) tryMove(from); }
    if (ev.code === 'Escape') { ev.preventDefault(); ev.stopPropagation(); close(); onClose?.(); }
  };
  window.addEventListener('keydown', onKey, true);

  function close() {
    window.removeEventListener('keydown', onKey, true);
    root.remove();
  }

  render();
  return { close };
}
