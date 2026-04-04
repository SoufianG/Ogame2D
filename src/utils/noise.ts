// Simplex-like noise implementation pour la generation procedurale de planetes
// Basee sur un hash permutation classique

const PERM_SIZE = 256;

function buildPermutation(seed: number): Uint8Array {
  const perm = new Uint8Array(PERM_SIZE * 2);
  const base = new Uint8Array(PERM_SIZE);
  for (let i = 0; i < PERM_SIZE; i++) base[i] = i;

  // Fisher-Yates shuffle avec seed
  let s = seed;
  for (let i = PERM_SIZE - 1; i > 0; i--) {
    s = (s * 16807 + 0) % 2147483647; // LCG
    const j = s % (i + 1);
    [base[i], base[j]] = [base[j], base[i]];
  }

  for (let i = 0; i < PERM_SIZE * 2; i++) {
    perm[i] = base[i % PERM_SIZE];
  }
  return perm;
}

function fade(t: number): number {
  return t * t * t * (t * (t * 6 - 15) + 10);
}

function lerp(a: number, b: number, t: number): number {
  return a + t * (b - a);
}

function grad(hash: number, x: number, y: number): number {
  const h = hash & 3;
  const u = h < 2 ? x : -x;
  const v = h === 0 || h === 3 ? y : -y;
  return u + v;
}

export function createNoise2D(seed: number) {
  const perm = buildPermutation(seed);

  return function noise(x: number, y: number): number {
    const xi = Math.floor(x) & 255;
    const yi = Math.floor(y) & 255;
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);

    const u = fade(xf);
    const v = fade(yf);

    const aa = perm[perm[xi] + yi];
    const ab = perm[perm[xi] + yi + 1];
    const ba = perm[perm[xi + 1] + yi];
    const bb = perm[perm[xi + 1] + yi + 1];

    return lerp(
      lerp(grad(aa, xf, yf), grad(ba, xf - 1, yf), u),
      lerp(grad(ab, xf, yf - 1), grad(bb, xf - 1, yf - 1), u),
      v
    );
  };
}

// Bruit multi-octave (fBm) pour plus de detail
export function fbm(
  noiseFn: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number = 4,
  lacunarity: number = 2.0,
  gain: number = 0.5
): number {
  let value = 0;
  let amplitude = 1;
  let frequency = 1;
  let max = 0;

  for (let i = 0; i < octaves; i++) {
    value += noiseFn(x * frequency, y * frequency) * amplitude;
    max += amplitude;
    amplitude *= gain;
    frequency *= lacunarity;
  }

  return value / max; // normalise entre -1 et 1
}
