import test from "node:test";
import assert from "node:assert/strict";
import { isOriginAllowed } from "../server/origins.js";
import { createApp } from "../server/app.js";
test("cross-origin deployment accepts only explicit frontend origins", () => {
  assert.equal(
    isOriginAllowed("https://echo.vercel.app", "backend.example", [
      "https://echo.vercel.app",
    ]),
    true,
  );
  assert.equal(
    isOriginAllowed("https://evil.example", "backend.example", [
      "https://echo.vercel.app",
    ]),
    false,
  );
  assert.equal(
    isOriginAllowed("https://echo.vercel.app.evil.example", "backend.example", [
      "https://echo.vercel.app",
    ]),
    false,
  );
  assert.equal(isOriginAllowed("null", "backend.example", []), false);
  assert.equal(
    isOriginAllowed("http://localhost:3001", "localhost:3001", []),
    true,
  );
  assert.equal(isOriginAllowed(undefined, "localhost:3001", []), true);
});
test("speech backend exposes CORS only to the configured Vercel origin", async (t) => {
  const server = createApp({
    allowedOrigins: ["https://echo.vercel.app"],
  }).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  t.after(() => server.close());
  const url = `http://127.0.0.1:${server.address().port}/api/health`;
  const response = await fetch(url, {
    headers: { Origin: "https://echo.vercel.app" },
  });
  assert.equal(response.status, 200);
  assert.equal(
    response.headers.get("access-control-allow-origin"),
    "https://echo.vercel.app",
  );
  const blocked = await fetch(url, {
    headers: { Origin: "https://evil.example" },
  });
  assert.equal(blocked.status, 403);
  assert.equal(blocked.headers.get("access-control-allow-origin"), null);
  const preflight = await fetch(url, {
    method: "OPTIONS",
    headers: {
      Origin: "https://echo.vercel.app",
      "Access-Control-Request-Method": "POST",
    },
  });
  assert.equal(preflight.status, 204);
});
test("WebSocket upgrade enforces the same explicit frontend origin", async (t) => {
  const { createServer } = await import("node:http");
  const { WebSocket } = await import("ws");
  const { attachMultiplayer } = await import("../server/multiplayer.js");
  const server = createServer();
  const cleanup = attachMultiplayer(server, {
    allowedOrigins: ["https://echo.vercel.app"],
  });
  server.listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  const url = `ws://127.0.0.1:${server.address().port}/ws`;
  t.after(async () => {
    await cleanup();
    await new Promise((resolve) => server.close(resolve));
  });
  const allowed = new WebSocket(url, { origin: "https://echo.vercel.app" });
  await new Promise((resolve, reject) => {
    allowed.once("open", resolve);
    allowed.once("error", reject);
  });
  allowed.close();
  const blocked = new WebSocket(url, { origin: "https://evil.example" });
  const error = await new Promise((resolve) => blocked.once("error", resolve));
  assert.match(error.message, /401/);
});
