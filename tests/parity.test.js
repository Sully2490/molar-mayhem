import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const doc = readFileSync(new URL('../docs/PARITY.md', import.meta.url), 'utf8');

test('sync is a manual local code with no account or backend', () => {
  assert.match(doc, /manual export\/import code/i);
  assert.match(doc, /localStorage/);
  assert.match(doc, /#sync=/);
  assert.match(doc, /No accounts/);
  assert.match(doc, /No logins/);
  assert.match(doc, /No backend/);
});

test('every Lab tool needs a description, keyboard, a still frame, and touch', () => {
  assert.match(doc, /tetrahedral, 109\.5°/);
  assert.match(doc, /aria-live/);
  assert.match(doc, /aria-describedby/);
  assert.match(doc, /keyboard alone/);
  assert.match(doc, /prefers-reduced-motion: reduce/);
  assert.match(doc, /still frame/);
  assert.match(doc, /max-width: 720px/);
  for (const tool of ['VSEPR 3D', 'EM wave', 'standing waves', 'Lewis structure builder']) {
    assert.match(doc, new RegExp(tool));
  }
});
