/** Rapid recall for the solubility patterns used with precipitation. */
export const solubility = {
  id: 'solubility-rules',
  title: 'Solubility rules',
  chapter: 7,
  lesson: 'ch07-classify',
  intro: 'These patterns say which ionic compounds dissolve in water. Exceptions matter.',
  cards: [
    {
      id: 'list',
      kind: 'list',
      prompt: 'Name four anion families that are soluble with only rare exceptions: nitrate, acetate, perchlorate, and the group 1 or ammonium cations. A short name for each family is enough.',
      items: [
        { id: 'nitrate', label: 'nitrates', accepts: ['nitrate', 'nitrates', 'NO3-'] },
        { id: 'acetate', label: 'acetates', accepts: ['acetate', 'acetates', 'CH3COO-'] },
        { id: 'perchlorate', label: 'perchlorates', accepts: ['perchlorate', 'perchlorates', 'ClO4-'] },
        { id: 'alkali', label: 'group 1 and ammonium', accepts: ['group 1', 'alkali', 'ammonium', 'NH4+', 'group 1 and ammonium'] },
      ],
    },
    {
      id: 'halide-exceptions',
      kind: 'list',
      prompt: 'Chlorides, bromides, and iodides are soluble except with which three cations?',
      items: [
        { id: 'ag', label: 'Ag+', accepts: ['Ag+', 'silver'] },
        { id: 'pb', label: 'Pb2+', accepts: ['Pb2+', 'lead'] },
        { id: 'hg', label: 'Hg2^2+', accepts: ['Hg2^2+', 'Hg22+', 'mercury(I)', 'mercurous'] },
      ],
    },
    {
      id: 'sulfate-exceptions',
      kind: 'list',
      prompt: 'Sulfates are soluble except with which four cations? Include barium, strontium, lead, and calcium.',
      items: [
        { id: 'ba', label: 'Ba2+', accepts: ['Ba2+', 'barium'] },
        { id: 'sr', label: 'Sr2+', accepts: ['Sr2+', 'strontium'] },
        { id: 'pb', label: 'Pb2+', accepts: ['Pb2+', 'lead'] },
        { id: 'ca', label: 'Ca2+', accepts: ['Ca2+', 'calcium'] },
      ],
    },
    { id: 'nitrate-yes', kind: 'item', prompt: 'Are nitrates soluble? Answer yes or no.', answer: 'yes', accepts: ['yes', 'soluble'] },
    { id: 'agcl', kind: 'item', prompt: 'Does AgCl dissolve? Answer soluble or insoluble.', answer: 'insoluble', accepts: ['insoluble', 'no'] },
    { id: 'baso4', kind: 'item', prompt: 'Does BaSO4 dissolve? Answer soluble or insoluble.', answer: 'insoluble', accepts: ['insoluble', 'no'] },
    { id: 'nacl', kind: 'item', prompt: 'Does NaCl dissolve? Answer soluble or insoluble.', answer: 'soluble', accepts: ['soluble', 'yes'] },
    { id: 'nh4', kind: 'item', prompt: 'Does NH4Cl dissolve? Answer soluble or insoluble.', answer: 'soluble', accepts: ['soluble', 'yes'] },
    {
      id: 'hydroxide',
      kind: 'list',
      prompt: 'Most hydroxides are insoluble. Name the soluble exceptions: group 1, plus calcium, strontium, and barium.',
      items: [
        { id: 'g1', label: 'group 1', accepts: ['group 1', 'alkali', 'alkali metals'] },
        { id: 'ca', label: 'Ca2+', accepts: ['Ca2+', 'calcium'] },
        { id: 'sr', label: 'Sr2+', accepts: ['Sr2+', 'strontium'] },
        { id: 'ba', label: 'Ba2+', accepts: ['Ba2+', 'barium'] },
      ],
    },
    {
      id: 'carbonate',
      kind: 'item',
      prompt: 'Is CaCO3 soluble or insoluble?',
      answer: 'insoluble',
      accepts: ['insoluble', 'no'],
    },
    {
      id: 'na2co3',
      kind: 'item',
      prompt: 'Is Na2CO3 soluble or insoluble? Group 1 carbonates are the exception.',
      answer: 'soluble',
      accepts: ['soluble', 'yes'],
    },
  ],
};
