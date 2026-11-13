/** @typedef {import('./csv.js').Place} Place */

const PALETTE = ['#f4a261', '#e9c46a', '#8ecae6', '#90be6d', '#f28482', '#b8a1e3', '#ffb703', '#84dcc6'];
const MAX_LABELS = 40;
const TAU = 2 * Math.PI;

function sliceColor(i, n) {
  // Keep last slice from matching the first when the palette wraps.
  if (n > 1 && i === n - 1 && i % PALETTE.length === 0) return PALETTE[PALETTE.length / 2];
  return PALETTE[i % PALETTE.length];
}

function fitLabel(ctx, text, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > maxWidth) s = s.slice(0, -1);
  return `${s}…`;
}

/** @param {HTMLCanvasElement} canvas @param {Place[]} places @param {number} rotation */
export function drawWheel(canvas, places, rotation) {
  const dpr = window.devicePixelRatio || 1;
  const size = canvas.clientWidth;
  if (size === 0) return; // hidden
  if (canvas.width !== Math.round(size * dpr)) {
    canvas.width = canvas.height = Math.round(size * dpr);
  }
  const ctx = canvas.getContext('2d');
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.clearRect(0, 0, size, size);

  const c = size / 2;
  const radius = c - 6;
  const n = places.length;

  if (n === 0) {
    ctx.beginPath();
    ctx.arc(c, c, radius, 0, TAU);
    ctx.fillStyle = '#88888833';
    ctx.fill();
  } else {
    const slice = TAU / n;
    const fontSize = Math.max(10, Math.min(16, radius * slice * 0.5));
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'right';
    for (let i = 0; i < n; i++) {
      const start = -Math.PI / 2 + rotation + i * slice;
      ctx.beginPath();
      ctx.moveTo(c, c);
      ctx.arc(c, c, radius, start, start + slice);
      ctx.closePath();
      ctx.fillStyle = sliceColor(i, n);
      ctx.fill();
      if (n > 1) {
        ctx.strokeStyle = '#ffffff99';
        ctx.lineWidth = 1;
        ctx.stroke();
      }
      if (n <= MAX_LABELS) {
        ctx.save();
        ctx.translate(c, c);
        ctx.rotate(start + slice / 2);
        ctx.fillStyle = '#1d1d1f';
        ctx.fillText(fitLabel(ctx, places[i].title, radius * 0.72), radius - 12, 0);
        ctx.restore();
      }
    }
  }

  // Hub
  ctx.beginPath();
  ctx.arc(c, c, Math.max(14, radius * 0.08), 0, TAU);
  ctx.fillStyle = '#ffffff';
  ctx.fill();
  ctx.strokeStyle = '#1d1d1f33';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pointer at top
  ctx.beginPath();
  ctx.moveTo(c - 14, 0);
  ctx.lineTo(c + 14, 0);
  ctx.lineTo(c, 26);
  ctx.closePath();
  ctx.fillStyle = '#e63946';
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 2;
  ctx.stroke();
}

/**
 * @param {number} from @param {number} to @param {number} ms
 * @param {(rotation: number) => void} onFrame
 * @returns {Promise<void>}
 */
export function animateSpin(from, to, ms, onFrame) {
  return new Promise(resolve => {
    const t0 = performance.now();
    const step = now => {
      const t = Math.min(1, (now - t0) / ms);
      const eased = 1 - (1 - t) ** 3;
      onFrame(from + (to - from) * eased);
      if (t < 1) requestAnimationFrame(step);
      else resolve();
    };
    requestAnimationFrame(step);
  });
}
