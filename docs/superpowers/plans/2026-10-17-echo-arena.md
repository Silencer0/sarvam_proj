# Echo Arena Implementation Plan

> **For agentic workers:** Use subagent-driven development with parallel file ownership as explicitly requested by the user.

**Goal:** Ship a playable 3D cartoon voice combat browser game with solo survival and two-player room-code PvP.
**Architecture:** Three.js client, deterministic solo combat module, authoritative PvP server over native `/ws` WebSockets, Node speech proxy, browser utterance recorder.
**Tech Stack:** JavaScript, Vite, Three.js, Express, Node test runner.
**Spec:** docs/superpowers/specs/2026-10-17-echo-arena-design.md

## Global Constraints

The API key exists only in ignored .env. Combat uses voice. Use licensed open-source assets and music. Push milestones. User explicitly requests no approval pauses and parallel implementation.

## Review Focus

Microphone denial must show an actionable error. Empty or oversized audio is rejected. Cooldowns prevent repeated actions. Restart resets state. Build output cannot contain credentials.

### Task 1: Game and interface

Files: index.html, src/main.js, src/game.js, src/style.css, tests/game.test.js.
Interface: createVoiceController({onTranscript,onStatus,onError}) returns start(), stop(); game consumes transcript and maps combat commands. Assets use public/assets manifest.

- [x] Write and run failing tests for command aliases, cooldown, shield, restart.
- [x] Implement 3D arena, combat, waves, HUD and voice integration.
- [x] Run tests and production build.

### Task 2: Speech backend and recorder

Files: server/index.js, server/app.js, src/voice.js, tests/server.test.js, .env.example, vite.config.js.
Interface: POST /api/transcribe multipart file returns {transcript,language_code}; GET /api/health returns configured flag. createVoiceController callbacks above; start and stop manage microphone resources.

- [x] Write and run failing tests for validation, secret boundary and upstream failure.
- [x] Implement bounded secure proxy and complete-utterance recording with VAD.
- [x] Run tests; do not log credentials or raw upstream failures.

### Task 3: Open assets and docs

Files: public/assets/\*\*, README.md.

- [x] Download verified CC0 Kenney model and audio assets with licenses.
- [x] Document exact chosen files and paths for game integration.
- [x] Write setup, controls, architecture, attribution, limitations README.

### Task 4: Integration and validation

- [x] Install dependencies; integrate all modules; run tests and build.
- [ ] Browser smoke test start, rendering, microphone denial, resize and restart. Blocked: browser automation rejected by approval policy; manual verification remains.
- [x] Scan staged files and build for credentials without printing matches.
- [x] Commit and push working milestones and final result.

### Task 5: Two-player PvP extension (user authorized)

**Goal:** Add room-code duels while retaining solo survival.
**Architecture extension:** Native WebSockets at `/ws`; the Node server owns movement, health, cooldowns, and combat. The client sends movement and recognized spell intent and renders authoritative snapshots.

- [x] Implement create/join room codes for exactly two participants and clear waiting/error states.
- [x] Add authoritative movement and combat: fireball 40 damage/range 12, lightning 75/range 7, shield 2.5 seconds, heal 30 capped at 100, dash 3 units; preserve solo cooldowns.
- [x] Implement disconnect forfeits and end-of-match feedback; rematches create a new room.
- [x] Integrate PvP selection, voice casts, opponent rendering, health, and cooldown feedback without breaking solo.
- [x] Proxy `/ws` in development and attach WebSocket handling to the production HTTP server.
- [x] Test room lifecycle, action validation, combat rules, disconnect behavior, and WebSocket integration; run the full test suite and build.
- [x] Document same-server room sharing and public HTTPS/WSS reverse-proxy requirements. Do not claim room codes bypass NAT or that a public deployment exists.
- [x] Preserve the server-only root `.env` boundary and scan output for secrets before pushing.

Baseline and outstanding verification are recorded in `docs/verification.md`. The integrated 18-test suite includes actual WebSocket peers and the client transport; the production build passes. A real Sarvam request also returned HTTP 200. Automated visual browser checks remain unavailable after an approval-policy rejection.

### Latest scope: Sarvam AI rap judging and score-scaled combat

This scope supersedes cosmetic score handling and bare-command casting.

- [x] Validate 4–80 words and local diversity; translate supported spoken languages with Sarvam.
- [x] Ask Sarvam's real LLM to choose the spell and judge translated lyric text using relevance 40, creativity 30, wordplay/rhyme 20, coherence 10.
- [x] Fail closed on rejected bars, invalid judge responses, or unavailable upstream; do not fabricate lexical quality scores.
- [x] Show topic cues by each spell card, judged score, and visible size scaling `0.5 + 1.5 × score / 100`.
- [x] Scale real damage/healing, shield duration, and dash distance by `0.25 + 1.75 × score / 100`; round damage/healing, preserve cooldowns/ranges, cap health.
- [x] Issue and validate short-lived, single-use signed PvP cast proofs bound to player, command, and score; reject client score manipulation and proof replay.
- [x] Test judging validation, failures, scaled solo/PvP rules, proof expiry/tamper/replay/wrong-player cases, and full integration.
- [x] Document translation limitations, translated-text scoring, speech plus chat access, additional latency, and token charges.

Do not claim live judge verification or updated test totals until the corresponding checks run.
