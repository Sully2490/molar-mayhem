import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { recall, templates } from '../content/templates/index.js';
import { grade } from '../js/grade.js';
import { diagnose, formatAnswer, generateFromSeed } from '../js/generate.js';

const SECTIONS = {
  1: [1, 2, 3, 4, 5, 6],
  2: [1, 2, 3, 4],
  3: [1, 2, 3, 4, 5, 6, 7],
  4: [1, 2, 3, 4, 5, 6],
  5: [1, 2, 3, 4],
  6: [1, 2, 3, 4],
  7: [1, 2, 3, 4, 5],
  8: [1, 2, 3, 4, 5, 6],
  9: [1, 2, 3, 4],
};

function mistakeText(problem, value) {
  if (problem.check.kind === 'numeric') {
    return formatAnswer(value, problem.check.sigFigs, problem.check.unit);
  }
  return String(value);
}

function assertGasBounds(spec, problem) {
  assert.ok(problem.vars.n >= 0.001 && problem.vars.n <= 20, `${spec.id} n=${problem.vars.n}`);
  const pressures = Object.entries(problem.vars).filter(([key, value]) => (
    typeof value === 'number' && /^P([0-9]|gas|tot)?$/.test(key)
  ));
  assert.ok(pressures.length > 0, `${spec.id} has no pressure`);
  for (const [key, value] of pressures) {
    assert.ok(value >= 0.1 && value <= 10, `${spec.id} ${key}=${value}`);
  }
  if (problem.check.unit === 'atm') {
    assert.ok(problem.check.value >= 0.1 && problem.check.value <= 10, `${spec.id} answer P`);
  }
  if (problem.check.unit === 'mol') {
    assert.ok(problem.check.value >= 0.001 && problem.check.value <= 20, `${spec.id} answer n`);
  }
}

function assertCalorimetry(spec, problem) {
  assert.ok(problem.vars.dT >= 1 && problem.vars.dT <= 60, `${spec.id} dT=${problem.vars.dT}`);
  if (typeof problem.vars.dTHot === 'number') {
    assert.ok(problem.vars.dTHot >= 1 && problem.vars.dTHot <= 60, `${spec.id} dTHot`);
  }
  for (const key of ['T1', 'T2', 'Tc', 'Th', 'Tf', 'Tw']) {
    if (typeof problem.vars[key] !== 'number') continue;
    assert.ok(problem.vars[key] >= 5 && problem.vars[key] <= 95, `${spec.id} ${key}=${problem.vars[key]}`);
  }
  if (typeof problem.vars.Tc === 'number') {
    assert.ok(problem.vars.Tf > problem.vars.Tc && problem.vars.Tf < problem.vars.Th, `${spec.id} Tf`);
  }
}

describe('template library', () => {
  it('has at least 80 unique templates across chapters 1–9', () => {
    const ids = new Set(templates.map((item) => item.id));
    assert.equal(ids.size, templates.length);
    assert.ok(templates.length >= 80, `only ${templates.length} templates`);
    for (const chapter of [1, 2, 3, 4, 5, 6, 7, 8, 9]) {
      assert.ok(templates.some((item) => item.ch === chapter), `missing chapter ${chapter}`);
    }
  });

  it('redraws a seed when valid() fails', () => {
    const spec = {
      id: 'redraw-demo',
      vars: { n: { min: 1, max: 6, step: 1 } },
      template: 'Value {n}',
      solve: (v) => v.n,
      unit: null,
      sigFigs: 1,
      hints: () => ['Use the even value.'],
      why: (_v, x) => `The value is ${x}.`,
      mistakes: [],
      valid: (v) => v.n % 2 === 0,
    };
    const problem = generateFromSeed(spec, 1);
    assert.equal(problem.vars.n % 2, 0);
    assert.ok(problem.seed >= 1);
    const again = generateFromSeed(spec, problem.seed);
    assert.equal(again.q, problem.q);
    assert.equal(again.a, problem.a);
  });

  for (const spec of templates) {
    it(`${spec.id} is stable, graded, and inside the chemistry bounds`, () => {
      const section = String(spec.openstax_section).match(/§(\d+)\.(\d+)/);
      assert.ok(section, spec.openstax_section);
      assert.equal(Number(section[1]), spec.ch);
      assert.ok(SECTIONS[spec.ch].includes(Number(section[2])), spec.openstax_section);
      assert.ok(Array.isArray(spec.mistakes) && spec.mistakes.length >= 2, spec.id);

      const problems = [];
      for (let seed = 1; seed <= 50; seed += 1) {
        const problem = generateFromSeed(spec, seed);
        const again = generateFromSeed(spec, seed);
        assert.equal(again.q, problem.q, `${spec.id} seed ${seed} q`);
        assert.equal(again.a, problem.a, `${spec.id} seed ${seed} a`);
        assert.equal(problem.templateId, spec.id);
        assert.equal(problem.q.includes('NaN'), false);
        assert.equal(problem.q.includes('Infinity'), false);
        assert.equal(problem.a.includes('NaN'), false);

        for (const [name, range] of Object.entries(spec.vars ?? {})) {
          const value = problem.vars[name];
          if (Array.isArray(range.choices)) {
            assert.ok(range.choices.includes(value), `${spec.id} ${name}`);
          } else {
            assert.ok(value >= range.min - 1e-9 && value <= range.max + 1e-9, `${spec.id} ${name}=${value}`);
          }
        }
        if (typeof spec.valid === 'function') assert.equal(spec.valid(problem.vars), true, spec.id);

        const graded = grade(problem.a, problem.check);
        assert.equal(graded.ok, true, `${spec.id} seed ${seed} ${graded.reason || ''} ${problem.a}`);
        assert.equal(graded.hint, undefined, `${spec.id} sig figs ${problem.a}`);

        if (problem.check.kind === 'numeric') {
          assert.equal(Number.isFinite(problem.check.value), true, spec.id);
        }

        for (const mistake of problem.mistakes) {
          assert.equal(Number.isFinite(mistake.value) || typeof mistake.value === 'string', true, mistake.id);
          const text = mistakeText(problem, mistake.value);
          const wrong = grade(text, problem.check);
          assert.equal(wrong.ok, false, `${spec.id} ${mistake.id} graded as correct (${text})`);
          const found = diagnose(text, problem);
          assert.ok(found, `${spec.id} ${mistake.id} was not diagnosed from ${text}`);
          assert.equal(found.id, mistake.id, `${spec.id} ${mistake.id} diagnosed as ${found.id} (${text})`);
          assert.equal(found.message, mistake.message);
        }

        if (spec.ch === 8) assertGasBounds(spec, problem);
        if (spec.topic === 'calorimetry') assertCalorimetry(spec, problem);
        if (spec.id === 'ch06-dilution') {
          assert.ok(problem.vars.C2 < problem.vars.C1, `${spec.id} C2`);
          assert.ok(problem.vars.V2 > problem.vars.V1, `${spec.id} V2`);
        }
        if (spec.id === 'ch07-percent-yield') {
          assert.ok(problem.check.value <= 100, `${spec.id} yield ${problem.check.value}`);
        }
        problems.push(problem);
      }

      const unique = new Set(problems.map((problem) => problem.q));
      assert.ok(unique.size >= 45, `${spec.id} only ${unique.size} different questions in 50 seeds`);
    });
  }
});

describe('recall deck', () => {
  it('accepts each card and rejects a lowercased formula', () => {
    const ids = new Set();
    for (const card of recall) {
      assert.equal(ids.has(card.id), false, card.id);
      ids.add(card.id);
      const graded = grade(card.back, card.check);
      assert.equal(graded.ok, true, `${card.id} ${graded.reason || ''}`);
      if (card.check.case === 'formula') {
        const lower = grade(card.back.toLowerCase(), card.check);
        assert.equal(lower.ok, false, `${card.id} accepted a lowercase formula`);
      }
    }
    const acids = recall.find((card) => card.id === 'recall-strong-acids');
    const near = grade('HCl, HBr, HI, HNO3, H2SO4, HF', acids.check);
    assert.equal(near.ok, false);
    assert.equal(near.reason, 'nearMiss');
  });
});
