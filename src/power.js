/** Shared score-to-power math; the server supplies the trusted Sarvam score in duels. */
const BASE_DAMAGE = { fireball: 40, lightning: 75 };
export function getSpellPower(command, score = 50) {
  score = Number.isFinite(score) ? Math.max(0, Math.min(100, score)) : 50;
  const multiplier = 0.25 + (1.75 * score) / 100;
  const scale = 0.5 + (1.5 * score) / 100;
  return {
    score,
    multiplier,
    scale,
    damage:
      typeof command === "string" && Object.hasOwn(BASE_DAMAGE, command)
        ? Math.round(BASE_DAMAGE[command] * multiplier)
        : 0,
    heal: command === "heal" ? Math.round(30 * multiplier) : 0,
    shieldDuration: command === "shield" ? 2.5 * multiplier : 0,
    dashDistance: command === "dash" ? 3 * multiplier : 0,
  };
}
