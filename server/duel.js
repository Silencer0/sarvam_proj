import { getSpellPower } from "../src/power.js";
import { SPELLS } from "../src/game.js";
const radius = 8.7;
const clampPosition = (p) => {
  const length = Math.hypot(p.x, p.z);
  if (length > radius) {
    p.x *= radius / length;
    p.z *= radius / length;
  }
};
export function createPlayer(id, x = -4) {
  return {
    id,
    x,
    z: 0,
    rotation: x < 0 ? Math.PI / 2 : -Math.PI / 2,
    health: 100,
    shieldUntil: 0,
    cooldowns: Object.fromEntries(Object.keys(SPELLS).map((key) => [key, 0])),
    input: { x: 0, z: 0, at: -1 },
    direction: { x: x < 0 ? 1 : -1, z: 0 },
  };
}
export function createDuel(a, b) {
  return {
    phase: b ? "playing" : "waiting",
    winnerId: null,
    time: 0,
    players: [createPlayer(a), ...(b ? [createPlayer(b, 4)] : [])],
  };
}
export function movePlayer(d, id, x, z) {
  if (d.phase !== "playing" || !Number.isFinite(x) || !Number.isFinite(z))
    return false;
  const p = d.players.find((p) => p.id === id);
  if (!p) return false;
  const length = Math.hypot(x, z);
  p.input = {
    x: length > 1 ? x / length : x,
    z: length > 1 ? z / length : z,
    at: d.time,
  };
  if (length > 0) {
    p.direction = { x: x / length, z: z / length };
    p.rotation = Math.atan2(p.direction.x, p.direction.z);
  }
  return true;
}
export function tickDuel(d, dt) {
  d.time += dt;
  if (d.phase !== "playing") return;
  for (const p of d.players) {
    if (d.time - p.input.at <= 0.3) {
      p.x += p.input.x * 4.5 * dt;
      p.z += p.input.z * 4.5 * dt;
      clampPosition(p);
    }
  }
}
export function castSpell(d, id, command, score = 50) {
  if (
    d.phase !== "playing" ||
    typeof command !== "string" ||
    !Object.hasOwn(SPELLS, command)
  )
    return null;
  const p = d.players.find((p) => p.id === id),
    target = d.players.find((p) => p.id !== id);
  if (!p || !target || d.time < p.cooldowns[command]) return null;
  const power = getSpellPower(command, score);
  p.cooldowns[command] = d.time + SPELLS[command].cooldown;
  if (command === "shield") p.shieldUntil = d.time + power.shieldDuration;
  if (command === "heal") p.health = Math.min(100, p.health + power.heal);
  if (command === "dash") {
    p.x += p.direction.x * power.dashDistance;
    p.z += p.direction.z * power.dashDistance;
    clampPosition(p);
  }
  if (
    (command === "fireball" || command === "lightning") &&
    Math.hypot(p.x - target.x, p.z - target.z) <=
      (command === "fireball" ? 12 : 7) &&
    target.shieldUntil <= d.time
  ) {
    target.health = Math.max(0, target.health - power.damage);
    if (target.health === 0) {
      d.phase = "finished";
      d.winnerId = p.id;
    }
  }
  return {
    type: "cast",
    ...power,
    power,
    playerId: id,
    command,
    x: p.x,
    z: p.z,
    targetX: target.x,
    targetZ: target.z,
  };
}
export function forfeit(d, id) {
  if (d.phase === "finished") return;
  d.phase = "finished";
  d.winnerId = d.players.find((p) => p.id !== id)?.id || null;
}
export function snapshot(d, roomCode) {
  return {
    type: "state",
    roomCode,
    phase: d.phase,
    winnerId: d.winnerId,
    time: d.time,
    players: d.players.map(({ input, direction, ...player }) => player),
  };
}
