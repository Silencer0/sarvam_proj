import test from "node:test";
import assert from "node:assert/strict";
import { judgeRap } from "../server/rap-judge.js";
test("AI evaluates metaphors without local keyword rejection", async () => {
  let called = false;
  const result = await judgeRap("My molten crown devours the frozen horizon", {
    apiKey: "dummy",
    fetchImpl: async (url, init) => {
      called = true;
      assert.equal(url, "https://api.sarvam.ai/v1/chat/completions");
      const body = JSON.parse(init.body);
      assert.equal(body.model, "sarvam-105b");
      assert.equal(body.reasoning_effort, null);
      assert.equal(body.max_tokens, 512);
      return new Response(
        JSON.stringify({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  accepted: true,
                  command: "fireball",
                  score: 88,
                  feedback: "Strong heat imagery.",
                }),
              },
            },
          ],
        }),
      );
    },
  });
  assert.equal(called, true);
  assert.equal(result.score, 88);
  assert.equal(result.command, "fireball");
});
test("bare and repeated bars never reach judge; malformed scoring fails closed", async () => {
  assert.equal((await judgeRap("fireball")).accepted, false);
  assert.equal((await judgeRap("fire fire fire fire")).accepted, false);
  await assert.rejects(() =>
    judgeRap("My molten crown devours the frozen horizon", {
      apiKey: "dummy",
      fetchImpl: async () =>
        new Response(
          JSON.stringify({
            choices: [
              {
                message: {
                  content:
                    '{"accepted":true,"command":"fireball","score":999,"feedback":"x"}',
                },
              },
            ],
          }),
        ),
    }),
  );
});
