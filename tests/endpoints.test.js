import test from "node:test";
import assert from "node:assert/strict";
import {
  createEndpoints,
  getWebSocketUrl,
  getApiUrl,
} from "../src/endpoints.js";
test("same origin defaults retain relative API URLs and select WS protocol", () => {
  const local = createEndpoints("", "http://localhost:5173");
  assert.equal(local.apiUrl("/api/health"), "/api/health");
  assert.equal(local.webSocketUrl(), "ws://localhost:5173/ws");
  assert.equal(
    createEndpoints("", "https://arena.example").webSocketUrl(),
    "wss://arena.example/ws",
  );
});
test("configured HTTPS origins and trailing slash target backend consistently", () => {
  const e = createEndpoints(
    "https://backend.example/",
    "https://arena.example",
  );
  assert.equal(
    e.apiUrl("/api/transcribe"),
    "https://backend.example/api/transcribe",
  );
  assert.equal(e.webSocketUrl(), "wss://backend.example/ws");
  assert.equal(
    createEndpoints("http://127.0.0.1:3001").webSocketUrl(),
    "ws://127.0.0.1:3001/ws",
  );
});
test("rejects unsafe and non-origin backend URLs", () => {
  for (const url of [
    "javascript:alert(1)",
    "ftp://backend.example",
    "wss://backend.example",
    "https://user:pass@backend.example",
    "https://backend.example/path",
    "https://backend.example?x=1",
    "https://backend.example#fragment",
    "http://backend.example",
    "//backend.example",
  ])
    assert.throws(() => createEndpoints(url));
  assert.throws(() =>
    createEndpoints("https://backend.example").apiUrl("//evil.example/api"),
  );
  assert.throws(() =>
    createEndpoints("https://backend.example").apiUrl("https://evil.example"),
  );
});
test("wrapper resolves browser location lazily including protocol/host test doubles", () => {
  const old = globalThis.location;
  try {
    globalThis.location = { protocol: "https:", host: "arena.example" };
    assert.equal(getWebSocketUrl(), "wss://arena.example/ws");
    globalThis.location = { origin: "http://localhost:4321" };
    assert.equal(getWebSocketUrl(), "ws://localhost:4321/ws");
    assert.equal(getApiUrl("/api/health"), "/api/health");
  } finally {
    if (old === undefined) delete globalThis.location;
    else globalThis.location = old;
  }
});
