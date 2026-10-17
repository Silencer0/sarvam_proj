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
test("fixed support powers ignore extra quality claims and preserve cooldowns", () => {
  const a = createGame(),
    b = createGame();
  a.health = b.health = 20;
  assert.deepEqual(cast(a, "heal", 0), cast(b, "heal", 100));
  assert.equal(a.health, 50);
  assert.equal(b.health, 50);
  const c = createGame();
  const shield = cast(c, "shield", Infinity);
  assert.equal(shield.power.shieldDuration, 2.5);
  assert.equal(c.shieldUntil, 2.5);
  assert.equal(cast(c, "shield").ok, false);
  assert.equal(cast(c, "constructor").ok, false);
});
test("translated single-word commands resolve common native-language meanings", () => {
  assert.equal(commandFromTranscript("Electricity."), "lightning");
  assert.equal(commandFromTranscript("Run!"), "dash");
  assert.equal(commandFromTranscript("Treatment"), "heal");
  assert.equal(commandFromTranscript("Armor"), "shield");
});
test("common Sarvam mishearings of short spell words still cast", () => {
  assert.equal(commandFromTranscript("Heel."), "heal");
  assert.equal(commandFromTranscript("Hill."), "heal");
  assert.equal(commandFromTranscript("He'll"), "heal");
  assert.equal(commandFromTranscript("Sheild!"), "shield");
  assert.equal(commandFromTranscript("Lighting."), "lightning");
  assert.equal(commandFromTranscript("Fire bowl"), "fireball");
  assert.equal(commandFromTranscript("Race Shield."), "shield");
  assert.equal(commandFromTranscript("Healing."), "heal");
});
