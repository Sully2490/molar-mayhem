# STATUS

_Last updated: 2026-10-15. This branch records the sync and Lab rules in `docs/PARITY.md`._

## State
- Features passing: F00, F03. See `feature_list.json`.
- Static site loads from `index.html` with no build step. Hash routes `#Map`, `#Learn`, `#Drill`, `#Prep`, and `#Cards` show placeholders. The periodic-table tray colors atomic radius, ionization energy, and electronegativity.
- `npm test` and `npm run check:content` run locally. GitHub Actions runs `npm test`.
- `check:content` parses any `content/*.json` files and skips the coverage manifest when `MM_SOURCES` is unset. The manifest mapping itself is F01.
- Course source material and the coverage manifest stay outside the repo, at the path set in `MM_SOURCES`.
- Numeric tolerance is a relative percent (default 0.5%). A sig-fig mismatch returns a hint and still counts. Exact checks fold Unicode subscripts and superscripts into ASCII digits, collapse whitespace, follow a case rule, and accept any listed answer. An unordered set can mark near-miss items. A config check expands [He] through [Rn] and matches orbitals in any order.
- `docs/PARITY.md` is the feature map. Sync is a manual export/import code in `localStorage` only: no accounts, logins, or backend. Every Lab tool needs a text description in an `aria-live` or `aria-describedby` region, full keyboard control, a static frame under `prefers-reduced-motion`, and touch on phone widths.

## Priorities
The grader review fixes land before chapter content. After that:

1. F01 coverage check, then F02 local OCR (no paid service).
2. Unit 3 first: C5 (Ch 5), C7 (Ch 7), then the Unit 3 checklist (G3).
3. Weak-spot drills W1–W6.
4. Ch 8 and Ch 9 (C8, C9).
5. Interactive features I1–I8.
6. Remaining chapters C1–C4 and C6, then the cumulative checklist (GF), study plan (P2), and practice final (P1).

The first chapter with answer boxes must give every input a visible label and put feedback in an aria-live region.

## Blockers
- None on the grader. Chapter lessons are not part of this branch.
