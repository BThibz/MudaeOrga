'use strict';
const express = require('express');
const { z } = require('zod');
const { getDb, transaction } = require('../db/migrate');
const { requireAuth } = require('../middleware/requireAuth');

const router = express.Router();

// GET /api/characters
router.get('/', requireAuth, (req, res) => {
  const db = getDb();
  const { series, group_id, kakera_min, kakera_max } = req.query;

  let query = `
    SELECT c.*,
      GROUP_CONCAT(g.id)   AS group_ids,
      GROUP_CONCAT(g.name) AS group_names
    FROM characters c
    LEFT JOIN character_groups cg ON c.id = cg.character_id
    LEFT JOIN groups g ON cg.group_id = g.id
    WHERE c.user_id = ?
  `;
  const params = [req.userId];

  if (series)     { query += ' AND c.series LIKE ?';  params.push(`%${series}%`); }
  if (kakera_min) { query += ' AND c.kakera >= ?';    params.push(Number(kakera_min)); }
  if (kakera_max) { query += ' AND c.kakera <= ?';    params.push(Number(kakera_max)); }
  if (group_id)   { query += ' AND cg.group_id = ?';  params.push(Number(group_id)); }

  query += ' GROUP BY c.id ORDER BY c.position ASC';

  const rows = db.prepare(query).all(...params);
  res.json(
    rows.map((r) => ({
      ...r,
      group_ids:   r.group_ids   ? r.group_ids.split(',').map(Number) : [],
      group_names: r.group_names ? r.group_names.split(',')           : [],
    }))
  );
});

// GET /api/characters/:id
router.get('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const char = db
    .prepare('SELECT * FROM characters WHERE id = ? AND user_id = ?')
    .get(Number(req.params.id), req.userId);
  if (!char) return res.status(404).json({ error: 'Not found' });
  res.json(char);
});

// PUT /api/characters/reorder
router.put('/reorder', requireAuth, (req, res) => {
  const schema = z.object({ ids: z.array(z.number()).min(1) });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const { ids } = result.data;
  const db = getDb();

  const owned = db
    .prepare(
      `SELECT id FROM characters WHERE user_id = ? AND id IN (${ids.map(() => '?').join(',')})`
    )
    .all(req.userId, ...ids)
    .map((r) => r.id);

  if (owned.length !== ids.length) {
    return res.status(403).json({ error: 'Some characters do not belong to you' });
  }

  const update = db.prepare(
    'UPDATE characters SET position = ?, updated_at = unixepoch() WHERE id = ?'
  );
  transaction((list) => list.forEach((id, idx) => update.run(idx + 1, id)))(ids);

  res.json({ ok: true });
});

// PUT /api/characters/:id/group
router.put('/:id/group', requireAuth, (req, res) => {
  const schema = z.object({ group_id: z.number().nullable() });
  const result = schema.safeParse(req.body);
  if (!result.success) return res.status(400).json({ error: result.error.flatten() });

  const charId = Number(req.params.id);
  const db = getDb();
  const char = db
    .prepare('SELECT id FROM characters WHERE id = ? AND user_id = ?')
    .get(charId, req.userId);
  if (!char) return res.status(404).json({ error: 'Not found' });

  const { group_id } = result.data;
  if (group_id === null) {
    db.prepare('DELETE FROM character_groups WHERE character_id = ?').run(charId);
  } else {
    const group = db
      .prepare('SELECT id FROM groups WHERE id = ? AND user_id = ?')
      .get(group_id, req.userId);
    if (!group) return res.status(404).json({ error: 'Group not found' });
    db.prepare(
      'INSERT OR REPLACE INTO character_groups (character_id, group_id) VALUES (?, ?)'
    ).run(charId, group_id);
  }

  res.json({ ok: true });
});

// DELETE /api/characters/:id
router.delete('/:id', requireAuth, (req, res) => {
  const db = getDb();
  const { changes } = db
    .prepare('DELETE FROM characters WHERE id = ? AND user_id = ?')
    .run(Number(req.params.id), req.userId);
  if (!changes) return res.status(404).json({ error: 'Not found' });
  res.json({ ok: true });
});

module.exports = router;
