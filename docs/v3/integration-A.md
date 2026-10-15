# Lane A integration notes for Lane G

Lane A stayed out of `index.html`, `css/styles.css`, `js/app.js`, `js/routes.js`, `js/nav.js`, and `package.json`. `DEPLOY_SALT` in `sw.js` is already `20261015v3a`. Lane G sets the final salt `20261015v3`.

## Hash router

`js/route-sync.js` notifies once per hash. `start()` records the current hash and does not paint. A same-hash click paints once; the hashchange that can follow is ignored. `history.replaceState` is not wrapped, so lesson-tab updates keep the current view.

In `js/app.js`, replace the hash listener and the first paint:

```javascript
import { createRouteSync } from './route-sync.js';

const routeSync = createRouteSync({
  getHash: () => location.hash,
  onRoute(event) {
    paintRoute(event);
  },
});
routeSync.start();
routeSync.publish(location.hash, 'start', true);
```

Remove:

```javascript
window.addEventListener('hashchange', paintRoute);
paintRoute();
```

`paintRoute` should accept the event and return when `event?.stale?.()` is true after every `await`, in the same places that already compare `paintGeneration`. Do not call `paintRoute` from both the old listener and `routeSync`.

## Precache paths already added

`tests/offline.test.js` requires every `content/**/*.json` file to be listed in `js/offline/precache.js`. These paths are already in that list. Do not add them again:

- `content/ch01/index.json`
- `content/ch02/index.json`
- `content/ch03/index.json`
- `content/ch04/index.json`
- `content/ch05/index.json`
- `content/ch06/index.json`
- `content/ch07/index.json`
- `content/ch08/index.json`
- `content/ch09/index.json`
- `content/terms/index.json`

Chapter indexes are arrays of lesson filenames. `content/terms/index.json` is `{ terms: [...] }` with `id`, `term`, `definition`, `ch`, and `href`, so search indexes the glossary without fetching one file per term.

## Math and Your turn

`js/app.js` already imports `js/steps/index.js`. That module starts `startPageUpgrades` in the browser. It hides each lesson "Your turn" hint and answer, and it renders `Z^2`, `2.179e-18`, and formula subscripts in `#view`. Leave the Hint and Answer markup in `js/learn.js`; `tests/learn.test.js` still expects that HTML string. The upgrade hides it after paint.

No `index.html` change is required. `css/steps/steps.css` and `css/chemkb/chemkb.css` are already linked. Exam styles are injected by `ensureExamCss`.
