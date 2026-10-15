/**
 * Small original diagrams for term cards. Decorative: the definition carries the meaning.
 * @param {string} id
 * @returns {string}
 */
const INK = '#1c2430';
const TEAL = '#0f5c56';
const GOLD = '#c2410c';
const PALE = '#dbeafe';
const CREAM = '#fffaf2';
const SAND = '#fde68a';

function frame(body) {
  return `<svg class="term-visual" viewBox="0 0 160 96" width="160" height="96" aria-hidden="true" focusable="false">${body}</svg>`;
}

function label(text, y = 88) {
  return `<text x="80" y="${y}" text-anchor="middle" font-size="11" fill="${INK}">${text}</text>`;
}

const ART = {
  atom: () => frame(`
    <circle cx="80" cy="42" r="8" fill="${GOLD}"></circle>
    <ellipse cx="80" cy="42" rx="36" ry="14" fill="none" stroke="${TEAL}" stroke-width="2"></ellipse>
    <ellipse cx="80" cy="42" rx="14" ry="36" fill="none" stroke="${TEAL}" stroke-width="2"></ellipse>
    <circle cx="116" cy="42" r="4" fill="${TEAL}"></circle>
    ${label('atom')}`),
  nucleus: () => frame(`
    <circle cx="70" cy="44" r="16" fill="${GOLD}"></circle>
    <circle cx="90" cy="40" r="14" fill="${TEAL}"></circle>
    <circle cx="80" cy="56" r="12" fill="${INK}"></circle>
    ${label('nucleus')}`),
  balance: () => frame(`
    <rect x="76" y="28" width="8" height="40" fill="${INK}"></rect>
    <rect x="40" y="66" width="80" height="6" rx="2" fill="${INK}"></rect>
    <polygon points="20,28 70,28 60,44 30,44" fill="${PALE}" stroke="${TEAL}"></polygon>
    <polygon points="90,28 140,28 130,50 100,50" fill="${SAND}" stroke="${GOLD}"></polygon>
    <rect x="18" y="22" width="124" height="4" fill="${TEAL}"></rect>
    ${label('equal mass')}`),
  flask: () => frame(`
    <path d="M68 16 h24 v22 l22 40 a28 28 0 0 1 -68 0 l22 -40 z" fill="${PALE}" stroke="${TEAL}" stroke-width="2"></path>
    <rect x="66" y="12" width="28" height="8" rx="2" fill="${TEAL}"></rect>
    ${label('sample')}`),
  thermometer: () => frame(`
    <rect x="74" y="10" width="12" height="58" rx="6" fill="${CREAM}" stroke="${INK}"></rect>
    <rect x="78" y="36" width="4" height="28" fill="${GOLD}"></rect>
    <circle cx="80" cy="74" r="10" fill="${GOLD}"></circle>
    ${label('temperature')}`),
  ruler: () => frame(`
    <rect x="16" y="36" width="128" height="22" rx="3" fill="${SAND}" stroke="${INK}"></rect>
    <path d="M28 36 v10 M48 36 v6 M68 36 v10 M88 36 v6 M108 36 v10 M128 36 v6" stroke="${INK}" stroke-width="2"></path>
    ${label('measure')}`),
  density: () => frame(`
    <path d="M18 70 h124" stroke="${TEAL}" stroke-width="2"></path>
    <path d="M18 50 q30 8 60 0 t64 0 v20 h-124 z" fill="${PALE}"></path>
    <rect x="68" y="28" width="24" height="24" fill="${GOLD}"></rect>
    ${label('mass / volume')}`),
  wave: () => frame(`
    <path d="M8 48 C 28 48 28 18 48 18 S 68 78 88 78 S 108 18 128 18 S 148 48 152 48" fill="none" stroke="${TEAL}" stroke-width="3"></path>
    <path d="M48 18 v30 M128 18 v30" stroke="${GOLD}" stroke-width="2"></path>
    ${label('wavelength')}`),
  photon: () => frame(`
    <path d="M20 48 h36 l10 -16 16 32 16 -32 10 16 h32" fill="none" stroke="${GOLD}" stroke-width="3"></path>
    ${label('photon')}`),
  orbital: () => frame(`
    <ellipse cx="80" cy="46" rx="28" ry="28" fill="${PALE}" stroke="${TEAL}" stroke-width="2"></ellipse>
    <circle cx="80" cy="46" r="4" fill="${INK}"></circle>
    ${label('orbital')}`),
  boxes: () => frame(`
    <rect x="22" y="28" width="28" height="28" fill="${CREAM}" stroke="${INK}"></rect>
    <rect x="66" y="28" width="28" height="28" fill="${CREAM}" stroke="${INK}"></rect>
    <rect x="110" y="28" width="28" height="28" fill="${CREAM}" stroke="${INK}"></rect>
    <path d="M30 48 v-12 M40 48 v-12 M74 42 v-8" stroke="${TEAL}" stroke-width="2"></path>
    ${label('orbital boxes')}`),
  piston: () => frame(`
    <rect x="48" y="28" width="64" height="48" fill="none" stroke="${INK}" stroke-width="3"></rect>
    <rect x="52" y="36" width="56" height="8" fill="${TEAL}"></rect>
    <rect x="76" y="12" width="8" height="24" fill="${INK}"></rect>
    <circle cx="70" cy="62" r="3" fill="${GOLD}"></circle>
    <circle cx="90" cy="58" r="3" fill="${GOLD}"></circle>
    ${label('gas')}`),
  balloon: () => frame(`
    <ellipse cx="80" cy="40" rx="36" ry="28" fill="${PALE}" stroke="${TEAL}" stroke-width="2"></ellipse>
    <path d="M74 66 h12 l-6 14 z" fill="${TEAL}"></path>
    ${label('volume')}`),
  manometer: () => frame(`
    <path d="M40 16 v50 a20 20 0 0 0 40 0 v-20" fill="none" stroke="${INK}" stroke-width="4"></path>
    <path d="M44 46 v16 a12 12 0 0 0 24 0 v-8 h8" fill="${PALE}" stroke="none"></path>
    ${label('pressure')}`),
  'graph-up': () => frame(`
    <path d="M24 76 h112 M24 76 V16" stroke="${INK}" stroke-width="2"></path>
    <path d="M32 68 L120 24" fill="none" stroke="${GOLD}" stroke-width="3"></path>
    ${label('both rise')}`),
  'graph-down': () => frame(`
    <path d="M24 76 h112 M24 76 V16" stroke="${INK}" stroke-width="2"></path>
    <path d="M32 24 Q 70 28 120 70" fill="none" stroke="${TEAL}" stroke-width="3"></path>
    ${label('trade-off')}`),
  molecule: () => frame(`
    <circle cx="48" cy="48" r="16" fill="${PALE}" stroke="${TEAL}" stroke-width="2"></circle>
    <circle cx="112" cy="48" r="16" fill="${SAND}" stroke="${GOLD}" stroke-width="2"></circle>
    <rect x="64" y="44" width="32" height="8" fill="${INK}"></rect>
    ${label('bond')}`),
  lewis: () => frame(`
    <circle cx="80" cy="46" r="6" fill="${INK}"></circle>
    <circle cx="80" cy="22" r="3" fill="${TEAL}"></circle>
    <circle cx="80" cy="30" r="3" fill="${TEAL}"></circle>
    <circle cx="58" cy="46" r="3" fill="${TEAL}"></circle>
    <circle cx="66" cy="46" r="3" fill="${TEAL}"></circle>
    <circle cx="102" cy="46" r="3" fill="${TEAL}"></circle>
    <circle cx="110" cy="46" r="3" fill="${TEAL}"></circle>
    ${label('Lewis')}`),
  dipole: () => frame(`
    <circle cx="52" cy="44" r="16" fill="${PALE}" stroke="${TEAL}"></circle>
    <circle cx="108" cy="44" r="16" fill="${SAND}" stroke="${GOLD}"></circle>
    <path d="M40 72 h80" stroke="${INK}" stroke-width="2"></path>
    <path d="M112 72 l-8 -5 v10 z" fill="${INK}"></path>
    ${label('dipole')}`),
  sigma: () => frame(`
    <circle cx="46" cy="40" r="18" fill="${PALE}" stroke="${TEAL}"></circle>
    <circle cx="114" cy="40" r="18" fill="${PALE}" stroke="${TEAL}"></circle>
    <path d="M64 40 h32" stroke="${GOLD}" stroke-width="4"></path>
    ${label('end-to-end')}`),
  pi: () => frame(`
    <ellipse cx="80" cy="30" rx="40" ry="12" fill="${PALE}" stroke="${TEAL}"></ellipse>
    <ellipse cx="80" cy="62" rx="40" ry="12" fill="${SAND}" stroke="${GOLD}"></ellipse>
    <rect x="76" y="24" width="8" height="44" fill="${INK}"></rect>
    ${label('side-by-side')}`),
  mo: () => frame(`
    <path d="M30 20 h28 M30 48 h28 M102 34 h28 M30 76 h28 M102 62 h28" stroke="${INK}" stroke-width="3"></path>
    <path d="M58 20 l44 14 M58 48 l44 14 M58 76 l44 -14" stroke="${TEAL}" stroke-width="1.5"></path>
    ${label('MO diagram')}`),
  calorimeter: () => frame(`
    <rect x="48" y="22" width="64" height="56" rx="6" fill="${CREAM}" stroke="${INK}" stroke-width="2"></rect>
    <rect x="58" y="34" width="44" height="32" fill="${PALE}"></rect>
    <rect x="70" y="10" width="20" height="14" fill="${TEAL}"></rect>
    ${label('calorimeter')}`),
  energy: () => frame(`
    <path d="M24 70 h112" stroke="${INK}" stroke-width="2"></path>
    <path d="M28 62 C 50 62 58 28 80 28 S 110 62 132 62" fill="none" stroke="${GOLD}" stroke-width="3"></path>
    ${label('energy')}`),
  heat: () => frame(`
    <path d="M80 78 C 58 78 52 60 64 50 C 58 40 70 28 80 18 C 90 28 102 40 96 50 C 108 60 102 78 80 78" fill="${GOLD}"></path>
    ${label('heat out')}`),
  titration: () => frame(`
    <rect x="74" y="8" width="12" height="36" fill="${PALE}" stroke="${TEAL}"></rect>
    <path d="M80 44 v10" stroke="${TEAL}" stroke-width="2"></path>
    <path d="M52 58 h56 l-8 26 h-40 z" fill="none" stroke="${INK}" stroke-width="2"></path>
    <path d="M56 74 h48 v8 h-48 z" fill="${SAND}"></path>
    ${label('titration')}`),
  precipitate: () => frame(`
    <path d="M48 18 h64 l-10 28 v28 h-44 v-28 z" fill="none" stroke="${INK}" stroke-width="2"></path>
    <circle cx="70" cy="64" r="3" fill="${GOLD}"></circle>
    <circle cx="82" cy="70" r="3" fill="${GOLD}"></circle>
    <circle cx="90" cy="62" r="3" fill="${GOLD}"></circle>
    ${label('solid forms')}`),
  spectrum: () => frame(`
    <rect x="20" y="36" width="16" height="24" fill="#312e81"></rect>
    <rect x="36" y="36" width="16" height="24" fill="#1d4ed8"></rect>
    <rect x="52" y="36" width="16" height="24" fill="#0f766e"></rect>
    <rect x="68" y="36" width="16" height="24" fill="#65a30d"></rect>
    <rect x="84" y="36" width="16" height="24" fill="#eab308"></rect>
    <rect x="100" y="36" width="16" height="24" fill="#ea580c"></rect>
    <rect x="116" y="36" width="16" height="24" fill="#b91c1c"></rect>
    ${label('spectrum')}`),
  table: () => frame(`
    <rect x="24" y="20" width="18" height="18" fill="${GOLD}"></rect>
    <rect x="46" y="20" width="18" height="18" fill="${SAND}"></rect>
    <rect x="90" y="20" width="18" height="18" fill="${PALE}"></rect>
    <rect x="112" y="20" width="18" height="18" fill="${TEAL}"></rect>
    <rect x="24" y="42" width="18" height="18" fill="${TEAL}"></rect>
    <rect x="46" y="42" width="18" height="18" fill="${PALE}"></rect>
    <rect x="68" y="42" width="18" height="18" fill="${SAND}"></rect>
    ${label('periodic table')}`),
  ion: () => frame(`
    <circle cx="58" cy="44" r="18" fill="${PALE}" stroke="${TEAL}" stroke-width="2"></circle>
    <circle cx="108" cy="44" r="18" fill="${SAND}" stroke="${GOLD}" stroke-width="2"></circle>
    <text x="58" y="49" text-anchor="middle" font-size="14" fill="${INK}">+</text>
    <text x="108" y="49" text-anchor="middle" font-size="14" fill="${INK}">−</text>`),
  lattice: () => frame(`
    <circle cx="40" cy="30" r="8" fill="${GOLD}"></circle>
    <circle cx="80" cy="30" r="8" fill="${TEAL}"></circle>
    <circle cx="120" cy="30" r="8" fill="${GOLD}"></circle>
    <circle cx="60" cy="58" r="8" fill="${TEAL}"></circle>
    <circle cx="100" cy="58" r="8" fill="${GOLD}"></circle>
    ${label('lattice')}`),
  mole: () => frame(`
    <circle cx="80" cy="40" r="26" fill="${SAND}" stroke="${INK}" stroke-width="2"></circle>
    <text x="80" y="46" text-anchor="middle" font-size="16" fill="${INK}">mol</text>`),
  water: () => frame(`
    <circle cx="80" cy="36" r="12" fill="${GOLD}"></circle>
    <circle cx="52" cy="58" r="14" fill="${PALE}" stroke="${TEAL}"></circle>
    <circle cx="108" cy="58" r="14" fill="${PALE}" stroke="${TEAL}"></circle>
    ${label('water')}`),
  buret: () => frame(`
    <rect x="70" y="8" width="20" height="70" fill="${CREAM}" stroke="${INK}"></rect>
    <path d="M74 20 h12 M74 32 h12 M74 44 h12 M74 56 h12" stroke="${TEAL}"></path>
    <rect x="76" y="78" width="8" height="8" fill="${TEAL}"></rect>
    ${label('buret')}`),
  barometer: () => frame(`
    <rect x="70" y="8" width="16" height="70" fill="${PALE}" stroke="${INK}"></rect>
    <rect x="74" y="24" width="8" height="48" fill="${TEAL}"></rect>
    <path d="M48 78 h64" stroke="${INK}" stroke-width="3"></path>
    ${label('barometer')}`),
  shield: () => frame(`
    <circle cx="80" cy="46" r="26" fill="none" stroke="${TEAL}" stroke-width="3"></circle>
    <circle cx="80" cy="46" r="8" fill="${GOLD}"></circle>
    <path d="M80 20 v10 M80 62 v10 M54 46 h10 M96 46 h10" stroke="${INK}" stroke-width="2"></path>
    ${label('shielding')}`),
  formula: () => frame(`
    <rect x="28" y="28" width="104" height="36" rx="6" fill="${CREAM}" stroke="${TEAL}" stroke-width="2"></rect>
    <text x="80" y="52" text-anchor="middle" font-size="16" fill="${INK}">A + B</text>`),
  airbag: () => frame(`
    <ellipse cx="80" cy="50" rx="50" ry="28" fill="${PALE}" stroke="${TEAL}" stroke-width="2"></ellipse>
    <circle cx="48" cy="50" r="4" fill="${GOLD}"></circle>
    <circle cx="70" cy="40" r="4" fill="${GOLD}"></circle>
    <circle cx="96" cy="56" r="4" fill="${GOLD}"></circle>
    ${label('airbag')}`),
};

export const VISUAL_IDS = Object.keys(ART);

export function visualSvg(id) {
  const draw = ART[id];
  return draw ? draw() : '';
}
