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
  assert.equal(duel.players[1].health, 60);
  assert.equal(castSpell(duel, "a", "fireball"), null);
  assert.equal(castSpell(duel, "b", "lightning")?.command, "lightning");
  assert.equal(duel.players[0].health, 100);
  castSpell(duel, "b", "heal");
  assert.equal(duel.players[1].health, 90);
  castSpell(duel, "b", "shield");
  tickDuel(duel, 1.3);
  castSpell(duel, "a", "fireball");
  assert.equal(duel.players[1].health, 90);
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
test("authoritative fixed powers ignore client score claims", () => {
  for (const command of ["fireball", "lightning", "heal", "shield", "dash"]) {
    const a = createDuel("a", "b"),
      b = createDuel("a", "b");
    a.players[1].x = b.players[1].x = 1;
    a.players[0].health = b.players[0].health = 10;
    const first = castSpell(a, "a", command, 0),
      second = castSpell(b, "a", command, 100);
    assert.deepEqual(first, second);
    assert.deepEqual(a, b);
    assert.equal(first.multiplier, 1);
    assert.equal(first.scale, 1);
    assert.equal(Object.hasOwn(first, "score"), false);
    if (command === "fireball") assert.equal(a.players[1].health, 60);
    if (command === "lightning") assert.equal(a.players[1].health, 25);
    if (command === "heal") assert.equal(a.players[0].health, 40);
    if (command === "shield") assert.equal(a.players[0].shieldUntil, 2.5);
    if (command === "dash") assert.equal(a.players[0].x, -1);
  }
});
