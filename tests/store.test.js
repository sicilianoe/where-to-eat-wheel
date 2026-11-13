import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  loadState, saveState, addList, removeList, setListActive, setExcluded, activePlaces,
} from '../src/store.js';

const fakeStorage = () => ({
  data: {},
  getItem(k) { return this.data[k] ?? null; },
  setItem(k, v) { this.data[k] = v; },
});
const empty = { lists: {}, activeLists: [], excluded: [] };
const place = (list, title) => ({ id: `${list}|${title}`, list, title, note: '', url: '' });

test('loadState on empty storage returns empty state', () => {
  assert.deepEqual(loadState(fakeStorage()), empty);
});

test('loadState with corrupt JSON returns empty state', () => {
  const s = fakeStorage();
  s.setItem('gmaps-wheel:v1', '{not json');
  assert.deepEqual(loadState(s), empty);
});

test('saveState then loadState round-trips', () => {
  const s = fakeStorage();
  const state = addList(empty, 'A', [place('A', 'x')]);
  saveState(s, state);
  assert.deepEqual(loadState(s), state);
});

test('addList with same name replaces places and stays active once', () => {
  let state = addList(empty, 'A', [place('A', 'x')]);
  state = addList(state, 'A', [place('A', 'y')]);
  assert.deepEqual(state.lists.A.map(p => p.title), ['y']);
  assert.deepEqual(state.activeLists, ['A']);
});

test('removeList drops list and active flag', () => {
  const state = removeList(addList(empty, 'A', [place('A', 'x')]), 'A');
  assert.deepEqual(state, empty);
});

test('setListActive false hides that list from activePlaces', () => {
  let state = addList(empty, 'A', [place('A', 'x')]);
  state = addList(state, 'B', [place('B', 'y')]);
  state = setListActive(state, 'A', false);
  assert.deepEqual(activePlaces(state).map(p => p.id), ['B|y']);
  assert.deepEqual(setListActive(state, 'A', true).activeLists, ['B', 'A']);
});

test('setExcluded adds without duplicates and removes', () => {
  let state = setExcluded(empty, ['A|x'], true);
  state = setExcluded(state, ['A|x'], true);
  assert.deepEqual(state.excluded, ['A|x']);
  assert.deepEqual(setExcluded(state, ['A|x'], false).excluded, []);
});
