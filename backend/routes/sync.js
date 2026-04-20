'use strict';
const express = require('express');
const { z } = require('zod');
const { getDb, transaction } = require('../db/migrate');

const router = express.Router();

const characterSchema = z.object({
  name: z.string().min(1),
  series: z.string().optional().default(''),
  kakera: z.number().int().min(0).optional().default(0),
  image_url: z.string().url().nullable().optional().default(null),
  rank: z.number().int().positive().nullable().optional().default(null),
  likes: z.number().int().min(0).optional().default(0),
});

const syncBodySchema = z.object({
  characters: z.array(characterSchema).min(1),
  userId: z.string().optional(),
});

// POST /api/sync  — upsert characters from bot
router.post('/', (req, res) => {
  const isBot =
    req.headers['x-bot-secret'] === (process.env.BOT_SERVER_SECRET || 'changeme');

  if (!isBot && !req.userId) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const result = syncBodySchema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { characters, userId } = result.data;
  const targetUserId = req.userId || userId;
  if (!targetUserId) return res.status(400).json({ error: 'userId required' });

  const db = getDb();
  db.prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)').run(
    targetUserId,
    targetUserId
  );

  const maxPos = db
    .prepare('SELECT COALESCE(MAX(position), 0) AS max FROM characters WHERE user_id = ?')
    .get(targetUserId).max;

  let newCount = 0;
  let offset = 0;

  const upsertAll = transaction((chars) => {
    chars.forEach((char) => {
      const existing = db
        .prepare('SELECT id FROM characters WHERE user_id = ? AND name = ?')
        .get(targetUserId, char.name);

      if (existing) {
        db.prepare(
          `UPDATE characters
           SET series = ?, kakera = ?, image_url = ?, rank = ?, likes = ?, updated_at = unixepoch()
           WHERE user_id = ? AND name = ?`
        ).run(char.series, char.kakera, char.image_url, char.rank, char.likes, targetUserId, char.name);
      } else {
        db.prepare(
          `INSERT INTO characters (user_id, name, series, kakera, image_url, rank, likes, position)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          targetUserId,
          char.name,
          char.series,
          char.kakera,
          char.image_url,
          char.rank,
          char.likes,
          maxPos + ++offset
        );
        newCount++;
      }
    });
  });

  upsertAll(characters);

  res.json({
    synced: characters.length,
    new: newCount,
    updated: characters.length - newCount,
  });
});

// POST /api/sync/trigger  — slash command /sync acknowledgement
router.post('/trigger', (req, res) => {
  res.json({ ok: true, message: 'Sync triggered. Run $mm in the channel.' });
});

module.exports = router;
