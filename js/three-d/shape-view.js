import { addBond, addSphere, atomColor, mountEngine } from './engine.js';
import { shapeScene } from './shapes.js';

export function mountShape(host, { source, id, pose }) {
  return mountEngine(host, {
    pose,
    async build({ THREE, group }) {
      const scene = await shapeScene(source, id);
      const resources = [];
      const reach = 1.35;
      addSphere(THREE, group, resources, [0, 0, 0], 0.34, atomColor(scene.center));
      for (const vector of scene.atoms) {
        const at = vector.map((value) => value * reach);
        addBond(THREE, group, resources, [0, 0, 0], at, 0x94a3b8);
        addSphere(THREE, group, resources, at, 0.26, atomColor(scene.outer));
      }
      for (const vector of scene.lonePairs) {
        const at = vector.map((value) => value * 0.72);
        const mesh = addSphere(THREE, group, resources, at, 0.28, 0xc4b5fd, 0.82);
        const direction = new THREE.Vector3(...vector);
        if (direction.lengthSq() > 1e-6) {
          mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction.normalize());
          mesh.scale.set(0.85, 1.25, 0.85);
        }
      }
      return { resources };
    },
  });
}
