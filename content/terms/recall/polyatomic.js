/** Names and charges for the polyatomic ions used in formulas. */
const IONS = [
  ['nh4', 'NH4+', 'ammonium', '1+'],
  ['h3o', 'H3O+', 'hydronium', '1+'],
  ['oh', 'OH-', 'hydroxide', '1-'],
  ['no3', 'NO3-', 'nitrate', '1-'],
  ['no2', 'NO2-', 'nitrite', '1-'],
  ['clo4', 'ClO4-', 'perchlorate', '1-'],
  ['clo3', 'ClO3-', 'chlorate', '1-'],
  ['clo2', 'ClO2-', 'chlorite', '1-'],
  ['clo', 'ClO-', 'hypochlorite', '1-'],
  ['so4', 'SO4^2-', 'sulfate', '2-'],
  ['so3', 'SO3^2-', 'sulfite', '2-'],
  ['hso4', 'HSO4-', 'hydrogen sulfate', '1-'],
  ['co3', 'CO3^2-', 'carbonate', '2-'],
  ['hco3', 'HCO3-', 'hydrogen carbonate', '1-'],
  ['po4', 'PO4^3-', 'phosphate', '3-'],
  ['hpo4', 'HPO4^2-', 'hydrogen phosphate', '2-'],
  ['h2po4', 'H2PO4-', 'dihydrogen phosphate', '1-'],
  ['c2h3o2', 'CH3COO-', 'acetate', '1-'],
  ['mno4', 'MnO4-', 'permanganate', '1-'],
  ['cro4', 'CrO4^2-', 'chromate', '2-'],
  ['cr2o7', 'Cr2O7^2-', 'dichromate', '2-'],
  ['cn', 'CN-', 'cyanide', '1-'],
  ['o2', 'O2^2-', 'peroxide', '2-'],
  ['scn', 'SCN-', 'thiocyanate', '1-'],
];

function chargeAccepts(charge) {
  if (charge === '1+') return ['1+', '+1', '+', '1'];
  if (charge === '1-') return ['1-', '-1', '-', '1-'];
  if (charge === '2-') return ['2-', '-2'];
  if (charge === '3-') return ['3-', '-3'];
  if (charge === '2+') return ['2+', '+2'];
  return [charge];
}

const cards = [
  {
    id: 'list-names',
    kind: 'list',
    prompt: 'Name these five ions: NH4+, OH-, NO3-, SO4^2-, and PO4^3-.',
    items: [
      { id: 'nh4', label: 'ammonium', accepts: ['ammonium'] },
      { id: 'oh', label: 'hydroxide', accepts: ['hydroxide'] },
      { id: 'no3', label: 'nitrate', accepts: ['nitrate'] },
      { id: 'so4', label: 'sulfate', accepts: ['sulfate'] },
      { id: 'po4', label: 'phosphate', accepts: ['phosphate'] },
    ],
  },
];

for (const [id, formula, name, charge] of IONS) {
  cards.push({
    id: `name-${id}`,
    kind: 'item',
    prompt: `Name the ion ${formula}.`,
    answer: name,
    accepts: [name],
  });
  cards.push({
    id: `charge-${id}`,
    kind: 'item',
    prompt: `What is the charge of ${name}? Use a form like ${charge}.`,
    answer: charge,
    accepts: chargeAccepts(charge),
  });
}

export const polyatomic = {
  id: 'polyatomic-ions',
  title: 'Polyatomic ions',
  chapter: 4,
  lesson: 'ch04-nomenclature',
  intro: 'Say the name and the charge. Subscripts and superscripts can be typed as ordinary numbers.',
  cards,
};
