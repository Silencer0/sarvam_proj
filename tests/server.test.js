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
test("forwards fixed upstream request and returns only transcript fields", async () => {
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
  assert.deepEqual(await response.json(), {
    transcript: "fireball",
    language_code: "en-IN",
    assessment: {
      accepted: false,
      command: null,
      score: 0,
      feedback:
        "Rap 4–80 words with original imagery; bare spells and repeated words do not count.",
      grade: "Keep writing",
      words: 1,
    },
    castToken: null,
  });
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
test("AI accepted bars issue a player-bound score proof; judge failures fail closed", async () => {
  const { createCastProofs } = await import("../server/cast-proofs.js");
  const proofs = createCastProofs();
  const playerId = "00000000-0000-0000-0000-000000000001";
  const init = upload();
  init.body.append("playerId", playerId);
  const base = {
    apiKey: "dummy",
    proofs,
    fetchImpl: async () =>
      new Response(
        JSON.stringify({
          transcript: "My molten crown consumes the frozen sky",
          language_code: "en-IN",
        }),
      ),
  };
  const assessment = {
    accepted: true,
    command: "fireball",
    score: 88,
    feedback: "Creative heat imagery",
    grade: "Legendary lyric",
    words: 8,
  };
  const response = await request(
    { ...base, judgeImpl: async () => assessment },
    "/api/transcribe",
    init,
  );
  const data = await response.json();
  assert.equal(response.status, 200);
  assert.deepEqual(data.assessment, assessment);
  assert.equal(proofs.consume(data.castToken, "fireball"), null);
  assert.deepEqual(proofs.consume(data.castToken, "fireball", playerId), {
    command: "fireball",
    score: 88,
  });
  const failed = await request(
    {
      ...base,
      judgeImpl: async () => {
        throw new Error("sensitive judge detail");
      },
    },
    "/api/transcribe",
    upload(),
  );
  assert.equal(failed.status, 502);
  assert.doesNotMatch(await failed.text(), /sensitive|castToken/);
});
