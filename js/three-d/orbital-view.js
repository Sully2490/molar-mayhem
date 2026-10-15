import { addSphere, mountEngine } from './engine.js';
import { orbitalMesh } from './orbitals.js';

const BLUE = 0x2563eb;
const RED = 0xe11d48;

export function mountOrbital(host, { id, pose, resolution = 16 }) {
  return mountEngine(host, {
    pose,
    async build({ THREE, group }) {
      const mesh = orbitalMesh(id, resolution);
      const resources = [];
      addLobe(THREE, group, resources, mesh.positive.positions, BLUE);
      addLobe(THREE, group, resources, mesh.negative.positions, RED);
      if (!resources.length) {
        addSphere(THREE, group, resources, [0, 0, 0], 0.4, BLUE, 0.85);
      }
      return { resources };
    },
  });
}

function addLobe(THREE, group, resources, positions, color) {
  if (!positions?.length) return;
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  geometry.computeVertexNormals();
  const material = new THREE.MeshLambertMaterial({
    color,
    side: THREE.DoubleSide,
    transparent: true,
    opacity: 0.9,
  });
  group.add(new THREE.Mesh(geometry, material));
  resources.push({ geometry, material });
}
