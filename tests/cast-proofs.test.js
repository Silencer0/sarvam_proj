import test from "node:test";
import assert from "node:assert/strict";
import { createCastProofs } from "../server/cast-proofs.js";
test("proof binds command and player and is single use", () => {
  const p = createCastProofs();
  const token = p.issue({ command: "fireball", score: 87 }, "player");
  const payload = JSON.parse(Buffer.from(token.split(".")[0], "base64url"));
  assert.equal("score" in payload, false, "caller score is never included");
  assert.equal(p.consume(token, "fireball", "other"), null);
  assert.equal(p.consume(token, "heal", "player"), null);
  assert.deepEqual(p.consume(token, "fireball", "player"), {
    command: "fireball",
  });
  assert.equal(p.consume(token, "fireball", "player"), null);
  assert.equal(p.consume(token + "x", "fireball", "player"), null);
});
test("expired proofs and tampered commands are rejected", () => {
  let time = 0;
  const p = createCastProofs({ now: () => time });
  const token = p.issue({ command: "heal" });
  const [body, sig] = token.split(".");
  const changed =
    Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(body, "base64url")),
        command: "fireball",
      }),
    ).toString("base64url") +
    "." +
    sig;
  assert.equal(p.consume(changed, "heal"), null);
  time = 60001;
  assert.equal(p.consume(token, "heal"), null);
});
