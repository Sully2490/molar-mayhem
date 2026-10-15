# STATUS

_Last updated: 2026-10-15. Lane G merges lanes A–F and wires them into the shared page shell. `DEPLOY_SALT` is `20261015v3`._

## State
- Features passing: F00, F03, I1, I8. See `feature_list.json`.
- v3 lanes A–F are merged here. Home leads with Start here and grouped tiles. Learn opens chapter modules. The header groups Study, Practice, and Exam, and hides those labels under 600px. The periodic-table tray uses the shared `mount()` board. Search stays under the page title, and `content/lab-help.json` is precached but not indexed as a lesson. The service worker salt is `20261015v3`.
- Static site loads from `index.html` with no build step. The nav opens Map, Learn, Lab, Build, Drill, Cards, Terms, Videos, Exam 3, Weak spots, Prep, and Final. `#Learn` loads each lesson in `content/chNN/`, links glossary terms, and shows guided steps when a problem has them. Opening a lesson marks it practicing. `#Drill` asks for a number and a unit in separate labeled boxes, then drills seeded templates. A miss is weighted so it returns sooner and more than once, and a diagnosed mistake is named first. `#Cards` flips the glossary decks. `#Map` lists every lesson (skip ahead any time), with mastery, streak, XP, and a Practice link into Drill. The streak uses the local date. A new mastery shows a toast and confetti; reduced motion keeps the toast and drops the animation. `#Prep` is an untimed practice final. `#Final` is the timed practice final. `#Build` opens the builders. `#Terms` is the glossary and quick recall. `#Videos`, `#Exam3`, and `#Weak` mount their lane pages. Home glossary terms open a dialog. The periodic-table tray colors atomic radius, ionization energy, and electronegativity. Lane A’s recall list stays unwired.
- `content/final/practice-final.json` may be a list of problem objects, a list of file names in that folder, `{ "files": [...] }`, or `{ "problems": [...] }`. A named file may be one problem or `{ "problems": [...] }`. Each problem uses `id`, `q`, `a`, `why`, `hints`, and `check`. P1 stays `passing: false` because GF and I3 are still open.
- `npm test` and `npm run check:content` run locally. GitHub Actions runs `npm test`.
- `check:content` walks `content/` including chapter folders, checks each lesson against the lesson schema, and skips the coverage manifest when `MM_SOURCES` is unset. `schema.json` and `coverage.json` are parsed only. The manifest mapping itself is F01.
- Course source material and the coverage manifest stay outside the repo, at the path set in `MM_SOURCES`.
- Unit aliases treat mL, ml, cm3, and cm³ as the same volume. Compound units fold case and symbols, so kJ/mol, J/g°C, J/°C, kJ/°C, kJ/g, g/mol, g/L, and m/s match their case variants (g/l, M/S, j/g°c). A lone M stays molarity, and a lone m stays meters. Numeric answers accept scientific notation with `×` or `x` and a superscript exponent, such as 4.307×10⁻¹⁹ J. Numeric tolerance is a relative percent (default 0.5%). A sig-fig mismatch returns a hint and still counts. Exact checks fold Unicode subscripts, superscripts, and charges (Fe³⁺ = Fe3+, O²⁻ = O2-) into ASCII. The default case is formula, so Co, CO, and co stay different, and NaCl does not match nacl. Use insensitive case only for element names and ordinary words. An unordered set can mark near-miss items. A config check expands [He] through [Rn] and matches orbitals in any order.
- The test workflow has `permissions: contents: read`, pins checkout and setup-node to commit SHAs, and runs push builds on main only. The periodic-table dialog marks the page behind it inert. Element numbers are 0.7rem at full opacity.
- `docs/PARITY.md` is the feature map. Every listed item is checked. Sync is a manual export/import code in `localStorage` only: no accounts, logins, or backend. A `#sync=` link is read on this device, then removed with `history.replaceState`, and the map opens. A bad link shows “That link could not be read.” Import asks before replacing progress that already has XP. Every Lab tool needs a text description in an `aria-live` or `aria-describedby` region, full keyboard control, a static frame under `prefers-reduced-motion`, and touch on phone widths.

## Priorities
Chapters are built in parallel. Each chapter pull request may add only `content/chNN/` and `tests/chNN.test.js`. After chapters 1–9 have merged, one pull request wires them into the nav, then the interactive features, then the practice final.

F01 and F02 stay on hold.

Practice on `#Learn` uses a visible "Your answer" label and an `aria-live="polite"` region. A miss shows a hint. The third miss shows the solution and disables the box.

## Blockers
- I1 is passing. F01 and F02 stay on hold. This branch does not add chapter content.
