# Current verification scope

The game now casts from spoken spell names again. Rap judging, chat-model requests, quality scores and score-based power scaling have been removed. Speech still uses Sarvam translation and automatic language detection across its documented 23 supported languages. PvP requires player-bound single-use proofs for recognized commands; client score claims have no effect.

The browser validates backend responses before parsing/using them. HTML fallback pages, plain-text proxy failures, malformed JSON, network errors and unexpected response shapes produce endpoint-specific setup messages rather than raw JSON parsing errors. Local API health checks at ports 3001 and 5173 returned valid JSON; the exact route that caused the user's reported failure has not been identified.

Deployment remains split between the Vercel frontend and one Render Node backend. The Vercel frontend is online at https://echo-arena-bice.vercel.app, and Render Blueprint ID exs-db9muleq1p3s738rojp0 was supplied. The actual Render service URL is still needed to connect and verify it. No complete hosted speech/PvP verification is claimed. Earlier visual browser automation was unavailable.

Current checks: all 40 automated tests pass and the production client build passes. A real single-word fireball audio request through the local Vite API proxy returned HTTP 200 with command fireball, a cast token and no rap assessment.

The local origin rejection was reproduced with an Origin header through the Vite proxy. Development now explicitly permits loopback frontend origins at ports 5173 and 4173; production keeps only configured origins. Real local Origin-header checks return200 for localhost/127.0.0.1:5173 and403 for an unapproved external origin. Service failures have separate UI guidance;403/503 stop capture without a microphone reconnect loop. The full suite now passes43tests and the production build passes.
