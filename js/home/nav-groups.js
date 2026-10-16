/**
 * Header groups for Lane G.
 * Study holds the reading paths, Practice holds the drills and pictures,
 * Exam holds the checks, and Tools holds the periodic table.
 * Lane G wires this into js/nav.js and index.html. This file does not.
 */
export const NAV_GROUP_NOTE = 'Lane G wires NAV_GROUPS into js/nav.js and index.html. Keep data-nav, data-nav-slot, PRIMARY_NAV, and MORE_NAV so the phone More menu still works.';

export const NAV_GROUPS = Object.freeze([
  {
    id: 'study',
    label: 'Study',
    blurb: 'Lessons, the map, and the words.',
    items: Object.freeze([
      { id: 'Learn', label: 'Learn', href: '#Learn', blurb: 'Chapter modules', kind: 'route' },
      { id: 'Map', label: 'Map', href: '#Map', blurb: 'Every lesson, in order', kind: 'route' },
      { id: 'Videos', label: 'Videos', href: '#Videos', blurb: 'Public clips', kind: 'route' },
      { id: 'Terms', label: 'Terms', href: '#Terms', blurb: 'Glossary', kind: 'route' },
      { id: 'Cards', label: 'Cards', href: '#Cards', blurb: 'Flip to recall', kind: 'route' },
    ]),
  },
  {
    id: 'practice',
    label: 'Practice',
    blurb: 'Extra problems and pictures you can move.',
    items: Object.freeze([
      { id: 'Drill', label: 'Drill', href: '#Drill', blurb: 'Extra problems', kind: 'route' },
      { id: 'Lab', label: 'Lab', href: '#Lab', blurb: 'Pictures you can move', kind: 'route' },
      { id: 'Build', label: 'Build', href: '#Build', blurb: 'Bonding, gases, and heat', kind: 'route' },
      { id: 'Weak', label: 'Weak spots', href: '#Weak', blurb: 'Lessons still open', kind: 'route' },
    ]),
  },
  {
    id: 'exam',
    label: 'Exam',
    blurb: 'Checks for chapters 5 and 7, then the whole course.',
    items: Object.freeze([
      { id: 'Exam3', label: 'Exam 3', href: '#Exam3', blurb: 'Chapters 5 and 7', kind: 'route' },
      { id: 'Prep', label: 'Prep', href: '#Prep', blurb: 'Short untimed drill', kind: 'route' },
      { id: 'Final', label: 'Final', href: '#Final', blurb: 'Timed practice final', kind: 'route' },
    ]),
  },
  {
    id: 'tools',
    label: 'Tools',
    blurb: 'A table you can open from any page.',
    items: Object.freeze([
      {
        id: 'periodic',
        label: 'Periodic table',
        href: '',
        blurb: 'Trends and details',
        kind: 'action',
        action: 'open-tray',
      },
    ]),
  },
]);

export function navItems() {
  return NAV_GROUPS.flatMap((group) => group.items.map((item) => ({
    ...item,
    group: group.id,
    groupLabel: group.label,
  })));
}

export function groupForRoute(id) {
  return NAV_GROUPS.find((group) => group.items.some((item) => item.id === id)) ?? null;
}
