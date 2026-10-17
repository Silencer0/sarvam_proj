import test from "node:test";
import assert from "node:assert/strict";
import http from "node:http";
import { WebSocket } from "ws";
import { attachMultiplayer } from "../server/multiplayer.js";
import { createMultiplayerClient } from "../src/multiplayer-client.js";

async function until(read) {
  const deadline = Date.now() + 3000;
  while (Date.now() < deadline) {
    const value = read();
    if (value) return value;
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  throw new Error("Client state callback timed out");
}

test("actual client transport joins a duel and receives authoritative shield/cast state", async (t) => {
  const server = http.createServer();
  const cleanup = attachMultiplayer(server);
  server.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  globalThis.WebSocket = WebSocket;
  globalThis.location = {
    protocol: "http:",
    host: `127.0.0.1:${server.address().port}`,
  };
  let stateA,
    stateB,
    casts = [],
    closed = 0;
  const a = createMultiplayerClient({
    onState: (state) => {
      stateA = state;
    },
    onCast: (event) => casts.push(event),
    onClose: () => closed++,
  });
  const b = createMultiplayerClient({
    onState: (state) => {
      stateB = state;
    },
  });
  t.after(async () => {
    a.close();
    b.close();
    await cleanup();
    await new Promise((resolve) => server.close(resolve));
  });
  await Promise.all([a.connect(), b.connect()]);
  assert.ok(a.id && b.id && a.id !== b.id);
  assert.equal(a.create(), true);
  await until(() => stateA?.phase === "waiting");
  assert.equal(b.join(stateA.roomCode), true);
  await until(() => stateA?.phase === "playing" && stateB?.phase === "playing");
  a.cast("shield");
  await until(
    () => stateA.players.find((p) => p.id === a.id).shieldUntil > stateA.time,
  );
  b.cast("fireball");
  await until(() =>
    casts.some(
      (event) => event.playerId === b.id && event.command === "fireball",
    ),
  );
  assert.equal(stateA.players.find((p) => p.id === a.id).health, 100);
  a.leave();
  assert.equal(a.id, null);
  assert.equal(a.cast("fireball"), false);
  await until(() => stateB?.phase === "finished");
  assert.equal(stateB.winnerId, b.id);
  assert.equal(
    closed,
    0,
    "intentional leave does not report a broken connection",
  );
});
