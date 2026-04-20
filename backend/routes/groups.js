const express = require('express');
const { z } = require('zod');
const { run, all, get } = require('../db/database');

const router = express.Router();

const groupSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/).default('#6366f1'),
});

// GET /api/groups
router.get('/', (req, res) => {
  const groups = all(
    `SELECT g.*, COUNT(cg.character_id) AS character_count
     FROM groups g
     LEFT JOIN character_groups cg ON g.id = cg.group_id
     GROUP BY g.id
     ORDER BY g.name ASC`
  );
  res.json(groups);
});

// POST /api/groups
router.post('/', (req, res, next) => {
  const parsed = groupSchema.safeParse(req.body);
  if (!parsed.success) return next(parsed.error);

  const { name, color } = parsed.data;

  const existing = get('SELECT id FROM groups WHERE name = ?', [name]);
  if (existing) return next({ status: 409, message: `Group "${name}" already exists` });

  const result = run('INSERT INTO groups (name, color) VALUES (?, ?)', [name, color]);
  const group = get('SELECT * FROM groups WHERE id = ?', [result.lastInsertRowid]);

  res.status(201).json(group);
});

// DELETE /api/groups/:id
router.delete('/:id', (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return next({ status: 400, message: 'Invalid id' });

  const group = get('SELECT id FROM groups WHERE id = ?', [id]);
  if (!group) return next({ status: 404, message: 'Group not found' });

  run('DELETE FROM groups WHERE id = ?', [id]);
  res.json({ message: 'Group deleted' });
});

module.exports = router;
