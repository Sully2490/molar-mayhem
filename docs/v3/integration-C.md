# Lane C integration notes

Lane C did not edit shared shell files except the one allowed salt assignment in `sw.js`:

```js
const DEPLOY_SALT = '20261015v3c';
```

`tests/nav.test.js` asserts that exact salt. Lane G should point the assertion at the final salt `20261015v3` when it lands.

The header tray already calls `renderTable()` from `js/app.js`, so the new board shows up without a shell edit: 18 columns, detached lanthanide and actinide rows, category / block / phase / heat maps, margin arrows, and the detail panel. A family-chip click on that string-rendered board filters in place. Arrow keys, `highlight()`, and `filter()` from other pages run through `mount()`. Wire `mount()` into the shell, and link the stylesheet, before calling the lane done.

## 1. `index.html`

Add the stylesheet with the other lane sheets:

```html
<link rel="stylesheet" href="css/periodic/periodic.css">
```

## 2. `js/offline/precache.js`

Add these paths to `PRECACHE_PATHS` (the table must work offline):

```js
'css/periodic/periodic.css',
'data/elements.json',
```

`data/ATTRIBUTION.md` is documentation. It does not need to be precached.

Do not change `sw.js` beyond the salt line. Lane G sets the final salt to `20261015v3`.

## 3. `js/app.js` — header tray uses `mount()`

Replace the `renderTable` import and the tray paint / click path so the header table is the shared component.

```js
import { mount } from './periodic.js';
```

Drop `let trendId` / `let selectedZ` and `paintTable`. Keep `trayBody`.

```js
let tableApi = null;

function ensureTable() {
  if (tableApi) return tableApi;
  tableApi = mount(trayBody, {
    size: 'full',
    mode: { kind: 'heatmap', property: 'radius' },
    skin: 'header',
  });
  return tableApi;
}

function openTray() {
  if (!tray.hidden) return;
  lastFocus = document.activeElement;
  backdrop.hidden = false;
  tray.hidden = false;
  document.body.classList.add('tray-open');
  setPageBehindInert(true);
  ensureTable();
  trayBody.querySelector('[data-mm-mode="radius"]')?.focus();
}
```

Remove the `data-trend` and `data-z` branches from the `document.body` click listener. `mount()` handles mode buttons, family chips, selection, and arrow keys. Leave the `[data-open-tray]` branch, and leave Escape / backdrop closing the tray.

`onSelect` is optional here. The detail panel already updates inside the component:

```js
ensureTable().onSelect((element) => {
  // element.z, element.sym, element.name
});
```

## 4. Lewis “Change Element” picker

`js/builders/lewis-view.js` and `js/lab/lewis-view.js` are outside this lane. When a Change Element control is added, mount a compact table into an empty element and read the symbol from `onSelect`. Do not build a second grid.

```js
import { mount } from '../periodic.js';

const picker = mount(host, {
  size: 'compact',
  mode: { kind: 'category' },
  onSelect(element) {
    // element.sym is H, C, O, …
  },
});
```

Call `picker.destroy()` when the picker closes.

## 5. Drill highlights

For a drill that marks the answer on the table, mount once at highlight size and pass atomic numbers:

```js
import { mount } from './periodic.js';

const table = mount(host, {
  size: 'highlight',
  mode: { kind: 'category' },
});
table.highlight([9]); // fluorine, for example
table.filter((element) => element.z <= 18); // optional
```

Highlighted cells get `is-hot`. The others get `is-dim`. A filtered cell stays in the grid and is marked `is-filtered` (hidden, not a fake value).

## 6. Lab tray

`js/lab/tray-view.js` already renders the shared board (`skin: 'lab'`). `js/lab/index.js` still moves the lab selection with `moveSelection` from `js/lab/chem.js`. That path steps along the main table and, once an f-block cell is focused, along that row. It does not step from yttrium into lanthanum. `moveFocus` in `js/periodic.js` does. A later edit to the lab key handler can call `moveFocus` instead of `moveSelection`. This lane did not change `js/lab/index.js`.

## Behavior G should not redo

- One dataset: `data/elements.json`, re-exported as `ELEMENTS` from `js/elements.js` (`sym` is still the symbol).
- Modes: `category`, `block`, `phase`, and heat maps `radius`, `ie` (`ie1`), `en`, `ea`, `mass`.
- Missing heatmap numbers are a grey hatch, not zero.
- Trend arrows sit in the top margin (across a period) and the side margin (down a group). They are not drawn on top of cells.
- Cells are at least 40px. The board scrolls sideways on a narrow screen.
- Cite OpenStax Chemistry: Atoms First 2e §3.5 and §3.6. Element facts are attributed in `data/ATTRIBUTION.md`.
