# MudaeOrga

Application web pour organiser son harem Mudae (bot Discord) via une interface drag & drop.

---

## Structure des branches

```
main
└── develop
    ├── feat/discord-bot      → Bot Discord + parsing Mudae
    ├── feat/backend-api      → API REST + base de données
    ├── feat/auth-discord     → Authentification Discord OAuth2
    ├── feat/frontend-ui      → Interface React drag & drop
    └── feat/discord-sync     → Sync de l'ordre vers Discord (optionnel)
```

**Règle :** on ne merge jamais directement dans `main`. Chaque branche `feat/*` merge dans `develop`, puis `develop` merge dans `main` quand une version est stable.

---

## Branche `main`

**Rôle :** version stable et déployable uniquement.

- Ne reçoit que des merges de `develop`
- Chaque merge = tag de version (`v1.0`, `v1.1`, etc.)
- Aucun commit direct autorisé

---

## Branche `develop`

**Rôle :** branche d'intégration. Toutes les `feat/*` mergent ici avant `main`.

- Sert à tester l'intégration entre les modules
- On peut y faire des commits de liaison (ex : connecter le bot au backend)
- Base de départ pour toutes les branches `feat/*`

---

## Branche `feat/discord-bot`

**Rôle :** créer le bot Discord qui lit et parse les données Mudae.

### Stack
- **discord.js** (Node.js v20+)
- Fichier `.env` pour le token du bot

### Tâches détaillées

#### 1. Setup du projet bot
- [ ] Initialiser `package.json` dans `/bot`
- [ ] Installer `discord.js`, `dotenv`
- [ ] Créer le fichier `.env.example` avec `DISCORD_TOKEN`, `GUILD_ID`, `CHANNEL_ID`
- [ ] Créer `bot/index.js` — point d'entrée, connexion au client Discord

#### 2. Listener de messages Mudae
- [ ] Écouter les messages de l'utilisateur Mudae (`id: 432610292342587392`)
- [ ] Détecter les embeds des commandes `$mm`, `$mmi`, `$mmk`
- [ ] Gérer la pagination des embeds (boutons suivant/précédent)

#### 3. Parser les embeds
- [ ] Extraire depuis chaque embed :
  - `name` (nom du personnage)
  - `series` (nom de la série)
  - `kakera` (valeur kakera)
  - `image_url` (URL de l'image dans l'embed)
  - `rank` (position dans le harem si présente)
  - `likes` (nombre de likes)
- [ ] Normaliser les données dans un objet JSON uniforme

#### 4. Envoi vers le backend
- [ ] Appel HTTP `POST /api/sync` avec la liste parsée
- [ ] Gestion des erreurs réseau et retry simple

#### 5. Commande de déclenchement manuel
- [ ] Slash command `/sync` pour forcer une resynchronisation
- [ ] Répondre avec un résumé (`X personnages synchronisés`)

---

## Branche `feat/backend-api`

**Rôle :** API REST qui stocke les personnages et leur ordre.

### Stack
- **Node.js + Express**
- **SQLite** via `better-sqlite3` (simple, sans serveur)
- **Zod** pour la validation des données entrantes

### Tâches détaillées

#### 1. Setup du projet backend
- [ ] Initialiser `package.json` dans `/backend`
- [ ] Installer `express`, `better-sqlite3`, `zod`, `cors`, `dotenv`
- [ ] Créer `backend/index.js` — serveur Express sur port `3001`

#### 2. Base de données
- [ ] Créer `backend/db/schema.sql` avec les tables :
  ```sql
  characters (id, name, series, kakera, image_url, rank, likes, position, created_at, updated_at)
  groups (id, name, color)
  character_groups (character_id, group_id)
  ```
- [ ] Script de migration au démarrage (`db/migrate.js`)

#### 3. Endpoints API
- [ ] `GET  /api/characters` — liste complète triée par `position`
- [ ] `GET  /api/characters/:id` — détail d'un personnage
- [ ] `PUT  /api/characters/reorder` — reçoit un tableau d'IDs ordonnés, met à jour `position`
- [ ] `POST /api/sync` — reçoit la liste du bot, upsert en BDD
- [ ] `GET  /api/groups` — liste des groupes
- [ ] `POST /api/groups` — créer un groupe
- [ ] `PUT  /api/characters/:id/group` — assigner un perso à un groupe
- [ ] `DELETE /api/characters/:id` — supprimer un perso

#### 4. Validation & erreurs
- [ ] Schémas Zod pour chaque endpoint
- [ ] Middleware d'erreur global (`400`, `404`, `500`)
- [ ] Logs des requêtes avec `morgan`

#### 5. Tests
- [ ] Tests des endpoints avec `supertest`
- [ ] Cas limites : reorder avec IDs manquants, sync avec données malformées

---

## Branche `feat/auth-discord`

**Rôle :** identifier l'utilisateur via Discord OAuth2 pour isoler les harams par compte.

### Stack
- **Discord OAuth2** (via `passport-discord` ou manuellement)
- **JWT** pour les sessions (`jsonwebtoken`)
- **cookie-parser** pour stocker le token côté client

### Tâches détaillées

#### 1. Setup OAuth2 Discord
- [ ] Créer une application Discord sur le portail développeur
- [ ] Configurer `CLIENT_ID`, `CLIENT_SECRET`, `REDIRECT_URI` dans `.env`
- [ ] Route `GET /auth/discord` → redirige vers Discord
- [ ] Route `GET /auth/discord/callback` → reçoit le code, échange contre un token

#### 2. Récupération du profil utilisateur
- [ ] Appel à `https://discord.com/api/users/@me` avec le token OAuth2
- [ ] Récupérer `id`, `username`, `avatar`
- [ ] Stocker l'utilisateur en BDD (`users` table)

#### 3. Session JWT
- [ ] Générer un JWT signé avec `user_id` et expiration `7d`
- [ ] Stocker dans un cookie `httpOnly`
- [ ] Middleware `requireAuth` à appliquer sur tous les endpoints `/api/*`

#### 4. Isolation des données
- [ ] Ajouter `user_id` dans la table `characters`
- [ ] Tous les `SELECT` et `UPDATE` filtrent par `user_id` extrait du JWT

#### 5. Route de déconnexion
- [ ] `POST /auth/logout` → supprime le cookie JWT

#### 6. Frontend
- [ ] Bouton "Se connecter avec Discord" sur la page d'accueil
- [ ] Affichage de l'avatar et du nom une fois connecté
- [ ] Redirection automatique vers `/login` si non authentifié

---

## Branche `feat/frontend-ui`

**Rôle :** interface React pour visualiser et réorganiser le harem.

### Stack
- **React 18** + **Vite**
- **dnd-kit** (drag & drop)
- **TailwindCSS** (style)
- **TanStack Query** (fetching/cache API)
- **Zustand** (état global léger)

### Tâches détaillées

#### 1. Setup du projet frontend
- [ ] Initialiser avec `npm create vite@latest frontend -- --template react`
- [ ] Installer `@dnd-kit/core`, `@dnd-kit/sortable`, `tailwindcss`, `@tanstack/react-query`, `zustand`
- [ ] Configurer le proxy Vite vers `localhost:3001`

#### 2. Pages et routing
- [ ] `react-router-dom` avec les routes :
  - `/` → page principale (harem)
  - `/login` → page de connexion Discord
  - `/groups` → gestion des groupes

#### 3. Composants principaux
- [ ] `<CharacterCard>` — image, nom, série, kakera, badge groupe
- [ ] `<HaremGrid>` — grille de cartes drag & drop (dnd-kit SortableContext)
- [ ] `<HaremList>` — vue liste alternative
- [ ] `<GroupPanel>` — panneau latéral des groupes (drag vers groupe)
- [ ] `<FilterBar>` — filtres par série, kakera min/max, groupe

#### 4. Drag & drop
- [ ] Drag entre cartes pour réordonner (`arrayMove` de dnd-kit)
- [ ] Drag vers un groupe dans le panneau latéral
- [ ] Indicateur visuel de drop zone
- [ ] Optimistic update (UI mise à jour avant confirmation serveur)
- [ ] Appel `PUT /api/characters/reorder` au drop

#### 5. Synchronisation
- [ ] Bouton "Synchroniser depuis Discord" → déclenche `/sync` via le bot
- [ ] Indicateur de chargement et message de succès/erreur
- [ ] Polling ou WebSocket pour détecter la fin de la sync

#### 6. UX & polish
- [ ] Skeleton loader pendant le chargement
- [ ] Toast notifications (succès/erreur)
- [ ] Mode sombre (TailwindCSS dark mode)
- [ ] Vue grille / liste switchable
- [ ] Responsive mobile

---

## Branche `feat/discord-sync`

**Rôle :** envoyer l'ordre réorganisé depuis l'app vers Discord via les commandes Mudae.

> ⚠️ **Fonctionnalité avancée et risquée** — Mudae limite les interactions, risque de cooldown si trop de commandes envoyées rapidement.

### Stack
- Extension du bot `feat/discord-bot`
- Queue de commandes avec délai (`p-queue`)

### Tâches détaillées

#### 1. Documenter les commandes Mudae de déplacement
- [ ] Documenter `$mmso <name> <slot>` (move to slot)
- [ ] Documenter les limites de rate de Mudae
- [ ] Tester manuellement le comportement attendu

#### 2. Endpoint de déclenchement
- [ ] `POST /api/discord-sync` reçoit l'ordre final souhaité
- [ ] Compare avec l'ordre actuel en BDD
- [ ] Calcule la liste minimale de déplacements nécessaires

#### 3. Queue d'envoi de commandes
- [ ] Implémenter une queue avec délai de `3-5s` entre chaque commande
- [ ] Envoyer chaque `$mmso` dans le bon channel Discord
- [ ] Écouter la réponse de Mudae pour confirmer le déplacement
- [ ] Arrêter la queue si une erreur est détectée

#### 4. Feedback utilisateur
- [ ] WebSocket ou SSE depuis le backend vers le frontend
- [ ] Barre de progression ("déplacement 3/12...")
- [ ] Possibilité d'annuler la sync en cours

#### 5. Sécurité
- [ ] Limiter à 1 sync en cours à la fois par utilisateur
- [ ] Log de toutes les commandes envoyées pour debug

---

## Ordre de développement recommandé

```
1. feat/backend-api        (fondation, tout dépend de l'API)
2. feat/discord-bot        (alimenter la BDD)
3. feat/auth-discord       (sécuriser avant d'exposer)
4. feat/frontend-ui        (consommer l'API)
5. feat/discord-sync       (optionnel, en dernier)
```

---

## Variables d'environnement

| Variable | Description | Utilisé dans |
|---|---|---|
| `DISCORD_TOKEN` | Token du bot Discord | bot |
| `DISCORD_CLIENT_ID` | ID de l'app OAuth2 | backend, bot |
| `DISCORD_CLIENT_SECRET` | Secret OAuth2 | backend |
| `DISCORD_REDIRECT_URI` | URL de callback OAuth2 | backend |
| `JWT_SECRET` | Clé de signature JWT | backend |
| `DATABASE_PATH` | Chemin vers le fichier SQLite | backend |
| `GUILD_ID` | ID du serveur Discord cible | bot |
| `CHANNEL_ID` | ID du channel pour les commandes | bot |
| `VITE_API_URL` | URL du backend pour le frontend | frontend |
