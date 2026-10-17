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
