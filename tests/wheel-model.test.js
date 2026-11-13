import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wheelPlaces, pickIndex, targetRotation, indexAtRotation } from '../src/wheel-model.js';

const place = title => ({ id: `L|${title}`, list: 'L', title, note: '', url: '' });
const state = excluded => ({ lists: { L: ['a', 'b', 'c'].map(place) }, activeLists: ['L'], excluded });

test('wheelPlaces removes excluded and skipped ids', () => {
  assert.deepEqual(wheelPlaces(state(['L|a']), new Set(['L|c'])).map(p => p.title), ['b']);
});

test('wheelPlaces returns [] when all excluded', () => {
  assert.deepEqual(wheelPlaces(state(['L|a', 'L|b', 'L|c']), new Set()), []);
});

test('pickIndex maps rand to index range', () => {
  assert.equal(pickIndex(4, () => 0.99), 3);
  assert.equal(pickIndex(4, () => 0), 0);
});

test('targetRotation lands on the chosen slice after full turns (incl. n=1)', () => {
  for (const n of [1, 2, 7, 40]) {
    for (let i = 0; i < n; i++) {
      for (const current of [0, 3.3, 100]) {
        const t = targetRotation(i, n, current);
        assert.ok(t > current + 2 * Math.PI * 4, `n=${n} i=${i} current=${current}`);
        assert.equal(indexAtRotation(t, n), i, `n=${n} i=${i} current=${current}`);
      }
    }
  }
});
