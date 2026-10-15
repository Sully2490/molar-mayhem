/** Shapes and bond angles from electron-region counts. */
export const vsepr = {
  id: 'vsepr-shapes',
  title: 'VSEPR shapes and angles',
  chapter: 4,
  lesson: 'ch04-shape-and-polarity',
  intro: 'Count electron regions first. Lone pairs change the shape name and squeeze the angle.',
  cards: [
    {
      id: 'list',
      kind: 'list',
      prompt: 'Name the five electron-pair geometries for 2, 3, 4, 5, and 6 regions.',
      items: [
        { id: 'lin', label: 'linear', accepts: ['linear'] },
        { id: 'tp', label: 'trigonal planar', accepts: ['trigonal planar'] },
        { id: 'tet', label: 'tetrahedral', accepts: ['tetrahedral'] },
        { id: 'tbp', label: 'trigonal bipyramidal', accepts: ['trigonal bipyramidal'] },
        { id: 'oct', label: 'octahedral', accepts: ['octahedral'] },
      ],
    },
    { id: 'a2', kind: 'item', prompt: 'Two regions, no lone pairs: shape and ideal angle.', answer: 'linear, 180', accepts: ['linear 180', 'linear, 180 degrees'] },
    { id: 'a3', kind: 'item', prompt: 'Three regions, no lone pairs: shape and ideal angle.', answer: 'trigonal planar, 120', accepts: ['trigonal planar 120', 'trigonal planar, 120 degrees'] },
    { id: 'a4', kind: 'item', prompt: 'Four regions, no lone pairs: shape and ideal angle.', answer: 'tetrahedral, 109.5', accepts: ['tetrahedral 109.5', 'tetrahedral, 109.5 degrees'] },
    { id: 'a5', kind: 'item', prompt: 'Five regions, no lone pairs: shape, and the two ideal angles.', answer: 'trigonal bipyramidal, 90 and 120', accepts: ['trigonal bipyramidal 90 120', 'trigonal bipyramidal, 90 and 120'] },
    { id: 'a6', kind: 'item', prompt: 'Six regions, no lone pairs: shape and ideal angle.', answer: 'octahedral, 90', accepts: ['octahedral 90', 'octahedral, 90 degrees'] },
    { id: 'water', kind: 'item', prompt: 'Water has two bonds and two lone pairs. What is the molecular shape?', answer: 'bent', accepts: ['bent', 'bent shape'] },
    { id: 'ammonia', kind: 'item', prompt: 'Ammonia has three bonds and one lone pair. What is the molecular shape?', answer: 'trigonal pyramidal', accepts: ['trigonal pyramidal', 'pyramidal'] },
    { id: 'co2', kind: 'item', prompt: 'Carbon dioxide has two regions and no lone pairs on carbon. What is the shape?', answer: 'linear', accepts: ['linear'] },
    { id: 'sf6', kind: 'item', prompt: 'SF6 has six bonds and no lone pairs. What is the shape?', answer: 'octahedral', accepts: ['octahedral'] },
    { id: 'seesaw', kind: 'item', prompt: 'Five regions with one lone pair: what is the molecular shape?', answer: 'seesaw', accepts: ['seesaw'] },
    { id: 'square', kind: 'item', prompt: 'Six regions with two lone pairs opposite each other: what is the molecular shape?', answer: 'square planar', accepts: ['square planar'] },
  ],
};
