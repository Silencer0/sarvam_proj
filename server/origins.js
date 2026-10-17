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
