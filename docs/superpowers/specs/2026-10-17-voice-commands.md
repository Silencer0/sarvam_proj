# Current voice command behavior

The user's latest instruction removes rap gameplay. Say a spell name to cast: fireball, lightning, shield, dash or heal. Sarvam automatically detects and translates supported languages. The server resolves translated text into a known command and returns a player-bound single-use cast proof for PvP. There is no chat-model call, lyric requirement, quality score or damage scaling. Powers are fixed: fireball 40 damage, lightning 75, heal 30, shield 2.5 seconds, dash 3 units, with existing cooldowns.

Frontend API responses are validated before use. Non-JSON bodies, HTML fallback pages, proxy failures and invalid JSON return endpoint-specific instructions rather than raw parsing exceptions. Solo startup uses the voice controller's single health check. Regression tests exercise these cases.

This supersedes the earlier rap-casting specification and quality-scoring plan. Deployment remains Vercel frontend plus one persistent Render backend.
