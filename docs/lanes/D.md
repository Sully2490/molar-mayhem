# Lane D — Builders

Interactive pictures for bonding, gases, heat, and stoichiometry. Each one teaches with a short challenge that is checked in the browser. This lane does not edit `index.html`, `js/routes.js`, `js/app.js`, or `css/styles.css`. Wire the shell in when the route lane is ready.

OpenStax *Chemistry: Atoms First 2e* (CC BY 4.0) is cited on each tool. The wording is original.

## Files

| Path | Role |
| --- | --- |
| `js/builders/index.js` | Lazy shell. `mount(el, opts)` loads one builder. |
| `js/builders/lewis.js`, `lewis-view.js` | Lewis structure builder and its check. |
| `js/builders/vsepr.js`, `vsepr-view.js` | VSEPR viewer. Canvas, own math. |
| `js/builders/gas.js`, `gas-view.js` | Ideal-gas piston. |
| `js/builders/calorimeter.js`, `calorimeter-view.js` | Coffee-cup calorimeter. |
| `js/builders/stoich.js`, `stoich-view.js` | Limiting reactant particles. |
| `js/builders/orbitals.js`, `orbitals-view.js` | Orbital boxes and a configuration check. |
| `css/builders/builders.css` | Layout, 44px targets, reduced motion. |
| `tests/builders.test.js` | Checker tests and markup checks. |

## mount(el, opts)

Every builder view exports `mount(el, opts)` and returns `{ getState, destroy }`.

```js
import { mount } from './js/builders/lewis-view.js';

const handle = mount(document.querySelector('#panel'), {
  reduced: false,       // optional; omit to read prefers-reduced-motion
  challenge: 'H2O',     // optional starting challenge id
});

handle.destroy();
```

`opts.reduced: true` keeps a still frame. Animation runs only when reduced motion is off.

The shell in `js/builders/index.js` also exports `mount(el, opts)`. It paints the tab list, then dynamic-imports the open builder. The other view modules stay unloaded.

```js
import { mount } from './js/builders/index.js';

mount(document.querySelector('#view'), { builder: 'gas' });
```

`opts.builder` is one of `lewis`, `vsepr`, `gas`, `calorimeter`, `stoich`, `orbitals`. `opts.hash` is read when `builder` is omitted (`#Build/gas` opens the piston).

Direct view imports are there for tests and for a host that already knows which tool to show. The shell is the one that lazy-loads.

## Routes

Suggested hashes, not wired yet:

| Hash | Builder |
| --- | --- |
| `#Build` | Shell with the six tabs. Nothing else loads. |
| `#Build/lewis` | Lewis structure builder |
| `#Build/vsepr` | VSEPR viewer |
| `#Build/gas` | Gas-law piston |
| `#Build/calorimeter` | Coffee-cup calorimeter |
| `#Build/stoich` | Limiting reactant |
| `#Build/orbitals` | Orbital filling |

`builderFromHash` in `js/builders/index.js` parses those hashes. A custom element `<mm-build>` is registered when `js/builders/index.js` loads. It reads the hash and calls the shell `mount`.

## Wiring (integration lane)

Do this in the route pull request, not in Lane D.

1. Add a nav link to `#Build` in `index.html`.
2. Optionally add `<link rel="stylesheet" href="css/builders/builders.css" data-mm-builders>` in `index.html`. `mount` injects that link if it is missing.
3. In `js/routes.js`, add `Build` to `ROUTE_IDS` and render `builderShell()` from `js/builders/index.js` for that route.
4. Import `js/builders/index.js` once from `js/app.js` (side effect: registers `<mm-build>`). Do not static-import the six view files. The shell imports a view only when its tab or hash opens.

```js
import { builderShell } from './builders/index.js';

// inside ROUTE_IDS: 'Build'
// route body:
Build: {
  title: 'Builders',
  body: builderShell(),
},
```

`builderFromHash('#Build/vsepr')` returns `'vsepr'`. The element reads `location.hash` on connect and on `hashchange`. Choosing a tab updates the hash to `#Build/<id>` without a page reload.

## Accessibility

- Each tool has a visible summary in an `aria-live="polite"` region. It names the atoms, shape, equation, particles, or boxes on screen.
- Every drag has a labeled control: bond-order buttons and arrow keys for Lewis atoms, arrow keys and Home for the 3D model, sliders and number boxes for the piston and the calorimeter, plus and minus buttons for particle counts, Enter and Backspace for orbital boxes.
- Controls are at least 44px by 44px (`css/builders/builders.css`).
- `prefers-reduced-motion: reduce` stops CSS animation. The scripts also skip `requestAnimationFrame` loops and draw one still frame.
- The VSEPR model is a `<canvas>` drawn with plain trig. There is no 3D library and no network call.
- Layouts wrap. At 375px the fields are full width, so the page does not scroll sideways.

## Challenges

A wrong check gives a hint. The third wrong check shows the worked solution. `missFeedback` in `js/builders/feedback.js` is the shared rule.

| Builder | What Check grades |
| --- | --- |
| Lewis | Atom count, bond orders, lone pairs, octet, formal charge, and total valence electrons against a reference structure. |
| VSEPR | Electron geometry, molecular shape, bond angle, and hybridization (`sp` through `sp3d2`). The viewer still rotates every AXE shape. |
| Gas | A typed P, V, T, or n from `PV = nRT` with `R = 0.08206`. The sliders keep showing both sides of the equation. |
| Calorimeter | A typed final temperature. `q = mcΔT` and `Tf = Σ(mcT) / Σ(mc)`. The on-screen mix is separate from the question. |
| Stoich | Limiting reactant, product counts, and leftover counts for the molecules on the buttons. Run shows the particles and the excess. |
| Orbitals | Box diagram (Aufbau, Hund, Pauli) and a typed configuration, including `[He]`, `[Ne]`, `[Ar]`, and the Cr and Cu exceptions. |

## Per builder

### Lewis — `#Build/lewis`

Place H, B, C, N, O, F, P, S, or Cl. Drag one atom onto another to add a bond, or choose a partner and press Single, Double, or Triple. Arrow keys move the selected atom. Lone pairs use the plus and minus buttons or the “Lone pair” chip. Challenges: H₂, H₂O, NH₃, CH₄, CO₂, BF₃, N₂. Boron may stop at 6 electrons. Period 3 atoms may hold 8, 10, or 12.

### VSEPR — `#Build/vsepr`

Shapes AX₂ through AX₄E₂, plus CO₂, BF₃, CH₄, NH₃, H₂O, PCl₅, SF₆, and XeF₄. The canvas shows the bond angle and the hybridization. Drag or the arrow keys rotate it. Home resets. Spin is off when reduced motion is on. Challenges cover 2, 3, 4, 5, and 6 domains (sp, sp², sp³, sp³d, sp³d²).

### Gas piston — `#Build/gas`

Sliders and number boxes for P (atm), V (L), T (K), and n (mol). The piston height follows V. Drag the handle or use the volume slider. Particles move only when reduced motion is off; otherwise they stay on the still frame. The line `PV = nRT` updates as the numbers change.

### Coffee-cup calorimeter — `#Build/calorimeter`

Two samples. Edit mass, temperature, and specific heat. The thermometer and the q readouts follow `q = mcΔT`. Hide the mix result if you want to practice on the sliders. The challenge uses its own numbers (equal masses of water, or a metal dropped into water).

### Limiting reactant — `#Build/stoich`

Reactions: `2 H₂ + O₂ → 2 H₂O`, `N₂ + 3 H₂ → 2 NH₃`, and `CH₄ + 2 O₂ → CO₂ + 2 H₂O`. Plus and minus set the starting molecules (up to 12). Run plays a short move, then shows product particles and leftover excess. With reduced motion, Run jumps to the still “after” frame. At most 8 circles are drawn; the button count is the real number.

### Orbital filling — `#Build/orbitals`

Elements 1–36. Enter or a tap adds an electron. Backspace removes one. Arrow keys move between boxes. A pair is refused while an empty box remains in that subshell, and a third electron in one box is refused. Check compares the diagram with the ground state. Chromium is `4s1 3d5`. Copper is `4s1 3d10`. The text box accepts full configurations and noble-gas shortcuts.
