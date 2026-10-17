# Echo Arena design

## Product scope

Build a polished cartoon voice-combat browser game rendered entirely in 3D. The user authorized fast parallel implementation, regular pushes, and the extension to two-player PvP. Solo survival remains available. WASD or arrow keys move the player; every combat ability requires a complete spoken rap bar, translated and judged by Sarvam AI to select fireball, lightning, shield, dash, or heal.

Solo mode uses automatic targeting and escalating enemy waves, with health, cooldowns, score, victory, defeat, and restart completing the loop. PvP mode lets one player create a room code and a second player join that room on the same server. Two participants fight until one loses all health or disconnects. A disconnect forfeits the match; a rematch uses a new room.

## Architecture

Vite and Three.js render the arena and HUD. A Node/Express server accepts short microphone recordings and calls Sarvam speech-to-text. The root `.env` holds `SARVAM_API_KEY` and is ignored by Git; the browser never receives the key. `.env.example` contains an empty setting. The speech proxy enforces upload limits and timeouts and returns safe errors. Transcripts map to a fixed vocabulary in the browser.

Native WebSockets at `/ws` carry PvP room events, movement intent, spell commands, and state snapshots. The server owns movement, health, cooldowns, ranges, and combat outcomes. The client renders server state and sends intent rather than choosing its health or damage. Solo state remains local. Production serves the built client and API from the same Node server.

## PvP combat rules

Players start with 100 health. The following are base effects before the latest score-based scaling described below. Fireball deals 40 damage within 12 arena units and has a 1.2-second cooldown. Lightning deals 75 damage within 7 units and has a 5-second cooldown. Shield blocks damage for 2.5 seconds and has an 8-second cooldown. Dash moves 3 units and has a 3-second cooldown. Heal restores 30 health up to 100 and has a 14-second cooldown. Cooldown durations match solo mode. The authoritative server rejects invalid actions and prevents clients from bypassing cooldowns.

## Experience

The entry screen explains microphone permission and offers solo, create-room, and join-room paths. Room waiting and opponent disconnect outcomes are visible. Listening, transcription, recognized action, health, and cooldown feedback explain voice control. A teal and cream interface frames a colorful low-poly courtyard. Solo enemies telegraph attacks and spells have distinct effects. Microphone errors and unavailable credentials are actionable. Sound can be muted.

## Hosting boundary

Two browsers on one machine can share the localhost development server. Remote opponents must open the same publicly reachable HTTPS deployment. Its reverse proxy must forward WebSocket upgrades for `/ws`; HTTPS clients use WSS. Room codes do not provide NAT traversal. This workspace does not itself provide a public deployment. Credentials remain server-side in every mode.

## Assets and verification

Use verified CC0 Kenney character/environment assets and music/sounds with checked-in licenses and a manifest. Verify solo rules, speech validation and credential isolation, then room lifecycle, authoritative PvP state, combat rules, disconnect forfeits, and WebSocket integration. Run the production build and scan tracked/staged files and output for secrets without printing matches. Browser rendering and real microphone behavior need manual verification when browser automation is unavailable. See `docs/verification.md` for evidence and outstanding checks.

## Latest scope: AI-judged rap controls and real spell scaling

This scope supersedes any earlier bare-command casting, lexical quality scoring, or cosmetic-only score interpretation. Accept 4–80-word bars subject to local diversity validation. Use Sarvam speech translation across the 23 supported spoken languages, then Sarvam's real chat/LLM API to judge translated lyric text and select a spell. Require the same server-only `.env` key to have speech and chat access. Topics appear by the cards: fire/heat, storm/electricity, armor/protection, speed/escape, and life/recovery.

The judge awards 0–100 points: topic relevance 40, creativity 30, wordplay/rhyme 20, coherence 10. It evaluates translated text, not audio cadence, accent, or delivery. Translation can erase native rhyme or wordplay. The implementation defines the weak-bar rejection threshold; rejected bars cannot cast. Upstream failure or invalid output fails closed, with no fabricated lexical score.

Visible size uses `0.5 + 1.5 × score / 100`; actual power uses `0.25 + 1.75 × score / 100`. Scale base fireball damage 40, lightning damage 75, heal amount 30, shield duration 2.5 seconds, and dash distance 3 units. Round damage and healing, cap health at 100, and preserve cooldowns and attack ranges. These rules apply in solo and PvP.

PvP uses a signed, short-lived, single-use server-issued cast proof that binds player identity, command, and judged score. The authoritative server validates and consumes it, ignores client-provided scores, and rejects expired, altered, reused, or wrong-player proofs. Voice processing adds an LLM network round trip and token charges. Clearly expose score and real spell strength to the player. New judge/scaling/proof tests and live verification are pending until independently run; historical results do not establish this scope works.
