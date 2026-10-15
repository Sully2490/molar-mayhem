import { centroid, extents, march } from './march.js';

/**
 * Real hydrogen orbitals in atomic units.
 * The pictures are isosurfaces of the wavefunction, so opposite phases can both show.
 * OpenStax Chemistry: Atoms First 2e §3.3.
 */
export const ORBITALS = [
  { id: '1s', label: '1s sphere', family: 's', range: 5, level: 0.22 },
  { id: '2s', label: '2s with a node', family: 's', range: 12, level: 0.08 },
  { id: '2px', label: '2px dumbbell', family: 'p', range: 12, level: 0.22 },
  { id: '2py', label: '2py dumbbell', family: 'p', range: 12, level: 0.22 },
  { id: '2pz', label: '2pz dumbbell', family: 'p', range: 12, level: 0.22 },
  { id: '3s', label: '3s with nodes', family: 's', range: 18, level: 0.08 },
  { id: '3px', label: '3px dumbbell', family: 'p', range: 18, level: 0.18 },
  { id: '3py', label: '3py dumbbell', family: 'p', range: 18, level: 0.18 },
  { id: '3pz', label: '3pz dumbbell', family: 'p', range: 18, level: 0.18 },
  { id: '3dz2', label: '3dz2 dumbbell and ring', family: 'd', range: 20, level: 0.2 },
  { id: '3dx2y2', label: '3dx2-y2 clover', family: 'd', range: 20, level: 0.2 },
  { id: '3dxy', label: '3dxy clover', family: 'd', range: 20, level: 0.2 },
  { id: '3dxz', label: '3dxz clover', family: 'd', range: 20, level: 0.2 },
  { id: '3dyz', label: '3dyz clover', family: 'd', range: 20, level: 0.2 },
];

const BY_ID = new Map(ORBITALS.map((entry) => [entry.id, entry]));
const meshCache = new Map();

export function orbitalById(id) {
  return BY_ID.get(id) ?? BY_ID.get('2pz');
}

/** Wavefunction value. Cartesian forms stay finite at the origin. */
export function sampleOrbital(id, x, y, z) {
  const r = Math.hypot(x, y, z);
  const entry = orbitalById(id).id;
  if (entry === '1s') return Math.exp(-r);
  if (entry === '2s') return (2 - r) * Math.exp(-r / 2);
  if (entry === '2px') return x * Math.exp(-r / 2);
  if (entry === '2py') return y * Math.exp(-r / 2);
  if (entry === '2pz') return z * Math.exp(-r / 2);
  if (entry === '3s') return (27 - 18 * r + 2 * r * r) * Math.exp(-r / 3);
  if (entry === '3px') return x * (6 - r) * Math.exp(-r / 3);
  if (entry === '3py') return y * (6 - r) * Math.exp(-r / 3);
  if (entry === '3pz') return z * (6 - r) * Math.exp(-r / 3);
  const decay = Math.exp(-r / 3);
  if (entry === '3dz2') return (3 * z * z - r * r) * decay;
  if (entry === '3dx2y2') return (x * x - y * y) * decay;
  if (entry === '3dxy') return x * y * decay;
  if (entry === '3dxz') return x * z * decay;
  if (entry === '3dyz') return y * z * decay;
  return 0;
}

export function isosurface(id, { resolution = 16 } = {}) {
  const spec = orbitalById(id);
  const n = resolution;
  const range = spec.range;
  const step = (2 * range) / (n - 1);
  const origin = -range;
  const values = new Float32Array(n * n * n);
  let max = 0;
  for (let k = 0; k < n; k += 1) {
    const z = origin + k * step;
    for (let j = 0; j < n; j += 1) {
      const y = origin + j * step;
      for (let i = 0; i < n; i += 1) {
        const x = origin + i * step;
        const value = sampleOrbital(spec.id, x, y, z);
        values[i + n * (j + n * k)] = value;
        const abs = Math.abs(value);
        if (abs > max) max = abs;
      }
    }
  }
  const level = max * spec.level;
  const dims = [n, n, n];
  const start = [origin, origin, origin];
  const spacing = [step, step, step];
  return {
    id: spec.id,
    positive: march(values, dims, level, start, spacing),
    negative: march(values, dims, -level, start, spacing),
    level,
    max,
  };
}

export function orbitalMesh(id, resolution = 16) {
  const spec = orbitalById(id);
  const key = `${spec.id}:${resolution}`;
  if (!meshCache.has(key)) meshCache.set(key, isosurface(spec.id, { resolution }));
  return meshCache.get(key);
}

export function lobeSummary(mesh) {
  return {
    positive: centroid(mesh.positive.positions),
    negative: centroid(mesh.negative.positions),
    positiveExtent: extents(mesh.positive.positions),
    negativeExtent: extents(mesh.negative.positions),
    positiveCount: mesh.positive.positions.length / 3,
    negativeCount: mesh.negative.positions.length / 3,
  };
}
