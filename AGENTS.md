# AGENTS.md: Molar Mayhem

Molar Mayhem is a free, static, interactive study site for a first-semester General Chemistry course (CHM 1045). It covers Ch 1–9 of OpenStax *Chemistry: Atoms First 2e*. The stack is vanilla HTML/CSS/JS on GitHub Pages, with no runtime dependencies.

## Start of every session
1. Read `docs/STATUS.md` first, then `feature_list.json`.
2. Pick the first feature with `"passing": false` whose `depends_on` are all passing.
3. Build **one feature per branch and PR** (`feat/<id>`). Never push to `main`.

## Install / run / test
```bash
npm install            # dev tooling only
npm run dev            # npx serve . -l 5173  → http://127.0.0.1:5173/
npm test               # node --test tests/
npm run check:content  # validates content/*.json against schema; coverage vs. external manifest
```
The site must work from GitHub Pages with no build step.

## Done means
- Every acceptance criterion is met, `npm test` passes, and you have tested the feature in a browser. Attach a screenshot or short video to the PR.
- Flip only that feature to `"passing": true` and update `docs/STATUS.md`.
- Open a **draft PR**. **Never merge.**

## Stop rules
- If something fails, retry at most **twice** with a different approach. Then stop, record the blocker in `docs/STATUS.md`, and leave the PR as a draft.
- **Ask the repo owner first** before any merge, deploy or Pages change, new paid tool or service, or force-push/history rewrite.
- No duplicate apps. This repo is the one study site.

## Content rules
- **Original content only.** Write your own explanations and problems. Cite OpenStax *Chemistry: Atoms First 2e* (CC BY 4.0) by section, e.g. "OpenStax AF2e §8.3", and keep the attribution in the site footer.
- **Course source material lives outside this repo and must never be committed.** That includes course files, instructor slides, study guides, extracted text and the coverage manifest. Read them locally through the path in the `MM_SOURCES` env var. Never copy their text verbatim. `.gitignore` blocks `sources/`, `*.pdf`, `*.docx` and `*.pptx`. Do not force-add them.
- Do not copy questions, assets or code from any commercial homework platform. Rebuild interaction patterns only (`AKTIV_PATTERNS.md`).
- No personal data: no names, grades or school identifiers.
- Problems should be solvable by hand with a basic scientific calculator.

## Teaching style (all on-screen text)
- Very concise and beginner level. Assume no background.
- For every topic: **teach step by step from scratch → worked example → a similar problem with a hint** → more practice.
- On a wrong answer, give a targeted hint first. Show the full worked solution only after the attempts run out.
