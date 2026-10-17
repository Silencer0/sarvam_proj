import test from "node:test";
import assert from "node:assert/strict";
import { createCastProofs } from "../server/cast-proofs.js";
test("proof binds score command player and is single use", () => {
  const p = createCastProofs();
  const token = p.issue({ command: "fireball", score: 87 }, "player");
  assert.equal(p.consume(token, "fireball", "other"), null);
  assert.equal(p.consume(token, "heal", "player"), null);
  assert.deepEqual(p.consume(token, "fireball", "player"), {
    command: "fireball",
    score: 87,
  });
  assert.equal(p.consume(token, "fireball", "player"), null);
  assert.equal(p.consume(token + "x", "fireball", "player"), null);
});
test("expired proofs and tampered scores are rejected", () => {
  let time = 0;
  const p = createCastProofs({ now: () => time });
  const token = p.issue({ command: "heal", score: 99 });
  const [body, sig] = token.split(".");
  const changed =
    Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, "base64url")),
        score: 100,
      }),
    ).toString("base64url") +
    "." +
    sig;
  assert.equal(p.consume(changed, "heal"), null);
  time = 60001;
  assert.equal(p.consume(token, "heal"), null);
});
