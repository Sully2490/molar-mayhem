# STATUS

_Last updated: 2026-10-15. This branch is the grader and dialog cleanup._

## State
- Features passing: F00, F03. See `feature_list.json`.
- Static site loads from `index.html` with no build step. Hash routes `#Map`, `#Learn`, `#Drill`, `#Prep`, and `#Cards` show placeholders. The periodic-table tray colors atomic radius, ionization energy, and electronegativity.
- `npm test` and `npm run check:content` run locally. GitHub Actions runs `npm test`.
- `check:content` parses any `content/*.json` files and skips the coverage manifest when `MM_SOURCES` is unset. The manifest mapping itself is F01.
- Course source material and the coverage manifest stay outside the repo, at the path set in `MM_SOURCES`.
- Numeric tolerance is a relative percent (default 0.5%). A sig-fig mismatch returns a hint and still counts. Exact checks fold Unicode subscripts, superscripts, and charges (Fe³⁺ = Fe3+, O²⁻ = O2-) into ASCII. The default case is formula, so Co, CO, and co stay different, and NaCl does not match nacl. Use insensitive case only for element names and ordinary words. An unordered set can mark near-miss items. A config check expands [He] through [Rn] and matches orbitals in any order.
- The test workflow has `permissions: contents: read`, pins checkout and setup-node to commit SHAs, and runs push builds on main only. The periodic-table dialog marks the page behind it inert. Element numbers are 0.7rem at full opacity.

## Priorities
Chapters are built in parallel. Each chapter pull request may add only `content/chNN/` and `tests/chNN.test.js`. After chapters 1–9 have merged, one pull request wires them into the nav, then the interactive features, then the practice final.

F01 and F02 stay on hold.

The first chapter with answer boxes must give every input a visible label and put feedback in an aria-live region.

## Blockers
- F01 and F02 are on hold. This branch does not add a chapter.
