---
name: Discord bot implementation status
description: État d'avancement de la branche feat/discord-bot du projet MudaeOrga
type: project
---

La branche `feat/discord-bot` a été entièrement implémentée dans le worktree `nervous-hypatia-9ad233`.

**Why:** Première brique fonctionnelle du projet — alimente la base SQLite via POST /api/sync.

**How to apply:** Quand l'utilisateur parle du bot ou de la sync Mudae, les fichiers sont dans `/bot`. Tests : `cd bot && npm test`.

## Fichiers créés

- `bot/package.json` — discord.js v14, axios, dotenv, jest
- `bot/.env.example` — DISCORD_TOKEN, DISCORD_CLIENT_ID, GUILD_ID, CHANNEL_ID, BACKEND_URL
- `bot/index.js` — point d'entrée, login Discord
- `bot/deploy-commands.js` — enregistrement slash command via REST API
- `bot/parsers/mudaeEmbed.js` — parse les embeds Mudae (name, series, kakera, likes, rank, image_url)
- `bot/utils/retry.js` — retry exponentiel générique
- `bot/services/backendApi.js` — POST /api/sync + GET /api/characters avec retry
- `bot/services/syncSession.js` — gestion session de sync paginée (60s timeout, déduplique par nom)
- `bot/commands/sync.js` — slash command /sync
- `bot/listeners/messageCreate.js` — écoute les embeds Mudae (user ID 432610292342587392)
- `bot/listeners/interactionCreate.js` — dispatch les slash commands
- `bot/jest.config.js` + `bot/__tests__/` — 32 tests passants

## Résultat tests
32/32 tests passants (mudaeEmbed, backendApi, syncSession).
