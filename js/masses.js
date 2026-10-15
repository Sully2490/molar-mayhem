/**
 * Atomic masses from the OpenStax Chemistry: Atoms First 2e periodic table,
 * at the working precision the book uses for formula mass (for example
 * H 1.008, C 12.01, O 16.00, Na 22.99, Cl 35.45, Ca 40.08, Fe 55.85).
 * Those anchors reproduce the book's own results: NaCl 58.44 amu,
 * NH3 17.03 amu, Ca3(PO4)2 310.18 amu. Values are not rounded further.
 */
export const ATOMIC_MASS = {
  H: 1.008,
  He: 4.003,
  Li: 6.94,
  Be: 9.012,
  B: 10.81,
  C: 12.01,
  N: 14.01,
  O: 16.00,
  F: 19.00,
  Ne: 20.18,
  Na: 22.99,
  Mg: 24.31,
  Al: 26.98,
  Si: 28.09,
  P: 30.97,
  S: 32.06,
  Cl: 35.45,
  Ar: 39.95,
  K: 39.10,
  Ca: 40.08,
  Sc: 44.96,
  Ti: 47.87,
  V: 50.94,
  Cr: 52.00,
  Mn: 54.94,
  Fe: 55.85,
  Co: 58.93,
  Ni: 58.69,
  Cu: 63.55,
  Zn: 65.38,
  Ga: 69.72,
  Ge: 72.63,
  As: 74.92,
  Se: 78.96,
  Br: 79.90,
  Kr: 83.80,
  Rb: 85.47,
  Sr: 87.62,
  Ag: 107.87,
  Cd: 112.41,
  Sn: 118.71,
  I: 126.90,
  Xe: 131.29,
  Ba: 137.33,
  W: 183.84,
  Pt: 195.08,
  Au: 196.97,
  Hg: 200.59,
  Pb: 207.2,
  U: 238.03,
};

/**
 * Molar mass in g/mol. Parentheses and a leading hydrate coefficient are allowed.
 * @param {string} formula
 */
export function molarMass(formula) {
  const text = String(formula ?? '').replace(/\s+/g, '');
  if (!text) throw new Error('Formula is empty');
  const parts = text.split(/[·*]/);
  let total = 0;
  for (const part of parts) total += massOfPiece(part);
  return total;
}

function massOfPiece(part) {
  const lead = part.match(/^(\d+)([A-Z(].*)$/);
  if (lead) return Number(lead[1]) * parseGroup(lead[2], 0, lead[2].length).mass;
  return parseGroup(part, 0, part.length).mass;
}

function parseGroup(text, start, end) {
  let mass = 0;
  let index = start;
  while (index < end) {
    const ch = text[index];
    if (ch === '(') {
      const close = findClose(text, index, end);
      const inner = parseGroup(text, index + 1, close);
      const count = readCount(text, close + 1, end);
      mass += inner.mass * count.value;
      index = count.next;
      continue;
    }
    if (!/[A-Z]/.test(ch)) throw new Error(`Cannot parse formula "${text}" near "${text.slice(index)}"`);
    let symbol = ch;
    index += 1;
    if (index < end && /[a-z]/.test(text[index])) {
      symbol += text[index];
      index += 1;
    }
    const atomic = ATOMIC_MASS[symbol];
    if (atomic == null) throw new Error(`No OpenStax mass for ${symbol}`);
    const count = readCount(text, index, end);
    mass += atomic * count.value;
    index = count.next;
  }
  return { mass };
}

function findClose(text, open, end) {
  let depth = 0;
  for (let index = open; index < end; index += 1) {
    if (text[index] === '(') depth += 1;
    if (text[index] === ')') {
      depth -= 1;
      if (depth === 0) return index;
    }
  }
  throw new Error(`Unclosed parenthesis in "${text}"`);
}

function readCount(text, index, end) {
  let digits = '';
  while (index < end && /[0-9]/.test(text[index])) {
    digits += text[index];
    index += 1;
  }
  return { value: digits ? Number(digits) : 1, next: index };
}
