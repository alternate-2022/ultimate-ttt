# Ultimate Tic-Tac-Toe — Local P2P PWA

A fully offline-capable, peer-to-peer Ultimate Tic-Tac-Toe game for two phones. No backend, no
accounts, no cloud. One phone hosts, the other joins by scanning a QR code, and after that every
move travels directly between the two phones over a WebRTC DataChannel.

## What's inside

- **`src/game/engine.ts`** — pure TypeScript rules engine (no React, no network). Fully unit tested
  in `src/game/__tests__/engine.test.ts` via Vitest.
- **`src/network/`** — the WebRTC layer: offer/answer creation, ICE gathering, QR payload
  encode/decode (gzip-compressed), and a `WebRTCPeer` class that also handles the 2-minute
  reconnect window.
- **`src/hooks/useGameStore.ts`** — Zustand store enforcing **host authority**: the guest only ever
  sends `MOVE_REQUEST`; the host validates and broadcasts `NEW_STATE`.
- **`src/screens/`** — Home, Host (QR + scan), Join (scan + manual paste), Game, Settings, How to
  Play.
- **PWA** — installable, offline-capable via `vite-plugin-pwa` (see `vite.config.ts`), with a
  generated icon set in `public/icons/`.

## Deploy it permanently (do this once, free forever)

This repo already includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that builds
and deploys the app to GitHub Pages automatically on every push. You never touch a terminal again
after this initial setup.

1. **Create a new repo on GitHub** (e.g. `ultimate-ttt`) — public or private both work.
2. **Push this project to it:**
   ```bash
   cd ultimate-ttt
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo>.git
   git push -u origin main
   ```
3. **Enable Pages:** on GitHub, go to your repo → **Settings → Pages** → under "Build and
   deployment", set **Source** to **GitHub Actions**. (You only do this once — the workflow file
   is already there.)
4. Go to the **Actions** tab and watch the "Deploy to GitHub Pages" run finish (~1 minute).
5. Your permanent link is now live at:
   ```
   https://<your-username>.github.io/<your-repo>/
   ```
   Open that URL on both phones (Chrome on Android), tap **Install App** on the home screen when
   prompted (or use the browser menu → "Add to Home screen"), and you're set — forever, for free,
   with real HTTPS so the QR camera scanner works properly.

Any time you want to update the app later, just `git push` again — it redeploys automatically.

## Running it locally (optional, for development)

```bash
npm install
npm run dev -- --host
```

`--host` exposes the dev server on your local network (e.g. `http://192.168.1.23:5173`) so you can
open the same URL from both phones while they're on the same WiFi or a phone hotspot.

**Important:** WebRTC's camera access (for QR scanning) requires a *secure context* — either
`https://` or `localhost`. A plain `http://192.168.x.x:5173` URL will **not** get camera
permission on most mobile browsers. Two ways around this:

1. **Easiest for testing:** use a tunnelling tool like `ngrok http 5173` or Cloudflare's free
   `cloudflared tunnel --url http://localhost:5173` to get a temporary `https://` URL, open that
   on both phones.
2. **For real use:** build it (`npm run build`) and deploy the static `dist/` folder to any static
   host that gives you HTTPS for free — GitHub Pages, Netlify, Vercel (static hosting only, no
   server functions needed), Cloudflare Pages, etc. Once deployed, install it as a PWA on both
   phones and it works with **zero further internet dependency** — the only thing that ever
   touches the internet is the one-time page load (and, if both phones are on different networks,
   the STUN handshake during connection).

## Building for production

```bash
npm run build      # outputs to dist/
npm run preview    # serve the production build locally to sanity-check it
```

## Testing the game engine

```bash
npx vitest run
```

## Design notes / trade-offs

- **No signaling server:** the offer and answer are fully self-contained (SDP + all gathered ICE
  candidates), each encoded into a single QR code. This avoids needing a live signaling
  connection, at the cost of waiting a few seconds for ICE gathering before each QR is ready.
- **STUN with local-first fallback:** public STUN servers are configured so two phones on
  different networks (e.g. different WiFi, or WiFi + cellular) can still connect. If both phones
  are on the same LAN/hotspot, local host candidates are used and no STUN round-trip is needed at
  all.
- **Reconnection:** if the DataChannel drops (backgrounding, brief WiFi loss), the app attempts an
  ICE restart every 2 seconds for up to 2 minutes before declaring the game over, per spec.
- **Host authority:** the host's local `applyMove` is the only path that ever mutates canonical
  game state. The guest's UI reflects `NEW_STATE` broadcasts only — it cannot get out of sync by
  design.

## Folder structure

```
src/
  components/   UI building blocks (game board, chat, QR, buttons)
  game/         pure rules engine + tests
  hooks/        Zustand stores (game, settings, UI/navigation) + small hooks
  network/      WebRTC peer wrapper, ICE/QR payload utilities, wire protocol
  screens/      one file per app screen
  types/        shared TypeScript types for game state and network messages
  utils/        audio (WebAudio-generated sound effects, no binary assets)
```
