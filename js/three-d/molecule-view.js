import { loadScript } from './load.js';
import { moleculeById, xyzText } from './molecules.js';
import { MOL_SCRIPT } from './policy.js';

export async function mountMolecule(host, { id, pose }) {
  const api = await loadScript(MOL_SCRIPT);
  if (typeof api?.createViewer !== 'function') throw new Error('Molecule viewer did not start');
  const entry = moleculeById(id);
  if (!entry) throw new Error('No coordinates for this molecule');
  host.replaceChildren();
  const viewer = api.createViewer(host, {
    backgroundColor: '#fffaf2',
    antialias: true,
  });
  viewer.addModel(xyzText(entry), 'xyz');
  viewer.setStyle({}, { stick: { radius: 0.14 }, sphere: { scale: 0.26 } });
  viewer.zoomTo();
  viewer.render();
  let yaw = 0;
  let pitch = 0;
  function applyPose(next) {
    const dy = ((next.yaw ?? 0) - yaw) * (180 / Math.PI);
    const dp = ((next.pitch ?? 0) - pitch) * (180 / Math.PI);
    yaw = next.yaw ?? yaw;
    pitch = next.pitch ?? pitch;
    if (Math.abs(dy) > 0.02) viewer.rotate(dy, 'y', 0);
    if (Math.abs(dp) > 0.02) viewer.rotate(dp, 'x', 0);
    else viewer.render();
  }
  applyPose(pose ?? { yaw: 0.6, pitch: 0.35 });
  return {
    applyPose,
    zoomBy(factor) {
      viewer.zoom(factor, 0);
      return null;
    },
    resize() {
      viewer.resize();
      viewer.render();
    },
    render() {
      viewer.render();
    },
    dispose() {
      viewer.spin(false);
      viewer.clear();
      host.replaceChildren();
    },
  };
}
