# Spec B — Worked steps + wrong-answer diagnosis (molar-mayhem)
Author: Scout · 2026-10-15 · Base: main c0d60de · Owner: Lane B cloud agent
Uses `grade(input, check)` from `js/grade.js`. The step UI follows the Learn player (`js/learn.js`): the attempt count is 1-based, the solution is revealed after the 3rd miss, and feedback goes to `<p class="feedback" aria-live="polite">`.

## Step schema (optional `guided` and `mistakes` on a problem; JSON)
The lesson-level `steps` (strings) stay as they are. Add this to the problem item in `content/schema.json`:
```json
"guided": [
  { "prompt": "Convert 10.0 g H2 to moles (M = 2.016 g/mol).",
    "expected": "4.96 mol",
    "check": { "kind": "numeric", "value": 4.960, "tolerance": 0.5, "sigFigs": 3, "unit": "mol" },
    "hint": "Divide grams by molar mass." },
  { "prompt": "Use 2 H2 : 2 H2O. Moles of H2O?", "expected": "4.96 mol",
    "check": { "kind": "numeric", "value": 4.960, "tolerance": 0.5, "sigFigs": 3, "unit": "mol" },
    "hint": "Multiply by the H2O/H2 ratio from the balanced equation." },
  { "prompt": "Convert to grams of H2O (18.02 g/mol).", "expected": "89.4 g",
    "check": { "kind": "numeric", "value": 89.37, "tolerance": 0.5, "sigFigs": 3, "unit": "g" },
    "hint": "Moles × molar mass." }
],
"mistakes": [
  { "id": "skip-moles", "value": 10.0, "unit": "g", "message": "You went straight from grams to grams. Convert to moles first." },
  { "id": "flip-ratio", "kind": "ratio", "message": "Your mole ratio is upside down. Put the unknown on top." }
]
```
Behaviour: one step is active at a time and is checked on submit. A miss shows the step's `hint`, plus a diagnosis message if one matches. After 3 misses the `expected` value is revealed and the next step unlocks. When the last step passes (or is revealed), the final answer and `why` are shown. Static steps get +0 XP. Finishing all steps with no reveal gives the normal problem XP.

## Diagnosis (`js/diagnose.js`)
`diagnose(input, check, mistakes, ctx) → {id, message} | null`. Only call it when `grade().ok === false`. Parse with `parseAnswer` from grade.js. Rules run in order; the first match wins:
1. **Named value**: `mistakes[].value` (or values precomputed by Spec A templates) within the check tolerance → that mistake.
2. **Sign flip**: |x + v| within tolerance → `sign`: "Check the sign: heat released means q (and ΔH) is negative."
3. **Exponent off**: x/v ≈ 10^k for k ∈ ±1..±3 → `exponent`: "Your digits are right but the power of ten is off."
4. **°C/K**: x matches the value recomputed with T − 273.15 (template `ctx.recompute`) or |x − v| ≈ 273.15 → `kelvin`: "Use kelvin: K = °C + 273.15."
5. **Inverted ratio**: x·v ≈ ratio², or x ≈ v·(b/a)² for mole ratio a:b from `ctx.ratio` → `flip-ratio`.
6. **Missing coefficient**: x ≈ v / c or v·c for a coefficient c in `ctx.coefficients` → `coefficient`: "Did you use the coefficient from the balanced equation?"
7. **Double bond as 2 groups** (exact checks on geometry/hybridization): input equals `ctx.overcount` (e.g. "sp3" for C in CO2, "tetrahedral" for CH2O) → `double-bond`: "A double bond counts as one electron group."

Course top-5 (Chemistry Tutor) must each have a named message: skip-moles, flip-ratio, kelvin, sign (q/ΔH), double-bond.

## Content target: ≥ 60 guided problems, Ch5 and Ch7 first
- **Ch5 (20):** groups → geometry → hybridization → σ/π count for CO2, HCN, C2H4, CH2O, N2, O3, SO2, NH3, H2O, C2H2… Each has `ctx.overcount`.
- **Ch7 (20):** balance → g→mol → ratio → g; limiting reagent (both reactants → mol → compare → product); percent yield; redox oxidation numbers.
- **Ch8 (10):** convert °C→K, then gas laws / PV=nRT, then gas stoich.
- **Ch9 (10):** q = mcΔT with the sign, calorimetry (q_rxn = −q_soln), then ΔH per mol, Hess's law.

## Required tests
- Every guided step's `expected` passes its own `check`. The last step's value equals the problem's `check.value` within tolerance.
- For each named mistake, `grade(mistakeValue).ok === false` and `diagnose` returns that id.
- Synthetic: −v → `sign`, 10v → `exponent`, v+273.15 → `kelvin`, ratio flip → `flip-ratio`. A random wrong value (×1.37) → `null`, so there are no false diagnoses.
- Rule order is deterministic. Correct answers are never diagnosed.
- Count: ≥ 60 guided problems, ≥ 20 in Ch5 and ≥ 20 in Ch7.
- UI (jsdom): 3 misses reveal the step and unlock the next one; focus moves to the next step's input.

## Accessibility
Feedback and diagnosis text go to the existing `aria-live="polite"` feedback `<p>`. Each step input has a `<label>` and `aria-describedby` pointing at its feedback. Revealed and completed steps stay readable as text (no color-only state). Everything works by keyboard (Enter submits), with no motion or timer.

## Wiring (this lane does not edit Learn)

`content/schema.json` already allows `guided` and `mistakes` (main `c0f8e65`). This lane does not change that file. On disk, a guided step stores the schema fields `prompt` and `answer` (the revealed value). `expected` repeats `answer`. `check` is the grader descriptor. A mistake stores `id`, `describe`, and `wrong`. Numeric mistakes also store `value` and `unit` so rule 1 can match them. `describe` is the message the spec calls `message`.

| Piece | Path | Call |
| --- | --- | --- |
| Diagnosis | `js/diagnose.js` | `diagnose(input, check, mistakes, ctx)` |
| Lane A templates | `js/gen/` (optional) | `loadLaneAMistakes(problem)` imports `js/gen/mistakes.js` and returns `[]` if that module is missing. A mistake may be `{id, describe, wrongAnswerFn}`. A throwing `wrongAnswerFn` is skipped. |
| Step session | `js/steps/engine.js` | `submitStep(problem, session, input)` |
| Step UI | `js/steps/index.js` | `renderGuided(problem)` then `bindGuided(root, problem, { storage })` |
| Styles | `css/steps/steps.css` | Link this stylesheet next to `css/styles.css`. |

When Learn grows a hook, render `renderGuided` for any practice problem whose `guided` array has steps, instead of the single answer box in `renderProblem`. Pass the problem's `mistakes` through. Build `ctx` with `ctxFor(problem, step)` so `overcount`, `ratio`, and `coefficients` on a step reach `diagnose`. Do not grade a correct answer with `diagnose`.

XP stays in `localStorage` through `js/progress.js`. Each finished step adds 0. A problem finished with no revealed step adds 10, the same amount a drill problem adds. A revealed step adds 0 for the whole problem. `bindGuided` writes that only when `storage` is passed or the page has `localStorage`.
