import { parseTakeoutCsv } from './csv.js';
import { loadState, saveState, addList, setListActive } from './store.js';
import { wheelPlaces, pickIndex, targetRotation } from './wheel-model.js';
import { drawWheel, animateSpin } from './wheel-canvas.js';

const SPIN_MS = 4000;
const $ = id => document.getElementById(id);

let state = loadState(localStorage);
const skipped = new Set();
let rotation = 0;
let spinning = false;
let places = [];

function update(next) {
  state = next;
  saveState(localStorage, state);
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
  await animateSpin(rotation, targetRotation(index, wheel.length, rotation), SPIN_MS, r => {
    rotation = r;
    drawWheel($('wheel'), wheel, rotation);
  });

  spinning = false;
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

// Flick the wheel to spin.
let pointerStart = null;
$('wheel').addEventListener('pointerdown', e => { pointerStart = { x: e.clientX, y: e.clientY }; });
$('wheel').addEventListener('pointerup', e => {
  if (pointerStart && Math.hypot(e.clientX - pointerStart.x, e.clientY - pointerStart.y) > 30) spin();
  pointerStart = null;
});

window.addEventListener('resize', () => drawWheel($('wheel'), places, rotation));

render();
