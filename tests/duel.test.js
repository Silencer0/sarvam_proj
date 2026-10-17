import test from "node:test";
import assert from "node:assert/strict";
import {
  createDuel,
  movePlayer,
  tickDuel,
  castSpell,
  forfeit,
} from "../server/duel.js";
test("movement is normalized, bounded and expires without fresh input", () => {
  const duel = createDuel("a", "b");
  movePlayer(duel, "a", 100, 100);
  tickDuel(duel, 0.1);
  const p = duel.players[0];
  assert.ok(Math.abs(Math.hypot(p.x + 4, p.z) - 0.45) < 0.001);
  tickDuel(duel, 0.3);
  const x = p.x;
  tickDuel(duel, 0.1);
  assert.equal(p.x, x);
});
test("spell ranges, cooldowns, shields, healing and defeat are authoritative", () => {
  const duel = createDuel("a", "b");
  assert.ok(castSpell(duel, "a", "fireball"));
  assert.equal(duel.players[1].health, 55);
  assert.equal(castSpell(duel, "a", "fireball"), null);
  assert.equal(castSpell(duel, "b", "lightning")?.command, "lightning");
  assert.equal(duel.players[0].health, 100);
  castSpell(duel, "b", "heal");
  assert.equal(duel.players[1].health, 89);
  castSpell(duel, "b", "shield");
  tickDuel(duel, 1.3);
  castSpell(duel, "a", "fireball");
  assert.equal(duel.players[1].health, 89);
  tickDuel(duel, 3);
  castSpell(duel, "a", "fireball");
  tickDuel(duel, 1.3);
  castSpell(duel, "a", "fireball");
  tickDuel(duel, 1.3);
  castSpell(duel, "a", "fireball");
  assert.equal(duel.phase, "finished");
  assert.equal(duel.winnerId, "a");
  assert.equal(castSpell(duel, "b", "heal"), null);
});
test("disconnect forfeits and unknown input never mutates state", () => {
  const d = createDuel("a", "b");
  assert.equal(movePlayer(d, "a", NaN, 0), false);
  assert.equal(castSpell(d, "a", "constructor"), null);
  assert.equal(castSpell(d, "a", { toString: null }), null);
  forfeit(d, "a");
  assert.equal(d.winnerId, "b");
});
test("authoritative score scales damage, healing, shield and dash with event power", () => {
  for (const command of ["fireball", "lightning", "heal", "shield", "dash"]) {
    const low = createDuel("a", "b"),
      high = createDuel("a", "b");
    low.players[1].x = high.players[1].x = 1;
    low.players[0].health = high.players[0].health = 10;
    const a = castSpell(low, "a", command, 20),
      b = castSpell(high, "a", command, 90);
    assert.ok(b.multiplier > a.multiplier);
    assert.equal(b.score, 90);
    assert.equal(b.power.scale, b.scale);
    if (command === "fireball" || command === "lightning")
      assert.ok(high.players[1].health < low.players[1].health);
    if (command === "heal")
      assert.ok(high.players[0].health > low.players[0].health);
    if (command === "shield")
      assert.ok(high.players[0].shieldUntil > low.players[0].shieldUntil);
    if (command === "dash") assert.ok(high.players[0].x > low.players[0].x);
  }
});
