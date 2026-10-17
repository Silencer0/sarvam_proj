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

| Command     | Ability                               |
| ----------- | ------------------------------------- |
| “Fireball”  | Launch a fire attack                  |
| “Lightning” | Strike nearby enemies                 |
| “Shield”    | Protect yourself from incoming damage |
| “Dash”      | Make a quick escape                   |
| “Heal”      | Restore health                        |

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
