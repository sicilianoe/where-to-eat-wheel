/**
 * @typedef {import('./csv.js').Place} Place
 * @typedef {{ lists: Record<string, Place[]>, activeLists: string[], excluded: string[] }} State
 */

const KEY = 'gmaps-wheel:v1';

/** @returns {State} */
const emptyState = () => ({ lists: {}, activeLists: [], excluded: [] });

/** @param {Storage} storage @returns {State} */
export function loadState(storage) {
  try {
    const raw = JSON.parse(storage.getItem(KEY) ?? 'null');
    if (!raw || typeof raw !== 'object') return emptyState();
    return {
      lists: raw.lists && typeof raw.lists === 'object' ? raw.lists : {},
      activeLists: Array.isArray(raw.activeLists) ? raw.activeLists : [],
      excluded: Array.isArray(raw.excluded) ? raw.excluded : [],
    };
  } catch {
    return emptyState();
  }
}

/** @param {Storage} storage @param {State} state */
export function saveState(storage, state) {
  storage.setItem(KEY, JSON.stringify(state));
}

/** @param {State} state @param {string} name @param {Place[]} places @returns {State} */
export function addList(state, name, places) {
  return setListActive({ ...state, lists: { ...state.lists, [name]: places } }, name, true);
}

/** @param {State} state @param {string} name @returns {State} */
export function removeList(state, name) {
  const { [name]: _removed, ...lists } = state.lists;
  return setListActive({ ...state, lists }, name, false);
}

/** @param {State} state @param {string} name @param {boolean} active @returns {State} */
export function setListActive(state, name, active) {
  const others = state.activeLists.filter(n => n !== name);
  return { ...state, activeLists: active ? [...others, name] : others };
}

/** @param {State} state @param {string[]} ids @param {boolean} excluded @returns {State} */
export function setExcluded(state, ids, excluded) {
  const set = new Set(state.excluded);
  for (const id of ids) excluded ? set.add(id) : set.delete(id);
  return { ...state, excluded: [...set] };
}

/** @param {State} state @returns {Place[]} */
export function activePlaces(state) {
  return state.activeLists.flatMap(name => state.lists[name] ?? []);
}
