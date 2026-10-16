import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { test } from 'node:test';
import { grade, parseConfig } from '../js/grade.js';
import { validateLesson } from '../js/schema.js';

/**
 * Section titles were checked against the OpenStax Chemistry: Atoms First 2e
 * outline on the chapter introduction and the chapter summary.
 * https://openstax.org/books/chemistry-atoms-first-2e/pages/3-introduction
 */
const OUTLINE = [
  { file: '3.1.json', id: 'ch03-electromagnetic', section: '3.1', title: 'Electromagnetic Energy' },
  { file: '3.2.json', id: 'ch03-bohr', section: '3.2', title: 'The Bohr Model' },
  { file: '3.3.json', id: 'ch03-quantum', section: '3.3', title: 'Development of Quantum Theory' },
  { file: '3.4.json', id: 'ch03-configurations', section: '3.4', title: 'Electronic Structure of Atoms (Electron Configurations)' },
  { file: '3.5.json', id: 'ch03-periodic-trends', section: '3.5', title: 'Periodic Variations in Element Properties' },
  { file: '3.6.json', id: 'ch03-periodic-table', section: '3.6', title: 'The Periodic Table' },
  { file: '3.7.json', id: 'ch03-compounds', section: '3.7', title: 'Ionic and Molecular Compounds' },
];

const C = 2.998e8;
const H = 6.626e-34;
const K = 2.179e-18;
const R = 1.097e7;
const A0 = 5.292e-11;
const ME = 9.109e-31;
const NA = 6.022e23;

const SUBSHELLS = [
  { id: '1s', n: 1, l: 0, cap: 2 },
  { id: '2s', n: 2, l: 0, cap: 2 },
  { id: '2p', n: 2, l: 1, cap: 6 },
  { id: '3s', n: 3, l: 0, cap: 2 },
  { id: '3p', n: 3, l: 1, cap: 6 },
  { id: '4s', n: 4, l: 0, cap: 2 },
  { id: '3d', n: 3, l: 2, cap: 10 },
  { id: '4p', n: 4, l: 1, cap: 6 },
  { id: '5s', n: 5, l: 0, cap: 2 },
  { id: '4d', n: 4, l: 2, cap: 10 },
  { id: '5p', n: 5, l: 1, cap: 6 },
];

const SYMBOL = {
  1: 'H', 2: 'He', 6: 'C', 7: 'N', 8: 'O', 9: 'F', 10: 'Ne', 11: 'Na', 12: 'Mg',
  13: 'Al', 14: 'Si', 15: 'P', 16: 'S', 17: 'Cl', 18: 'Ar', 19: 'K', 20: 'Ca',
  24: 'Cr', 25: 'Mn', 26: 'Fe', 27: 'Co', 28: 'Ni', 29: 'Cu', 30: 'Zn', 32: 'Ge',
  33: 'As', 35: 'Br', 36: 'Kr', 38: 'Sr', 53: 'I',
};

const lessonDir = new URL('../content/ch03/', import.meta.url);
const lessons = readdirSync(lessonDir)
  .filter((name) => name.endsWith('.json') && name !== 'index.json')
  .sort()
  .map((name) => ({
    name,
    lesson: JSON.parse(readFileSync(new URL(name, lessonDir), 'utf8')),
  }));

function byId(id) {
  for (const { lesson } of lessons) {
    const problem = lesson.problems.find((item) => item.id === id);
    if (problem) return problem;
  }
  return null;
}

function format4(value) {
  const abs = Math.abs(value);
  if (abs < 1e-2 || abs >= 1e4) return value.toExponential(3).replace('e+', 'e');
  return Number(value.toPrecision(4)).toPrecision(4);
}

function sameConfig(left, right) {
  const a = parseConfig(left);
  const b = parseConfig(right);
  assert.ok(a, left);
  assert.ok(b, right);
  assert.equal(a.size, b.size, `${left} vs ${right}`);
  for (const [key, count] of a) assert.equal(b.get(key), count, key);
}

function fillNeutral(z) {
  const counts = new Map();
  let left = z;
  for (const sub of SUBSHELLS) {
    if (left === 0) break;
    const take = Math.min(sub.cap, left);
    counts.set(sub.id, take);
    left -= take;
  }
  if (z === 24) {
    counts.set('4s', 1);
    counts.set('3d', 5);
  }
  if (z === 29) {
    counts.set('4s', 1);
    counts.set('3d', 10);
  }
  return counts;
}

function removeElectrons(counts, nRemove) {
  let left = nRemove;
  while (left > 0) {
    let best = null;
    for (const [id, count] of counts) {
      if (count <= 0) continue;
      const sub = SUBSHELLS.find((item) => item.id === id);
      if (!best || sub.n > best.n || (sub.n === best.n && sub.l > best.l)) best = sub;
    }
    const have = counts.get(best.id);
    const take = Math.min(have, left);
    if (have === take) counts.delete(best.id);
    else counts.set(best.id, have - take);
    left -= take;
  }
}

function addElectrons(counts, nAdd) {
  let left = nAdd;
  for (const sub of SUBSHELLS) {
    if (left === 0) break;
    const have = counts.get(sub.id) ?? 0;
    const take = Math.min(sub.cap - have, left);
    if (take > 0) counts.set(sub.id, have + take);
    left -= take;
  }
}

function configuration(z, charge = 0) {
  const counts = fillNeutral(z);
  if (charge > 0) removeElectrons(counts, charge);
  if (charge < 0) addElectrons(counts, -charge);
  return counts;
}

function fullConfig(counts) {
  return [...counts.entries()].map(([id, count]) => `${id}${count}`).join(' ');
}

function renderSubshell(id, count, cap) {
  const orbitals = cap / 2;
  const boxes = Array.from({ length: orbitals }, () => '');
  let left = count;
  for (let i = 0; i < orbitals && left > 0; i += 1) {
    boxes[i] = '↑';
    left -= 1;
  }
  for (let i = 0; i < orbitals && left > 0; i += 1) {
    boxes[i] = '↑↓';
    left -= 1;
  }
  return `${id} ${boxes.map((box) => box || '[]').join(' ')}`;
}

function orbitalBoxes(counts, only = null) {
  const parts = [];
  for (const sub of SUBSHELLS) {
    if (!counts.has(sub.id)) continue;
    if (only && !only.includes(sub.id)) continue;
    parts.push(renderSubshell(sub.id, counts.get(sub.id), sub.cap));
  }
  return parts.join(' | ');
}

function electronsIn(text) {
  const parsed = parseConfig(text);
  let total = 0;
  for (const count of parsed.values()) total += count;
  return total;
}

function superscripts(text) {
  const sup = '⁰¹²³⁴⁵⁶⁷⁸⁹';
  return text.replace(/\d/g, (digit) => sup[Number(digit)]);
}

function subscripts(text) {
  const sub = '₀₁₂₃₄₅₆₇₈₉';
  return text.replace(/\d/g, (digit) => sub[Number(digit)]);
}

function swap4s3d(text) {
  const parts = text.split(' ');
  const i = parts.findIndex((part) => /^4s\d+$/.test(part));
  const j = parts.findIndex((part) => /^3d\d+$/.test(part));
  if (i < 0 || j < 0) return null;
  const copy = [...parts];
  [copy[i], copy[j]] = [copy[j], copy[i]];
  return copy.join(' ');
}

const CORES = [
  ['[Xe]', '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6 5s2 4d10 5p6'],
  ['[Kr]', '1s2 2s2 2p6 3s2 3p6 4s2 3d10 4p6'],
  ['[Ar]', '1s2 2s2 2p6 3s2 3p6'],
  ['[Ne]', '1s2 2s2 2p6'],
  ['[He]', '1s2'],
];

function expandCore(text) {
  let out = text;
  for (const [token, body] of CORES) out = out.replaceAll(token, body);
  return out;
}

function acceptedTexts(check) {
  const texts = [];
  if (typeof check.text === 'string' && check.text.length > 0) texts.push(check.text);
  if (Array.isArray(check.answers)) texts.push(...check.answers);
  return texts;
}

function wrongInput(problem) {
  if (problem.check.kind === 'numeric') {
    return problem.check.unit ? `999 ${problem.check.unit}` : '999';
  }
  if (problem.check.kind === 'config') return '1s1';
  if (problem.check.kind === 'set') return 'Zz';
  return 'not-the-answer';
}

function needsSensitive(check) {
  return acceptedTexts(check).some((text) => (
    /[A-Z]/.test(text) || /\d[spdf]/.test(text) || /^[spdf]$/.test(text) || /ns\d/.test(text) || /[↑↓]/.test(text)
  ));
}

test('chapter 3 matches the Atoms First 2e outline and the lesson schema', () => {
  assert.equal(lessons.length, OUTLINE.length);
  for (const { name, lesson } of lessons) {
    const spec = OUTLINE.find((item) => item.file === name);
    assert.ok(spec, name);
    assert.equal(OUTLINE.filter((item) => item.title === spec.title).length, 1);
    assert.deepEqual(validateLesson(lesson), []);
    assert.equal(lesson.ch, 3);
    assert.equal(lesson.id, spec.id);
    assert.equal(lesson.openstax_section, `OpenStax AF2e §${spec.section}`);
    assert.deepEqual(lesson.sources, [`OpenStax AF2e §${spec.section}`]);
    assert.ok(lesson.problems.length >= 10, lesson.id);
    assert.ok(lesson.steps.length >= 3);
    assert.equal(lesson.guide_line.length > 0, true);
    const cited = JSON.stringify(lesson).match(/§3\.\d/g) ?? [];
    for (const cite of cited) assert.equal(cite, `§${spec.section}`, lesson.id);
  }
});

test('every hint is specific to one problem', () => {
  const seen = new Map();
  for (const { lesson } of lessons) {
    const hints = [lesson.similar_problem.hint, ...lesson.problems.flatMap((problem) => problem.hints)];
    for (const hint of hints) {
      assert.equal(typeof hint, 'string');
      assert.ok(hint.length > 20, hint);
      assert.equal(seen.has(hint), false, hint);
      seen.set(hint, lesson.id);
    }
    for (const problem of lesson.problems) assert.ok(problem.hints.length >= 1);
  }
  const expected = lessons.reduce((sum, { lesson }) => sum + 1 + lesson.problems.length, 0);
  assert.equal(seen.size, expected);
});

test('lesson text stays free of course-private wording', () => {
  const banned = /canvas|instructor|syllabus|gradebook|aktiv|worksheet/i;
  for (const { lesson } of lessons) assert.equal(banned.test(JSON.stringify(lesson)), false, lesson.id);
});

const problems = lessons.flatMap(({ lesson }) => lesson.problems.map((problem) => ({ lesson, problem })));

for (const { lesson, problem } of problems) {
  test(`${problem.id} grades the key and rejects a wrong answer`, () => {
    const section = lesson.openstax_section.match(/3\.\d/)[0];
    assert.match(problem.id, new RegExp(`^ch03-s3${section.slice(2)}-`));
    const graded = grade(problem.a, problem.check);
    assert.equal(graded.ok, true, problem.id);
    assert.equal(graded.hint, undefined, problem.id);
    if (problem.check.kind === 'set') {
      assert.equal(grade(problem.check.answers.join(', '), problem.check).ok, true, problem.id);
    } else {
      for (const text of acceptedTexts(problem.check)) {
        assert.equal(grade(text, problem.check).ok, true, `${problem.id} ${text}`);
      }
    }
    const wrong = grade(wrongInput(problem), problem.check);
    assert.equal(wrong.ok, false, problem.id);
    if (problem.check.kind === 'config' || (problem.check.kind !== 'numeric' && needsSensitive(problem.check))) {
      assert.equal(problem.check.case, 'sensitive', problem.id);
    }
    if (problem.check.kind === 'exact' && problem.check.case === 'sensitive' && /[A-Z]/.test(problem.a)) {
      const lower = problem.a.toLowerCase();
      if (lower !== problem.a) assert.equal(grade(lower, problem.check).ok, false, problem.id);
    }
    if (problem.check.kind === 'exact' && /\d/.test(problem.a) && /[A-Za-z]/.test(problem.a)) {
      assert.equal(grade(subscripts(problem.a), problem.check).ok, true, problem.id);
    }
    if (problem.check.kind === 'config') {
      assert.equal(lesson.openstax_section, 'OpenStax AF2e §3.4');
      assert.equal(grade(superscripts(problem.a), problem.check).ok, true, problem.id);
      assert.equal(grade(expandCore(problem.a), problem.check).ok, true, problem.id);
      const swapped = swap4s3d(problem.a);
      if (swapped) assert.equal(grade(swapped, problem.check).ok, true, problem.id);
      assert.equal(grade('1s2 2s2 2p5', problem.check).ok, false, problem.id);
    }
    if (problem.id.includes('box')) assert.equal(lesson.openstax_section, 'OpenStax AF2e §3.4');
  });
}

const NUMERIC = {
  'ch03-s31-p01': [C / 515e-9, 'Hz', '515.0'],
  'ch03-s31-p02': [C / 9.450e7, 'm', '9.450e7'],
  'ch03-s31-p03': [H * 6.500e14, 'J', '6.500e14'],
  'ch03-s31-p04': [H * C / 375e-9, 'J', '375.0'],
  'ch03-s31-p05': [H * C / 3.250e-19, 'm', '3.250e-19'],
  'ch03-s31-p06': [4.800e-19 / H, 'Hz', '4.800e-19'],
  'ch03-s31-p07': [2.500e-16 / 5.000e-19, null, '2.500e-16'],
  'ch03-s31-p08': [C / 1.250e-6, 'Hz', '1.250e-6'],
  'ch03-s31-p09': [(H * C / 475e-9) * NA / 1000, 'kJ/mol', '475.0'],
  'ch03-s31-p10': [C / 2.800e9, 'm', '2.800e9'],
  'ch03-s32-p01': [-K / 4, 'J', 'n = 2'],
  'ch03-s32-p02': [-K / 25, 'J', 'n = 5'],
  'ch03-s32-p03': [K * (1 / 4 - 1 / 16), 'J', 'n = 4 to n = 2'],
  'ch03-s32-p04': [1 / (R * (1 / 4 - 1 / 16)), 'm', 'n = 4 to n = 2'],
  'ch03-s32-p05': [K / 16, 'J', 'n = 4'],
  'ch03-s32-p06': [1 / (R * (1 - 1 / 25)), 'm', 'n = 5 to n = 1'],
  'ch03-s32-p07': [-K, 'J', 'He+'],
  'ch03-s32-p08': [9 * A0, 'm', 'n = 3'],
  'ch03-s32-p09': [(K * 0.75) / H, 'Hz', 'n = 2 to n = 1'],
  'ch03-s32-p10': [-K * 9 / 4, 'J', 'Li2+'],
  'ch03-s32-p11': [1 / (R * (1 / 9 - 1 / 36)), 'm', 'n = 6 to n = 3'],
  'ch03-s32-p12': [-K * 4 / 9, 'J', 'He+'],
  'ch03-s33-p01': [H / (ME * 1.85e6), 'm', '1.85e6'],
  'ch03-s33-p02': [H / (ME * 4.20e5), 'm', '4.20e5'],
  'ch03-s33-p03': [55.845 / NA, 'g', '55.845'],
  'ch03-s33-p04': [H / ((55.845 / NA / 1000) * 250), 'm', '250.0'],
  'ch03-s33-p05': [4.0026 / NA, 'g', '4.0026'],
  'ch03-s33-p06': [H / ((4.0026 / NA / 1000) * 425), 'm', '425.0'],
  'ch03-s37-p10': [2 * 1.008 + 32.06 + 4 * 15.999, 'g/mol', '15.999'],
};

test('numeric keys use the OpenStax working constants and four significant figures', () => {
  const light = lessons.find((item) => item.lesson.id === 'ch03-electromagnetic').lesson;
  const bohr = lessons.find((item) => item.lesson.id === 'ch03-bohr').lesson;
  assert.equal(light.worked_example.answer, `${format4(H * C / 650e-9)} J`);
  assert.equal(light.similar_problem.answer, `${format4(H * C / 420e-9)} J`);
  assert.equal(bohr.worked_example.answer, `${format4(K * (1 / 4 - 1 / 9))} J`);
  assert.equal(bohr.similar_problem.answer, `${format4(K * (1 - 1 / 16))} J`);
  for (const [id, [value, unit, token]] of Object.entries(NUMERIC)) {
    const problem = byId(id);
    assert.ok(problem.q.includes(token), id);
    assert.equal(problem.check.kind, 'numeric', id);
    assert.equal(problem.check.sigFigs, 4, id);
    assert.equal(problem.check.unit, unit, id);
    assert.ok(Math.abs(problem.check.value - value) <= Math.abs(value) * 1e-9 + 1e-12, id);
    const shown = unit ? `${format4(value)} ${unit}` : format4(value);
    assert.equal(problem.a, shown, id);
    assert.equal(grade(shown, problem.check).hint, undefined, id);
  }
  const forbidden = ['-2.421e-19', '7.566e-20', '6.198e-19', '3.205e-7'];
  for (const { problem } of problems) {
    if (problem.check.kind === 'numeric') assert.equal(forbidden.includes(format4(problem.check.value)), false, problem.id);
  }
});

test('counts, groups, and quantum-number rules are exact', () => {
  const counts = {
    'ch03-s33-p13': 3,
    'ch03-s33-p14': 16,
    'ch03-s33-p15': 32,
    'ch03-s33-p16': 9,
    'ch03-s33-p17': 10,
    'ch03-s33-p18': 2,
    'ch03-s33-p27': 2,
    'ch03-s34-unpaired-O': 2,
    'ch03-s34-unpaired-N': 3,
    'ch03-s34-unpaired-Fe': 4,
    'ch03-s34-unpaired-Cr': 6,
    'ch03-s34-unpaired-Cu': 1,
    'ch03-s34-unpaired-Zn': 0,
    'ch03-s34-valence-S': 6,
    'ch03-s34-valence-Ca': 2,
    'ch03-s34-valence-Br': 7,
    'ch03-s35-p10': 2,
    'ch03-s35-p11': 14,
    'ch03-s35-p12': 1,
    'ch03-s36-p01': 1,
    'ch03-s36-p04': 6,
    'ch03-s36-p12': 33,
    'ch03-s36-p14': 8,
  };
  for (const [id, value] of Object.entries(counts)) {
    const problem = byId(id);
    assert.equal(problem.check.value, value, id);
    assert.equal(problem.check.sigFigs, undefined, id);
    assert.equal(problem.a, String(value), id);
  }
  assert.equal(byId('ch03-s33-p07').a, 'allowed');
  assert.equal(byId('ch03-s33-p08').a, 'not allowed');
  assert.equal(byId('ch03-s33-p09').a, 'not allowed');
  assert.equal(grade('2', byId('ch03-s34-unpaired-Zn').check).ok, false);
  assert.equal(byId('ch03-s33-p19').check.kind, 'set');
  assert.equal(grade('-1, 0, 1', byId('ch03-s33-p19').check).ok, true);
  assert.equal(grade('1, 0, -1', byId('ch03-s33-p19').check).ok, true);
  assert.equal(grade('2, 0, -1', byId('ch03-s33-p19').check).ok, false);
  assert.equal(byId('ch03-s33-p21').a, 'Na');
  assert.equal(byId('ch03-s33-p22').a, 'Al');
  assert.equal(byId('ch03-s33-p23').a, 'N');
  assert.equal(byId('ch03-s33-p24').a, 'no');
  assert.equal(byId('ch03-s33-p25').a, 'no');
  assert.equal(byId('ch03-s33-p26').a, 'no');
  assert.equal(byId('ch03-s33-p28').a, 'sphere');
  assert.equal(byId('ch03-s33-p29').a, 'dumbbell');
  assert.equal(byId('ch03-s33-p30').a, 'no');
  assert.equal(byId('ch03-s31-p13').a, 'both');
  assert.equal(byId('ch03-s31-p14').a, 'higher');
  assert.equal(byId('ch03-s32-p15').a, 'absorption');
  assert.equal(byId('ch03-s32-p16').a, 'no');
  const spins = byId('ch03-s33-p31');
  assert.equal(grade('+1/2, -1/2', spins.check).ok, true);
  assert.equal(grade('-1/2, +1/2', spins.check).ok, true);
  assert.equal(grade('+1/2', spins.check).ok, false);
});

const CONFIG_JOBS = [
  ['ch03-s34-cfg-C', 6, 0],
  ['ch03-s34-cfg-O', 8, 0],
  ['ch03-s34-cfg-Na', 11, 0],
  ['ch03-s34-cfg-P', 15, 0],
  ['ch03-s34-cfg-Ca', 20, 0],
  ['ch03-s34-cfg-Ni', 28, 0],
  ['ch03-s34-cfg-Cr', 24, 0],
  ['ch03-s34-cfg-Cu', 29, 0],
  ['ch03-s34-cfg-Br', 35, 0],
  ['ch03-s34-cfg-Mn', 25, 0],
  ['ch03-s34-cfg-Zn', 30, 0],
  ['ch03-s34-cfg-Fe3plus', 26, 3],
  ['ch03-s34-cfg-Cl1minus', 17, -1],
  ['ch03-s34-cfg-Cu1plus', 29, 1],
  ['ch03-s34-cfg-Co2plus', 27, 2],
];

test('electron configurations accept shorthand and full forms, including Cr and Cu', () => {
  for (const [id, z, charge] of CONFIG_JOBS) {
    const problem = byId(id);
    const built = fullConfig(configuration(z, charge));
    sameConfig(problem.a, built);
    sameConfig(problem.check.text, built);
    assert.equal(grade(built, problem.check).ok, true, id);
    assert.equal(grade(built.replaceAll(' ', ''), problem.check).ok, true, id);
  }
  const chromium = byId('ch03-s34-cfg-Cr');
  const copper = byId('ch03-s34-cfg-Cu');
  assert.equal(chromium.a, '[Ar] 4s1 3d5');
  assert.equal(copper.a, '[Ar] 4s1 3d10');
  assert.equal(grade('[Ar] 4s2 3d4', chromium.check).ok, false);
  assert.equal(grade('1s2 2s2 2p6 3s2 3p6 4s2 3d4', chromium.check).ok, false);
  assert.equal(grade('[Ar] 3d5 4s1', chromium.check).ok, true);
  assert.equal(grade('[Ar] 4s¹ 3d⁵', chromium.check).ok, true);
  assert.equal(grade('[Ar] 4s2 3d9', copper.check).ok, false);
  assert.equal(grade('[Ar] 3d10 4s1', copper.check).ok, true);
  assert.equal(grade('1s2 2s2 2p6 3s2 3p6 4s1 3d10', copper.check).ok, true);
  const copperIon = byId('ch03-s34-cfg-Cu1plus');
  assert.equal(grade('[Ar] 3d10', copperIon.check).ok, true);
  assert.equal(grade('[Ar] 4s1 3d9', copperIon.check).ok, false);
  const ironThree = byId('ch03-s34-cfg-Fe3plus');
  sameConfig(ironThree.a, '[Ar] 3d5');
  assert.equal(grade('[Ar] 4s2 3d3', ironThree.check).ok, false);
});

test('configuration-to-element items count electrons back to the symbol', () => {
  for (const { problem } of problems) {
    const neutral = problem.q.match(/neutral atom has the configuration ([^.]+)\./);
    const ion = problem.q.match(/charge (\d+)\+ has the configuration ([^.]+)\./);
    if (neutral) {
      const electrons = electronsIn(neutral[1]);
      assert.equal(problem.a, SYMBOL[electrons], problem.id);
      assert.equal(problem.check.case, 'sensitive');
      assert.equal(grade(problem.a.toLowerCase(), problem.check).ok, false, problem.id);
    }
    if (ion) {
      const charge = Number(ion[1]);
      const electrons = electronsIn(ion[2]);
      const z = electrons + charge;
      const mag = charge === 1 ? '' : String(charge);
      assert.equal(problem.a, `${SYMBOL[z]}${mag}+`, problem.id);
    }
  }
  assert.equal(byId('ch03-s34-who-Cr').a, 'Cr');
  assert.equal(byId('ch03-s34-who-Cu').a, 'Cu');
  assert.equal(byId('ch03-s34-ion-Fe2plus').a, 'Fe2+');
  assert.equal(byId('ch03-s34-ion-Fe3plus').a, 'Fe3+');
  assert.equal(byId('ch03-s34-ion-Cuplus').a, 'Cu+');
  assert.equal(lessons.find((item) => item.lesson.id === 'ch03-configurations').lesson.similar_problem.answer, 'As');
});

test('orbital-box diagrams follow Hund and the Cr and Cu exceptions', () => {
  const expected = {
    'ch03-s34-box-O': orbitalBoxes(configuration(8, 0)),
    'ch03-s34-box-N': orbitalBoxes(configuration(7, 0)),
    'ch03-s34-box-C': orbitalBoxes(configuration(6, 0)),
    'ch03-s34-box-Cr': orbitalBoxes(configuration(24, 0), ['4s', '3d']),
    'ch03-s34-box-Cu': orbitalBoxes(configuration(29, 0), ['4s', '3d']),
    'ch03-s34-box-F': orbitalBoxes(configuration(9, 0)),
  };
  assert.equal(expected['ch03-s34-box-O'], '1s ↑↓ | 2s ↑↓ | 2p ↑↓ ↑ ↑');
  assert.equal(expected['ch03-s34-box-N'], '1s ↑↓ | 2s ↑↓ | 2p ↑ ↑ ↑');
  assert.equal(expected['ch03-s34-box-C'], '1s ↑↓ | 2s ↑↓ | 2p ↑ ↑ []');
  assert.equal(expected['ch03-s34-box-Cr'], '4s ↑ | 3d ↑ ↑ ↑ ↑ ↑');
  assert.equal(expected['ch03-s34-box-Cu'], '4s ↑ | 3d ↑↓ ↑↓ ↑↓ ↑↓ ↑↓');
  assert.equal(expected['ch03-s34-box-F'], '1s ↑↓ | 2s ↑↓ | 2p ↑↓ ↑↓ ↑');
  for (const [id, diagram] of Object.entries(expected)) {
    const problem = byId(id);
    assert.equal(problem.a, diagram, id);
    assert.equal(problem.check.kind, 'exact');
    assert.equal(grade(diagram, problem.check).ok, true, id);
  }
  assert.equal(grade('1s ↑↓ | 2s ↑↓ | 2p ↑↓ ↑↓', byId('ch03-s34-box-O').check).ok, false);
  assert.equal(grade('1s ↑↓ | 2s ↑↓ | 2p ↑↓ [] []', byId('ch03-s34-box-C').check).ok, false);
  assert.equal(grade('4s ↑↓ | 3d ↑ ↑ ↑ ↑', byId('ch03-s34-box-Cr').check).ok, false);
  assert.equal(grade('4s ↑↓ | 3d ↑↓ ↑↓ ↑↓ ↑↓ ↑', byId('ch03-s34-box-Cu').check).ok, false);
  assert.equal(grade('1s ↑↓ | 2s ↑↓ | 2p ↑↓ ↑ ↑ ↑', byId('ch03-s34-box-F').check).ok, false);
  const readOxygen = byId('ch03-s34-box-read-O');
  sameConfig(readOxygen.a, fullConfig(configuration(8, 0)));
  assert.equal(grade('1s2 2s2 2p4', readOxygen.check).ok, true);
  assert.equal(byId('ch03-s34-box-who-N').a, 'N');
  assert.equal(byId('ch03-s34-box-who-Cr').a, 'Cr');
  const arrows = (text) => (text.match(/[↑↓]/g) ?? []).length;
  assert.equal(arrows(byId('ch03-s34-box-who-N').q), 7);
  assert.equal(18 + arrows(byId('ch03-s34-box-who-Cr').q), 24);
  assert.equal(arrows(byId('ch03-s34-box-F').a), 9);
  assert.equal(byId('ch03-s34-valid-s3').a, 'no');
  assert.equal(byId('ch03-s34-valid-core').a, 'no');
  assert.equal(grade('[Ar] 5s2', byId('ch03-s34-valid-kr').check).ok, false);
  assert.equal(grade('[Kr] 5s2', byId('ch03-s34-valid-kr').check).ok, true);
  assert.equal(byId('ch03-s34-valid-order').a, '4s');
  assert.equal(grade('4S', byId('ch03-s34-valid-order').check).ok, false);
  assert.equal(grade('3d', byId('ch03-s34-valid-order').check).ok, false);
  assert.equal(byId('ch03-s35-p20').a, 'Be');
  assert.equal(byId('ch03-s35-p21').a, 'N < P < As');
  assert.equal(byId('ch03-s35-p22').a, 'negative');
  assert.equal(grade('positive', byId('ch03-s35-p22').check).ok, false);
  assert.equal(byId('ch03-s35-p23').a, 'Br');
  assert.equal(grade('Kr', byId('ch03-s35-p23').check).ok, false);
});
