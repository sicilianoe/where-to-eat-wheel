import { parseTakeoutCsv } from './csv.js';
import {
  loadState, saveState, addList, removeList, setListActive, setExcluded, activePlaces,
} from './store.js';
import { wheelPlaces, pickIndex, targetRotation, slicesPassed } from './wheel-model.js';
import { createTicker } from './sound.js';
import { drawWheel, animateSpin } from './wheel-canvas.js';

const SPIN_MS = 4000;
const $ = id => document.getElementById(id);

let state = loadState(localStorage);
const skipped = new Set();
let rotation = 0;
let spinning = false;
let places = [];
const ticker = createTicker();

function update(next) {
  state = next;
  $('save-error').hidden = saveState(localStorage, state);
  render();
}

function renderChips() {
  const chips = $('chips');
  chips.replaceChildren(...Object.keys(state.lists).map(name => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.textContent = `${name} (${state.lists[name].length})`;
    chip.setAttribute('aria-pressed', String(state.activeLists.includes(name)));
    chip.disabled = spinning;
    chip.addEventListener('click', () => {
      update(setListActive(state, name, !state.activeLists.includes(name)));
    });
    return chip;
  }));
}

function render() {
  places = wheelPlaces(state, skipped);
  const hasLists = Object.keys(state.lists).length > 0;

  renderChips();
  $('empty').hidden = hasLists;
  $('wheel-area').hidden = !hasLists;
  $('edit-btn').hidden = !hasLists;
  $('edit-btn').disabled = spinning;

  const message = $('message');
  message.hidden = places.length > 0;
  message.textContent = state.activeLists.length === 0
    ? 'Pick a list above to fill the wheel.'
    : 'No places on the wheel — tap ✏️ to add some.';

  $('spin').disabled = spinning || places.length === 0;

  const reset = $('reset-skipped');
  reset.hidden = skipped.size === 0;
  reset.textContent = `Reset skipped (${skipped.size})`;

  drawWheel($('wheel'), places, rotation);
}

function showResult(place) {
  $('result-title').textContent = `🎉 ${place.title}`;
  $('result-note').textContent = place.note;
  const maps = $('result-maps');
  maps.hidden = !place.url;
  if (place.url) maps.href = place.url;
  $('nope').dataset.id = place.id;
  $('result').hidden = false;
}

async function spin() {
  if (spinning || places.length === 0) return;
  spinning = true;
  $('result').hidden = true;
  render();

  const wheel = places;
  const index = pickIndex(wheel.length);
  ticker.unlock();
  await animateSpin(rotation, targetRotation(index, wheel.length, rotation), SPIN_MS, r => {
    if (slicesPassed(rotation, r, wheel.length) > 0) ticker.tick();
    rotation = r;
    drawWheel($('wheel'), wheel, rotation);
  });

  spinning = false;
  ticker.ding();
  render();
  showResult(wheel[index]);
  $('result').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

async function handleUpload(files) {
  const errors = [];
  let next = state;
  for (const file of files) {
    const name = file.name.replace(/\.csv$/i, '');
    try {
      next = addList(next, name, parseTakeoutCsv(await file.text(), name));
    } catch (err) {
      errors.push(`${file.name}: ${err.message}`);
    }
  }
  const error = $('upload-error');
  error.hidden = errors.length === 0;
  error.textContent = errors.join(' · ');
  update(next);
}

$('upload').addEventListener('change', e => {
  handleUpload([...e.target.files]);
  e.target.value = '';
});

$('spin').addEventListener('click', spin);

function renderSound() {
  const btn = $('sound-btn');
  btn.textContent = ticker.muted ? '🔇' : '🔊';
  btn.setAttribute('aria-pressed', String(ticker.muted));
  btn.setAttribute('aria-label', ticker.muted ? 'Unmute sound' : 'Mute sound');
}

$('sound-btn').addEventListener('click', () => {
  ticker.setMuted(!ticker.muted);
  renderSound();
});
renderSound();

$('nope').addEventListener('click', e => {
  skipped.add(e.currentTarget.dataset.id);
  $('result').hidden = true;
  render();
  spin();
});

$('reset-skipped').addEventListener('click', () => {
  skipped.clear();
  render();
});

// Edit wheel screen

function visibleEditorPlaces() {
  const q = $('edit-search').value.trim().toLowerCase();
  return activePlaces(state).filter(p => !q || `${p.title} ${p.note}`.toLowerCase().includes(q));
}

function renderEditor() {
  const excluded = new Set(state.excluded);
  const showList = state.activeLists.length > 1;
  $('edit-items').replaceChildren(...visibleEditorPlaces().map(place => {
    const li = document.createElement('li');
    const label = document.createElement('label');
    const box = document.createElement('input');
    box.type = 'checkbox';
    box.checked = !excluded.has(place.id);
    box.addEventListener('change', () => update(setExcluded(state, [place.id], !box.checked)));
    const name = document.createElement('span');
    name.className = 'name';
    name.textContent = place.title;
    if (showList) {
      const list = document.createElement('small');
      list.textContent = place.list;
      name.append(list);
    }
    label.append(box, name);
    li.append(label);
    return li;
  }));

  $('edit-lists').replaceChildren(...Object.keys(state.lists).map(listName => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'link-btn';
    btn.textContent = `Remove “${listName}”`;
    btn.addEventListener('click', () => {
      if (!confirm(`Remove the list “${listName}”? You can upload it again later.`)) return;
      update(removeList(state, listName));
      renderEditor();
    });
    return btn;
  }));
}

function setEditorOpen(open) {
  $('editor').hidden = !open;
  $('main').hidden = open;
  if (open) {
    $('edit-search').value = '';
    renderEditor();
    window.scrollTo(0, 0);
  } else {
    render();
  }
}

function setVisibleExcluded(excluded) {
  update(setExcluded(state, visibleEditorPlaces().map(p => p.id), excluded));
  renderEditor();
}

$('edit-btn').addEventListener('click', () => setEditorOpen(true));
$('edit-done').addEventListener('click', () => setEditorOpen(false));
$('edit-search').addEventListener('input', renderEditor);
$('edit-all').addEventListener('click', () => setVisibleExcluded(false));
$('edit-none').addEventListener('click', () => setVisibleExcluded(true));

// Flick the wheel to spin.
let pointerStart = null;
$('wheel').addEventListener('pointerdown', e => { pointerStart = { x: e.clientX, y: e.clientY }; });
$('wheel').addEventListener('pointerup', e => {
  if (pointerStart && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 30) spin();
  pointerStart = null;
});

window.addEventListener('resize', () => drawWheel($('wheel'), places, rotation));

render();

if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js');
