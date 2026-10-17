import express from "express";
import multer from "multer";
import { judgeRap } from "./rap-judge.js";
import { castProofs } from "./cast-proofs.js";

const supported = new Set([
  "audio/webm",
  "audio/ogg",
  "audio/wav",
  "audio/x-wav",
  "audio/mp4",
  "audio/mpeg",
]);
export function createApp({
  apiKey = "",
  fetchImpl = fetch,
  timeoutMs = 12000,
  judgeImpl = judgeRap,
  proofs = castProofs,
} = {}) {
  const app = express();
  app.disable("x-powered-by");
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  });
  app.get("/api/health", (req, res) =>
    res.json({ configured: Boolean(apiKey) }),
  );
  const requests = new Map();
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1, fields: 2 },
    fileFilter(req, file, done) {
      if (!supported.has(file.mimetype))
        return done(
          Object.assign(new Error("Unsupported audio format."), {
            status: 415,
          }),
        );
      done(null, true);
    },
  }).single("file");
  app.post(
    "/api/transcribe",
    (req, res, next) => {
      const now = Date.now();
      for (const [ip, value] of requests)
        if (now - value.start > 60000) requests.delete(ip);
      const entry = requests.get(req.ip) || { start: now, count: 0 };
      entry.count++;
      requests.set(req.ip, entry);
      if (entry.count > 45)
        return res.status(429).json({
          error: "Too many voice requests. Wait a moment and try again.",
        });
      if (!apiKey)
        return res.status(503).json({
          error:
            "Speech engine is not configured. Add SARVAM_API_KEY to the server .env file.",
        });
      upload(req, res, next);
    },
    async (req, res) => {
      if (!req.file?.size)
        return res
          .status(400)
          .json({ error: "Record a non-empty audio clip." });
      const form = new FormData();
      form.append(
        "file",
        new Blob([req.file.buffer], { type: req.file.mimetype }),
        "voice." +
          ({
            "audio/ogg": "ogg",
            "audio/mp4": "m4a",
            "audio/mpeg": "mp3",
            "audio/wav": "wav",
            "audio/x-wav": "wav",
          }[req.file.mimetype] || "webm"),
      );
      form.append("model", "saaras:v4");
      form.append("mode", "translate");
      form.append("language_code", "unknown");
      try {
        const response = await fetchImpl(
          "https://api.sarvam.ai/speech-to-text",
          {
            method: "POST",
            headers: { "api-subscription-key": apiKey },
            body: form,
            signal: AbortSignal.timeout(timeoutMs),
          },
        );
        if (!response.ok)
          return res.status(502).json({
            error:
              response.status === 429
                ? "Speech service is busy. Please try again shortly."
                : "Speech service could not transcribe this clip. Please try again.",
          });
        const data = await response.json();
        if (typeof data.transcript !== "string")
          throw new Error("Invalid response");
        const assessment = await judgeImpl(data.transcript, {
          apiKey,
          fetchImpl,
        });
        const subject =
          typeof req.body?.playerId === "string" &&
          /^[a-f0-9-]{36}$/i.test(req.body.playerId)
            ? req.body.playerId
            : "solo";
        const castToken = assessment.accepted
          ? proofs.issue(
              { command: assessment.command, score: assessment.score },
              subject,
            )
          : null;
        res.json({
          assessment,
          castToken,
          transcript: data.transcript.slice(0, 2000),
          language_code:
            typeof data.language_code === "string" ? data.language_code : null,
        });
      } catch (error) {
        res
          .status(
            error.name === "TimeoutError" || error.name === "AbortError"
              ? 504
              : 502,
          )
          .json({
            error: "Speech or AI rap judging is unavailable. Please try again.",
          });
      }
    },
  );
  app.use((error, req, res, next) => {
    res
      .status(error.code === "LIMIT_FILE_SIZE" ? 413 : error.status || 400)
      .json({
        error:
          error.code === "LIMIT_FILE_SIZE"
            ? "Audio clip exceeds 5 MB."
            : error.status === 415
              ? "Unsupported audio format."
              : "Invalid audio upload.",
      });
  });
  return app;
}
