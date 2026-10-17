import test from "node:test";
import assert from "node:assert/strict";
import {
  commandFromTranscript,
  createGame,
  cast,
  tick,
  damage,
} from "../src/game.js";
test("recognizes multilingual spell aliases without accidental substrings", () => {
  assert.equal(commandFromTranscript("cast fireball please"), "fireball");
  assert.equal(commandFromTranscript("बिजली"), "lightning");
  assert.equal(commandFromTranscript("heal me"), "heal");
  assert.equal(commandFromTranscript("fireplace"), null);
});
test("cooldowns, shield and restart enforce combat rules", () => {
  let g = createGame();
  assert.equal(cast(g, "shield").ok, true);
  assert.equal(cast(g, "shield").ok, false);
  damage(g, 20);
  assert.equal(g.health, 100);
  tick(g, 3);
  damage(g, 20);
  assert.equal(g.health, 80);
  assert.equal(createGame().time, 0);
});
test("heal is capped and terminal games reject actions", () => {
  let g = createGame();
  g.health = 90;
  cast(g, "heal");
  assert.equal(g.health, 100);
  g.status = "defeat";
  assert.equal(cast(g, "fireball").ok, false);
});
test("normalizes speech whitespace and punctuation", () => {
  assert.equal(commandFromTranscript("  “fireball”\n"), "fireball");
  assert.equal(commandFromTranscript("fire   ball"), "fireball");
  assert.equal(commandFromTranscript("shield: please"), "shield");
});
