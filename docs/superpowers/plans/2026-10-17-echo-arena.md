# Echo Arena Implementation Plan

> **For agentic workers:** Use subagent-driven development with parallel file ownership as explicitly requested by the user.

**Goal:** Ship a playable 3D cartoon voice combat browser game.
**Architecture:** Three.js client, deterministic combat module, Node speech proxy, browser utterance recorder.
**Tech Stack:** JavaScript, Vite, Three.js, Express, Node test runner.
**Spec:** docs/superpowers/specs/2026-10-17-echo-arena-design.md

## Global Constraints
The API key exists only in ignored .env. Combat uses voice. Use licensed open-source assets and music. Push milestones. User explicitly requests no approval pauses and parallel implementation.

## Review Focus
Microphone denial must show an actionable error. Empty or oversized audio is rejected. Cooldowns prevent repeated actions. Restart resets state. Build output cannot contain credentials.

### Task 1: Game and interface
Files: index.html, src/main.js, src/game.js, src/style.css, tests/game.test.js.
Interface: createVoiceController({onTranscript,onStatus,onError}) returns start(), stop(); game consumes transcript and maps combat commands. Assets use public/assets manifest.
- [ ] Write and run failing tests for command aliases, cooldown, shield, restart.
- [ ] Implement 3D arena, combat, waves, HUD and voice integration.
- [ ] Run tests and production build.

### Task 2: Speech backend and recorder
Files: server/index.js, server/app.js, src/voice.js, tests/server.test.js, .env.example, vite.config.js.
Interface: POST /api/transcribe multipart file returns {transcript,language_code}; GET /api/health returns configured flag. createVoiceController callbacks above; start and stop manage microphone resources.
- [ ] Write and run failing tests for validation, secret boundary and upstream failure.
- [ ] Implement bounded secure proxy and complete-utterance recording with VAD.
- [ ] Run tests; do not log credentials or raw upstream failures.

### Task 3: Open assets and docs
Files: public/assets/**, README.md.
- [ ] Download verified CC0 Kenney model and audio assets with licenses.
- [ ] Document exact chosen files and paths for game integration.
- [ ] Write setup, controls, architecture, attribution, limitations README.

### Task 4: Integration and validation
- [ ] Install dependencies; integrate all modules; run tests and build.
- [ ] Browser smoke test start, rendering, microphone denial, resize and restart.
- [ ] Scan staged files and build for credentials without printing matches.
- [ ] Commit and push working milestones and final result.
