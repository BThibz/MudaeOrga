# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

MudaeOrga is a web app to organize a Mudae Discord bot harem (character collection) via a drag & drop interface. It consists of three independent modules that communicate over HTTP and a shared SQLite database.

## Monorepo structure

```
/bot        → discord.js bot — reads Mudae embeds, pushes data to backend
/backend    → Express REST API + SQLite database
/frontend   → React (Vite) SPA with dnd-kit drag & drop
```

Each module has its own `package.json` and `.env`. There is no root-level build script — run commands from inside each subdirectory.

## Branch strategy

Feature branches merge into `develop`, never directly into `main`. `main` is reserved for stable releases only.

| Branch | Purpose |
|---|---|
| `feat/discord-bot` | Bot + Mudae parser |
| `feat/backend-api` | Express API + SQLite |
| `feat/auth-discord` | Discord OAuth2 + JWT |
| `feat/frontend-ui` | React UI |
| `feat/discord-sync` | Write-back to Discord (optional) |

## Bot (`/bot`)

```bash
cd bot
npm install
npm run dev       # nodemon watch mode
npm start         # production
```

Key env vars: `DISCORD_TOKEN`, `GUILD_ID`, `CHANNEL_ID`, `BACKEND_URL`.

The bot listens for embeds from Mudae's user ID `432610292342587392`. It parses `$mm` / `$mmi` / `$mmk` embed responses (paginated) and POSTs normalized character objects to `BACKEND_URL/api/sync`. It also registers a `/sync` slash command for manual triggers.

## Backend (`/backend`)

```bash
cd backend
npm install
npm run dev       # nodemon, port 3001
npm test          # supertest suite
```

Key env vars: `DATABASE_PATH`, `JWT_SECRET`, `DISCORD_CLIENT_ID`, `DISCORD_CLIENT_SECRET`, `DISCORD_REDIRECT_URI`.

SQLite schema lives in `db/schema.sql`. Migrations run automatically at startup via `db/migrate.js`. All `/api/*` routes require a valid JWT cookie (set by Discord OAuth2 flow) — the `requireAuth` middleware extracts `user_id` from the token and filters every query by it.

Core API surface:
- `GET/PUT /api/characters` — list + reorder (accepts ordered ID array)
- `POST /api/sync` — upsert from bot payload
- `GET/POST /api/groups`, `PUT /api/characters/:id/group`
- `GET /auth/discord` → `GET /auth/discord/callback` → `POST /auth/logout`

Validation uses Zod schemas at every endpoint boundary.

## Frontend (`/frontend`)

```bash
cd frontend
npm install
npm run dev       # Vite dev server, proxies /api → localhost:3001
npm run build     # production build
npm run preview   # serve production build locally
```

Key env vars: `VITE_API_URL` (only needed for production builds; dev uses Vite proxy).

State is split between TanStack Query (server state) and Zustand (UI state: active filters, view mode). The drag & drop layer uses `@dnd-kit/sortable` — on drop, it fires an optimistic update via Zustand then calls `PUT /api/characters/reorder`. If the server call fails the optimistic state is rolled back.

## Data flow

```
Discord (Mudae) → bot parses embeds → POST /api/sync → SQLite
                                                          ↓
                              frontend ← GET /api/characters
                              (drag & drop reorder)
                              PUT /api/characters/reorder → SQLite
```

## Mudae-specific notes

- Mudae's user ID on Discord: `432610292342587392`
- Harem list command: `$mm` (paginated embeds)
- Move character to slot: `$mmso <name> <slot>` (used only in `feat/discord-sync`)
- Rate-limit `$mmso` to one command every 3–5 seconds to avoid Mudae cooldowns
