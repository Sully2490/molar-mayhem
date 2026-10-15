import { edgeTable, triTable } from './march-tables.js';

const CORNERS = [
  [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
  [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1],
];

const EDGES = [
  [0, 1], [1, 2], [2, 3], [3, 0],
  [4, 5], [5, 6], [6, 7], [7, 4],
  [0, 4], [1, 5], [2, 6], [3, 7],
];

/**
 * Polygonise a scalar grid at one level.
 * `values` is x-fastest. A corner is inside the surface when its value is below `level`.
 */
export function march(values, dims, level, origin, spacing) {
  const [nx, ny, nz] = dims;
  const out = [];
  const at = (i, j, k) => values[i + nx * (j + ny * k)];
  for (let k = 0; k < nz - 1; k += 1) {
    for (let j = 0; j < ny - 1; j += 1) {
      for (let i = 0; i < nx - 1; i += 1) {
        let cube = 0;
        const value = new Array(8);
        const point = new Array(8);
        for (let corner = 0; corner < 8; corner += 1) {
          const di = CORNERS[corner][0];
          const dj = CORNERS[corner][1];
          const dk = CORNERS[corner][2];
          const sample = at(i + di, j + dj, k + dk);
          value[corner] = sample;
          point[corner] = [
            origin[0] + (i + di) * spacing[0],
            origin[1] + (j + dj) * spacing[1],
            origin[2] + (k + dk) * spacing[2],
          ];
          if (sample < level) cube |= 1 << corner;
        }
        const bits = edgeTable[cube];
        if (!bits) continue;
        const vertex = new Array(12);
        for (let edge = 0; edge < 12; edge += 1) {
          if ((bits & (1 << edge)) === 0) continue;
          const a = EDGES[edge][0];
          const b = EDGES[edge][1];
          const span = value[b] - value[a];
          let t = span === 0 ? 0.5 : (level - value[a]) / span;
          if (t < 0) t = 0;
          else if (t > 1) t = 1;
          vertex[edge] = [
            point[a][0] + (point[b][0] - point[a][0]) * t,
            point[a][1] + (point[b][1] - point[a][1]) * t,
            point[a][2] + (point[b][2] - point[a][2]) * t,
          ];
        }
        const row = cube << 4;
        for (let tri = 0; triTable[row + tri] !== -1; tri += 3) {
          const a = vertex[triTable[row + tri]];
          const b = vertex[triTable[row + tri + 1]];
          const c = vertex[triTable[row + tri + 2]];
          out.push(a[0], a[1], a[2], b[0], b[1], b[2], c[0], c[1], c[2]);
        }
      }
    }
  }
  return { positions: Float32Array.from(out) };
}

export function centroid(positions) {
  const count = positions.length / 3;
  if (!count) return null;
  let x = 0;
  let y = 0;
  let z = 0;
  for (let i = 0; i < positions.length; i += 3) {
    x += positions[i];
    y += positions[i + 1];
    z += positions[i + 2];
  }
  return [x / count, y / count, z / count];
}

export function extents(positions) {
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];
  for (let i = 0; i < positions.length; i += 3) {
    for (let axis = 0; axis < 3; axis += 1) {
      const value = positions[i + axis];
      if (value < min[axis]) min[axis] = value;
      if (value > max[axis]) max[axis] = value;
    }
  }
  return { min, max };
}
