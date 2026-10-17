import test from "node:test";
import assert from "node:assert/strict";
import { fetchGameJson } from "../src/api.js";
function mockFetch(t, fn) {
  const old = globalThis.fetch;
  globalThis.fetch = fn;
  t.after(() => {
    globalThis.fetch = old;
  });
}
test("HTML from a frontend fallback produces an endpoint-specific setup error", async (t) => {
  mockFetch(
    t,
    async () =>
      new Response("<!doctype html><html>Frontend</html>", {
        headers: { "Content-Type": "text/html" },
      }),
  );
  await assert.rejects(
    () => fetchGameJson("/api/health"),
    (error) =>
      /\/api\/health/.test(error.message) &&
      /HTML/.test(error.message) &&
      /npm run dev/.test(error.message) &&
      !/JSON\.parse|Unexpected token/.test(error.message),
  );
});
test("plain-text proxy failure and malformed JSON never expose the response body", async (t) => {
  mockFetch(
    t,
    async () => new Response("private proxy diagnostics", { status: 502 }),
  );
  await assert.rejects(
    () => fetchGameJson("/api/transcribe"),
    (e) => /502/.test(e.message) && !/private/.test(e.message),
  );
  mockFetch(
    t,
    async () =>
      new Response("{malformed private details", {
        headers: { "Content-Type": "application/json" },
      }),
  );
  await assert.rejects(
    () => fetchGameJson("/api/health"),
    (e) => /invalid JSON/.test(e.message) && !/private/.test(e.message),
  );
});
test("valid backend JSON passes through and safe server errors remain actionable", async (t) => {
  mockFetch(t, async () => Response.json({ configured: true }));
  assert.deepEqual(await fetchGameJson("/api/health"), { configured: true });
  mockFetch(t, async () =>
    Response.json(
      { error: "Speech engine is not configured." },
      { status: 503 },
    ),
  );
  await assert.rejects(
    () => fetchGameJson("/api/health"),
    /Speech engine is not configured/,
  );
});
test("network errors explain backend startup and cancelled requests stay cancelled", async (t) => {
  mockFetch(t, async () => {
    throw new TypeError("Failed to fetch");
  });
  await assert.rejects(() => fetchGameJson("/api/health"), /npm run dev/);
  mockFetch(t, async () => {
    throw new DOMException("Cancelled", "AbortError");
  });
  await assert.rejects(
    () => fetchGameJson("/api/health"),
    (e) => e.name === "AbortError",
  );
});
test("API shape mismatches fail before microphone and game callbacks", async (t) => {
  mockFetch(t, async () => Response.json({ page: "not a backend" }));
  await assert.rejects(() => fetchGameJson("/api/health"), /health response/);
  mockFetch(t, async () => Response.json({ ok: true }));
  await assert.rejects(
    () => fetchGameJson("/api/transcribe"),
    /transcription response/,
  );
});
