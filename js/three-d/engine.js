import { THREE_SPECIFIER } from './policy.js';

let pending = null;

export function loadEngine() {
  if (!pending) {
    pending = import(THREE_SPECIFIER).catch((error) => {
      pending = null;
      throw error;
    });
  }
  return pending;
}

const COLORS = {
  H: 0xf8fafc,
  C: 0x334155,
  N: 0x2563eb,
  O: 0xe11d48,
  F: 0x16a34a,
  B: 0xfecdd3,
  S: 0xeab308,
  P: 0xf97316,
  Cl: 0x65a30d,
  Xe: 0x0f766e,
  A: 0x0f5c56,
  X: 0xe7e5e4,
};

export function atomColor(symbol) {
  return COLORS[symbol] ?? 0xe7e5e4;
}

export async function mountEngine(host, { build, pose }) {
  const THREE = await loadEngine();
  const renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: false,
    preserveDrawingBuffer: false,
    powerPreference: 'low-power',
  });
  renderer.setClearColor(0xfffaf2, 1);
  renderer.setPixelRatio(Math.min(2, globalThis.devicePixelRatio || 1));
  const canvas = renderer.domElement;
  canvas.style.width = '100%';
  canvas.style.height = '100%';
  canvas.style.display = 'block';
  canvas.setAttribute('aria-hidden', 'true');
  host.replaceChildren(canvas);

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, 1, 0.05, 400);
  const ambient = new THREE.AmbientLight(0xffffff, 0.72);
  const sun = new THREE.DirectionalLight(0xffffff, 1.05);
  sun.position.set(3, 5, 6);
  scene.add(ambient, sun);
  const group = new THREE.Group();
  scene.add(group);
  const made = await build({ THREE, group, scene });
  const resources = made?.resources ?? [];

  const box = new THREE.Box3().setFromObject(group);
  const size = box.getSize(new THREE.Vector3());
  const radius = Math.max(0.4, 0.5 * Math.max(size.x, size.y, size.z));
  const fit = (radius / Math.sin((20 * Math.PI) / 180)) * 1.2;
  let zoom = pose?.zoom ?? 1;

  function place() {
    const width = Math.max(1, host.clientWidth || 320);
    const height = Math.max(1, host.clientHeight || 260);
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.position.set(0, 0, fit / zoom);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }

  function applyPose(next) {
    zoom = next.zoom ?? zoom;
    group.rotation.order = 'YXZ';
    group.rotation.y = next.yaw;
    group.rotation.x = next.pitch;
    place();
    renderer.render(scene, camera);
  }

  function resize() {
    place();
    renderer.render(scene, camera);
  }

  applyPose({ yaw: pose?.yaw ?? 0.6, pitch: pose?.pitch ?? 0.35, zoom });

  return {
    applyPose,
    zoomBy(factor) {
      zoom = Math.min(2.6, Math.max(0.55, zoom * factor));
      place();
      renderer.render(scene, camera);
      return zoom;
    },
    resize,
    render() {
      renderer.render(scene, camera);
    },
    dispose() {
      for (const item of resources) {
        item.geometry?.dispose?.();
        item.material?.dispose?.();
      }
      renderer.dispose();
      renderer.forceContextLoss?.();
      host.replaceChildren();
    },
  };
}

export function addSphere(THREE, group, resources, position, radius, color, opacity = 1) {
  const geometry = new THREE.SphereGeometry(radius, 22, 16);
  const material = new THREE.MeshLambertMaterial({
    color,
    transparent: opacity < 1,
    opacity,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(position[0], position[1], position[2]);
  group.add(mesh);
  resources.push({ geometry, material });
  return mesh;
}

export function addBond(THREE, group, resources, a, b, color) {
  const start = new THREE.Vector3(a[0], a[1], a[2]);
  const end = new THREE.Vector3(b[0], b[1], b[2]);
  const direction = new THREE.Vector3().subVectors(end, start);
  const length = direction.length();
  if (length < 1e-4) return;
  const geometry = new THREE.CylinderGeometry(0.07, 0.07, length, 10);
  const material = new THREE.MeshLambertMaterial({ color });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(start).add(end).multiplyScalar(0.5);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
  group.add(mesh);
  resources.push({ geometry, material });
}
