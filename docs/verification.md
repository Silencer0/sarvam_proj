# Verification record

## Current integrated result

The full suite passes **28 tests**, covering solo combat, two real WebSocket peers, the actual client transport, speech validation, microphone denial/disconnection/onset timing, score-to-power scaling, AI score schema validation, and signed cast proofs. The production build passes. Its Three.js bundle produces a size advisory, not a build failure.

Independent code review found no blocking integration defects. Both solo and PvP use the same bounded power formula. PvP requires an expiring, single-use server proof binding the assessed spell and score to the player; client-supplied scores are ignored. Tampered, expired, reused and wrong-player proofs are rejected.

## Live Sarvam checks

A generated English rap bar passed speech-to-English translation and live `sarvam-105b` judging, returning an accepted fireball score of 55. A same-topic quality comparison scored a weak bar **25** and a stronger creative bar **82**. These are observed examples, not a guarantee that subjective model ratings are identical between calls.

The working judge request explicitly disables reasoning with `reasoning_effort: null` and allows 512 output tokens. Request-configuration regression assertions cover those settings. No API key, recorded audio, response transcript, or private model reasoning is recorded here.

For fireball, score 25 yields 28 damage and 0.875× visual size; score 82 yields 67 damage and 1.73× size. Both follow the shared score formula. Healing amount, shield duration, and dash distance scale as well; cooldowns remain fixed.

Spoken-language coverage follows Sarvam's documented 23-language translation support. Each language has not been individually live-tested. The judge assesses translated lyric content, topic relevance and wordplay; translation can alter rhyme. Audio cadence and accent are not evaluated.

## Credentials

Credential scans of staged files and the production bundle pass. `.env` is ignored and untracked; the API key remains server-only. Cast-signing secrets are generated in memory, not committed or sent to clients.

## Browser and deployment limits

Earlier browser automation was rejected under the environment's approval policy. No visual, microphone-permission, or two-browser gameplay pass is claimed. Manual checks remain for scene layout, visible score-dependent effects, room joining and complete-match replay. No public deployment, reverse-proxy or remote-network play verification is claimed.
