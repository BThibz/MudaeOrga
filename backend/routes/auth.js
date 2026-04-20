const express = require('express');
const jwt = require('jsonwebtoken');
const { getDb } = require('../db/database');
const requireAuth = require('../middleware/requireAuth');

const router = express.Router();

const DISCORD_API = 'https://discord.com/api/v10';
const COOKIE_TTL_MS = 7 * 24 * 60 * 60 * 1000;

// GET /auth/discord — redirige vers la page d'autorisation Discord
router.get('/discord', (req, res) => {
  const { DISCORD_CLIENT_ID, DISCORD_REDIRECT_URI } = process.env;
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
  });
  res.redirect(`${DISCORD_API}/oauth2/authorize?${params}`);
});

// GET /auth/discord/callback — échange le code contre un token, crée la session
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) {
    return res.status(400).json({ error: 'Paramètre code manquant' });
  }

  const { DISCORD_CLIENT_ID, DISCORD_CLIENT_SECRET, DISCORD_REDIRECT_URI } = process.env;

  // Échange du code contre un access_token Discord
  let tokenData;
  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: DISCORD_CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: DISCORD_REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) {
      return res.status(400).json({ error: 'Échec de l\'échange du code Discord' });
    }
    tokenData = await tokenRes.json();
  } catch {
    return res.status(502).json({ error: 'Erreur lors de la communication avec Discord' });
  }

  // Récupération des infos utilisateur
  let discordUser;
  try {
    const userRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!userRes.ok) {
      return res.status(400).json({ error: 'Impossible de récupérer l\'utilisateur Discord' });
    }
    discordUser = await userRes.json();
  } catch {
    return res.status(502).json({ error: 'Erreur lors de la communication avec Discord' });
  }

  // Upsert de l'utilisateur en base
  const db = getDb();
  db.prepare(`
    INSERT INTO users (id, username, discriminator, avatar, updated_at)
    VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(id) DO UPDATE SET
      username      = excluded.username,
      discriminator = excluded.discriminator,
      avatar        = excluded.avatar,
      updated_at    = CURRENT_TIMESTAMP
  `).run(
    discordUser.id,
    discordUser.username,
    discordUser.discriminator ?? null,
    discordUser.avatar ?? null,
  );

  // Création du JWT
  const token = jwt.sign(
    { user_id: discordUser.id },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );

  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    maxAge: COOKIE_TTL_MS,
  });

  res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
});

// POST /auth/logout — supprime le cookie de session
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ message: 'Déconnexion réussie' });
});

// GET /auth/me — retourne l'utilisateur courant
router.get('/me', requireAuth, (req, res) => {
  const db = getDb();
  const user = db.prepare('SELECT id, username, discriminator, avatar FROM users WHERE id = ?')
    .get(req.user_id);
  if (!user) return res.status(404).json({ error: 'Utilisateur introuvable' });
  res.json(user);
});

module.exports = router;
