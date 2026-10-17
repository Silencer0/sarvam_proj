import test from "node:test";
import assert from "node:assert/strict";
import { createApp } from "../server/app.js";

async function request(options, path, init) {
  const server = createApp(options).listen(0, "127.0.0.1");
  await new Promise((resolve) => server.once("listening", resolve));
  try {
    return await fetch(
      `http://127.0.0.1:${server.address().port}${path}`,
      init,
    );
  } finally {
    server.close();
  }
}
function upload(content = "voice", type = "audio/webm") {
  const body = new FormData();
  body.append("file", new Blob([content], { type }), "voice.webm");
  return { method: "POST", body };
}
test("health reveals configuration flag only", async () => {
  const response = await request(
    { apiKey: "dummy-test-credential" },
    "/api/health",
  );
  assert.deepEqual(await response.json(), { configured: true });
});
test("missing configuration returns actionable safe error", async () => {
  const response = await request({ apiKey: "" }, "/api/transcribe", upload());
  assert.equal(response.status, 503);
  assert.match((await response.json()).error, /configured/i);
});
test("rejects missing, empty, unsupported and oversized audio", async () => {
  for (const init of [
    { method: "POST" },
    upload(""),
    upload("bad", "text/plain"),
    upload("a".repeat(5 * 1024 * 1024 + 1)),
  ]) {
    const response = await request(
      { apiKey: "dummy" },
      "/api/transcribe",
      init,
    );
    assert.ok([400, 413, 415].includes(response.status));
  }
});
test("accepts a single spoken spell and returns only safe command fields", async () => {
  let captured;
  const response = await request(
    {
      apiKey: "dummy",
      fetchImpl: async (url, init) => {
        captured = { url, init };
        return new Response(
          JSON.stringify({
            transcript: "fireball",
            language_code: "en-IN",
            secret: "hidden",
          }),
        );
      },
    },
    "/api/transcribe",
    upload(),
  );
  assert.equal(captured.url, "https://api.sarvam.ai/speech-to-text");
  assert.equal(captured.init.headers["api-subscription-key"], "dummy");
  assert.equal(captured.init.body.get("model"), "saaras:v4");
  assert.equal(captured.init.body.get("mode"), "translate");
  assert.equal(captured.init.body.get("language_code"), "unknown");
  assert.equal(captured.init.body.has("keyterms"), false);
  const data = await response.json();
  assert.equal(typeof data.castToken, "string");
  assert.deepEqual(
    { ...data, castToken: "issued" },
    {
      transcript: "fireball",
      language_code: "en-IN",
      command: "fireball",
      castToken: "issued",
    },
  );
});
test("upstream errors never expose response details or credentials", async () => {
  const response = await request(
    {
      apiKey: "dummy",
      fetchImpl: async () =>
        new Response("sensitive upstream payload", { status: 403 }),
    },
    "/api/transcribe",
    upload(),
  );
  assert.equal(response.status, 502);
  assert.doesNotMatch(await response.text(), /sensitive|dummy/);
});
test("single-word commands issue player-bound proofs and unknown words do not cast", async () => {
  const { createCastProofs } = await import("../server/cast-proofs.js");
  const proofs = createCastProofs();
  const playerId = "00000000-0000-0000-0000-000000000001";
  const init = upload();
  init.body.append("playerId", playerId);
  const options = (transcript) => ({
    apiKey: "dummy",
    proofs,
    fetchImpl: async () =>
      new Response(JSON.stringify({ transcript, language_code: "en-IN" })),
  });
  const response = await request(options("fireball"), "/api/transcribe", init);
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.equal(data.command, "fireball");
  assert.equal("assessment" in data, false);
  assert.equal("score" in data, false);
  assert.equal(proofs.consume(data.castToken, "fireball"), null);
  assert.deepEqual(proofs.consume(data.castToken, "fireball", playerId), {
    command: "fireball",
  });
  assert.equal(proofs.consume(data.castToken, "fireball", playerId), null);
  const unknown = await request(options("banana"), "/api/transcribe", upload());
  assert.deepEqual(await unknown.json(), {
    transcript: "banana",
    language_code: "en-IN",
    command: null,
    castToken: null,
  });
});
