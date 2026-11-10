import test from "node:test";
import assert from "node:assert/strict";
import { RefreshedMotion } from "../src/animation/refreshed-motion.js";
import { SpringSimulation } from "../src/animation/spring-simulation.js";
import { CubicSplineInterpolator } from "../src/animation/cubic-spline.js";

test("refreshed motion produces bounded word and dot values", () => {
  assert.equal(RefreshedMotion.wordFloat(0, 0, 1000), 0);
  assert.equal(RefreshedMotion.wordFloat(1000, 0, 1000), 0.75);
  assert.equal(RefreshedMotion.wordFloat(2000, 0, 1000), 1);
  assert.equal(RefreshedMotion.emphasis(0), 0);
  assert.equal(RefreshedMotion.emphasis(0.5), 1);
  assert.equal(RefreshedMotion.emphasis(1), 0);
  assert.ok(RefreshedMotion.dotAlpha(1000, 3000, 0) <= 1);
});

test("spring moves toward its goal and preserves velocity on retarget", () => {
  const spring = new SpringSimulation(0, 2, 0.8);
  spring.setGoal(1);
  const first = spring.step(0.016);
  assert.ok(first > 0 && first < 1);
  const velocityBefore = spring.velocity;
  spring.setGoal(2);
  assert.equal(spring.velocity, velocityBefore);
  assert.equal(spring.goal, 2);
});

test("spring reset snaps position and clears velocity", () => {
  const spring = new SpringSimulation(0, 2, 0.8);
  spring.setGoal(1);
  spring.step(0.016);
  spring.resetTo(4);
  assert.equal(spring.current, 4);
  assert.equal(spring.velocity, 0);
});

test("natural cubic spline passes through control points and clamps", () => {
  const spline = new CubicSplineInterpolator([
    { time: 0, value: 0 },
    { time: 1, value: 2 },
    { time: 2, value: 0 }
  ]);
  assert.equal(spline.at(-1), 0);
  assert.equal(spline.at(0), 0);
  assert.equal(spline.at(1), 2);
  assert.equal(spline.at(2), 0);
  assert.equal(spline.at(3), 0);
});
