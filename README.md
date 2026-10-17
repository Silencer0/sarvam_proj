# Echo Arena

A browser-based 3D arena with solo survival and two-player voice duels, where your voice casts every combat ability. Move through a bright cartoon battleground, keep enemies at a distance, and speak your next spell. Speech recognition runs through Sarvam AI via a local server that keeps the API key out of browser code.

## Quick start

Requires Node.js 20.19+ or 22.12+, npm, an internet connection, and a Sarvam API key with speech-to-text access.

```bash
npm install
cp .env.example .env
```

Set the following value in the local `.env` file:

```dotenv
SARVAM_API_KEY=your_sarvam_api_key
```

Then start both services:

```bash
npm run dev
```

Open **http://localhost:5173**. The API server listens on **http://localhost:3001**; Vite proxies API requests and the `/ws` WebSocket connection to it. Allow microphone access when prompted, then use the in-game voice control to start listening.

Never put the key in a `VITE_` variable, frontend source, screenshots, logs, or commits. `.env` is ignored by Git; `.env.example` contains a placeholder only.

## Play

Use **WASD** or arrow keys to move. Speak a short, clear command to cast:

| Command        | Ability                               |
| -------------- | ------------------------------------- |
| “Fireball”     | Launch a fire attack                  |
| “Lightning”    | Strike nearby enemies                 |
| “Raise shield” | Protect yourself from incoming damage |
| “Dash”         | Make a quick escape                   |
| “Healing”      | Restore health                        |

Combat abilities are voice controlled. Watch the command feedback and ability cooldowns, and leave a short pause between commands. Enable sound after interacting with the page; browsers block autoplay before a user gesture.

## Two-player duels

Choose the multiplayer mode, create a room, and share its room code with your opponent. Your opponent opens the same server, chooses join, and enters the code. Both players need microphone permission and use the same voice commands and movement controls as solo mode. Two browser windows or profiles on one computer can use `http://localhost:5173`; use headphones and avoid capturing both players through one microphone.

**Remote players need the same publicly reachable deployment.** `localhost` refers to each player's own computer, so sharing a localhost URL or room code alone does not connect two machines. Deploy the client and Node server together under HTTPS and configure your reverse proxy to forward WebSocket upgrade requests at `/ws` to the Node server. The browser uses WSS on HTTPS. There is no automatic NAT traversal or peer-to-peer connection. No public deployment is provided by this workspace.

The server owns player movement, health, spell cooldowns, and combat outcomes. A player disconnecting forfeits the duel. For a rematch, create and join a new room. Solo survival remains available separately.

| Spell     | PvP effect                      | Cooldown |
| --------- | ------------------------------- | -------- |
| Fireball  | 40 damage within 12 arena units | 1.2 s    |
| Lightning | 75 damage within 7 arena units  | 5 s      |
| Shield    | Block damage for 2.5 s          | 8 s      |
| Dash      | Move 3 arena units              | 3 s      |
| Heal      | Restore 30 health, up to 100    | 14 s     |

## How it works

The browser records microphone audio and sends it to the same-origin API. The Node/Express proxy reads `SARVAM_API_KEY` from `.env`, submits audio to Sarvam speech-to-text, and returns the transcript and detected language. The client resolves the transcript into a recognized command. Solo mode applies it locally; multiplayer sends the command over the native `/ws` WebSocket connection for authoritative server validation and state updates. The API key stays on the server.

Microphone capture requires **localhost or HTTPS** and explicit permission. Use a current browser with WebGL, MediaRecorder, and microphone support. Headphones reduce game audio leaking into recognition. If the microphone is unavailable, check browser permissions, the selected input device, and whether another application is using it.

## Languages

Speech uses Sarvam automatic language detection and English translation across its 23 supported languages (English plus 22 Indian languages). Say a spell name or its equivalent in your language. Translation quality can vary. There is no rap judging, score, or quality-based damage scaling.

## Local troubleshooting

Start the game with `npm run dev` and open `http://localhost:5173`. This starts both Vite and the Node API on port 3001. Running only a static file server or opening `dist/index.html` cannot provide speech or PvP. For a production build, run `npm run build` then `npm start` and open `http://localhost:3001`.

If an API request returns HTML or invalid JSON, the game now shows the endpoint and HTTP status with setup guidance. Check that `http://localhost:5173/api/health` returns JSON with `configured: true`. Leave `VITE_BACKEND_URL` unset for a local backend; use the actual Render HTTPS origin only when connecting to Render.

## Development

```bash
npm test       # Automated tests
npm run build # Production client bundle in dist/
npm start     # Start the API server
```

For deployment, run `npm run build` followed by `npm start`; the Node server serves `dist/`, the API, and `/ws`. Put that server behind HTTPS with WebSocket upgrade forwarding. Serve the client and API under one HTTPS origin and supply the key through the server environment. Do not expose an unrestricted public speech proxy: add authentication, request limits, and usage monitoring appropriate to your deployment.

Speech recognition requires network access and an active Sarvam account. Commands have recording, upload, and transcription latency; this is a deliberate-paced voice game rather than an instant-response fighting game. Recognition can vary with microphone quality, background noise, accent, and network conditions. API calls can consume paid Sarvam usage; check your account limits and pricing before long sessions. No offline speech fallback is included.

## Open assets

All bundled character, environment, music, and sound assets are **CC0** assets by [Kenney](https://kenney.nl/assets):

- [Mini Arena](https://kenney.nl/assets/mini-arena): cartoon soldier, arena architecture, props, and vegetation.
- [Impact Sounds](https://kenney.nl/assets/impact-sounds): casting, hit, shield, and footstep cues.
- [Music Jingles](https://kenney.nl/assets/music-jingles): short looping background jingle and victory cue.

The music is a short licensed jingle loop, not a full-length soundtrack. Original license notices are in `public/assets/licenses/`. [Asset attribution](public/assets/ATTRIBUTION.md) and the [asset manifest](public/assets/manifest.json) record the original filenames and sources. Three.js is distributed under the MIT license; other package licenses remain with their respective authors.

## Deploy: Vercel frontend + Render backend

The checked-in `vercel.json` deploys the Vite client. The `render.yaml` Blueprint deploys one Docker-based Node backend. Keep exactly **one backend instance**: PvP rooms, live simulation and single-use cast proofs are currently held in memory. Restarting or redeploying that service ends active duels.

1. [Create the Render backend from this repository](https://render.com/deploy?repo=https://github.com/Silencer0/sarvam_proj). The Blueprint uses the free plan; it can sleep and cold-start. Use an always-on plan for a continuously available game if you choose to upgrade. Set `SARVAM_API_KEY` privately in Render using your local `.env` value. Set `ALLOWED_ORIGINS` to your exact Vercel frontend origin; it accepts comma-separated origins if you also need a preview URL. `TRUST_PROXY=1` is configured for Render's reverse proxy.
2. Copy the backend's actual HTTPS URL, such as `https://your-service.onrender.com`. Check `/api/health`; it should return `{"configured":true}`. The backend also serves a same-origin copy of the game, which can be used for initial verification.
3. Import this repository into Vercel with the Vite preset, or run `npx vercel login` and `npx vercel --prod`. Set **only the public** `VITE_BACKEND_URL` build variable to that backend origin. It must be an HTTPS origin with no path or credentials. Never set `SARVAM_API_KEY` as a frontend build variable or any `VITE_` variable.
4. Set Render's `ALLOWED_ORIGINS` to the resulting exact Vercel URL (no trailing slash), then redeploy the Vercel frontend after setting `VITE_BACKEND_URL`. The browser sends API requests and WSS connections directly to that backend; both reach the same Node instance.
5. Verify microphone permission, a scored bar, and a two-player duel from the Vercel URL. Preview domains must be explicitly allowed too. Do not use a wildcard origin for the speech proxy.

Vercel currently supports WebSockets, but separate connections need not land on the same Function instance. The current in-memory backend therefore stays on Render; deploying it directly as Vercel Functions would require shared room state, authoritative simulation ownership and atomic proof consumption. See [Vercel's persistent-state guidance](https://vercel.com/docs/functions/websockets#manage-persistent-state).

`.vercelignore` excludes the backend, tests and `.env` files from frontend upload. `.dockerignore` excludes `.env` from container builds. Docker execution was not verified locally if a Docker daemon is unavailable; the normal production build and automated network tests remain the local checks.
