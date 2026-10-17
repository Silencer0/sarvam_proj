import { getApiUrl } from "./endpoints.js";
const setup =
  "For local play, run npm run dev and open http://localhost:5173. For hosted play, check VITE_BACKEND_URL and that the backend is running.";
/** Read backend JSON without exposing HTML pages, proxy diagnostics or raw parse failures. */
export async function fetchGameJson(path, options = {}) {
  let response;
  try {
    response = await fetch(getApiUrl(path), options);
  } catch (error) {
    if (error.name === "AbortError") throw error;
    throw new Error(`Cannot reach the game backend at ${path}. ${setup}`);
  }
  const text = await response.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    const format = /^\s*</.test(text) ? "HTML instead of JSON" : "invalid JSON";
    throw new Error(
      `Game backend returned ${format} for ${path} (HTTP ${response.status}). ${setup}`,
    );
  }
  if (!response.ok)
    throw new Error(
      typeof data?.error === "string"
        ? data.error.slice(0, 300)
        : `Game backend request ${path} failed (HTTP ${response.status}). ${setup}`,
    );
  if (path === "/api/health" && typeof data?.configured !== "boolean")
    throw new Error(`Invalid backend health response. ${setup}`);
  if (path === "/api/transcribe" && typeof data?.transcript !== "string")
    throw new Error(`Invalid backend transcription response. ${setup}`);
  return data;
}
