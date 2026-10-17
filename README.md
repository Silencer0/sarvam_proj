# Echo Arena

A browser-based 3D arena with solo survival and two-player voice duels, where your voice casts every combat ability. Move through a bright cartoon battleground, keep enemies at a distance, and rap your next spell. Speech recognition runs through Sarvam AI via a local server that keeps the API key out of browser code.

## Quick start

Requires Node.js 20.19+ or 22.12+, npm, an internet connection, and a Sarvam API key with speech-to-text and chat/LLM access.

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

Use **WASD** or arrow keys to move. Rap a complete **4–80-word bar** with a clear spell topic. Bare spell names and low-diversity repetition are rejected. Sarvam AI judges the translated lyrics, chooses the spell, and awards a score from **0 to 100**; weak or rejected bars do not cast. The topic cues beside the spell cards are fire/heat, storm/electricity, armor/protection, speed/escape, and life/recovery:

| Example rap line                    | Spell     |
| ----------------------------------- | --------- |
| “My burning fire lights the night”  | Fireball  |
| “I bring the thunder from above”    | Lightning |
| “My shield will guard my soul”      | Shield    |
| “I dash like wind across the sky”   | Dash      |
| “Let healing light restore my soul” | Heal      |

Speak naturally in any of Sarvam's **23 supported languages**: English, Hindi, Bengali, Kannada, Malayalam, Marathi, Odia, Punjabi, Tamil, Telugu, Gujarati, Assamese, Urdu, Nepali, Konkani, Kashmiri, Sindhi, Sanskrit, Santali, Manipuri, Bodo, Maithili, or Dogri. The server automatically detects the input language and translates your bar into English before the game evaluates its imagery. Support is limited to these languages; recognition and translation quality can vary. The judge scores the translated lyric text, so translation can lose wordplay and native-language rhyme. It does not judge audio cadence, delivery, or accent.

Use a clear complete line and pause briefly afterwards. Recordings finish after about **900 ms of silence**, or **10 seconds** at most, then upload for recognition. Leave space between bars and watch the translated transcript, spell feedback, and cooldowns. Enable sound after interacting with the page; browsers block autoplay before a user gesture.

## Two-player duels

Choose the multiplayer mode, create a room, and share its room code with your opponent. Your opponent opens the same server, chooses join, and enters the code. Both players need microphone permission and use the same rap casting and movement controls as solo mode. Two browser windows or profiles on one computer can use `http://localhost:5173`; use headphones and avoid capturing both players through one microphone.

**Remote players need the same publicly reachable deployment.** `localhost` refers to each player's own computer, so sharing a localhost URL or room code alone does not connect two machines. Deploy the client and Node server together under HTTPS and configure your reverse proxy to forward WebSocket upgrade requests at `/ws` to the Node server. The browser uses WSS on HTTPS. There is no automatic NAT traversal or peer-to-peer connection. No public deployment is provided by this workspace.

The server owns player movement, health, spell cooldowns, and combat outcomes. A player disconnecting forfeits the duel. For a rematch, create and join a new room. Solo survival remains available separately.

## Rap scores and spell power

Sarvam's LLM evaluates topic relevance (40 points), creativity (30), wordplay/rhyme (20), and coherence (10). The displayed score changes both visible spell size and gameplay strength:

```text
size scale = 0.5 + 1.5 × score / 100
power multiplier = 0.25 + 1.75 × score / 100
```

Damage and healing are rounded after scaling. Shield duration and dash distance scale with power; cooldowns and attack ranges stay fixed. For example, a score of 100 gives size 2× and power 2×, while a score of 50 gives size 1.25× and power 1.125×.

| Spell     | Base effect before score scaling | Cooldown |
| --------- | -------------------------------- | -------- |
| Fireball  | 40 damage within 12 arena units  | 1.2 s    |
| Lightning | 75 damage within 7 arena units   | 5 s      |
| Shield    | Block damage for 2.5 s           | 8 s      |
| Dash      | Move 3 arena units               | 3 s      |
| Heal      | Restore 30 health, capped at 100 | 14 s     |

If the AI judge is unavailable or returns an invalid result, the bar fails without casting. There is no substitute keyword-based quality score. Examples suggest a topic; they do not guarantee a particular score.

## How it works

The browser records microphone audio and sends it to the same-origin API. The Node/Express proxy reads `SARVAM_API_KEY` from the root `.env`, uses Sarvam Saaras v4 to detect the spoken language and translate the bar into English, then asks Sarvam's LLM to select a spell and judge its lyrics. Local word-count and diversity checks reject unsuitable input before judging. The same server-only key needs access to both speech and chat APIs.

Solo mode uses the judged result locally. In PvP, the server issues a signed, short-lived, single-use cast proof binding the player, command, and judged score. The authoritative WebSocket server validates this proof and ignores a score supplied by the client. A proof cannot be reused for another cast or player. The API key stays on the server.

Microphone capture requires **localhost or HTTPS** and explicit permission. Use a current browser with WebGL, MediaRecorder, and microphone support. Headphones reduce game audio leaking into recognition. If the microphone is unavailable, check browser permissions, the selected input device, and whether another application is using it.

## Development

```bash
npm test       # Automated tests
npm run build # Production client bundle in dist/
npm start     # Start the API server
```

For deployment, run `npm run build` followed by `npm start`; the Node server serves `dist/`, the API, and `/ws`. Put that server behind HTTPS with WebSocket upgrade forwarding. Serve the client and API under one HTTPS origin and supply the key through the server environment. Do not expose an unrestricted public speech proxy: add authentication, request limits, and usage monitoring appropriate to your deployment.

Speech recognition requires network access and an active Sarvam account. Rap lines have recording, upload, translation, transcription, and an additional LLM judging round trip; this is a deliberate-paced voice game rather than an instant-response fighting game. Recognition can vary with microphone quality, background noise, accent, and network conditions. Speech calls and LLM token usage can incur separate Sarvam charges; check your account limits and pricing before long sessions. No offline speech fallback is included.

## Open assets

All bundled character, environment, music, and sound assets are **CC0** assets by [Kenney](https://kenney.nl/assets):

- [Mini Arena](https://kenney.nl/assets/mini-arena): cartoon soldier, arena architecture, props, and vegetation.
- [Impact Sounds](https://kenney.nl/assets/impact-sounds): casting, hit, shield, and footstep cues.
- [Music Jingles](https://kenney.nl/assets/music-jingles): short looping background jingle and victory cue.

The music is a short licensed jingle loop, not a full-length soundtrack. Original license notices are in `public/assets/licenses/`. [Asset attribution](public/assets/ATTRIBUTION.md) and the [asset manifest](public/assets/manifest.json) record the original filenames and sources. Three.js is distributed under the MIT license; other package licenses remain with their respective authors.
