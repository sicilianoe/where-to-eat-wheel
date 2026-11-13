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
  const csv = 'Title,Note,URL\n\n,orphan note,\n,,,,\nTacos,,\n';
  assert.deepEqual(parseTakeoutCsv(csv, 'L').map(p => p.id), ['L|Tacos']);
});

test('parseTakeoutCsv throws on missing Title column', () => {
  assert.throws(() => parseTakeoutCsv('Name,URL\nx,y\n', 'L'), /Title/);
});
