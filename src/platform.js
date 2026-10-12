// CrazyGames SDK v3 (loaded by a <script> in each page's <head>).
// Everything here is safe without the SDK (blocked, offline, or a host where it is "disabled"):
// calls turn into no-ops, saves fall back to localStorage and ads are skipped.
const sdk = window.CrazyGames?.SDK;
let on = false;

// init can hang when the network is slow: don't let it hold up the game for more than a few seconds
export const ready = (async () => {
  if (!sdk) return;
  try {
    await Promise.race([sdk.init(), new Promise((_, no) => setTimeout(() => no(new Error('timeout')), 6000))]);
    on = sdk.environment !== 'disabled';
  } catch (e) { console.warn('[crazygames] SDK init failed, playing without it', e); }
})();

const call = (fn) => { if (!on) return; try { fn(); } catch (e) { console.warn('[crazygames]', e); } };

// gameplayStart/Stop must follow every break (pause, menus, level end); only report real changes
let playing = false;
export function setPlaying(p) {
  if (p === playing) return;
  playing = p;
  call(() => (p ? sdk.game.gameplayStart() : sdk.game.gameplayStop()));
}
export const loadingStart = () => call(() => sdk.game.loadingStart());
export const loadingStop = () => call(() => sdk.game.loadingStop());

// a midgame ad at a level transition. The SDK keeps them at least 3 minutes apart (early requests
// end in adError 'adCooldown'), so this can be asked for at every level. Resolves once it's over.
export function midgameAd() {
  if (!on) return Promise.resolve();
  return new Promise((done) => {
    try {
      sdk.ad.requestAd('midgame', { adStarted: () => {}, adFinished: () => done(), adError: () => done() });
    } catch { done(); }
  });
}

// save storage: the SDK's data module (follows the player across devices) or this browser
export const storage = {
  getItem: (k) => { try { return on && sdk.data ? sdk.data.getItem(k) : localStorage.getItem(k); } catch { return null; } },
  setItem: (k, v) => { try { if (on && sdk.data) sdk.data.setItem(k, v); else localStorage.setItem(k, v); } catch { /* storage unavailable: progress lasts for this session only */ } },
};
