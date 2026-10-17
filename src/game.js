export const SPELLS = {
  fireball: {
    label: "Fireball",
    hint: "“fireball”",
    cooldown: 1.2,
    damage: 40,
    color: "#ff9a46",
    icon: "✦",
  },
  lightning: {
    label: "Lightning",
    hint: "“lightning”",
    cooldown: 5,
    damage: 75,
    color: "#d6c4ff",
    icon: "ϟ",
  },
  shield: {
    label: "Shield",
    hint: "“shield”",
    cooldown: 8,
    color: "#8ee7e0",
    icon: "◇",
  },
  dash: {
    label: "Dash",
    hint: "“dash”",
    cooldown: 3,
    color: "#fff3ad",
    icon: "»",
  },
  heal: {
    label: "Heal",
    hint: "“heal”",
    cooldown: 14,
    color: "#b5efa4",
    icon: "+",
  },
};
const aliases = {
  fireball: ["fireball", "fire ball", "fire", "attack", "आग", "अग्नि", "हमला"],
  lightning: ["lightning", "thunder", "electric", "बिजली", "वज्र"],
  shield: ["shield", "block", "protect", "ढाल", "बचाओ", "रक्षा"],
  dash: ["dash", "dodge", "भागो", "तेज"],
  heal: ["heal", "health", "healing", "इलाज", "ठीक", "उपचार"],
};
export function commandFromTranscript(text) {
  const clean = String(text)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
  for (const [command, words] of Object.entries(aliases))
    for (const word of words)
      if ((" " + clean + " ").includes(" " + word + " ")) return command;
  return null;
}
export function createGame() {
  return {
    health: 100,
    score: 0,
    time: 0,
    wave: 1,
    status: "playing",
    shieldUntil: 0,
    cooldowns: Object.fromEntries(Object.keys(SPELLS).map((k) => [k, 0])),
  };
}
export function tick(g, dt) {
  if (g.status === "playing") g.time += dt;
}
export function damage(g, amount) {
  if (g.time < g.shieldUntil || g.status !== "playing") return;
  g.health = Math.max(0, g.health - amount);
  if (!g.health) g.status = "defeat";
}
export function cast(g, command) {
  if (g.status !== "playing" || !SPELLS[command])
    return { ok: false, reason: "Arena is resting" };
  if (g.cooldowns[command] > g.time)
    return {
      ok: false,
      reason: `${SPELLS[command].label} ready in ${Math.ceil(g.cooldowns[command] - g.time)}s`,
    };
  g.cooldowns[command] = g.time + SPELLS[command].cooldown;
  if (command === "shield") g.shieldUntil = g.time + 2.5;
  if (command === "heal") g.health = Math.min(100, g.health + 30);
  return { ok: true };
}
