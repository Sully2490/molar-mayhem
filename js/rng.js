/**
 * Mulberry32. Same seed, same sequence of numbers in [0, 1).
 * @param {number} seed
 * @returns {() => number}
 */
export function mulberry32(seed) {
  let a = Number(seed) >>> 0;
  return function random() {
    a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
