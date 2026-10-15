import { orbitalFallback } from './fallback.js';
import { hasMolecule } from './molecules.js';
import { orbitalById } from './orbitals.js';
import {
  STYLE_HREF,
  dragPose,
  graphicsAvailable,
  initialPose,
  loadDecision,
  pinchZoom,
  reducedMotion,
  spinAllowed,
  turnPose,
} from './policy.js';

const live = new Set();

export function ensure3dCss(doc = globalThis.document) {
  if (!doc?.head || typeof doc.createElement !== 'function') return;
  if (doc.querySelector('link[data-mm-3d]')) return;
  const link = doc.createElement('link');
  link.rel = 'stylesheet';
  link.href = STYLE_HREF;
  link.setAttribute('data-mm-3d', '');
  doc.head.appendChild(link);
}

function readNumber(stage, name) {
  if (!stage.hasAttribute(name)) return null;
  const value = Number(stage.getAttribute(name));
  return Number.isFinite(value) ? value : null;
}

function readPose(stage) {
  const pose = stage.pose ? { ...stage.pose } : initialPose();
  const yaw = readNumber(stage, 'data-yaw');
  const pitch = readNumber(stage, 'data-pitch');
  const zoom = readNumber(stage, 'data-zoom');
  if (yaw != null) pose.yaw = yaw;
  if (pitch != null) pose.pitch = pitch;
  if (zoom != null) pose.zoom = zoom;
  return pose;
}

function markerPose(stage) {
  const svg = stage.parentElement?.querySelector?.('[data-rotate]');
  const node = svg?.querySelector?.('[data-mm-view]');
  const raw = node?.getAttribute('data-mm-view') ?? '';
  const [yaw, pitch] = raw.split(/\s+/).map(Number);
  if (!Number.isFinite(yaw) || !Number.isFinite(pitch)) return null;
  return { yaw, pitch, zoom: stage.pose?.zoom ?? 1 };
}

export function boot3d() {
  ensure3dCss();
  if (typeof document !== 'undefined' && !document.documentElement.dataset.mm3dClicks) {
    document.documentElement.dataset.mm3dClicks = '1';
    document.addEventListener('click', onControlClick);
  }
  if (typeof HTMLElement === 'undefined' || typeof customElements === 'undefined') return;
  if (customElements.get('mm-3d-stage')) return;

  class Stage extends HTMLElement {
    static get observedAttributes() {
      return ['data-yaw', 'data-pitch', 'data-zoom', 'data-shape', 'data-orbital', 'data-kind', 'data-spin'];
    }

    connectedCallback() {
      this.token = (this.token ?? 0) + 1;
      this.pose = readPose(this);
      this.pointers = new Map();
      ensure3dCss();
      this.keepFlat();
      this.unwatch = watchVisible(this, (visible) => {
        this.visible = visible;
        if (visible) this.begin();
        else this.releaseModel();
      });
      this.onKey = (event) => this.handleKey(event);
      this.onPointerDown = (event) => this.handlePointerDown(event);
      this.onPointerMove = (event) => this.handlePointerMove(event);
      this.onPointerUp = (event) => this.handlePointerUp(event);
      this.onWheel = (event) => this.handleWheel(event);
      this.addEventListener('keydown', this.onKey);
      this.addEventListener('pointerdown', this.onPointerDown);
      this.addEventListener('pointermove', this.onPointerMove);
      this.addEventListener('pointerup', this.onPointerUp);
      this.addEventListener('pointercancel', this.onPointerUp);
      this.addEventListener('wheel', this.onWheel, { passive: false });
      this.watchMarker();
      this.onHide = () => {
        if (document.hidden) this.stopLoop();
        else this.syncSpin();
      };
      document.addEventListener('visibilitychange', this.onHide);
    }

    disconnectedCallback() {
      this.token += 1;
      this.unwatch?.();
      this.marker?.disconnect();
      this.stopLoop();
      this.releaseModel();
      document.removeEventListener('visibilitychange', this.onHide);
      live.delete(this);
    }

    attributeChangedCallback(name) {
      if (!this.isConnected || !this.view) return;
      if (name === 'data-yaw' || name === 'data-pitch' || name === 'data-zoom') {
        this.pose = readPose(this);
        this.view.applyPose(this.pose);
        return;
      }
      if (name === 'data-spin') {
        this.syncSpin();
        return;
      }
      if (name === 'data-shape' || name === 'data-orbital' || name === 'data-kind') this.begin();
    }

    kind() {
      return this.getAttribute('data-kind') || 'orbital';
    }

    keepFlat() {
      if (this.kind() !== 'orbital') return;
      if (this.querySelector('.mm-flat')) return;
      this.innerHTML = orbitalFallback(this.getAttribute('data-orbital') || '2pz');
    }

    async begin() {
      if (this.visible !== true || !this.isConnected) return;
      const probe = document.createElement('canvas');
      const graphics = graphicsAvailable(probe);
      const gl = probe.getContext('webgl2') || probe.getContext('webgl') || probe.getContext('experimental-webgl');
      gl?.getExtension?.('WEBGL_lose_context')?.loseContext?.();
      if (loadDecision({ visible: true, graphics }) !== 'model') {
        this.setAttribute('data-state', 'flat');
        this.keepFlat();
        return;
      }
      for (const other of live) {
        if (other !== this) other.releaseModel();
      }
      this.view?.dispose?.();
      this.view = null;
      const mine = ++this.token;
      live.add(this);
      try {
        const pose = markerPose(this) ?? readPose(this);
        this.pose = pose;
        this.view = await this.openView(pose);
        if (mine !== this.token || !this.isConnected) {
          this.view?.dispose?.();
          this.view = null;
          live.delete(this);
          return;
        }
        const flat = this.parentElement?.querySelector('[data-rotate]');
        if (flat) flat.style.transform = '';
        this.setAttribute('data-state', 'model');
        this.resizeObserver?.disconnect();
        if (typeof ResizeObserver === 'function') {
          this.resizeObserver = new ResizeObserver(() => this.view?.resize?.());
          this.resizeObserver.observe(this);
        }
        this.view.resize?.();
        this.syncSpin();
      } catch {
        if (mine === this.token) {
          live.delete(this);
          this.setAttribute('data-state', 'flat');
          this.keepFlat();
        }
      }
    }

    openView(pose) {
      const kind = this.kind();
      if (kind === 'molecule') {
        return import('./molecule-view.js').then(({ mountMolecule }) => mountMolecule(this, {
          id: this.getAttribute('data-molecule') || this.getAttribute('data-shape'),
          pose,
        }));
      }
      if (kind === 'orbital') {
        const id = orbitalById(this.getAttribute('data-orbital')).id;
        return import('./orbital-view.js').then(({ mountOrbital }) => mountOrbital(this, { id, pose }));
      }
      return import('./shape-view.js').then(({ mountShape }) => mountShape(this, {
        source: this.getAttribute('data-source') === 'lab' ? 'lab' : 'build',
        id: this.getAttribute('data-shape') || 'H2O',
        pose,
      }));
    }

    releaseModel(dropLive = true) {
      this.token = (this.token ?? 0) + 1;
      this.stopLoop();
      this.resizeObserver?.disconnect();
      this.view?.dispose?.();
      this.view = null;
      if (dropLive) live.delete(this);
      if (this.getAttribute('data-state') === 'model') this.setAttribute('data-state', 'flat');
      this.keepFlat();
    }

    applyLocalPose(next, { spin = false } = {}) {
      this.pose = next;
      this.setAttribute('data-yaw', String(next.yaw));
      this.setAttribute('data-pitch', String(next.pitch));
      this.setAttribute('data-zoom', String(next.zoom));
      if (!spin) {
        this.setAttribute('data-spin', 'off');
        const button = this.parentElement?.querySelector('[data-mm-spin]');
        if (button && !button.disabled) {
          button.textContent = 'Spin';
          button.setAttribute('aria-pressed', 'false');
        }
      }
      this.view?.applyPose(next);
    }

    handleKey(event) {
      if (this.kind() !== 'orbital') return;
      const tag = event.target?.tagName;
      if (tag === 'INPUT' || tag === 'SELECT' || tag === 'TEXTAREA') return;
      const next = turnPose(this.pose ?? initialPose(), event.key);
      if (!next) return;
      event.preventDefault();
      this.applyLocalPose(next);
    }

    handlePointerDown(event) {
      if (this.kind() !== 'orbital') return;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.setPointerCapture?.(event.pointerId);
    }

    handlePointerMove(event) {
      if (this.kind() !== 'orbital') return;
      const previous = this.pointers.get(event.pointerId);
      if (!previous) return;
      if (this.pointers.size >= 2) {
        const [a, b] = [...this.pointers.values()];
        const before = Math.hypot(a.x - b.x, a.y - b.y);
        this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const [c, d] = [...this.pointers.values()];
        const after = Math.hypot(c.x - d.x, c.y - d.y);
        const zoom = pinchZoom(this.pose?.zoom ?? 1, before, after);
        this.applyLocalPose({ ...(this.pose ?? initialPose()), zoom });
        return;
      }
      const dx = event.clientX - previous.x;
      const dy = event.clientY - previous.y;
      this.pointers.set(event.pointerId, { x: event.clientX, y: event.clientY });
      this.applyLocalPose(dragPose(this.pose ?? initialPose(), dx, dy));
    }

    handlePointerUp(event) {
      this.pointers.delete(event.pointerId);
    }

    handleWheel(event) {
      if (this.kind() !== 'orbital') return;
      event.preventDefault();
      const factor = event.deltaY > 0 ? 1 / 1.08 : 1.08;
      const zoom = pinchZoom(this.pose?.zoom ?? 1, 1, factor);
      this.applyLocalPose({ ...(this.pose ?? initialPose()), zoom });
    }

    zoomBy(factor) {
      if (this.view?.zoomBy) {
        const reported = this.view.zoomBy(factor);
        if (Number.isFinite(reported)) this.pose = { ...(this.pose ?? initialPose()), zoom: reported };
        return;
      }
      const zoom = pinchZoom(this.pose?.zoom ?? 1, 1, factor);
      this.pose = { ...(this.pose ?? initialPose()), zoom };
      const pic = this.kind() === 'orbital'
        ? this.querySelector('.mm-flat')
        : this.parentElement?.querySelector('[data-rotate]');
      if (pic) {
        pic.style.transformOrigin = 'center center';
        pic.style.transform = `scale(${zoom})`;
      }
    }

    resetView() {
      this.applyLocalPose(initialPose());
    }

    watchMarker() {
      const svg = this.parentElement?.querySelector?.('[data-rotate]');
      if (!svg || typeof MutationObserver !== 'function') return;
      this.marker = new MutationObserver(() => {
        const pose = markerPose(this);
        if (!pose || !this.view) return;
        pose.zoom = this.pose?.zoom ?? 1;
        this.pose = pose;
        this.view.applyPose(pose);
      });
      this.marker.observe(svg, { childList: true, subtree: true, attributes: true });
    }

    syncSpin() {
      const playing = this.getAttribute('data-spin') === 'on';
      const reduced = reducedMotion(typeof matchMedia === 'function' ? matchMedia.bind(globalThis) : null);
      if (!spinAllowed({ reduced, playing }) || !this.view) {
        this.stopLoop();
        return;
      }
      if (this.raf) return;
      const loop = () => {
        if (!this.view || !spinAllowed({
          reduced: reducedMotion(typeof matchMedia === 'function' ? matchMedia.bind(globalThis) : null),
          playing: this.getAttribute('data-spin') === 'on',
        })) {
          this.raf = 0;
          return;
        }
        this.pose = { ...(this.pose ?? initialPose()), yaw: (this.pose?.yaw ?? 0) + 0.012 };
        this.view.applyPose(this.pose);
        this.raf = requestAnimationFrame(loop);
      };
      this.raf = requestAnimationFrame(loop);
    }

    stopLoop() {
      if (this.raf && typeof cancelAnimationFrame === 'function') cancelAnimationFrame(this.raf);
      this.raf = 0;
    }
  }

  customElements.define('mm-3d-stage', Stage);
}

function watchVisible(el, onChange) {
  if (typeof IntersectionObserver !== 'function') {
    onChange(true);
    return () => {};
  }
  const observer = new IntersectionObserver((entries) => {
    onChange(entries.some((entry) => entry.isIntersecting));
  }, { rootMargin: '80px' });
  observer.observe(el);
  return () => observer.disconnect();
}

function stageFrom(node) {
  const root = node.closest?.('.mm-3d-stack, .b-tool, .lab-tool');
  return root?.querySelector('mm-3d-stage') ?? null;
}

function onControlClick(event) {
  const button = event.target?.closest?.('[data-mm-zoom], [data-mm-reset], [data-mm-spin], [data-mm-style]');
  if (!button || button.disabled) return;
  const stage = stageFrom(button);
  if (!stage) return;
  if (button.hasAttribute('data-mm-zoom')) {
    stage.zoomBy?.(button.getAttribute('data-mm-zoom') === 'out' ? 1 / 1.15 : 1.15);
  }
  if (button.hasAttribute('data-mm-reset')) stage.resetView?.();
  if (button.hasAttribute('data-mm-spin')) {
    const on = stage.getAttribute('data-spin') !== 'on';
    stage.setAttribute('data-spin', on ? 'on' : 'off');
    button.textContent = on ? 'Hold still' : 'Spin';
    button.setAttribute('aria-pressed', on ? 'true' : 'false');
  }
  if (button.hasAttribute('data-mm-style')) {
    const shape = stage.getAttribute('data-shape');
    if (!hasMolecule(shape)) return;
    const molecule = stage.getAttribute('data-kind') !== 'molecule';
    stage.setAttribute('data-kind', molecule ? 'molecule' : 'vsepr');
    stage.setAttribute('data-molecule', shape);
    button.textContent = molecule ? 'Domains' : 'Ball and stick';
    button.setAttribute('aria-pressed', molecule ? 'true' : 'false');
  }
}

export { live as activeStages };
