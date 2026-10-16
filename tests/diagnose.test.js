import assert from 'node:assert/strict';
import { test } from 'node:test';
import { diagnose, loadLaneAMistakes, MESSAGES } from '../js/diagnose.js';
import { grade } from '../js/grade.js';

const numeric = (value, extra = {}) => ({ kind: 'numeric', value, tolerance: 0.5, ...extra });

test('synthetic mistakes match in rule order and a near miss stays quiet', () => {
  const check = numeric(20);
  assert.equal(diagnose('-20', check).id, 'sign');
  assert.equal(diagnose('-20', check).message, MESSAGES.sign);
  assert.equal(diagnose('200', check).id, 'exponent');
  assert.equal(diagnose('200', check).message, MESSAGES.exponent);
  assert.equal(diagnose('293.15', check).id, 'kelvin');
  assert.equal(diagnose('293.15', check).message, MESSAGES.kelvin);
  assert.equal(diagnose('80', check, [], { ratio: [1, 2] }).id, 'flip-ratio');
  assert.equal(diagnose('80', check, [], { ratio: [1, 2] }).message, MESSAGES['flip-ratio']);
  assert.equal(diagnose('13.7', numeric(10), [], {}), null);
});

test('rule order is deterministic when two rules could match', () => {
  const scaled = diagnose('100', numeric(10), [], { recompute: () => 100 });
  assert.equal(scaled.id, 'exponent');
  assert.deepEqual(diagnose('100', numeric(10), [], { recompute: () => 100 }), scaled);

  assert.equal(diagnose('303.5', numeric(30.35)).id, 'exponent');

  const both = diagnose('16', numeric(4), [], { ratio: [1, 2], coefficients: [4] });
  assert.equal(both.id, 'flip-ratio');
  assert.deepEqual(diagnose('16', numeric(4), [], { ratio: [1, 2], coefficients: [4] }), both);
});

test('a named mistake beats the generic rule and keeps its own message', () => {
  const check = numeric(10);
  const named = diagnose('-10', check, [{
    id: 'sign',
    describe: 'Heat left the system, so q is negative.',
    value: -10,
  }]);
  assert.equal(named.id, 'sign');
  assert.equal(named.message, 'Heat left the system, so q is negative.');
  assert.notEqual(named.message, MESSAGES.sign);
});

test('skip-moles outranks sign, and an alias keeps its own id', () => {
  const check = numeric(4);
  const ranked = diagnose('-40', check, [
    { id: 'sign', describe: 'Wrong sign.', value: -40 },
    { id: 'skip-moles', describe: 'Convert to moles first.', value: -40 },
  ]);
  assert.equal(ranked.id, 'skip-moles');
  assert.equal(ranked.message, 'Convert to moles first.');

  const alias = diagnose('99', check, [
    { id: 'sign', describe: 'Wrong sign.', value: 99 },
    { id: 'flipped-ratio', describe: 'The ratio is upside down.', value: 99 },
  ]);
  assert.equal(alias.id, 'flipped-ratio');
  assert.equal(alias.message, 'The ratio is upside down.');
});

test('wrongAnswerFn supplies the named value, and a throw is skipped', () => {
  const check = numeric(4);
  let seen = null;
  const fromTemplate = diagnose('40', check, [{
    id: 'skip-moles',
    describe: 'Convert to moles first.',
    wrongAnswerFn(ctx) {
      seen = ctx.ratio;
      return 40;
    },
  }], { ratio: [1, 2] });
  assert.equal(fromTemplate.id, 'skip-moles');
  assert.deepEqual(seen, [1, 2]);

  const skipped = diagnose('40', check, [
    { id: 'sign', describe: 'Unused.', wrongAnswerFn() { throw new Error('missing template'); } },
    { id: 'skip-moles', describe: 'Convert to moles first.', value: 40 },
  ]);
  assert.equal(skipped.id, 'skip-moles');
});

test('correct answers are not diagnosed, and a sig-fig miss is not another mistake', () => {
  const check = numeric(1.5, { sigFigs: 2 });
  const loose = grade('1.50', check);
  assert.equal(loose.ok, false);
  assert.equal(loose.reason, 'sigfigs');
  assert.equal(diagnose('1.50', check, [{ id: 'sign', describe: 'Nope.', value: -1.5 }]), null);
  assert.equal(grade('1.5', check).ok, true);
  assert.equal(diagnose('1.5', check), null);
  assert.equal(diagnose('20 kg', numeric(20, { unit: 'g' })), null);
});

test('a double bond counted twice is an exact-check miss', () => {
  const check = { kind: 'exact', text: 'sp', case: 'insensitive' };
  assert.equal(diagnose('sp', check, [], { overcount: 'sp3' }), null);
  const found = diagnose('sp3', check, [], { overcount: 'sp3' });
  assert.equal(found.id, 'double-bond');
  assert.equal(found.message, MESSAGES['double-bond']);
  assert.equal(diagnose('sp3', numeric(2), [], { overcount: 'sp3' }), null);
});

test('lane A mistakes degrade to an empty list when js/gen is absent', async () => {
  assert.deepEqual(await loadLaneAMistakes({ id: 'missing' }), []);
});
