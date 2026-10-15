import { test } from 'node:test';
import assert from 'node:assert/strict';
import { withinRelativePercent } from '../js/grade.js';

test('tiny values: off by 10x is rejected', () => {
  assert.equal(withinRelativePercent(4.307e-18, 4.307e-19, 0.5), false);
});
test('tiny values: wrong sign is rejected', () => {
  assert.equal(withinRelativePercent(-4.307e-19, 4.307e-19, 0.5), false);
});
test('tiny values: within 0.5% is accepted', () => {
  assert.equal(withinRelativePercent(4.309e-19, 4.307e-19, 0.5), true);
});
test('normal values still graded the same', () => {
  assert.equal(withinRelativePercent(22.41, 22.40, 0.5), true);
  assert.equal(withinRelativePercent(23.0, 22.40, 0.5), false);
});
