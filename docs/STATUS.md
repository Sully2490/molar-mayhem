# STATUS

_Last updated: 2026-10-15. This branch folds compound unit aliases, loads the practice final, and records the parity rules._

## State
- Features passing: F00, F03, I1. See `feature_list.json`.
- Static site loads from `index.html` with no build step. `#Learn` loads each lesson in `content/chNN/`. `#Drill` asks for a number and a unit in separate labeled boxes. `#Prep` is an untimed practice final that loads chapter-schema problems from `content/final/practice-final.json`. This screen does not contain the questions. `#Map` and `#Cards` show placeholders. The periodic-table tray colors atomic radius, ionization energy, and electronegativity.
- `content/final/practice-final.json` may be a list of problem objects, a list of file names in that folder, `{ "files": [...] }`, or `{ "problems": [...] }`. A named file may be one problem or `{ "problems": [...] }`. Each problem uses `id`, `q`, `a`, `why`, `hints`, and `check`. P1 stays `passing: false` because GF and I3 are still open.
- `npm test` and `npm run check:content` run locally. GitHub Actions runs `npm test`.
- `check:content` walks `content/` including chapter folders, checks each lesson against the lesson schema, and skips the coverage manifest when `MM_SOURCES` is unset. `schema.json` and `coverage.json` are parsed only. The manifest mapping itself is F01.
- Course source material and the coverage manifest stay outside the repo, at the path set in `MM_SOURCES`.
- Unit aliases treat mL, ml, cm3, and cm³ as the same volume. Compound units fold case and symbols, so kJ/mol, J/g°C, J/°C, kJ/°C, kJ/g, g/mol, g/L, and m/s match their case variants (g/l, M/S, j/g°c). A lone M stays molarity, and a lone m stays meters. Numeric answers accept scientific notation with `×` or `x` and a superscript exponent, such as 4.307×10⁻¹⁹ J. Numeric tolerance is a relative percent (default 0.5%). A sig-fig mismatch returns a hint and still counts. Exact checks fold Unicode subscripts, superscripts, and charges (Fe³⁺ = Fe3+, O²⁻ = O2-) into ASCII. The default case is formula, so Co, CO, and co stay different, and NaCl does not match nacl. Use insensitive case only for element names and ordinary words. An unordered set can mark near-miss items. A config check expands [He] through [Rn] and matches orbitals in any order.
- The test workflow has `permissions: contents: read`, pins checkout and setup-node to commit SHAs, and runs push builds on main only. The periodic-table dialog marks the page behind it inert. Element numbers are 0.7rem at full opacity.

## Priorities
Chapters are built in parallel. Each chapter pull request may add only `content/chNN/` and `tests/chNN.test.js`. After chapters 1–9 have merged, one pull request wires them into the nav, then the interactive features, then the practice final.

F01 and F02 stay on hold.

Practice on `#Learn` uses a visible "Your answer" label and an `aria-live="polite"` region. A miss shows a hint. The third miss shows the solution and disables the box.

## Blockers
- I1 is passing. F01 and F02 stay on hold. This branch does not add chapter content.
