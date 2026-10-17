/** Explicit frontend origins for a separately hosted browser client. */
export function isOriginAllowed(origin, host, allowedOrigins = []) {
  if (!origin) return true;
  try {
    const parsed = new URL(origin);
    if (
      !["http:", "https:"].includes(parsed.protocol) ||
      parsed.origin !== origin
    )
      return false;
    return parsed.host === host || allowedOrigins.includes(origin);
  } catch {
    return false;
  }
}

/** Vite changes the upstream Host; explicitly permit its loopback origins only in development. */
export function getAllowedOrigins(env = process.env) {
  const configured = (env.ALLOWED_ORIGINS || "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  if (env.NODE_ENV !== "production") {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
      for (const port of [5173, 4173])
        configured.push(`http://${host}:${port}`);
    }
  }
  return [...new Set(configured)];
}
