/**
 * One renderer for on-screen chemistry text.
 * Plain text in, HTML out: Z^2, 2.179e-18, H2O, n_low, Ca(OH)2, sp3d2, A -> B.
 * Call it on text, not on a string that already has tags.
 */

const ELEMENTS = new Set([
  'Ac', 'Ag', 'Al', 'Am', 'Ar', 'As', 'At', 'Au', 'B', 'Ba', 'Be', 'Bh', 'Bi', 'Bk', 'Br',
  'C', 'Ca', 'Cd', 'Ce', 'Cf', 'Cl', 'Cm', 'Cn', 'Co', 'Cr', 'Cs', 'Cu', 'Db', 'Ds', 'Dy',
  'Er', 'Es', 'Eu', 'F', 'Fe', 'Fl', 'Fm', 'Fr', 'Ga', 'Gd', 'Ge', 'H', 'He', 'Hf', 'Hg',
  'Ho', 'Hs', 'I', 'In', 'Ir', 'K', 'Kr', 'La', 'Li', 'Lr', 'Lu', 'Lv', 'Mc', 'Md', 'Mg',
  'Mn', 'Mo', 'Mt', 'N', 'Na', 'Nb', 'Nd', 'Ne', 'Nh', 'Ni', 'No', 'Np', 'O', 'Og', 'Os',
  'P', 'Pa', 'Pb', 'Pd', 'Pm', 'Po', 'Pr', 'Pt', 'Pu', 'Ra', 'Rb', 'Re', 'Rf', 'Rg', 'Rh',
  'Rn', 'Ru', 'S', 'Sb', 'Sc', 'Se', 'Sg', 'Si', 'Sm', 'Sn', 'Sr', 'Ta', 'Tb', 'Tc', 'Te',
  'Th', 'Ti', 'Tl', 'Tm', 'Ts', 'U', 'V', 'W', 'Xe', 'Y', 'Yb', 'Zn', 'Zr',
]);

const MINUS = '−';

export function escapeHtml(text) {
  return String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function sup(inner) {
  return `<sup>${escapeHtml(inner)}</sup>`;
}

function sub(inner) {
  return `<sub>${escapeHtml(inner)}</sub>`;
}

function expText(raw) {
  return String(raw).replaceAll('-', MINUS).replaceAll('−', MINUS);
}

function matchElement(source, index) {
  const two = source.slice(index, index + 2);
  if (/^[A-Z][a-z]$/.test(two) && ELEMENTS.has(two)) return two;
  const one = source[index];
  if (/^[A-Z]$/.test(one) && ELEMENTS.has(one)) return one;
  return '';
}

function readCount(source, index) {
  const match = /^\d+/.exec(source.slice(index));
  return match ? match[0] : '';
}

function readCaretCharge(source, index) {
  if (source[index] !== '^') return null;
  const match = /^([+−-]?)(\d+)([+−-]?)/.exec(source.slice(index + 1));
  if (!match?.[2]) return null;
  const body = `${expText(match[1])}${match[2]}${expText(match[3] || '')}`;
  return { html: body, length: 1 + match[0].length };
}

function readPiece(source, start, inside) {
  let index = start;
  let html = '';
  let digits = false;
  let atoms = 0;
  while (index < source.length) {
    if (source[index] === '(') {
      const inner = readPiece(source, index + 1, true);
      if (!inner?.atoms || source[inner.end] !== ')') break;
      let chunk = `(${inner.html})`;
      let next = inner.end + 1;
      const count = readCount(source, next);
      if (count) {
        chunk += sub(count);
        next += count.length;
        digits = true;
      }
      const charge = readCaretCharge(source, next);
      if (charge) {
        chunk += sup(charge.html);
        next += charge.length;
        digits = true;
      }
      html += chunk;
      index = next;
      atoms += 1;
      digits = digits || inner.digits;
      continue;
    }
    if (inside && source[index] === ')') break;
    const element = matchElement(source, index);
    if (!element) break;
    let chunk = escapeHtml(element);
    let next = index + element.length;
    const count = readCount(source, next);
    if (count) {
      chunk += sub(count);
      next += count.length;
      digits = true;
    }
    const charge = readCaretCharge(source, next);
    if (charge) {
      chunk += sup(charge.html);
      next += charge.length;
      digits = true;
    }
    html += chunk;
    index = next;
    atoms += 1;
  }
  if (!atoms) return null;
  return { html, end: index, digits, atoms };
}

function readFormula(source, index) {
  if (index > 0 && /[A-Za-z]/.test(source[index - 1])) return null;
  if (source[index] !== '(' && !matchElement(source, index)) return null;
  const parsed = readPiece(source, index, false);
  if (!parsed?.digits || parsed.end <= index) return null;
  return parsed;
}

function readSci(source, index) {
  if (index > 0 && /[A-Za-z0-9.]/.test(source[index - 1])) return null;
  const match = /^([+−-]?)(\d+\.\d+|\d+)[eE]([+−-]?\d+)/.exec(source.slice(index));
  if (!match) return null;
  const lead = match[1] === '-' || match[1] === MINUS ? MINUS : match[1];
  return {
    html: `${lead}${match[2]}×10${sup(expText(match[3]))}`,
    length: match[0].length,
  };
}

function readTimes(source, index) {
  const match = /^(?:×|x)\s*10\s*\^\s*([+−-]?\d+)/i.exec(source.slice(index));
  if (!match) return null;
  const first = match[0][0];
  if ((first === 'x' || first === 'X') && index > 0 && /[A-Za-z]/.test(source[index - 1])) return null;
  return {
    html: `×10${sup(expText(match[1]))}`,
    length: match[0].length,
  };
}

function readCaret(source, index) {
  const match = /^([A-Za-z0-9)])\^([+−-]?\d+)/.exec(source.slice(index));
  if (!match) return null;
  return {
    html: `${escapeHtml(match[1])}${sup(expText(match[2]))}`,
    length: match[0].length,
  };
}

function readUnderscore(source, index) {
  if (index > 0 && /[A-Za-z]/.test(source[index - 1])) return null;
  const match = /^([A-Za-z])_([A-Za-z]+|\d+)(?:\^([+−-]?\d+))?/.exec(source.slice(index));
  if (!match) return null;
  let html = `${escapeHtml(match[1])}${sub(match[2])}`;
  if (match[3]) html += sup(expText(match[3]));
  return { html, length: match[0].length };
}

const SUPER_DIGITS = '⁰¹²³⁴⁵⁶⁷⁸⁹';

/** sp, sp2, sp3, sp3d2. Digits become superscripts. A bare sp stays sp. */
function readHybrid(source, index) {
  if (index > 0 && /[A-Za-z0-9_]/.test(source[index - 1])) return null;
  const match = /^sp([23])?(d([2]))?(?![A-Za-z0-9_])/.exec(source.slice(index));
  if (!match) return null;
  let html = 'sp';
  if (match[1]) html += sup(match[1]);
  if (match[2]) html += `d${sup('2')}`;
  return { html, length: match[0].length };
}

function readArrow(source, index) {
  if (!source.startsWith('->', index)) return null;
  return { html: '→', length: 2 };
}

function hybridUnicode(source) {
  return source.replace(/\bsp([23])?(d([2]))?\b/g, (_full, pCount, dOrbital) => {
    let text = 'sp';
    if (pCount) text += SUPER_DIGITS[pCount];
    if (dOrbital) text += `d${SUPER_DIGITS[2]}`;
    return text;
  });
}

/** Turn chemistry plain text into sup/sub/×10ⁿ HTML. */
export function renderMath(text) {
  const source = String(text ?? '');
  let index = 0;
  let html = '';
  while (index < source.length) {
    const sci = readSci(source, index);
    if (sci) {
      html += sci.html;
      index += sci.length;
      continue;
    }
    const times = readTimes(source, index);
    if (times) {
      html += times.html;
      index += times.length;
      continue;
    }
    const hybrid = readHybrid(source, index);
    if (hybrid) {
      html += hybrid.html;
      index += hybrid.length;
      continue;
    }
    const formula = readFormula(source, index);
    if (formula) {
      html += formula.html;
      index = formula.end;
      continue;
    }
    const caret = readCaret(source, index);
    if (caret) {
      html += caret.html;
      index += caret.length;
      continue;
    }
    const under = readUnderscore(source, index);
    if (under) {
      html += under.html;
      index += under.length;
      continue;
    }
    const arrow = readArrow(source, index);
    if (arrow) {
      html += arrow.html;
      index += arrow.length;
      continue;
    }
    html += escapeHtml(source[index]);
    index += 1;
  }
  return html;
}

/** Plain-text formulas for nodes that cannot use innerHTML, such as search titles. */
export function toUnicodeFormula(text) {
  return hybridUnicode(String(text ?? '').replaceAll('->', '→'));
}
