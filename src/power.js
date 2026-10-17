/** Fixed spell effects shared by solo and authoritative multiplayer combat. */
const BASE_DAMAGE = { fireball: 40, lightning: 75 };
export function getSpellPower(command) {
  return {
    multiplier: 1,
    scale: 1,
    damage:
      typeof command === "string" && Object.hasOwn(BASE_DAMAGE, command)
        ? BASE_DAMAGE[command]
        : 0,
    heal: command === "heal" ? 30 : 0,
    shieldDuration: command === "shield" ? 2.5 : 0,
    dashDistance: command === "dash" ? 3 : 0,
  };
}
