import dotenv from "dotenv";
import express from "express";
import { fileURLToPath } from "node:url";
import { resolve, dirname } from "node:path";
import { existsSync } from "node:fs";
import { createApp } from "./app.js";
import { attachMultiplayer } from "./multiplayer.js";
const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
dotenv.config({ path: resolve(root, ".env"), quiet: true });
const app = createApp({ apiKey: process.env.SARVAM_API_KEY || "" });
const dist = resolve(root, "dist");
if (existsSync(resolve(dist, "index.html"))) {
  app.use(express.static(dist, { dotfiles: "deny" }));
  app.get("/{*path}", (req, res) => {
    if (req.path.startsWith("/api/"))
      return res.status(404).json({ error: "Unknown API route." });
    res.sendFile(resolve(dist, "index.html"));
  });
}
const server = app.listen(Number(process.env.PORT) || 3001, "0.0.0.0", () =>
  console.log("Echo Arena server ready."),
);

attachMultiplayer(server);
