'use strict';
const express = require('express');
const { z } = require('zod');
const { getDb } = require('../db/migrate');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/groups
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const groups = db
    .prepare('SELECT * FROM groups WHERE user_id = ? ORDER BY id ASC')
    .all(req.userId);
  res.json(groups);
});

// POST /api/groups
router.post('/', requireAuth, (req, res) => {
  const schema = z.object({
    name: z.string().min(1).max(50),
    color: z
      .string()
      .regex(/^#[0-9a-fA-F]{6}$/)
      .optional(),
  });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const db = getDb();
  const { lastInsertRowid } = db
    .prepare('INSERT INTO groups (user_id, name, color) VALUES (?, ?, ?)')
    .run(req.userId, result.data.name, result.data.color ?? '#6366f1');

  res.status(201).json({ id: Number(lastInsertRowid), ...result.data });
});

// DELETE /api/groups/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { changes } = db
    .prepare('DELETE FROM groups WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.userId);
  if (!changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
