# Deployment status

Frontend production URL: https://echo-arena-bice.vercel.app

The Vercel deployment is READY. Public HTTP checks returned 200 for the page, JavaScript bundle and stylesheet. Its upload manifest was checked to exclude backend source, `.env` files and the Sarvam API key. No Sarvam key is configured in Vercel.

The Render Blueprint is prepared at `render.yaml`, with a single free-plan Docker service in Singapore. Its allowed frontend origin is prefilled with the production Vercel URL. The Dockerfile excludes local secrets and runs the API, speech judge, cast-proof store and WebSocket room simulation in one Node process. Docker execution could not be tested locally because no Docker daemon is running.

## Pending backend provisioning

Open https://render.com/deploy?repo=https://github.com/Silencer0/sarvam_proj and create the backend in the intended Render account. Supply `SARVAM_API_KEY` privately from the local `.env`; do not paste it into chat or a public configuration field. Render account authentication is not available to this session.

After the backend is ready, its actual public HTTPS origin must be configured as Vercel's `VITE_BACKEND_URL` production build variable, followed by a new frontend deployment. Verify backend `/api/health`, CORS from the Vercel origin, WSS room creation/joining and scored speech before declaring the complete game live. Until then the frontend is online, but speech and PvP are not connected.

The Render free plan can sleep and cold-start. Rebooting or redeploying the backend discards in-memory rooms and proofs. Keep one instance; multiple instances require shared state and coordination.

Local verification for this deployment change: 35 tests pass, production client build passes, and explicit HTTP/WebSocket origin checks pass. Vercel's hosted production build also passes. GitHub auto-deploy linking failed in Vercel; direct authenticated CLI deployment succeeded.
