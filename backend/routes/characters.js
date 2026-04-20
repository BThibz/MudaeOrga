const express = require('express');
const { z } = require('zod');
const { run, all, get } = require('../db/database');

const router = express.Router();

const characterSchema = z.object({
  name: z.string().min(1),
  series: z.string().min(1),
  kakera: z.number().int().min(0).default(0),
  image_url: z.string().url().nullable().optional(),
  rank: z.number().int().min(1).nullable().optional(),
  likes: z.number().int().min(0).default(0),
});

const reorderSchema = z.object({
  ids: z.array(z.number().int().positive()).min(1),
});

const syncSchema = z.object({
  characters: z.array(characterSchema).min(1),
});

// GET /api/characters
router.get('/', (req, res) => {
  const characters = all(
    `SELECT c.*, GROUP_CONCAT(g.id) AS group_ids, GROUP_CONCAT(g.name) AS group_names
     FROM characters c
     LEFT JOIN character_groups cg ON c.id = cg.character_id
     LEFT JOIN groups g ON cg.group_id = g.id
     GROUP BY c.id
     ORDER BY c.position ASC, c.id ASC`
  );
  res.json(characters.map(formatCharacter));
});

// GET /api/characters/:id
router.get('/:id', (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return next({ status: 400, message: 'Invalid id' });

  const character = get(
    `SELECT c.*, GROUP_CONCAT(g.id) AS group_ids, GROUP_CONCAT(g.name) AS group_names
     FROM characters c
     LEFT JOIN character_groups cg ON c.id = cg.character_id
     LEFT JOIN groups g ON cg.group_id = g.id
     WHERE c.id = ?
     GROUP BY c.id`,
    [id]
  );
  if (!character) return next({ status: 404, message: 'Character not found' });

  res.json(formatCharacter(character));
});

// PUT /api/characters/reorder
router.put('/reorder', (req, res, next) => {
  const parsed = reorderSchema.safeParse(req.body);
  if (!parsed.success) return next(parsed.error);

  const { ids } = parsed.data;

  // Verify all IDs exist
  const existing = all(
    `SELECT id FROM characters WHERE id IN (${ids.map(() => '?').join(',')})`,
    ids
  );
  const existingIds = new Set(existing.map(r => r.id));
  const missing = ids.filter(id => !existingIds.has(id));

  if (missing.length > 0) {
    return next({ status: 400, message: `Unknown character IDs: ${missing.join(', ')}` });
  }

  ids.forEach((id, index) => {
    run(
      'UPDATE characters SET position = ?, updated_at = datetime(\'now\') WHERE id = ?',
      [index, id]
    );
  });

  res.json({ message: 'Reordered successfully', count: ids.length });
});

// POST /api/sync
router.post('/sync', (req, res, next) => {
  const parsed = syncSchema.safeParse(req.body);
  if (!parsed.success) return next(parsed.error);

  const { characters } = parsed.data;
  let inserted = 0;
  let updated = 0;

  characters.forEach((char, index) => {
    const existing = get('SELECT id FROM characters WHERE name = ? AND series = ?', [char.name, char.series]);
    if (existing) {
      run(
        `UPDATE characters SET kakera = ?, image_url = ?, rank = ?, likes = ?, updated_at = datetime('now') WHERE id = ?`,
        [char.kakera, char.image_url ?? null, char.rank ?? null, char.likes, existing.id]
      );
      updated++;
    } else {
      run(
        `INSERT INTO characters (name, series, kakera, image_url, rank, likes, position) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [char.name, char.series, char.kakera, char.image_url ?? null, char.rank ?? null, char.likes, index]
      );
      inserted++;
    }
  });

  res.status(201).json({ message: 'Sync complete', inserted, updated });
});

// PUT /api/characters/:id/group
router.put('/:id/group', (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return next({ status: 400, message: 'Invalid id' });

  const schema = z.object({ group_id: z.number().int().positive().nullable() });
  const parsed = schema.safeParse(req.body);
  if (!parsed.success) return next(parsed.error);

  const character = get('SELECT id FROM characters WHERE id = ?', [id]);
  if (!character) return next({ status: 404, message: 'Character not found' });

  const { group_id } = parsed.data;

  // Remove from all groups first
  run('DELETE FROM character_groups WHERE character_id = ?', [id]);

  if (group_id !== null) {
    const group = get('SELECT id FROM groups WHERE id = ?', [group_id]);
    if (!group) return next({ status: 404, message: 'Group not found' });

    run('INSERT INTO character_groups (character_id, group_id) VALUES (?, ?)', [id, group_id]);
  }

  res.json({ message: 'Group updated' });
});

// DELETE /api/characters/:id
router.delete('/:id', (req, res, next) => {
  const id = parseInt(req.params.id);
  if (isNaN(id)) return next({ status: 400, message: 'Invalid id' });

  const character = get('SELECT id FROM characters WHERE id = ?', [id]);
  if (!character) return next({ status: 404, message: 'Character not found' });

  run('DELETE FROM characters WHERE id = ?', [id]);
  res.json({ message: 'Character deleted' });
});

function formatCharacter(row) {
  return {
    id: row.id,
    name: row.name,
    series: row.series,
    kakera: row.kakera,
    image_url: row.image_url,
    rank: row.rank,
    likes: row.likes,
    position: row.position,
    created_at: row.created_at,
    updated_at: row.updated_at,
    groups: row.group_ids
      ? row.group_ids.split(',').map((gid, i) => ({
          id: parseInt(gid),
          name: row.group_names.split(',')[i],
        }))
      : [],
  };
}

module.exports = router;
