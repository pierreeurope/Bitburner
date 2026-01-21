# Bitburner Remote API setup

This repo is where we will keep your Bitburner scripts. The game will sync from
this folder using the Remote API.

## 1) Enable Remote API in Bitburner
- Open your running game
- Go to `Options` -> `Remote API`
- Set a port (common default: `12525`)
- Click **Connect**

## 2) Option A setup (official template style)
I scaffolded a minimal TypeScript + filesync setup in this repo:
- `src/` for TypeScript source
- `dist/` for compiled JS
- `filesync.json` for Remote API settings

Install dependencies:
```
npm install
```

Start the TypeScript compiler (watch mode):
```
npm run watch:ts
```

Start the Remote API sync server (in a second terminal):
```
npm run sync
```

When `npm run sync` is running, the Remote API screen in the game should connect.
If it still shows **Offline**, the sync server is not running or the port does
not match `filesync.json`.

## 3) Where your scripts live in this repo
- Write TypeScript in `src/`
- Compiled JS lands in `dist/`
- The game syncs from `dist/`

## Troubleshooting Remote API offline
Your screenshot shows a websocket error on `ws://localhost:12525`. That means
there is no local sync server running on that port yet. Once `npm run sync` is
running, click **Connect** again in the game.
