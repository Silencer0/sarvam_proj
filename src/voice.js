import {getApiUrl} from "./endpoints.js";
/** Complete, independently decodable utterances; no browser credentials. */
export function createVoiceController({
  onTranscript = () => {},
  getPlayerId = () => "",
  onStatus = () => {},
  onError = () => {},
} = {}) {
  let stream, context, source, analyser, recorder, interval, abort;
  let active = false,
    generation = 0,
    pending = false;
  function stop() {
    active = false;
    generation++;
    clearInterval(interval);
    abort?.abort();
    abort = null;
    if (recorder && recorder.state !== "inactive") recorder.stop();
    recorder = null;
    stream?.getTracks().forEach((track) => track.stop());
    stream = null;
    source?.disconnect();
    source = null;
    context?.close().catch(() => {});
    context = null;
    onStatus("off");
  }
  async function start() {
    if (active) return Boolean(stream && recorder?.state === "recording");
    stop();
    const session = generation;
    active = true;
    onStatus("connecting");
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.MediaRecorder)
        throw new Error(
          "Voice requires a modern browser on localhost or HTTPS.",
        );
      const health = await fetch(getApiUrl("/api/health")).then((response) =>
        response.json(),
      );
      if (!active || session !== generation) return false;
      if (!health.configured)
        throw new Error(
          "Speech engine is not configured. Add SARVAM_API_KEY to .env and restart the server.",
        );
      const captured = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
        video: false,
      });
      if (!active || session !== generation) {
        captured.getTracks().forEach((track) => track.stop());
        return false;
      }
      stream = captured;
      stream.getTracks().forEach((track) =>
        track.addEventListener?.(
          "ended",
          () => {
            if (active && session === generation) {
              stop();
              onError(
                "Microphone disconnected. Check microphone permission and reconnect.",
              );
            }
          },
          { once: true },
        ),
      );
      context = new (window.AudioContext || window.webkitAudioContext)();
      await context.resume();
      if (!active || session !== generation) return false;
      source = context.createMediaStreamSource(stream);
      analyser = context.createAnalyser();
      analyser.fftSize = 1024;
      source.connect(analyser);
      const samples = new Float32Array(analyser.fftSize);
      const mime = [
        "audio/webm;codecs=opus",
        "audio/ogg;codecs=opus",
        "audio/mp4",
      ].find((type) => MediaRecorder.isTypeSupported(type));
      let lastSpeech = 0,
        firstSpeech = 0,
        started = 0,
        heard = false;
      function record() {
        if (!active || session !== generation || pending) return;
        try {
          heard = false;
          lastSpeech = 0;
          firstSpeech = 0;
          started = performance.now();
          const chunks = [];
          const currentRecorder = new MediaRecorder(
            stream,
            mime ? { mimeType: mime } : {},
          );
          recorder = currentRecorder;
          currentRecorder.ondataavailable = (event) => {
            if (event.data.size) chunks.push(event.data);
          };
          currentRecorder.onerror = () => {
            if (session === generation) {
              stop();
              onError(
                "Microphone recording failed. Enable your microphone and reconnect.",
              );
            }
          };
          currentRecorder.onstop = async () => {
            if (!active || session !== generation) return false;
            if (!heard || !chunks.length) {
              record();
              return;
            }
            pending = true;
            onStatus("transcribing");
            abort = new AbortController();
            const form = new FormData();
            const blob = new Blob(chunks, {
              type: currentRecorder.mimeType || "audio/webm",
            });
            form.append(
              "file",
              blob,
              blob.type.includes("mp4")
                ? "voice.m4a"
                : blob.type.includes("ogg")
                  ? "voice.ogg"
                  : "voice.webm",
            );
            const playerId = getPlayerId();
            if (playerId) form.append("playerId", playerId);
            try {
              const response = await fetch(getApiUrl("/api/transcribe"), {
                method: "POST",
                body: form,
                signal: abort.signal,
              });
              const data = await response.json();
              if (!response.ok)
                throw new Error(
                  data.error || "Speech request failed. Try again.",
                );
              if (active && session === generation && data.transcript.trim())
                onTranscript(data.transcript, data);
            } catch (error) {
              if (
                active &&
                session === generation &&
                error.name !== "AbortError"
              )
                onError(error.message || "Speech engine unavailable.");
            } finally {
              if (active && session === generation) {
                pending = false;
                onStatus("listening");
                record();
              }
            }
          };
          currentRecorder.start();
          onStatus("listening");
          return true;
        } catch {
          if (active && session === generation) {
            stop();
            onError(
              "Microphone recording failed. Check your microphone and reconnect.",
            );
          }
          return false;
        }
      }
      pending = false;
      if (!record()) return false;
      interval = setInterval(() => {
        if (!active || pending || recorder?.state !== "recording") return;
        analyser.getFloatTimeDomainData(samples);
        const rms = Math.sqrt(
          samples.reduce((sum, value) => sum + value * value, 0) /
            samples.length,
        );
        const now = performance.now();
        if (rms > 0.018) {
          if (!heard) firstSpeech = now;
          heard = true;
          lastSpeech = now;
          onStatus("hearing");
        }
        if (
          (heard && (now - lastSpeech > 900 || now - firstSpeech >= 10000)) ||
          (!heard && now - started >= 5000)
        )
          recorder.stop();
      }, 60);
      return true;
    } catch (error) {
      if (session !== generation) return false;
      stop();
      onError(
        error.name === "NotAllowedError"
          ? "Microphone blocked. Allow microphone access in your browser, then reconnect."
          : error.name === "NotFoundError"
            ? "No microphone found. Connect a microphone and retry."
            : error.message || "Cannot connect to the speech engine.",
      );
      return false;
    }
  }
  return { start, stop };
}
