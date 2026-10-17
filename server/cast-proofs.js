import { randomBytes, createHmac, timingSafeEqual } from "node:crypto";
const commands = new Set(["fireball", "lightning", "shield", "dash", "heal"]);
export function createCastProofs({
  now = Date.now,
  ttlMs = 60000,
  maxEntries = 5000,
} = {}) {
  const key = randomBytes(32),
    issued = new Map();
  const sign = (body) =>
    createHmac("sha256", key).update(body).digest("base64url");
  const cleanup = () => {
    for (const [id, expires] of issued) if (expires <= now()) issued.delete(id);
  };
  return {
    issue({ command, score }, subject = "solo") {
      cleanup();
      if (
        !commands.has(command) ||
        !Number.isInteger(score) ||
        score < 0 ||
        score > 100
      )
        throw new Error("Invalid cast assessment");
      while (issued.size >= maxEntries)
        issued.delete(issued.keys().next().value);
      const nonce = randomBytes(16).toString("hex"),
        expires = now() + ttlMs;
      const body = Buffer.from(
        JSON.stringify({ command, score, subject, nonce, expires }),
      ).toString("base64url");
      issued.set(nonce, expires);
      return body + "." + sign(body);
    },
    consume(token, expectedCommand, subject = "solo") {
      cleanup();
      if (typeof token !== "string" || token.length > 1500) return null;
      try {
        const [body, signature, ...rest] = token.split(".");
        if (rest.length || !body || !signature) return null;
        const actual = Buffer.from(signature),
          expected = Buffer.from(sign(body));
        if (
          actual.length !== expected.length ||
          !timingSafeEqual(actual, expected)
        )
          return null;
        const data = JSON.parse(Buffer.from(body, "base64url"));
        if (
          data.subject !== subject ||
          data.command !== expectedCommand ||
          data.expires <= now() ||
          !issued.has(data.nonce)
        )
          return null;
        issued.delete(data.nonce);
        return { command: data.command, score: data.score };
      } catch {
        return null;
      }
    },
  };
}
export const castProofs = createCastProofs();
