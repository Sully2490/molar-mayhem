# Spec A — Seeded problem generator (molar-mayhem)
Author: Scout · 2026-10-15 · Base: main c0d60de · Owner: Lane A cloud agent
Builds on `js/generate.js` (`generateProblem(spec, random)`, with `vars{min,max,step}`, `solve`, `sigFigs`, `unit`) and `js/grade.js` (`grade(input, check)` → `{ok, reason?, hint?}`). Don't fork either. Extend them.

## Files
- `js/rng.js`: `mulberry32(seed)` returns `() => number` in [0,1). Pass it as `random` to `generateProblem`.
- `js/masses.js`: OpenStax AF2e periodic-table atomic masses (use the values in the book; don't edit by hand). `molarMass('Ca(OH)2')`.
- `content/templates/chNN.js`: an ES module exporting an array of templates. JS, because `solve` and `mistakes` are functions. Lesson JSON stays schema-valid (schema has additionalProperties:false; don't add template fields there).
- `tests/templates.test.js`.

## Template schema
```js
{
  id: 'ch08-ideal-gas-V',          // unique, stable
  ch: 8,
  openstax_section: 'OpenStax AF2e §8.2',
  topic: 'gas laws',               // used for final-guide weighting
  vars: {                          // realistic ranges; step sets input sig figs
    n: { min: 0.100, max: 5.00, step: 0.01, sigFigs: 3 },
    T: { min: 250.0, max: 500.0, step: 0.1, sigFigs: 4 },
    P: { min: 0.100, max: 10.0, step: 0.01, sigFigs: 3 },
  },
  template: 'What volume do {n} mol of gas occupy at {T} K and {P} atm?',
  solve: ({ n, T, P }) => n * 0.08206 * T / P,
  unit: 'L',
  sigFigs: 'min',                  // 'min' = fewest input sig figs (grade to the inputs); or an integer
  tolerance: 0.5,
  hints: (v) => ['Use PV = nRT and solve for V.', `R = 0.08206 L·atm/(mol·K); T is already in kelvin (${v.T} K).`],
  why: (v, x) => `V = nRT/P = ${v.n}(0.08206)(${v.T})/${v.P} = ${x.toPrecision(3)} L.`,
  mistakes: [                      // each one must give a value that FAILS the check
    { id: 'celsius', value: ({n,T,P}) => n*0.08206*(T-273.15)/P, message: 'That looks like °C. Gas laws need kelvin.' },
    { id: 'inverted', value: ({n,T,P}) => P/(n*0.08206*T), message: 'You divided the wrong way. V = nRT/P.' },
    { id: 'R-wrong', value: ({n,T,P}) => n*8.314*T/P, message: 'With atm and L, use R = 0.08206, not 8.314.' },
  ],
}
```
Output = `generateProblem` output plus `seed`, `templateId` and `mistakes: [{id, value, message}]` (values precomputed). `check` stays `{kind:'numeric', value, tolerance, sigFigs, unit}`, so grade.js gives its existing sig-fig hint unchanged.

## Rules (from Chemistry Tutor)
- Only physically real values: K > 0, masses 0.100–500 g, P 0.100–10.0 atm, V 0.100–50.0 L, T 250–500 K (or the °C equivalent when asked), molarity 0.0100–6.00 M, yields ≤ 100%. Add a `valid(vars)` guard; regenerate (deterministically, seed+1) when it fails.
- Inputs use 3–4 sig figs and are rendered with trailing zeros (`toPrecision`, not `String()`, so 2.50 stays "2.50").
- The answer is rounded to the input sig figs. The value is computed in code, never typed in.
- Masses come only from `js/masses.js`.

## Template set (≥ 80; weighted to Ch5/7/8/9 and the final study guide)
| Ch | n | Templates |
|---|---|---|
| 1 | 6 | unit conversions (length/mass/volume), density, °C↔K↔°F, sig-fig rounding, multi-step dimensional analysis |
| 2 | 4 | average atomic mass from isotopes, p/n/e counts for isotopes/ions |
| 3 | 6 | λ↔ν, photon E, Rydberg ΔE/λ, de Broglie λ |
| 4 | 4 | formal charge counts, ΔEN bond classification (exact) |
| 5 | 10 | electron groups → hybridization, σ/π counts from formulas, bond order from MO electron counts, bond angle from group count (exact/numeric, built from a molecule table) |
| 6 | 10 | formula mass, grams↔moles↔particles, % composition, empirical formula, molarity, dilution M1V1, mass/ppm/mole fraction |
| 7 | 16 | mole ratio, g→g stoich, limiting reagent, theoretical/percent yield, titration, solution stoich, oxidation numbers (exact) |
| 8 | 14 | Boyle, Charles, Gay-Lussac, combined, PV=nRT (each variable), density/molar mass, Dalton partial P, gas-collected-over-water, gas stoich at STP, Graham effusion, u_rms |
| 9 | 12 | q = mcΔT (each variable), coffee-cup and bomb calorimetry, Hess's law, ΔH°rxn from ΔHf°, ΔH from bond energies, ΔH per gram/mole |
Total 82. Final-guide topics (gases, thermo, molarity/dilution, grams–moles, stoich, limiting reagent) ≈ 50 of the 82.

## Quick-recall bonus deck
`content/templates/recall.js` exports items `{id, front, back, check, topic}` with exact/set checks (case 'formula' for formulas). The deck draws from:
- **Strong acids:** HCl, HBr, HI, HNO3, H2SO4, HClO4. Set check, with HF and HClO3 as near misses.
- **Strong bases:** the group 1 hydroxides plus Ca/Sr/Ba(OH)2.
- **Solubility rules:** "Is PbCl2 soluble?" → no.
- **Polyatomic ions:** name ↔ formula with charge (sulfate SO4²⁻, nitrate, phosphate, ammonium, hydroxide, carbonate, acetate, permanganate, etc.).
- **VSEPR:** group count + lone pairs → shape and angle.
- **Gas laws:** "Charles's law" → V1/T1 = V2/T2.

Feeds the existing Cards and drill queue (replaces the hard-coded DECK and DRILL_ITEMS, which closes #39 findings 3 and 4). +5 XP once per card, via `reviewCard`.

## Required tests (`npm test`)
For every template × seeds 1..50:
1. The same seed gives an identical `q`/`a`; a different seed gives a different `q` for ≥ 45/50.
2. All vars are within their range and `valid()` passes. No NaN/Infinity in q, a or value.
3. `grade(a, check).ok === true` with no sig-fig hint.
4. Every mistake value, formatted to the same sig figs, gives `grade(...).ok === false`, and `diagnose()` (Spec B) returns that mistake's id and message.
5. `openstax_section` matches /§\d\.\d/ and the chapter's section list. Template ids are unique, and there are ≥ 80 templates.
Recall deck: each item's answer passes its check, and a lowercase formula fails.

## Addendum (Oct 15, 3:26 AM): Chemistry Tutor range rules
- Gas templates: after computing, reject the seed and redraw unless P is 0.1–10 atm and n is 0.001–20 mol.
- Calorimetry: temperatures in °C, water between 5 and 95 °C, ΔT between 1 and 60 °C, final temperature strictly between the two starting temperatures.
- Dilution: require C2 < C1 and V2 > V1.
- Tests: the 50-seed test must also assert these bounds.

## Export API

Lane A does not edit Drill, Cards, or the map. The integrator wires the exports below.

```js
import { templates, templateById, templatesForSection, recall } from './content/templates/index.js';
import { generateFromSeed, diagnose, generateProblem } from './js/generate.js';
import { grade } from './js/grade.js';
import { mulberry32 } from './js/rng.js';
import { reviewCard } from './js/progress.js';
```

- `templates` is the full list (chapters 1–9, more than 80). Each item matches the schema above. `kind: 'exact'` is used for empirical formulas, the limiting-reactant formula, and bond classification. Oxidation numbers stay numeric with one significant figure.
- `templateById(id)` returns one spec. `templatesForSection('OpenStax AF2e §8.2')` returns every template for that lesson.
- `generateFromSeed(spec, seed)` returns `{ q, a, why, hints, check, vars, seed, templateId, mistakes }`. `mistakes` is `[{ id, value, message }]` with the values already computed. If `valid(vars)` fails, the same function tries `seed + 1`, then `seed + 2`, up to 40 steps.
- `generateProblem(spec, mulberry32(seed))` is the lower-level draw. Prefer `generateFromSeed` so the seed and the mistakes travel with the problem.
- `diagnose(input, problem)` returns `{ id, message }` when the answer matches a mistake, or `null`. Numeric matches allow the rounding that sig-fig formatting introduces. A correct answer is not reported as a mistake.
- `recall` is `{ id, front, back, check, topic }`. Formula cards use `case: 'formula'`, so `hcl` does not match `HCl`.

`check` is ready for the existing `grade(input, check)` call. Do not change `js/grade.js`.

### Drill

Build a practice item from a template instead of a hard-coded list:

```js
const spec = templateById('ch08-ideal-v');
const problem = generateFromSeed(spec, seed);
const result = grade(studentInput, problem.check);
if (!result.ok) {
  const found = diagnose(studentInput, problem);
  // Show found.message first when it exists, then problem.hints[attempt].
}
```

Store `problem.seed` with the item so the same problem can be rebuilt. A miss still goes back through the existing drill queue. Final-guide weight comes from `spec.topic` (`gas laws`, `calorimetry`, `thermochemistry`, `molarity`, `dilution`, `grams moles`, `stoichiometry`, `limiting reagent`).

### Map

Group templates by `spec.ch`. On a lesson row, attach every template whose `openstax_section` equals `lesson.openstax_section` (`templatesForSection`). A Practice control can open Drill with that `templateId` and a new integer seed. The map stays a list of lessons; this lane does not add a second app.

### Cards

Append `recall` to the deck produced from the lessons. Each card id is `card.id`. When the learner flips to the back, call `reviewCard(progress, card.id)`. That awards +5 XP the first time and 0 XP after that. A typed answer uses `grade(input, card.check)`.

No network calls and no accounts. Seeds, generated problems, and review XP stay in `localStorage` with the rest of the site.
