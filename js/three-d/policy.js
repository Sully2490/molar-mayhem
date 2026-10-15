/** Relative vendor paths. Nothing here may be a remote URL. */

export const THREE_SPECIFIER = '../../vendor/three/three.module.js';
export const MOL_SCRIPT = 'vendor/3dmol/3Dmol-min.js';
export const STYLE_HREF = 'css/three-d/three-d.css';

const POSE_STEP = 0.28;

export function isRemoteUrl(value) {
  const text = String(value ?? '').trim();
  return text.startsWith('//') || /^[a-z][a-z0-9+.-]*:/i.test(text);
}

/** Resolve a site-relative path against the page, and refuse a remote library. */
export function pageUrl(path, base) {
  if (isRemoteUrl(path)) throw new Error('Remote libraries are not allowed');
  return new URL(path, base).href;
}

/**
 * Wait until the picture is on screen, then either draw the model or keep
 * the flat picture when the browser has no graphics context.
 */
export function loadDecision({ visible, graphics }) {
  if (!visible) return 'wait';
  if (!graphics) return 'flat';
  return 'model';
}

/** A missing media query counts as reduced motion, matching the other tools. */
export function reducedMotion(matchMedia) {
  if (typeof matchMedia !== 'function') return true;
  try {
    return Boolean(matchMedia('(prefers-reduced-motion: reduce)')?.matches);
  } catch {
    return true;
  }
}

export function spinAllowed({ reduced, playing }) {
  return reduced !== true && playing === true;
}

export function clampZoom(zoom) {
  if (!Number.isFinite(zoom)) return 1;
  return Math.min(2.6, Math.max(0.55, zoom));
}

export function initialPose() {
  return { yaw: 0.6, pitch: 0.35, zoom: 1 };
}

/** Arrow keys turn the model. Home resets. Plus and minus zoom. */
export function turnPose(pose, key) {
  const current = { ...initialPose(), ...pose };
  if (key === 'ArrowLeft') return { ...current, yaw: current.yaw - POSE_STEP };
  if (key === 'ArrowRight') return { ...current, yaw: current.yaw + POSE_STEP };
  if (key === 'ArrowUp') return { ...current, pitch: current.pitch - POSE_STEP };
  if (key === 'ArrowDown') return { ...current, pitch: current.pitch + POSE_STEP };
  if (key === 'Home') return initialPose();
  if (key === '=' || key === '+' || key === 'Add') return { ...current, zoom: clampZoom(current.zoom * 1.15) };
  if (key === '-' || key === '_' || key === 'Subtract') return { ...current, zoom: clampZoom(current.zoom / 1.15) };
  return null;
}

export function dragPose(pose, dx, dy) {
  const current = { ...initialPose(), ...pose };
  return {
    ...current,
    yaw: current.yaw + dx * 0.01,
    pitch: current.pitch + dy * 0.01,
  };
}

export function pinchZoom(zoom, previousDistance, nextDistance) {
  if (!previousDistance || !nextDistance) return clampZoom(zoom);
  return clampZoom(zoom * (nextDistance / previousDistance));
}

export function graphicsAvailable(canvas) {
  if (!canvas || typeof canvas.getContext !== 'function') return false;
  try {
    const gl = canvas.getContext('webgl2')
      || canvas.getContext('webgl')
      || canvas.getContext('experimental-webgl');
    return Boolean(gl);
  } catch {
    return false;
  }
}
