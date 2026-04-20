'use strict';
const express = require('express');
const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const { getDb } = require('../db/migrate');

const router = express.Router();
const DISCORD_API = 'https://discord.com/api/v10';

// GET /auth/discord  — redirect to Discord OAuth
router.get('/discord', (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.DISCORD_CLIENT_ID,
    redirect_uri: process.env.DISCORD_REDIRECT_URI,
    response_type: 'code',
    scope: 'identify',
  });
  res.redirect(`${DISCORD_API}/oauth2/authorize?${params}`);
});

// GET /auth/discord/callback
router.get('/discord/callback', async (req, res) => {
  const { code } = req.query;
  if (!code) return res.status(400).json({ error: 'Missing code' });

  try {
    const tokenRes = await fetch(`${DISCORD_API}/oauth2/token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        client_id: process.env.DISCORD_CLIENT_ID,
        client_secret: process.env.DISCORD_CLIENT_SECRET,
        grant_type: 'authorization_code',
        code,
        redirect_uri: process.env.DISCORD_REDIRECT_URI,
      }).toString(),
    });
    if (!tokenRes.ok) throw new Error('Discord token exchange failed');
    const tokenData = await tokenRes.json();

    const profileRes = await fetch(`${DISCORD_API}/users/@me`, {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    if (!profileRes.ok) throw new Error('Discord profile fetch failed');
    const profile = await profileRes.json();

    const db = getDb();
    db.prepare(
      `INSERT INTO users (id, username, avatar) VALUES (?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET username = excluded.username, avatar = excluded.avatar`
    ).run(profile.id, profile.username, profile.avatar);

    const token = jwt.sign(
      { user_id: profile.id },
      process.env.JWT_SECRET || 'changeme',
      { expiresIn: '7d' }
    );

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    res.redirect(process.env.FRONTEND_URL || 'http://localhost:5173');
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /auth/logout
router.post('/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ ok: true });
});

// GET /auth/me
router.get('/me', (req, res) => {
  const token = req.cookies?.token;
  if (!token) return res.status(401).json({ error: 'Not logged in' });
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || 'changeme');
    const db = getDb();
    const user = db
      .prepare('SELECT id, username, avatar FROM users WHERE id = ?')
      .get(payload.user_id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
});

module.exports = router;
