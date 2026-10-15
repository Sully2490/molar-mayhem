# STATUS

_Last updated: 2026-10-15. F00 scaffold is in place. Chapter content is paused._

## State
- Features passing: 1 (F00). See `feature_list.json`.
- Static site loads from `index.html` with no build step. Hash routes `#Map`, `#Learn`, `#Drill`, `#Prep`, and `#Cards` show placeholders. The periodic-table tray colors atomic radius, ionization energy, and electronegativity.
- `npm test` and `npm run check:content` run locally. GitHub Actions runs `npm test`.
- `check:content` parses any `content/*.json` files and skips the coverage manifest when `MM_SOURCES` is unset. The manifest mapping itself is F01.
- Course source material and the coverage manifest stay outside the repo, at the path set in `MM_SOURCES`.

## Priorities
Paused. Do not start chapter content until the owner sends detailed per-chapter content briefs. Lessons, problems, drills, and the practice final must be written from those briefs.

When briefs are in hand, build in course order:

1. F03 schema/grader and F01 coverage check. Chapter features depend on both. F02 (OCR) stays off the path unless a brief is blocked by an image-only source.
2. Exam 1: Ch 1 (C1), then Ch 2 (C2), then the weak spots and interactives that belong to those chapters (I1 numeric entry with units and sig figs, I2 dimensional analysis, and I8 attempts/hints/solutions). W1–W6 are later exams, not Exam 1.
3. Exam 2: Ch 3 (C3) and Ch 4 (C4), with W1–W4 (configurations, quantum numbers, orbitals), W5–W6 (ionic vs covalent, polarity), and I4 (Lewis and VSEPR).
4. Exam 3: Ch 5 (C5) and Ch 7 (C7), with I6 (MO diagrams), I3 (equation balancer), I7 (net ionic), I5 (multi-part problems), and the Unit 3 checklist (G3).
5. Ch 6 (C6), then Ch 8 (C8), then Ch 9 (C9).
6. Cumulative checklist (GF), study plan (P2), and the practice final (P1).

If two features are both unblocked, follow this list rather than the order they appear in `feature_list.json`.

## Blockers
- Chapter content is waiting on the owner's per-chapter briefs.
