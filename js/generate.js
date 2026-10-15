import { diagnose } from './diagnose.js';
import { DEFAULT_RELATIVE_PERCENT, countSigFigs, parseAnswer } from './grade.js';
import { mulberry32 } from './rng.js';

export { diagnose };

/**
 * Turn a static problem or a numeric template into { q, a, why, hints, check }.
 * Pass mulberry32(seed) as random. Templates may also set choices, derive, valid,
 * sigFigs: 'min', and kind: 'exact'.
 * @param {object} spec
 * @param {() => number} [random]
 */
export function generateProblem(spec, random = Math.random) {
  if (typeof spec.template === 'string') return generateTemplate(spec, random);
  const problem = {
    q: spec.q,
    a: spec.a,
    why: spec.why,
    hints: [...(spec.hints ?? [])],
    check: spec.check,
  };
  for (const field of ['q', 'a', 'why', 'hints', 'check']) {
    if (problem[field] === undefined) throw new Error(`Problem is missing ${field}`);
  }
  return problem;
}

/**
 * Draw a template with a seeded RNG. If valid(vars) fails, try seed+1.
 * Adds seed, templateId, and precomputed mistakes.
 * @param {object} spec
 * @param {number} seed
 */
export function generateFromSeed(spec, seed) {
  const start = Number(seed);
  if (!Number.isInteger(start)) throw new Error('Seed must be an integer');
  for (let step = 0; step < 40; step += 1) {
    const used = start + step;
    const problem = generateProblem(spec, mulberry32(used));
    if (typeof spec.valid === 'function' && !spec.valid(problem.vars)) continue;
    const value = problem.check?.value;
    if (typeof value === 'number' && !Number.isFinite(value)) continue;
    const mistakes = (spec.mistakes ?? []).map((item) => materializeMistake(item, problem.vars));
    return {
      ...problem,
      seed: used,
      templateId: spec.id,
      mistakes,
    };
  }
  throw new Error(`No valid draw for ${spec.id} from seed ${start}`);
}

function materializeMistake(item, vars) {
  const mistake = { id: item.id, message: item.message };
  if (typeof item.wrong === 'function') mistake.wrong = item.wrong(vars);
  if (typeof item.value === 'function') {
    const value = item.value(vars);
    if (typeof value === 'number') mistake.value = value;
    else if (typeof value === 'string' && mistake.wrong == null) mistake.wrong = value;
  }
  return mistake;
}

function generateTemplate(spec, random) {
  const vars = sampleVars(spec, random);
  // Shown inputs are rounded before derive, and again after, so solve() uses
  // the same digits the question prints.
  roundShownInputs(spec, vars);
  if (typeof spec.derive === 'function') {
    const extra = spec.derive(vars) ?? {};
    Object.assign(vars, extra);
    roundShownInputs(spec, vars);
  }
  const q = spec.template.replaceAll(/\{(\w+)\}/g, (_, name) => renderVar(name, vars[name], spec));
  const solved = spec.solve(vars);
  const hints = spec.hints(vars);
  if (spec.kind === 'exact' || spec.kind === 'set') {
    const text = String(solved);
    return {
      q,
      a: text,
      why: spec.why(vars, text),
      hints,
      vars,
      check: spec.kind === 'set'
        ? { kind: 'set', answers: spec.answers?.(vars) ?? [text], case: spec.case ?? 'formula', nearMiss: spec.nearMiss }
        : { kind: 'exact', text, case: spec.case ?? 'insensitive' },
    };
  }
  const sigFigs = resolveSigFigs(spec);
  const digits = sigFigs ?? 3;
  const answer = formatAnswer(solved, digits, spec.unit ?? null);
  const parsed = parseAnswer(answer);
  if (!parsed) throw new Error(`Could not format ${spec.id ?? 'template'} answer`);
  return {
    q,
    a: answer,
    why: spec.why(vars, solved),
    hints,
    vars,
    check: {
      kind: 'numeric',
      value: parsed.value,
      tolerance: spec.tolerance ?? DEFAULT_RELATIVE_PERCENT,
      sigFigs,
      unit: spec.unit ?? null,
    },
  };
}

function sampleVars(spec, random) {
  const vars = {};
  for (const [name, range] of Object.entries(spec.vars ?? {})) {
    if (Array.isArray(range.choices)) {
      if (range.choices.length === 0) throw new Error(`${name} has no choices`);
      const index = Math.floor(random() * range.choices.length);
      vars[name] = range.choices[index];
      continue;
    }
    const steps = Math.round((range.max - range.min) / range.step);
    const index = Math.floor(random() * (steps + 1));
    const value = range.min + index * range.step;
    vars[name] = roundTo(value, range.step);
  }
  return vars;
}

function renderVar(name, value, spec) {
  const sigFigs = shownSigFigs(spec, name);
  if (typeof value === 'number' && sigFigs != null) return formatInput(value, sigFigs);
  return String(value);
}

function shownNames(spec) {
  return new Set([...String(spec.template ?? '').matchAll(/\{(\w+)\}/g)].map((match) => match[1]));
}

function shownSigFigs(spec, name) {
  const fromVar = spec.vars?.[name]?.sigFigs;
  if (typeof fromVar === 'number') return fromVar;
  const fromFormat = spec.format?.[name];
  if (typeof fromFormat === 'number') return fromFormat;
  return null;
}

function roundShownInputs(spec, vars) {
  for (const name of shownNames(spec)) {
    const digits = shownSigFigs(spec, name);
    if (typeof vars[name] !== 'number' || digits == null) continue;
    const parsed = parseAnswer(formatSigFigs(vars[name], digits));
    if (parsed) vars[name] = parsed.value;
  }
}

export function resolveSigFigs(spec) {
  if (spec.sigFigs !== 'min') return spec.sigFigs;
  const figs = [];
  for (const range of Object.values(spec.vars ?? {})) {
    if (typeof range.sigFigs === 'number') figs.push(range.sigFigs);
  }
  for (const digits of Object.values(spec.format ?? {})) {
    if (typeof digits === 'number') figs.push(digits);
  }
  return figs.length ? Math.min(...figs) : 3;
}

/**
 * Show an input with its sig figs, including trailing zeros.
 * @param {number} value
 * @param {number} sigFigs
 */
export function formatInput(value, sigFigs) {
  return formatSigFigs(value, sigFigs);
}

/**
 * Round a computed answer and keep the sig figs grade.js will count.
 * @param {number} value
 * @param {number} sigFigs
 * @param {string | null} [unit]
 */
export function formatAnswer(value, sigFigs, unit = null) {
  const text = formatSigFigs(value, sigFigs);
  return unit ? `${text} ${unit}` : text;
}

export function formatSigFigs(value, sigFigs) {
  const digits = Number(sigFigs);
  if (!Number.isInteger(digits) || digits < 1) throw new Error(`Bad sig fig count: ${sigFigs}`);
  if (!Number.isFinite(value)) return String(value);
  const negative = value < 0;
  const abs = Math.abs(value);
  if (abs === 0) return negative ? '-0' : '0';
  const exponential = abs.toExponential(digits - 1);
  const match = exponential.match(/^(\d(?:\.\d+)?)e([+-]\d+)$/i);
  if (!match) return exponential;
  const coeff = match[1];
  const exponent = Number(match[2]);
  const fixed = shiftDecimal(coeff, exponent);
  const plain = `${negative ? '-' : ''}${fixed}`;
  if (!/[eE]/.test(fixed) && countSigFigs(plain) === digits) return plain;
  return `${negative ? '-' : ''}${coeff} x 10^${exponent}`;
}

function shiftDecimal(coeff, exponent) {
  const digits = coeff.replace('.', '');
  const decLen = coeff.includes('.') ? coeff.length - coeff.indexOf('.') - 1 : 0;
  const places = decLen - exponent;
  if (places <= 0) return digits + '0'.repeat(-places);
  if (places >= digits.length) return `0.${'0'.repeat(places - digits.length)}${digits}`;
  const point = digits.length - places;
  return `${digits.slice(0, point)}.${digits.slice(point)}`;
}

function roundTo(value, step) {
  const places = decimalPlaces(step);
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function decimalPlaces(step) {
  const text = String(step);
  const dot = text.indexOf('.');
  return dot === -1 ? 0 : text.length - dot - 1;
}
