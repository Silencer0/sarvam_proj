/** Public network origins only. Credentials stay on the speech/game server. */
function parseOrigin(value, label) {
  if (typeof value !== "string" || !/^https?:\/\//i.test(value))
    throw Error(`${label} must be an HTTP(S) origin.`);
  let url;
  try {
    url = new URL(value);
  } catch {
    throw Error(`${label} is not a valid origin.`);
  }
  if (
    url.username ||
    url.password ||
    url.pathname !== "/" ||
    url.search ||
    url.hash ||
    /[?#]/.test(value)
  )
    throw Error(
      `${label} must contain only an origin, without credentials, paths, queries or fragments.`,
    );
  const loopback = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
  if (url.protocol !== "https:" && !(url.protocol === "http:" && loopback))
    throw Error(
      `${label} must use HTTPS; HTTP is allowed only for local development.`,
    );
  return url.origin;
}
export function createEndpoints(
  backendUrl = "",
  pageOrigin = "http://localhost:5173",
) {
  const backend = backendUrl ? parseOrigin(backendUrl, "VITE_BACKEND_URL") : "";
  const origin = backend || parseOrigin(pageOrigin, "Page origin");
  return {
    apiUrl(path) {
      if (
        typeof path !== "string" ||
        !path.startsWith("/api/") ||
        /[\\?#]/.test(path) ||
        path.includes("..")
      )
        throw Error(
          "API path must start with /api/ and contain no traversal or query.",
        );
      return backend + path;
    },
    webSocketUrl() {
      return origin.replace(/^http/, "ws") + "/ws";
    },
  };
}
function currentEndpoints() {
  const page = globalThis.location;
  const origin =
    page?.origin ||
    (page?.protocol && page?.host
      ? `${page.protocol}//${page.host}`
      : "http://localhost:5173");
  return createEndpoints(import.meta.env?.VITE_BACKEND_URL || "", origin);
}
export function getApiUrl(path) {
  return currentEndpoints().apiUrl(path);
}
export function getWebSocketUrl() {
  return currentEndpoints().webSocketUrl();
}
