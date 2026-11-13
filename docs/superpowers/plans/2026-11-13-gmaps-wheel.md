# Google Maps Wheel Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Static web app that imports Google Takeout "Saved" CSVs and picks a place to eat with an animated spinner wheel.

**Architecture:** Pure-logic ES modules (CSV parsing, state, wheel math) tested with Node's built-in test runner; thin DOM/canvas layer on top. State lives in localStorage. No build step; served as static files (GitHub Pages) with a PWA manifest + service worker.

**Tech Stack:** Plain HTML/CSS/JS (ES modules), Canvas 2D, `node --test` (Node ≥ 20) for tests.

**Spec:** `docs/superpowers/specs/2026-11-13-gmaps-wheel-design.md`

## Global Constraints

- No framework, no build step, no runtime dependencies, no server.
- Data never leaves the device (no network calls except loading the app's own files).
- List name = CSV filename without `.csv`; re-upload replaces the list of the same name.
- Place identity = `${list}|${url || title}`.
- Unticked (edit screen) exclusions persist in localStorage; "Nope" skips are session-only (in memory).
- Must be usable on a phone (viewport meta, touch targets ≥ 44px).

## Review Focus

1. CSV with a UTF-8 BOM, CRLF line endings, quoted fields containing commas/newlines/`""` → parses correctly (Task 1 tests).
2. Rows with empty Title or blank lines → skipped, not shown as empty slices (Task 1 test).
3. All places excluded or no lists active → Spin disabled with a message, no crash/NaN in wheel math (Task 3 test `wheelPlaces returns [] ...`, Task 4 manual check).
4. localStorage holding corrupt JSON → app falls back to empty state instead of a blank page (Task 2 test).
5. Single place on wheel → spin still lands on it (Task 3 test `targetRotation with n=1`).

---

## File Structure

```
index.html              markup for all screens
styles.css              layout/theme
src/csv.js              parseCsv, parseTakeoutCsv
src/store.js            load/save state, list + exclusion operations (pure, storage injected)
src/wheel-model.js      wheelPlaces, pickIndex, targetRotation, indexAtRotation
src/wheel-canvas.js     drawWheel, animateSpin (DOM/canvas only)
src/app.js              UI wiring
manifest.webmanifest, sw.js, icon.svg   PWA
tests/*.test.js         node:test suites
package.json            {"type":"module","scripts":{"test":"node --test tests/"}}
```

Shared type (JSDoc in `src/csv.js`):
`Place = { id: string, list: string, title: string, note: string, url: string }`

---

### Task 1: Project setup + CSV parsing

**Files:**
- Create: `package.json`, `.gitignore`, `src/csv.js`, `tests/csv.test.js`

**Interfaces:**
- Produces: `parseCsv(text: string) => string[][]`, `parseTakeoutCsv(text: string, listName: string) => Place[]`

- [ ] **Step 1:** `git init`; create `package.json` (above) and `.gitignore` (`node_modules/`, `.superpowers/`). Run `node --version` → ≥ v20.

- [ ] **Step 2: Write failing tests** in `tests/csv.test.js`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, parseTakeoutCsv } from '../src/csv.js';

test('parseCsv handles quotes, escaped quotes, commas, newlines, CRLF', () => {
  assert.deepEqual(parseCsv('a,"b,c","d ""e""\nf"\r\ng,h,i\r\n'),
    [['a', 'b,c', 'd "e"\nf'], ['g', 'h', 'i']]);
});

test('parseTakeoutCsv maps columns by header name and builds ids', () => {
  const csv = '﻿Title,Note,URL,Tags,Comment\nPho 99,get the brisket,https://maps.google.com/?cid=1,,\n';
  assert.deepEqual(parseTakeoutCsv(csv, 'Want to go'), [
    { id: 'Want to go|https://maps.google.com/?cid=1', list: 'Want to go',
      title: 'Pho 99', note: 'get the brisket', url: 'https://maps.google.com/?cid=1' },
  ]);
});

test('parseTakeoutCsv skips blank rows and rows without title; id falls back to title', () => {
  const csv = 'Title,Note,URL\n\n,orphan note,\nTacos,,\n';
  assert.deepEqual(parseTakeoutCsv(csv, 'L').map(p => p.id), ['L|Tacos']);
});

test('parseTakeoutCsv throws on missing Title column', () => {
  assert.throws(() => parseTakeoutCsv('Name,URL\nx,y\n', 'L'), /Title/);
});
```

- [ ] **Step 3:** `npm test` → FAIL (module not found).

- [ ] **Step 4:** Implement in `src/csv.js`. `parseCsv` is a char-by-char state machine (in-quotes flag; `""` → `"`; `\r\n` and `\n` end rows; drop a trailing empty row). `parseTakeoutCsv` strips BOM, finds header indices case-insensitively, throws `Error('Not a Google Takeout list: missing Title column')` if no Title, trims cells, skips rows with empty title.

- [ ] **Step 5:** `npm test` → PASS.

- [ ] **Step 6:** `git add -A && git commit -m "feat: Takeout CSV parsing"`

---

### Task 2: State store

**Files:**
- Create: `src/store.js`, `tests/store.test.js`

**Interfaces:**
- Consumes: `Place` from Task 1.
- Produces:
  - `State = { lists: Record<string, Place[]>, activeLists: string[], excluded: string[] }`
  - `loadState(storage: Storage) => State` (key `gmaps-wheel:v1`; missing/corrupt → `{lists:{},activeLists:[],excluded:[]}`)
  - `saveState(storage: Storage, state: State) => void`
  - `addList(state, name: string, places: Place[]) => State` (replaces same name; new list becomes active)
  - `removeList(state, name) => State` (also removes from activeLists)
  - `setListActive(state, name, active: boolean) => State`
  - `setExcluded(state, ids: string[], excluded: boolean) => State`
  - `activePlaces(state) => Place[]` (all places in active lists, list order then file order)

All functions are pure (return new state).

- [ ] **Step 1: Write failing tests** in `tests/store.test.js` using a fake storage `{ data:{}, getItem(k){return this.data[k] ?? null}, setItem(k,v){this.data[k]=v} }`:
  - `loadState` on empty storage → empty state.
  - `loadState` with `'{not json'` stored → empty state (Review Focus 4).
  - save then load round-trips.
  - `addList` twice with same name → second places replace first; name appears once in `activeLists`.
  - `removeList` drops it from `lists` and `activeLists`.
  - `setListActive(s,'A',false)` → `activePlaces` excludes A's places.
  - `setExcluded(s,['A|x'],true)` then `(…,false)` → `excluded` back to `[]`, no duplicates when excluding twice.

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement `src/store.js`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `git add -A && git commit -m "feat: persisted state store"`

---

### Task 3: Wheel model (pure math)

**Files:**
- Create: `src/wheel-model.js`, `tests/wheel-model.test.js`

**Interfaces:**
- Consumes: `State`, `activePlaces` from Task 2.
- Produces:
  - `wheelPlaces(state: State, skipped: Set<string>) => Place[]` — active places minus `state.excluded` minus `skipped`.
  - `pickIndex(n: number, rand = Math.random) => number` — `Math.floor(rand() * n)`.
  - `targetRotation(index: number, n: number, current: number, turns = 5) => number` — radians, > `current`, such that `indexAtRotation(result, n) === index`, landing at the center of the slice.
  - `indexAtRotation(rotation: number, n: number) => number` — slice under the pointer.

Geometry convention: slice `i` spans `[i·2π/n, (i+1)·2π/n)` measured clockwise from the pointer at the top (−π/2) when rotation = 0; rotating the wheel by `r` clockwise puts slice at angle `(2π − r mod 2π)` under the pointer:

```js
export const indexAtRotation = (r, n) => {
  const slice = (2 * Math.PI) / n;
  const a = ((-r % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
  return Math.floor(a / slice) % n;
};
```

- [ ] **Step 1: Write failing tests:**
  - `wheelPlaces` removes excluded and skipped ids.
  - `wheelPlaces returns [] when all excluded` (Review Focus 3).
  - `pickIndex(4, () => 0.99) === 3`, `pickIndex(4, () => 0) === 0`.
  - For n in `[1, 2, 7, 40]`, every index, and `current` in `[0, 3.3, 100]`: `t = targetRotation(i, n, current)` satisfies `t > current + 2π·4` and `indexAtRotation(t, n) === i` (covers `targetRotation with n=1`, Review Focus 5).

- [ ] **Step 2:** `npm test` → FAIL.
- [ ] **Step 3:** Implement. `targetRotation`: desired final angle mod 2π = `2π − (index + 0.5)·slice`; result = `current + turns·2π + ((desired − current) mod 2π, normalised to [0, 2π))`.
- [ ] **Step 4:** `npm test` → PASS.
- [ ] **Step 5:** `git add -A && git commit -m "feat: wheel selection math"`

---

### Task 4: Wheel canvas + main screen

**Files:**
- Create: `index.html`, `styles.css`, `src/wheel-canvas.js`, `src/app.js`

**Interfaces:**
- Consumes: Tasks 1–3.
- Produces (`src/wheel-canvas.js`):
  - `drawWheel(canvas: HTMLCanvasElement, places: Place[], rotation: number) => void` — slices in a fixed palette cycling ≥ 8 colors (adjacent slices differ, including last/first when n > 1); labels truncated with `…`; labels omitted when `places.length > 40`; pointer triangle at top; HiDPI via `devicePixelRatio`.
  - `animateSpin(from: number, to: number, ms: number, onFrame: (r:number)=>void) => Promise<void>` — `requestAnimationFrame`, ease-out cubic, 4000 ms in app.

Main screen layout (top → bottom): list chips row (toggle `setListActive`) + "＋ Upload" (`<input type=file accept=".csv" multiple>`), ✏️ Edit button, canvas wheel (square, `min(90vw, 420px)`), big **SPIN** button, result card (hidden until a spin finishes) with title, note, **Open in Maps** (`<a target=_blank rel=noopener href=url>`, hidden when url empty), **Nope, spin again**, and a **Reset skipped (N)** link visible when N > 0.

Behaviour in `app.js`:
- Session `skipped = new Set()`; `rotation` kept in memory.
- Upload: for each file, `parseTakeoutCsv(await file.text(), file.name.replace(/\.csv$/i,''))` → `addList` → `saveState`; on parse error show the message inline naming the file, continue with other files.
- Spin: disabled while spinning or when `wheelPlaces` is empty; `i = pickIndex(n)`; animate to `targetRotation(i, n, rotation)`; show result for `places[i]`.
- Nope: add result id to `skipped`, redraw, spin again.
- Empty states: no lists → panel with the Takeout steps (takeout.google.com → Deselect all → Saved → export → unzip `Takeout/Saved/*.csv`) and the upload button; lists but 0 wheel places → "No places on the wheel — tap ✏️ to add some", Spin disabled.
- Swipe (optional): a vertical/horizontal flick on the canvas triggers Spin.

- [ ] **Step 1:** Implement files above.
- [ ] **Step 2:** Serve: `python3 -m http.server 8000`; open `http://localhost:8000` (use the `run` skill / browser). Verify with a sample CSV saved to `.superpowers/tmp/Want to go.csv` (5 rows incl. a quoted comma and an empty-title row):
  - upload → chip "Want to go" appears, wheel shows 4 slices;
  - 10 spins → the result card name always equals the slice under the pointer;
  - Nope → slice disappears, Reset skipped (1) restores it;
  - reload → list still present;
  - phone-width viewport (390px) → no horizontal scroll.
- [ ] **Step 3:** `npm test` → PASS (regression).
- [ ] **Step 4:** `git add -A && git commit -m "feat: spinner wheel UI"`

---

### Task 5: Edit wheel screen

**Files:**
- Modify: `index.html`, `styles.css`, `src/app.js`

**Interfaces:**
- Consumes: `activePlaces`, `setExcluded`, `saveState`.

Screen (full-screen panel over main): header "Edit wheel" + **All** / **None**, search input (case-insensitive substring on title and note), list of `activePlaces` as checkbox rows (checked = not in `state.excluded`), list name shown small when > 1 list active, **Done** returns and redraws. All/None apply only to currently visible (filtered) rows. Each toggle saves immediately. Also on this screen: per-list "Remove list" (calls `removeList`, confirm first).

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Browser check: untick 2 places → Done → wheel has 2 fewer slices; reload → still excluded; search "ta" + None → only matching rows unticked; All → restored; untick all → Spin disabled with message.
- [ ] **Step 3:** `npm test` → PASS.
- [ ] **Step 4:** `git add -A && git commit -m "feat: edit wheel screen"`

---

### Task 6: PWA + deploy readiness

**Files:**
- Create: `manifest.webmanifest`, `sw.js`, `icon.svg`, `README.md`
- Modify: `index.html` (manifest link, theme-color, SW registration)

- `manifest.webmanifest`: name "Where to Eat Wheel", short_name "Eat Wheel", `display: standalone`, `start_url: "./"`, `scope: "./"`, icon `icon.svg` (`sizes: "any"`, purpose `any maskable`).
- `sw.js`: cache-first for the app shell (all static files listed explicitly, cache name `eat-wheel-v1`); delete old caches on activate. Relative paths so it works under a GitHub Pages subpath.
- `README.md`: what it is, Takeout export steps, local run (`python3 -m http.server`), deploy (push to GitHub, Settings → Pages → deploy from branch root).

- [ ] **Step 1:** Implement.
- [ ] **Step 2:** Browser check: DevTools → Application shows manifest valid + SW activated; set Offline, reload → app loads with saved lists.
- [ ] **Step 3:** `npm test` → PASS.
- [ ] **Step 4:** `git add -A && git commit -m "feat: installable PWA + README"`
