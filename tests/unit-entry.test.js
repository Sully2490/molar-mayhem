import assert from 'node:assert/strict';
import { test } from 'node:test';
import { grade } from '../js/grade.js';
import { UNIT_PROBLEMS, feedbackForUnit, renderDrill } from '../js/unit-entry.js';

function roundSig(value, sigs) {
  const exponent = Math.floor(Math.log10(Math.abs(value)));
  const factor = 10 ** (sigs - 1 - exponent);
  return Math.round(value * factor) / factor;
}

test('unit entry uses separate value and unit fields', () => {
  const html = renderDrill();
  assert.match(html, /data-route="Drill"/);
  assert.match(html, /for="value-i1-gold"/);
  assert.match(html, />Value</);
  assert.match(html, /id="value-i1-gold"[^>]*inputmode="decimal"/);
  assert.match(html, /class="answer-field">\s*<label class="answer-label" for="unit-i1-gold">Unit<\/label>/);
  assert.match(html, /for="unit-i1-gold"/);
  assert.match(html, />Unit</);
  assert.equal(/id="unit-i1-gold"[^>]*inputmode=/.test(html), false);
  assert.match(html, /aria-live="polite"/);
  assert.equal(UNIT_PROBLEMS[0].check.value, roundSig(19.3 * 2.5, 3));
  assert.equal(UNIT_PROBLEMS[1].check.value, roundSig(50 / 0.789, 3));
});

test('feedback distinguishes the number, the unit, and sig figs', () => {
  const problem = UNIT_PROBLEMS[0];
  const right = grade('48.3 g', problem.check);
  assert.equal(feedbackForUnit(right, 1, problem).status, 'correct');
  const figs = grade('48.25 g', problem.check);
  assert.equal(figs.ok, true);
  assert.equal(feedbackForUnit(figs, 1, problem).status, 'sig');
  const unit = grade('48.3 kg', problem.check);
  assert.equal(unit.reason, 'unit');
  assert.match(feedbackForUnit(unit, 1, problem).text, /unit/);
  const number = grade('10 g', problem.check);
  assert.equal(number.reason, 'tolerance');
  assert.match(feedbackForUnit(number, 1, problem).text, /Not yet/);
  assert.equal(feedbackForUnit(number, 3, problem).status, 'solution');
});
