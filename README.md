# Mafia: Shadows of the Village 🎭

A modern, real-time multiplayer social deduction web game built with **React**, **Vite**, **TypeScript**, **Tailwind CSS**, and **Socket.IO**. Designed mobile-first for fast phone gameplay with rich cinematic animations, synthesized atmospheric audio, and dual-language (English & Tamil) support.

---

## 🌟 Key Features

- **Instant Join**: 4-letter room code and nickname only. No accounts, no database, zero signup friction.
- **Strict Server Authority**: The server is the single source of truth. Player views are sanitized via `getPlayerView(room, playerId)`—villagers never receive hidden Mafia identities.
- **Seamless Reconnection**: Session tokens stored in `localStorage` allow immediate seat rejoin upon refresh or cellular signal drop.
- **Cinematic Day/Night Atmosphere**:
  - Full-screen SVG village skyline that transitions smoothly across phases.
  - Twinkling stars and drifting fog at night, rising sun and warm cottage window lights by day.
- **Dramatic Animations & Feedback**:
  - 3D card flip with role-specific flair (Mafia dark smoke wisp, Doctor green pulse, Detective blue magnifier, Villager candle flicker) and a **"Press & Hold to Peek"** safety gesture.
  - Phase banners with typewriter narrator text.
  - Circular countdown timer with urgency pulsation and heartbeat sound in the final 10 seconds.
  - Night actions: Reticle lock-on, Mafia knife slash, Doctor shield bubble, Detective stamp.
  - Dawn reveal: Sunrise light sweep, 1.5s suspense delay, spotlight on victim with tombstone drop, or golden shield flash if protected.
  - Day discussion: Public chat with spring bubbles, typing indicators, and floating emoji reactions.
  - Voting: Live flying tokens, bouncing vote badges, trial drumroll, spotlight elimination, dissolving-into-ash effect.
  - Spectator Ghost Realm: Eliminated players turn grayscale with an ethereal ghost chat.
  - Game Over: Confetti celebrations for village victory, ominous red vignette and fog for Mafia win, and an interactive chronicle timeline.
- **Synthesized Web Audio**: Complete sound design (flips, slashes, shields, stamps, thuds, tokens, drumrolls, fanfares) generated dynamically via Web Audio API without external file dependencies.
- **Bilingual (English & Tamil)**: Instant i18n language toggle (`தமிழ்` / `English`) covering all narrator logs, roles, and UI buttons.
- **Animation Catalog**: Dedicated testing playground at `/dev/animations` to trigger and preview every animation and audio effect independently.
- **PWA Ready**: Web app manifest included for full-screen home screen installation on iOS and Android.

---

## 🏗️ Architecture & Monorepo Structure

```
mafia/
├── package.json              # Root workspace orchestrator (concurrently)
├── shared/                   # Pure TypeScript game engine & types (Zero Socket.IO)
│   ├── src/
│   │   ├── types.ts          # Core types: GameState, PlayerGameView, Role, Phase
│   │   ├── roles.ts          # Role definitions, counts (5-12 players), alignments
│   │   ├── events.ts         # Socket.IO client/server typed event contracts
│   │   ├── engine.ts         # State machine, pure resolvers & getPlayerView()
│   │   ├── i18n.ts           # English & Tamil translations dictionary
│   │   └── index.ts
│   └── tests/
│       └── engine.test.ts    # Vitest unit tests + 1,000 game bot simulation
├── server/                   # Node.js + Express + Socket.IO (TypeScript)
│   └── src/
│       ├── server.ts         # HTTP & Socket.IO server initialization
│       ├── roomManager.ts    # Room state maps, timers, reconnects, auto-cleanup
│       ├── socketHandlers.ts # Strict event validation & per-player broadcasts
│       └── sanitizer.ts      # HTML stripping, 4-letter code generator, rate limiting
└── client/                   # React + Vite + Tailwind CSS + Framer Motion
    └── src/
        ├── audio/            # Web Audio synthesizer & sound manager
        ├── config/           # Centralized animation timings & settings
        ├── context/          # React Game & Socket context
        ├── components/
        │   ├── background/   # VillageSkyline SVG day/night transition
        │   ├── narrator/     # PhaseBanner & circular countdown ring
        │   ├── screens/      # Landing, Lobby, RoleReveal, Night, Dawn, Discussion, Voting, Result, GameOver
        │   └── dev/          # Animation catalog (/dev/animations)
        └── App.tsx
```

---

## 🚀 Quick Start (Local Development)

### Prerequisites
- Node.js 18+ (tested with v24)
- npm 9+

### 1. Install Dependencies
Run from the root directory:
```bash
npm install
```

### 2. Run Both Server & Client
Start shared watch, backend server (`http://localhost:3001`), and frontend dev server (`http://localhost:3000`) in one command:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) on your desktop or phone (via local network IP).

To inspect the animation showcase directly, visit [http://localhost:3000/dev/animations](http://localhost:3000/dev/animations).

---

## 🧪 Testing

Run the game engine test suite:
```bash
npm test
```

Tests verify:
- Role counts and distributions for 5 to 12 players.
- Doctor saving Mafia targets.
- Doctor self-protect rule (strictly once per game).
- Tie votes resulting in no elimination.
- Win conditions for both Villagers and Mafia.
- Mafia majority tie-breaking logic.
- Action prevention for dead players.
- Strict information hiding (`getPlayerView` filters hidden roles).
- **1,000-Game Bot Simulation**: Plays 1,000 automated, complete random games to completion asserting no hangs, deadlocks, or uncaught errors.

---

## ⚙️ Environment Variables

### Server (`server/.env` or hosting environment)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `PORT` | Port the Node.js server listens on | `3001` |

### Client (`client/.env` or hosting environment)
| Variable | Description | Default |
| :--- | :--- | :--- |
| `VITE_SERVER_URL` | Absolute URL of the Socket.IO backend | Same origin / `http://localhost:3001` |

---

## 🌐 Deployment Guide

### Deploying Frontend (Vercel or Netlify)
1. Set the root directory or base directory to `client`.
2. **Build command**: `npm run build`
3. **Publish / Output directory**: `dist`
4. Set the environment variable:
   - `VITE_SERVER_URL`: URL of your deployed backend (e.g. `https://mafia-server.onrender.com`).

### Deploying Backend (Render or Railway)
1. Deploy from the repository root or set root directory to `server`.
2. **Build command**:
   ```bash
   npm run build --workspace=shared && npm run build --workspace=server
   ```
3. **Start command**:
   ```bash
   npm start --workspace=server
   ```
4. Set environment variable: `PORT=3001` (or let the host assign `$PORT`).

> [!NOTE]
> Free hosting tiers (e.g. Render Free) may spin down when idle. When players connect after inactivity, the first connection may take 30–50 seconds to wake the instance up. Once awake, Socket.IO connections remain active and fast.
