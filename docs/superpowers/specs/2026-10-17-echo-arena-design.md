# Echo Arena design

Build a browser game for a fast, playable voice-combat demonstration. The approved direction is a polished cartoon wizard survival arena, rendered entirely in 3D. WASD controls movement; all combat uses spoken commands. Commands are fireball, lightning, shield, dash, and heal. Auto-targeting selects nearby enemies so speech latency does not require precise aiming. Enemy waves escalate, with health, cooldowns, score, defeat, and restart completing the loop.

## Architecture
Vite and Three.js render the arena and game HUD. A Node server accepts short microphone audio recordings and calls Sarvam speech-to-text. The browser never receives the API key. The key exists only in an ignored root .env, and .env.example contains an empty setting. Requests have file size limits, timeouts, and safe errors. Recognized transcripts map to a fixed command vocabulary; no arbitrary code or actions run from transcripts.

## Experience
A clear entry screen explains microphone permission and the commands. A live listening indicator, transcript, recognized action, and cooldown feedback make voice control understandable. A muted teal/cream interface frames a colorful low-poly courtyard. Enemies telegraph attacks and spells have distinct effects. Microphone errors and unavailable credentials are visible. Sound can be muted.

## Assets and verification
Use open-source or CC0 character/environment assets and music/sound with a checked-in attribution manifest. Test transcript mapping, cooldown and health rules, and the backend security boundary. Run a production build and browser smoke check. README covers setup, .env, API requirements, command vocabulary, controls, architecture, assets, and limitations. Commit and push verified milestones as requested.
