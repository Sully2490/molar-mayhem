/**
 * Turn a static problem or a numeric template into { q, a, why, hints, check }.
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

function generateTemplate(spec, random) {
  const vars = {};
  for (const [name, range] of Object.entries(spec.vars)) {
    const steps = Math.round((range.max - range.min) / range.step);
    const index = Math.floor(random() * (steps + 1));
    const value = range.min + index * range.step;
    vars[name] = roundTo(value, range.step);
  }
  const q = spec.template.replaceAll(/\{(\w+)\}/g, (_, name) => String(vars[name]));
  const value = spec.solve(vars);
  const answer = formatGenerated(value, spec);
  return {
    q,
    a: answer,
    why: spec.why(vars, value),
    hints: spec.hints(vars),
    check: {
      kind: 'numeric',
      value,
      tolerance: spec.tolerance ?? 0,
      sigFigs: spec.sigFigs,
      unit: spec.unit ?? null,
    },
  };
}

function formatGenerated(value, spec) {
  const digits = spec.sigFigs ?? 3;
  const text = Number(value.toPrecision(digits)).toString();
  return spec.unit ? `${text} ${spec.unit}` : text;
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
