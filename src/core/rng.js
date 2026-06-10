// Seeded RNG + dice. All game randomness flows through an Rng instance so
// tests can be deterministic.

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export class Rng {
  constructor(seed = (Date.now() & 0xffffffff)) {
    this.seed = seed >>> 0;
    this.f = mulberry32(this.seed);
  }
  next() { return this.f(); }
  int(n) { return Math.floor(this.f() * n); }            // 0..n-1
  range(a, b) { return a + this.int(b - a + 1); }         // a..b inclusive
  pick(arr) { return arr[this.int(arr.length)]; }
  chance(pct) { return this.f() * 100 < pct; }
  d(sides) { return 1 + this.int(sides); }
}

// Parse and roll dice strings like "2d6", "1d8+2", "3d4-1", "0", "12".
export function rollDice(rng, spec) {
  if (typeof spec === 'number') return spec;
  const s = String(spec).trim();
  const m = s.match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) {
    const n = parseInt(s, 10);
    if (Number.isFinite(n)) return n;
    throw new Error('bad dice spec: ' + spec);
  }
  const [, nStr, sidesStr, modStr] = m;
  let total = modStr ? parseInt(modStr, 10) : 0;
  const n = parseInt(nStr, 10), sides = parseInt(sidesStr, 10);
  for (let i = 0; i < n; i++) total += rng.d(sides);
  return total;
}

export function diceMax(spec) {
  if (typeof spec === 'number') return spec;
  const m = String(spec).trim().match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return parseInt(spec, 10) || 0;
  return parseInt(m[1], 10) * parseInt(m[2], 10) + (m[3] ? parseInt(m[3], 10) : 0);
}

export function diceAvg(spec) {
  if (typeof spec === 'number') return spec;
  const m = String(spec).trim().match(/^(\d+)d(\d+)([+-]\d+)?$/);
  if (!m) return parseInt(spec, 10) || 0;
  return parseInt(m[1], 10) * (parseInt(m[2], 10) + 1) / 2 + (m[3] ? parseInt(m[3], 10) : 0);
}
