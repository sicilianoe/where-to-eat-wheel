/**
 * @typedef {{ id: string, list: string, title: string, note: string, url: string }} Place
 */

/** @param {string} text @returns {string[][]} */
export function parseCsv(text) {
  const rows = [];
  let row = [];
  let cell = '';
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (inQuotes) {
      if (ch === '"' && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        cell += ch;
      }
    } else if (ch === '"') {
      inQuotes = true;
    } else if (ch === ',') {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && text[i + 1] === '\n') i++;
      row.push(cell);
      rows.push(row);
      row = [];
      cell = '';
    } else {
      cell += ch;
    }
  }
  if (cell !== '' || row.length > 0) {
    row.push(cell);
    rows.push(row);
  }
  return rows;
}

/** @param {string} text @param {string} listName @returns {Place[]} */
export function parseTakeoutCsv(text, listName) {
  const [header = [], ...rows] = parseCsv(text.replace(/^﻿/, ''));
  const col = name => header.findIndex(h => h.trim().toLowerCase() === name);
  const titleCol = col('title');
  const noteCol = col('note');
  const urlCol = col('url');
  if (titleCol === -1) throw new Error('Not a Google Takeout list: missing Title column');

  const cellAt = (row, idx) => (idx === -1 ? '' : (row[idx] ?? '').trim());
  return rows
    .map(row => ({ title: cellAt(row, titleCol), note: cellAt(row, noteCol), url: cellAt(row, urlCol) }))
    .filter(p => p.title)
    .map(p => ({ id: `${listName}|${p.url || p.title}`, list: listName, ...p }));
}
