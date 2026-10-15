/**
 * Small teaching molecules. Coordinates are in angstroms, built from typical
 * bond lengths and the VSEPR angles students use. OpenStax Chemistry: Atoms First 2e §4.6.
 */

const DEG = Math.PI / 180;

function atom(el, x, y, z) {
  return { el, x, y, z };
}

function scale(vector, length) {
  const norm = Math.hypot(...vector) || 1;
  return vector.map((value) => (value / norm) * length);
}

function tetra(length) {
  return [
    scale([1, 1, 1], length),
    scale([1, -1, -1], length),
    scale([-1, 1, -1], length),
    scale([-1, -1, 1], length),
  ].map(([x, y, z]) => atom('H', x, y, z));
}

function pyramid(length, angleDeg, el) {
  const alpha = angleDeg * DEG;
  const cosBetaSq = (Math.cos(alpha) + 0.5) / 1.5;
  const beta = Math.acos(Math.sqrt(Math.max(0, cosBetaSq)));
  const ring = length * Math.sin(beta);
  const rise = length * Math.cos(beta);
  return [0, 120, 240].map((turn) => {
    const phi = turn * DEG;
    return atom(el, ring * Math.cos(phi), rise, ring * Math.sin(phi));
  });
}

function planar(length, count, el) {
  return Array.from({ length: count }, (_, index) => {
    const phi = (index * 360 / count) * DEG;
    return atom(el, length * Math.cos(phi), length * Math.sin(phi), 0);
  });
}

function molecule(id, name, atoms, bonds) {
  return { id, name, atoms, bonds };
}

function bondsFromCenter(count) {
  return Array.from({ length: count }, (_, index) => [0, index + 1]);
}

const waterAngle = 104.5 * DEG;
const waterBond = 0.958;
const waterHalf = waterAngle / 2;

export const MOLECULES = [
  molecule('H2', 'hydrogen', [
    atom('H', 0, 0, -0.37),
    atom('H', 0, 0, 0.37),
  ], [[0, 1]]),
  molecule('N2', 'nitrogen', [
    atom('N', 0, 0, -0.549),
    atom('N', 0, 0, 0.549),
  ], [[0, 1]]),
  molecule('H2O', 'water', [
    atom('O', 0, 0, 0),
    atom('H', waterBond * Math.sin(waterHalf), waterBond * Math.cos(waterHalf), 0),
    atom('H', -waterBond * Math.sin(waterHalf), waterBond * Math.cos(waterHalf), 0),
  ], bondsFromCenter(2)),
  molecule('NH3', 'ammonia', [
    atom('N', 0, 0, 0),
    ...pyramid(1.012, 107, 'H'),
  ], bondsFromCenter(3)),
  molecule('CH4', 'methane', [
    atom('C', 0, 0, 0),
    ...tetra(1.09).map((item) => atom('H', item.x, item.y, item.z)),
  ], bondsFromCenter(4)),
  molecule('CO2', 'carbon dioxide', [
    atom('C', 0, 0, 0),
    atom('O', 0, 0, -1.162),
    atom('O', 0, 0, 1.162),
  ], bondsFromCenter(2)),
  molecule('BF3', 'boron trifluoride', [
    atom('B', 0, 0, 0),
    ...planar(1.307, 3, 'F'),
  ], bondsFromCenter(3)),
  molecule('PCl5', 'phosphorus pentachloride', [
    atom('P', 0, 0, 0),
    atom('Cl', 0, 0, 2.14),
    atom('Cl', 0, 0, -2.14),
    ...planar(2.02, 3, 'Cl'),
  ], bondsFromCenter(5)),
  molecule('SF6', 'sulfur hexafluoride', [
    atom('S', 0, 0, 0),
    atom('F', 1.56, 0, 0),
    atom('F', -1.56, 0, 0),
    atom('F', 0, 1.56, 0),
    atom('F', 0, -1.56, 0),
    atom('F', 0, 0, 1.56),
    atom('F', 0, 0, -1.56),
  ], bondsFromCenter(6)),
  molecule('XeF4', 'xenon tetrafluoride', [
    atom('Xe', 0, 0, 0),
    ...planar(1.95, 4, 'F'),
  ], bondsFromCenter(4)),
  molecule('SF4', 'sulfur tetrafluoride', [
    atom('S', 0, 0, 0),
    atom('F', 1.545 * Math.cos(50.5 * DEG), 1.545 * Math.sin(50.5 * DEG), 0),
    atom('F', 1.545 * Math.cos(50.5 * DEG), -1.545 * Math.sin(50.5 * DEG), 0),
    atom('F', -1.646 * Math.sin(3.5 * DEG), 0, 1.646 * Math.cos(3.5 * DEG)),
    atom('F', -1.646 * Math.sin(3.5 * DEG), 0, -1.646 * Math.cos(3.5 * DEG)),
  ], bondsFromCenter(4)),
];

const BY_ID = new Map(MOLECULES.map((entry) => [entry.id, entry]));

export function moleculeById(id) {
  return BY_ID.get(id) ?? null;
}

export function hasMolecule(id) {
  return BY_ID.has(id);
}

export function xyzText(entry) {
  const lines = entry.atoms.map((item) => `${item.el} ${item.x.toFixed(6)} ${item.y.toFixed(6)} ${item.z.toFixed(6)}`);
  return `${entry.atoms.length}\n${entry.name}\n${lines.join('\n')}\n`;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Angle in degrees at `vertex` between the other two atoms. */
export function angleAt(vertex, a, b) {
  const ax = a.x - vertex.x;
  const ay = a.y - vertex.y;
  const az = a.z - vertex.z;
  const bx = b.x - vertex.x;
  const by = b.y - vertex.y;
  const bz = b.z - vertex.z;
  const adot = ax * bx + ay * by + az * bz;
  const denom = Math.hypot(ax, ay, az) * Math.hypot(bx, by, bz);
  return (Math.acos(Math.min(1, Math.max(-1, adot / denom))) * 180) / Math.PI;
}

export function bondLengths(entry) {
  return entry.bonds.map(([left, right]) => distance(entry.atoms[left], entry.atoms[right]));
}
