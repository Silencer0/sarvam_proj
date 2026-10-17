import { WebSocketServer, WebSocket } from "ws";
import { randomUUID, randomBytes } from "node:crypto";
import {
  createDuel,
  createPlayer,
  movePlayer,
  tickDuel,
  castSpell,
  forfeit,
  snapshot,
} from "./duel.js";
import { isOriginAllowed } from "./origins.js";
import { castProofs } from "./cast-proofs.js";
export function attachMultiplayer(
  server,
  { proofs = castProofs, allowedOrigins = [] } = {},
) {
  const wss = new WebSocketServer({
    server,
    path: "/ws",
    maxPayload: 1024,
    verifyClient: (info) =>
      isOriginAllowed(info.origin, info.req.headers.host, allowedOrigins),
  });
  const rooms = new Map();
  const send = (ws, data) => {
    if (ws.readyState === WebSocket.OPEN && ws.bufferedAmount < 65536)
      ws.send(JSON.stringify(data));
  };
  const broadcast = (room, data) => {
    for (const ws of room.clients) send(ws, data);
  };
  function leave(ws) {
    const room = rooms.get(ws.roomCode);
    ws.roomCode = null;
    if (!room) return;
    room.clients.delete(ws);
    if (room.clients.size === 0) {
      rooms.delete(room.code);
      return;
    }
    forfeit(room.duel, ws.id);
    room.changed = Date.now();
    broadcast(room, snapshot(room.duel, room.code));
  }
  wss.on("connection", (ws) => {
    if (wss.clients.size > 200) {
      ws.close(1013, "Server full");
      return;
    }
    ws.id = randomUUID();
    ws.rateAt = Date.now();
    ws.rate = 0;
    ws.errorAt = 0;
    send(ws, { type: "welcome", id: ws.id });
    const error = (message) => {
      if (Date.now() - ws.errorAt > 500) {
        send(ws, { type: "error", message });
        ws.errorAt = Date.now();
      }
    };
    ws.on("error", () => {});
    ws.on("close", () => leave(ws));
    ws.on("message", (raw, binary) => {
      const now = Date.now();
      if (now - ws.rateAt > 1000) {
        ws.rateAt = now;
        ws.rate = 0;
      }
      if (++ws.rate > 90) {
        error("Too many inputs.");
        return;
      }
      if (binary) {
        error("Text messages required.");
        return;
      }
      let data;
      try {
        data = JSON.parse(raw.toString());
      } catch {
        error("Invalid message.");
        return;
      }
      if (!data || typeof data !== "object" || Array.isArray(data)) {
        error("Invalid message.");
        return;
      }
      if (data.type === "leave") {
        leave(ws);
        return;
      }
      if (data.type === "create") {
        if (rooms.size >= 100) {
          error("Arena rooms are full. Try later.");
          return;
        }
        leave(ws);
        let code;
        do {
          code = randomBytes(3).toString("hex").toUpperCase();
        } while (rooms.has(code));
        const room = {
          code,
          clients: new Set([ws]),
          duel: createDuel(ws.id),
          changed: now,
        };
        rooms.set(code, room);
        ws.roomCode = code;
        broadcast(room, snapshot(room.duel, code));
        return;
      }
      if (data.type === "join") {
        if (
          typeof data.code !== "string" ||
          !/^[a-fA-F0-9]{6}$/.test(data.code)
        ) {
          error("Enter a valid six-character room code.");
          return;
        }
        const room = rooms.get(data.code.toUpperCase());
        if (
          !room ||
          room.duel.phase !== "waiting" ||
          room.clients.size !== 1 ||
          room.clients.has(ws)
        ) {
          error("Room unavailable or already full.");
          return;
        }
        leave(ws);
        room.clients.add(ws);
        ws.roomCode = room.code;
        room.duel.players.push(createPlayer(ws.id, 4));
        room.duel.phase = "playing";
        room.duel.time = 0;
        room.changed = now;
        broadcast(room, snapshot(room.duel, room.code));
        return;
      }
      const room = rooms.get(ws.roomCode);
      if (!room) {
        error("Create or join a room first.");
        return;
      }
      if (data.type === "move") {
        if (!movePlayer(room.duel, ws.id, data.x, data.z))
          error("Invalid movement.");
        return;
      }
      if (data.type === "cast") {
        const proof = proofs.consume(data.castToken, data.command, ws.id);
        if (!proof) {
          error("Rap approval expired or invalid. Record another bar.");
          return;
        }
        const event = castSpell(room.duel, ws.id, data.command, proof.score);
        if (!event) {
          error("Spell unavailable or cooling down.");
          return;
        }
        broadcast(room, event);
        broadcast(room, snapshot(room.duel, room.code));
        if (room.duel.phase === "finished") room.changed = now;
        return;
      }
      error("Unknown action.");
    });
  });
  let last = Date.now();
  const timer = setInterval(() => {
    const now = Date.now(),
      dt = Math.min((now - last) / 1000, 0.1);
    last = now;
    for (const room of rooms.values()) {
      if (
        (room.duel.phase === "waiting" && now - room.changed > 600000) ||
        (room.duel.phase === "finished" && now - room.changed > 120000)
      ) {
        for (const ws of room.clients) {
          ws.roomCode = null;
          send(ws, {
            type: "error",
            message: "Room expired. Create a new duel.",
          });
        }
        rooms.delete(room.code);
        continue;
      }
      tickDuel(room.duel, dt);
      broadcast(room, snapshot(room.duel, room.code));
    }
  }, 50);
  timer.unref();
  return () =>
    new Promise((resolve) => {
      clearInterval(timer);
      for (const ws of wss.clients) ws.terminate();
      rooms.clear();
      wss.close(() => resolve());
    });
}
