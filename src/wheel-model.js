import { activePlaces } from './store.js';

/**
 * @typedef {import('./csv.js').Place} Place
 * @typedef {import('./store.js').State} State
 */

const TAU = 2 * Math.PI;
const mod = (x, m) => ((x % m) + m) % m;

/** @param {State} state @param {Set<string>} skipped @returns {Place[]} */
export function wheelPlaces(state, skipped) {
  const excluded = new Set(state.excluded);
  return activePlaces(state).filter(p => !excluded.has(p.id) && !skipped.has(p.id));
}

/** @param {number} n @param {() => number} [rand] */
export function pickIndex(n, rand = Math.random) {
  return Math.floor(rand() * n);
}

/**
 * Slice i spans [i, i+1) * 2π/n clockwise from the top pointer at rotation 0.
 * Rotating the wheel clockwise by r brings angle (-r mod 2π) under the pointer.
 * @param {number} rotation @param {number} n
 */
export function indexAtRotation(rotation, n) {
  return Math.floor(mod(-rotation, TAU) / (TAU / n)) % n;
}

/**
 * Rotation greater than `current` (by `turns` full spins plus a remainder) that
 * leaves the center of slice `index` under the pointer.
 * @param {number} index @param {number} n @param {number} current @param {number} [turns]
 */
export function targetRotation(index, n, current, turns = 5) {
  const desired = mod(-(index + 0.5) * (TAU / n), TAU);
  return current + turns * TAU + mod(desired - current, TAU);
}
