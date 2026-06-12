// Smooth-step camera math. Pure functions — no DOM, no renderer — so the
// easing/offset is unit-testable in isolation (test/slide.test.js).
//
// The exploration renderer projects walls by distance (K / d). A forward step
// is animated by rendering the *new* scene with the camera pulled back, then
// gliding it home: the camera offset (in cells) sweeps from `from` to 0 over
// SLIDE_MS, eased so it lands rather than stops dead.
//   from = -1  forward step  (camera starts one cell behind, slides up)
//   from = +1  backward step (camera starts one cell ahead, slides back)

export const SLIDE_MS = 140;            // within the 120–160ms target

// ease-out cubic, clamped to [0,1]
export function easeOutCubic(t) {
  const c = t < 0 ? 0 : t > 1 ? 1 : t;
  return 1 - Math.pow(1 - c, 3);
}

// Camera offset (cells, signed) at normalized time t∈[0,1]. Lands exactly on 0
// (clean +0, never -0, so the camera parks precisely on the cell).
export function slideOffset(from, t) {
  const e = easeOutCubic(t);
  return e >= 1 ? 0 : from * (1 - e);
}
