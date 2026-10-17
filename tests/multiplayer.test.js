import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { WebSocket } from "ws";
import { castProofs } from "../server/cast-proofs.js";
import { attachMultiplayer } from "../server/multiplayer.js";
function client(url) {
  const ws = new WebSocket(url);
  const messages = [];
  ws.on("message", (data) => messages.push(JSON.parse(data)));
  return {
    ws,
    messages,
    send: (value) => ws.send(JSON.stringify(value)),
    async wait(predicate) {
      const until = Date.now() + 3000;
      while (Date.now() < until) {
        const i = messages.findIndex(predicate);
        if (i >= 0) return messages.splice(i, 1)[0];
        await new Promise((r) => setTimeout(r, 10));
      }
      throw new Error("WebSocket event timed out");
    },
  };
}
test("two real websocket players join, move, cast and forfeit", async (t) => {
  const server = http.createServer();
  const cleanup = attachMultiplayer(server);
  server.listen(0, "127.0.0.1");
  await new Promise((r) => server.once("listening", r));
  const url = `ws://127.0.0.1:${server.address().port}/ws`;
  const a = client(url),
    b = client(url);
  t.after(async () => {
    a.ws.terminate();
    b.ws.terminate();
    await cleanup();
    await new Promise((r) => server.close(r));
  });
  const aid = (await a.wait((m) => m.type === "welcome")).id;
  await b.wait((m) => m.type === "welcome");
  a.send({ type: "create" });
  const room = await a.wait((m) => m.type === "state" && m.phase === "waiting");
  b.send({ type: "join", code: room.roomCode });
  await a.wait((m) => m.type === "state" && m.phase === "playing");
  a.send({ type: "move", x: 100, z: 0 });
  const moved = await a.wait((m) => m.type === "state" && m.players[0].x > -4);
  assert.ok(moved.players[0].x < -3);
  a.send({
    type: "cast",
    command: "fireball",
    score: 1000000, // Client-supplied strength must not change fixed damage.
    castToken: castProofs.issue({ command: "fireball" }, aid),
  });
  await a.wait((m) => m.type === "cast");
  const hit = await b.wait(
    (m) => m.type === "state" && m.players[1].health === 60,
  );
  assert.equal(hit.players[0].health, 100);
  a.send({
    type: "cast",
    command: "fireball",
    castToken: castProofs.issue({ command: "fireball" }, aid),
  });
  await a.wait((m) => m.type === "error");
  b.ws.close();
  const finished = await a.wait(
    (m) => m.type === "state" && m.phase === "finished",
  );
  assert.equal(finished.winnerId, aid);
});
