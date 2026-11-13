const MIN_TICK_GAP_MS = 35;
const MUTE_KEY = 'gmaps-wheel:muted';

/** Short synthesized "clack" of a wheel peg hitting the pointer. */
export function createTicker() {
  let ctx = null;
  let lastTick = 0;
  let muted = false;
  try { muted = localStorage.getItem(MUTE_KEY) === '1'; } catch { /* storage blocked */ }

  return {
    get muted() { return muted; },

    setMuted(value) {
      muted = value;
      try { localStorage.setItem(MUTE_KEY, value ? '1' : '0'); } catch { /* storage blocked */ }
    },

    /** Call from a user gesture (e.g. the Spin tap) so mobile browsers allow audio. */
    unlock() {
      if (muted) return;
      ctx ??= new AudioContext();
      if (ctx.state === 'suspended') ctx.resume();
    },

    tick() {
      if (muted || !ctx) return;
      const now = performance.now();
      if (now - lastTick < MIN_TICK_GAP_MS) return;
      lastTick = now;

      const t = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1800, t);
      osc.frequency.exponentialRampToValueAtTime(600, t + 0.03);
      gain.gain.setValueAtTime(0.25, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
      osc.connect(gain).connect(ctx.destination);
      osc.start(t);
      osc.stop(t + 0.05);
    },
  };
}
