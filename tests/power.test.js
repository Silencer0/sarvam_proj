import test from "node:test";
import assert from "node:assert/strict";
import { getSpellPower } from "../src/power.js";
test("score controls damage and all support effects deterministically", () => {
  for (const command of ["fireball", "lightning", "heal", "shield", "dash"]) {
    const low = getSpellPower(command, 20),
      high = getSpellPower(command, 90);
    assert.ok(high.multiplier > low.multiplier);
    assert.ok(high.scale > low.scale);
    const key =
      command === "heal"
        ? "heal"
        : command === "shield"
          ? "shieldDuration"
          : command === "dash"
            ? "dashDistance"
            : "damage";
    assert.ok(high[key] > low[key]);
  }
  assert.equal(getSpellPower("fireball").damage, 45);
  assert.equal(getSpellPower("lightning").damage, 84);
});
test("scores are finite, clamped and never inherited spell properties", () => {
  assert.equal(getSpellPower("fireball", -9).score, 0);
  assert.equal(getSpellPower("fireball", 150).score, 100);
  for (const score of [NaN, Infinity, -Infinity, "90", null, {}])
    assert.equal(getSpellPower("fireball", score).score, 50);
  assert.equal(getSpellPower("constructor", 100).damage, 0);
  assert.equal(getSpellPower("heal", 100).damage, 0);
});
