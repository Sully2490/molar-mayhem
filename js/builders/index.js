import { ensureBuilderCss, on, reducedFrom, restoreFocus } from './dom.js';

/** Lane D builders. Each view module is imported only when that builder opens. */
export const BUILDERS = [
  { id: 'lewis', label: 'Lewis builder', cite: 'OpenStax AF2e §4.4–§4.5' },
  { id: 'vsepr', label: 'VSEPR viewer', cite: 'OpenStax AF2e §4.6, §5.2' },
  { id: 'gas', label: 'Gas piston', cite: 'OpenStax AF2e §8.2' },
  { id: 'calorimeter', label: 'Coffee-cup calorimeter', cite: 'OpenStax AF2e §9.2' },
  { id: 'stoich', label: 'Limiting reactant', cite: 'OpenStax AF2e §7.3–§7.4' },
  { id: 'orbitals', label: 'Orbital filling', cite: 'OpenStax AF2e §3.4' },
];

const LOADERS = {
  lewis: () => import('./lewis-view.js'),
  vsepr: () => import('./vsepr-view.js'),
  gas: () => import('./gas-view.js'),
  calorimeter: () => import('./calorimeter-view.js'),
  stoich: () => import('./stoich-view.js'),
  orbitals: () => import('./orbitals-view.js'),
};

export function loaderFor(id) {
  return LOADERS[id] ?? null;
}

export function builderFromHash(hash) {
  const raw = String(hash ?? '').replace(/^#/, '').trim();
  const [head, sub] = raw.split(/[/?]/);
  if ((head ?? '').toLowerCase() !== 'build') return '';
  const id = (sub ?? '').toLowerCase();
  return BUILDERS.some((item) => item.id === id) ? id : '';
}

export function renderShell(activeId = '') {
  const tabs = BUILDERS.map((item) => {
    const onTab = item.id === activeId;
    return `<button type="button" class="b-tab" role="tab" id="build-tab-${item.id}" data-builder-open="${item.id}" data-focus="tab-${item.id}" aria-selected="${onTab ? 'true' : 'false'}" aria-controls="build-panel" tabindex="${onTab || !activeId ? '0' : '-1'}">${item.label}</button>`;
  }).join('');
  const intro = activeId
    ? ''
    : '<p class="b-summary">Choose a builder. It loads when you open it, and the others stay unloaded.</p>';
  return `
    <div class="b-shell" data-motion="still">
      <h1>Builders</h1>
      <p>Short pictures for bonding, gases, heat, and stoichiometry. Each one has a challenge you can check. Nothing is sent off this device.</p>
      <div class="b-tabs" role="tablist" aria-label="Builders">${tabs}</div>
      ${intro}
      <div id="build-panel" data-panel role="tabpanel" aria-labelledby="${activeId ? `build-tab-${activeId}` : 'build-tab-lewis'}"></div>
    </div>
  `;
}

export function builderShell() {
  return '<mm-build><h1>Builders</h1><p>Turn on JavaScript to use the builders. They run in the browser and do not send data anywhere.</p></mm-build>';
}

/**
 * Shell mount. Pass opts.builder to open one tool. The matching view module
 * is loaded with a dynamic import; the other builders are not loaded.
 */
export function mount(el, opts = {}) {
  ensureBuilderCss();
  const reduced = reducedFrom(opts);
  let active = opts.builder || builderFromHash(opts.hash ?? '');
  if (active && !loaderFor(active)) active = '';
  let child = null;
  let token = 0;
  let alive = true;
  const stops = [];

  async function open(id, focusId) {
    const mine = ++token;
    child?.destroy?.();
    child = null;
    active = loaderFor(id) ? id : '';
    if (!alive) return null;
    el.innerHTML = renderShell(active);
    restoreFocus(el, focusId);
    if (!active) return null;
    const mod = await loaderFor(active)();
    if (!alive || mine !== token) return null;
    const panel = el.querySelector('[data-panel]');
    if (!panel) return null;
    child = mod.mount(panel, { ...opts, reduced });
    if (opts.syncHash && typeof location !== 'undefined' && typeof history !== 'undefined') {
      const url = new URL(location.href);
      url.hash = active ? `Build/${active}` : 'Build';
      if (location.hash !== url.hash) history.replaceState(null, '', url);
    }
    return child;
  }

  stops.push(on(el, 'click', (event) => {
    const button = event.target.closest?.('[data-builder-open]');
    if (!button || !el.contains(button)) return;
    const id = button.getAttribute('data-builder-open');
    if (id && id !== active) open(id, `tab-${id}`);
  }));

  stops.push(on(el, 'keydown', (event) => {
    const tab = event.target.closest?.('[role="tab"]');
    if (!tab || !el.contains(tab)) return;
    const ids = BUILDERS.map((item) => item.id);
    const index = Math.max(0, ids.indexOf(active));
    let next = null;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = ids[(index + 1) % ids.length];
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = ids[(index - 1 + ids.length) % ids.length];
    if (event.key === 'Home') next = ids[0];
    if (event.key === 'End') next = ids[ids.length - 1];
    if (!next || next === active) return;
    event.preventDefault();
    open(next, `tab-${next}`);
  }));

  const ready = open(active, active ? `tab-${active}` : '');
  return {
    open,
    ready,
    getState: () => ({ builder: active }),
    destroy() {
      alive = false;
      token += 1;
      child?.destroy?.();
      for (const stop of stops) stop();
      el.replaceChildren?.();
    },
  };
}

export function installBuilders() {
  if (typeof HTMLElement === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('mm-build')) return;

  class BuildBench extends HTMLElement {
    connectedCallback() {
      const id = builderFromHash(typeof location !== 'undefined' ? location.hash : '');
      this.onHash = () => {
        const next = builderFromHash(location.hash);
        this.api?.open(next, next ? `tab-${next}` : '');
      };
      window.addEventListener('hashchange', this.onHash);
      this.api = mount(this, { builder: id, syncHash: true });
    }

    disconnectedCallback() {
      window.removeEventListener('hashchange', this.onHash);
      this.api?.destroy();
    }
  }

  customElements.define('mm-build', BuildBench);
}

installBuilders();
