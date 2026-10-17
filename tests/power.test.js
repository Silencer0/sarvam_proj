import test from "node:test";
import assert from "node:assert/strict";
import { getSpellPower } from "../src/power.js";
test("spells use exact fixed powers and neutral visuals", () => {
  const expected = {
    fireball: { damage: 40 },
    lightning: { damage: 75 },
    heal: { heal: 30 },
    shield: { shieldDuration: 2.5 },
    dash: { dashDistance: 3 },
  };
  for (const [command, effect] of Object.entries(expected)) {
    assert.deepEqual(getSpellPower(command), {
      multiplier: 1,
      scale: 1,
      damage: 0,
      heal: 0,
      shieldDuration: 0,
      dashDistance: 0,
      ...effect,
    });
  }
});
test("extra score claims never affect powers", () => {
  for (const command of ["fireball", "lightning", "heal", "shield", "dash"])
    for (const claim of [-100, 0, 50, 100, Infinity, NaN, "100", {}])
      assert.deepEqual(getSpellPower(command, claim), getSpellPower(command));
  assert.equal(Object.hasOwn(getSpellPower("fireball"), "score"), false);
});
test("unknown inherited commands have no combat effect", () => {
  for (const command of [
    "constructor",
    "toString",
    null,
    {},
    Object.create(null),
  ])
    assert.deepEqual(getSpellPower(command), {
      multiplier: 1,
      scale: 1,
      damage: 0,
      heal: 0,
      shieldDuration: 0,
      dashDistance: 0,
    });
});
