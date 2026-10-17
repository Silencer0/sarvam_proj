import test from "node:test";
import assert from "node:assert/strict";
import { createVoiceController } from "../src/voice.js";

function browser(t, getUserMedia) {
  const previous = new Map();
  const set = (key, value) => {
    previous.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
    Object.defineProperty(globalThis, key, {
      configurable: true,
      writable: true,
      value,
    });
  };
  class Recorder {
    static isTypeSupported() {
      return true;
    }
    constructor() {
      this.state = "inactive";
      this.mimeType = "audio/webm";
    }
    start() {
      this.state = "recording";
    }
    stop() {
      this.state = "inactive";
      this.onstop?.();
    }
  }
  class AudioContext {
    async resume() {}
    async close() {}
    createMediaStreamSource() {
      return { connect() {}, disconnect() {} };
    }
    createAnalyser() {
      return {
        fftSize: 1024,
        getFloatTimeDomainData(array) {
          array.fill(0);
        },
      };
    }
  }
  set("navigator", { mediaDevices: { getUserMedia } });
  set("window", { MediaRecorder: Recorder, AudioContext });
  set("MediaRecorder", Recorder);
  set("fetch", async () => new Response(JSON.stringify({ configured: true })));
  t.after(() => {
    for (const [key, descriptor] of previous) {
      if (descriptor) Object.defineProperty(globalThis, key, descriptor);
      else delete globalThis[key];
    }
  });
}
test("denied microphone returns false and an actionable error", async (t) => {
  browser(t, async () => {
    throw Object.assign(new Error(), { name: "NotAllowedError" });
  });
  const errors = [];
  const statuses = [];
  const voice = createVoiceController({
    onError: (error) => errors.push(error),
    onStatus: (status) => statuses.push(status),
  });
  assert.equal(await voice.start(), false);
  assert.match(errors[0], /allow microphone/i);
  assert.equal(statuses.at(-1), "off");
});
test("successful microphone starts listening and stop releases every track", async (t) => {
  let released = 0;
  browser(t, async () => ({
    getTracks: () => [
      {
        stop() {
          released++;
        },
      },
      {
        stop() {
          released++;
        },
      },
    ],
  }));
  const statuses = [];
  const voice = createVoiceController({
    onStatus: (status) => statuses.push(status),
  });
  t.after(() => voice.stop());
  assert.equal(await voice.start(), true);
  assert.equal(statuses.at(-1), "listening");
  voice.stop();
  assert.equal(released, 2);
  assert.equal(statuses.at(-1), "off");
});
test("disconnected microphone stops capture and reports how to reconnect", async (t) => {
  let ended,
    released = 0;
  const track = {
    addEventListener(event, callback) {
      if (event === "ended") ended = callback;
    },
    stop() {
      released++;
    },
  };
  browser(t, async () => ({ getTracks: () => [track] }));
  const errors = [],
    statuses = [];
  const voice = createVoiceController({
    onError: (message) => errors.push(message),
    onStatus: (status) => statuses.push(status),
  });
  t.after(() => voice.stop());
  assert.equal(await voice.start(), true);
  assert.equal(typeof ended, "function");
  ended();
  assert.equal(statuses.at(-1), "off");
  assert.equal(released, 1);
  assert.match(errors[0], /microphone.*reconnect/i);
});
test("recorder construction failure returns false and releases capture", async (t) => {
  let released = 0;
  browser(t, async () => ({
    getTracks: () => [
      {
        stop() {
          released++;
        },
      },
    ],
  }));
  class BrokenRecorder {
    static isTypeSupported() {
      return true;
    }
    constructor() {
      throw new Error("capture lost");
    }
  }
  globalThis.MediaRecorder = BrokenRecorder;
  window.MediaRecorder = BrokenRecorder;
  const errors = [];
  const voice = createVoiceController({
    onError: (message) => errors.push(message),
  });
  assert.equal(await voice.start(), false);
  assert.equal(released, 1);
  assert.match(errors[0], /reconnect/i);
});
