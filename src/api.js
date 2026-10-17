import { getApiUrl } from "./endpoints.js";
const setup =
  "For local play, run npm run dev and open http://localhost:5173. For hosted play, check VITE_BACKEND_URL and that the backend is running.";
/** Read backend JSON without exposing HTML pages, proxy diagnostics or raw parse failures. */
function apiError(message, status = 0) {
  return Object.assign(new Error(message), { status });
}
export async function fetchGameJson(path, options = {}) {
  let response;
  try {
    response = await fetch(getApiUrl(path), options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw apiError(`Cannot reach the game backend at ${path}. ${setup}`);
  }
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const format = /^\s*</.test(text) ? "HTML instead of JSON" : "invalid JSON";
    throw apiError(
      `Game backend returned ${format} for ${path} (HTTP ${response.status}). ${setup}`,
      response.status,
    );
  }
  if (!response.ok)
    throw apiError(
      typeof data?.error === "string"
        ? data.error.slice(0, 300)
        : `Game backend request ${path} failed (HTTP ${response.status}). ${setup}`,
      response.status,
    );
  if (path === "/api/health" && typeof data?.configured !== "boolean")
    throw apiError(`Invalid backend health response. ${setup}`);
  if (path === "/api/transcribe" && typeof data?.transcript !== "string")
    throw apiError(`Invalid backend transcription response. ${setup}`);
  return data;
}
