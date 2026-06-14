// Smooth-step camera math (src/ui/slide.js). New file — does not touch the
// sacrosanct original logic tests.

import test from 'node:test';
import assert from 'node:assert/strict';
import { easeOutCubic, slideOffset, SLIDE_MS } from '../src/ui/slide.js';

test('easeOutCubic spans 0..1 at the endpoints', () => {
  assert.equal(easeOutCubic(0), 0);
  assert.equal(easeOutCubic(1), 1);
});

test('easeOutCubic clamps out-of-range t', () => {
  assert.equal(easeOutCubic(-0.5), 0);
  assert.equal(easeOutCubic(2), 1);
});

test('easeOutCubic is monotonically increasing and front-loaded', () => {
  let prev = -1;
  for (let i = 0; i <= 10; i++) {
    const v = easeOutCubic(i / 10);
    assert.ok(v >= prev, `non-decreasing at t=${i / 10}`);
    prev = v;
  }
  // ease-OUT: past the halfway point in progress by the time t=0.5
  assert.ok(easeOutCubic(0.5) > 0.5);
});

test('slideOffset lands exactly on 0 and starts at `from`', () => {
  assert.equal(slideOffset(-1, 0), -1);   // forward: one cell behind
  assert.equal(slideOffset(-1, 1), 0);    // arrived
  assert.equal(slideOffset(1, 0), 1);     // backward: one cell ahead
  assert.equal(slideOffset(1, 1), 0);
});

test('slideOffset eases out — most of the travel is done by the midpoint', () => {
  // |offset| at t=0.5 is well under half of the starting magnitude
  assert.ok(Math.abs(slideOffset(-1, 0.5)) < 0.5);
  assert.ok(Math.abs(slideOffset(1, 0.5)) < 0.5);
});

test('slideOffset moves monotonically toward 0', () => {
  let prev = Infinity;
  for (let i = 0; i <= 10; i++) {
    const mag = Math.abs(slideOffset(-1, i / 10));
    assert.ok(mag <= prev + 1e-9, `magnitude non-increasing at t=${i / 10}`);
    prev = mag;
  }
});

test('SLIDE_MS is within the 120–160ms target', () => {
  assert.ok(SLIDE_MS >= 120 && SLIDE_MS <= 160, `SLIDE_MS=${SLIDE_MS}`);
});
