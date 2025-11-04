// Seeded RNG (mulberry32)

export function createRng(seed) {
  let s = (seed >>> 0) || 0x12345678;
  return function rand() {
    s |= 0; s = s + 0x6D2B79F5 | 0;
    let t = Math.imul(s ^ s >>> 15, 1 | s);
    t ^= t + Math.imul(t ^ t >>> 7, 61 | t);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function randRange(rand, min, max) {
  return min + (max - min) * rand();
}


