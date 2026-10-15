# Lane D integration notes

Lane G applies the shared-file edits below. Lane D did not edit `index.html`, `css/styles.css`, `js/app.js`, `js/routes.js`, `js/nav.js`, the precache list, or `package.json`.

The 3D stage upgrades itself inside the existing orbital and VSEPR views. No new route is required.

## DEPLOY_SALT

`sw.js` already uses the lane salt:

```js
const DEPLOY_SALT = '20261015v3d';
```

`tests/nav.test.js` asserts that same literal, because `npm test` checks it. Lane G sets the final salt to `20261015v3` in both files after rebasing:

```js
const DEPLOY_SALT = '20261015v3';
```

```js
test('service worker salt is 20261015v3', () => {
  const sw = read('sw.js');
  assert.match(sw, /const DEPLOY_SALT = '20261015v3';/);
});
```

## Precache

Add these paths to `PRECACHE_PATHS` in `js/offline/precache.js` so the first offline launch can draw a model. The views load them with relative URLs. There is no CDN script.

```js
'css/three-d/three-d.css',
'js/three-d/engine.js',
'js/three-d/fallback.js',
'js/three-d/index.js',
'js/three-d/load.js',
'js/three-d/march-tables.js',
'js/three-d/march.js',
'js/three-d/markup.js',
'js/three-d/molecule-view.js',
'js/three-d/molecules.js',
'js/three-d/orbital-view.js',
'js/three-d/orbitals.js',
'js/three-d/policy.js',
'js/three-d/shape-view.js',
'js/three-d/shapes.js',
'js/three-d/stage.js',
'vendor/3dmol/3Dmol-min.js',
'vendor/3dmol/3Dmol-min.js.LICENSE.txt',
'vendor/3dmol/LICENSE',
'vendor/three/LICENSE',
'vendor/three/three.module.js',
```

## index.html

Optional. `boot3d()` injects the stylesheet when a view module loads. Adding it in the document head avoids a flash:

```html
<link rel="stylesheet" href="css/three-d/three-d.css" data-mm-3d>
```

## package.json

No dependency. three.js r170 (`vendor/three/three.module.js`, MIT) and 3Dmol.js 2.5.5 (`vendor/3dmol/3Dmol-min.js`, BSD-3-Clause) are vendored with their license files.

## Behavior Lane G does not need to rewire

- `#Build/orbitals` shows a rotatable s/p/d surface above the box diagram. The flat SVG stays when the browser cannot start a graphics context.
- `#Build/vsepr` and `#Lab/vsepr` keep the existing drag and arrow keys. When a model is on screen it follows that same yaw and pitch. Real molecules (H₂O, NH₃, CH₄, CO₂, BF₃, PCl₅, SF₆, XeF₄, SF₄) have a Ball and stick button that loads 3Dmol.js only after the click.
- Libraries load only after the stage intersects the viewport. One graphics context is live at a time. `prefers-reduced-motion: reduce` disables spin; arrow keys and drag still turn the picture.
