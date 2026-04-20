'use strict';
const express = require('express');
const { z } = require('zod');
const { randomUUID } = require('crypto');
const fetch = require('node-fetch');
const { getDb } = require('../db/migrate');
const { requireAuth } = require('../middleware/requireAuth');
const { addClient, sendEvent } = require('../sse/sseManager');

const router = express.Router();

const syncRequestSchema = z.object({
  desiredOrder: z.array(
    z.object({ id: z.number(), name: z.string() })
  ).min(1),
  channelId: z.string().optional(),
});

// POST /api/discord-sync  — trigger sync to Discord
router.post('/', requireAuth, async (req, res) => {
  const result = syncRequestSchema.safeParse(req.body);
  if (!result.success) {
    return res.status(400).json({ error: result.error.flatten() });
  }

  const { desiredOrder, channelId } = result.data;
  const userId = req.userId;
  const db = getDb();

  // Enforce 1 active sync per user
  const activeJob = db
    .prepare(
      `SELECT id FROM discord_sync_jobs
       WHERE user_id = ? AND status IN ('pending','running') LIMIT 1`
    )
    .get(userId);
  if (activeJob) {
    return res
      .status(409)
      .json({ error: 'A sync is already in progress', jobId: activeJob.id });
  }

  // Fetch current order from DB
  const currentCharacters = db
    .prepare(
      `SELECT id, name, position FROM characters
       WHERE user_id = ? ORDER BY position ASC`
    )
    .all(userId);

  const moves = computeMinimalMoves(currentCharacters, desiredOrder);

  if (moves.length === 0) {
    return res.json({ message: 'Order is already correct, no moves needed', moves: 0 });
  }

  const jobId = randomUUID();
  db.prepare(
    `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'pending', ?)`
  ).run(jobId, userId, moves.length);

  const BOT_URL = process.env.BOT_URL || 'http://localhost:3002';
  const BOT_SECRET = process.env.BOT_SERVER_SECRET || 'changeme';

  try {
    const botRes = await fetch(`${BOT_URL}/execute-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': BOT_SECRET,
      },
      body: JSON.stringify({
        jobId,
        moves,
        channelId: channelId || process.env.CHANNEL_ID,
      }),
    });

    if (!botRes.ok) {
      db.prepare(
        `UPDATE discord_sync_jobs SET status = 'error', error = ? WHERE id = ?`
      ).run('Bot returned error', jobId);
      return res.status(503).json({ error: 'Bot returned an error', jobId });
    }

    db.prepare(`UPDATE discord_sync_jobs SET status = 'running' WHERE id = ?`).run(jobId);

    console.log(`[discord-sync] Job ${jobId}: ${moves.length} moves for user ${userId}`);
    moves.forEach((m, i) =>
      console.log(`  ${i + 1}. $mmso "${m.name}" ${m.slot}`)
    );

    res.json({ jobId, totalMoves: moves.length });
  } catch (err) {
    db.prepare(
      `UPDATE discord_sync_jobs SET status = 'error', error = ? WHERE id = ?`
    ).run(err.message, jobId);
    res.status(503).json({ error: 'Failed to reach bot', detail: err.message, jobId });
  }
});

// GET /api/discord-sync/jobs  — list recent jobs (specific route before parameterized)
router.get('/jobs', requireAuth, (req, res) => {
  const db = getDb();
  const jobs = db
    .prepare(
      `SELECT * FROM discord_sync_jobs
       WHERE user_id = ? ORDER BY created_at DESC LIMIT 20`
    )
    .all(req.userId);
  res.json(jobs);
});

// GET /api/discord-sync/:jobId/progress  — SSE stream for frontend
router.get('/:jobId/progress', requireAuth, (req, res) => {
  const { jobId } = req.params;
  const db = getDb();

  const job = db
    .prepare(`SELECT * FROM discord_sync_jobs WHERE id = ? AND user_id = ?`)
    .get(jobId, req.userId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  // Send current state immediately
  res.write(
    `event: state\ndata: ${JSON.stringify({
      status: job.status,
      completed: job.completed,
      total: job.total,
      error: job.error,
    })}\n\n`
  );

  if (['completed', 'cancelled', 'error'].includes(job.status)) {
    res.end();
    return;
  }

  addClient(req.userId, res);
});

// POST /api/discord-sync/:jobId/progress  — called by bot to report progress
router.post('/:jobId/progress', (req, res) => {
  const botSecret = req.headers['x-bot-secret'];
  if (botSecret !== (process.env.BOT_SERVER_SECRET || 'changeme')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  const { jobId } = req.params;
  const db = getDb();

  const job = db.prepare(`SELECT * FROM discord_sync_jobs WHERE id = ?`).get(jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });

  const { status, completed, total, error, currentMove } = req.body;

  const dbStatus = status === 'progress' ? 'running' : status;
  db.prepare(
    `UPDATE discord_sync_jobs
     SET status = ?, completed = ?, error = ?, updated_at = unixepoch()
     WHERE id = ?`
  ).run(dbStatus, completed ?? job.completed, error ?? null, jobId);

  sendEvent(job.user_id, 'progress', {
    jobId,
    status,
    completed,
    total,
    currentMove,
    error,
  });

  res.json({ ok: true });
});

// DELETE /api/discord-sync/:jobId  — cancel a running sync
router.delete('/:jobId', requireAuth, async (req, res) => {
  const { jobId } = req.params;
  const db = getDb();

  const job = db
    .prepare(`SELECT * FROM discord_sync_jobs WHERE id = ? AND user_id = ?`)
    .get(jobId, req.userId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  if (!['pending', 'running'].includes(job.status)) {
    return res.status(400).json({ error: 'Job is not running' });
  }

  const BOT_URL = process.env.BOT_URL || 'http://localhost:3002';
  const BOT_SECRET = process.env.BOT_SERVER_SECRET || 'changeme';

  try {
    await fetch(`${BOT_URL}/cancel-sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-bot-secret': BOT_SECRET,
      },
      body: JSON.stringify({ jobId }),
    });
  } catch {
    // Bot may be down — mark cancelled regardless
  }

  db.prepare(
    `UPDATE discord_sync_jobs SET status = 'cancelled', updated_at = unixepoch() WHERE id = ?`
  ).run(jobId);

  sendEvent(req.userId, 'progress', { jobId, status: 'cancelled' });

  res.json({ ok: true });
});

/**
 * Compute the minimal ordered list of $mmso moves to go from currentOrder to desiredOrder.
 * Uses a single forward pass: for each position i, if the character at position i in desired
 * is not already at position i in the simulated array, emit a move and update the simulation.
 * Only names present in currentOrder are considered (unknown names are skipped).
 */
function computeMinimalMoves(currentOrder, desiredOrder) {
  const simulated = currentOrder.map((c) => c.name);
  const desired = desiredOrder
    .map((c) => c.name)
    .filter((name) => simulated.includes(name));

  const moves = [];

  for (let i = 0; i < desired.length; i++) {
    const target = desired[i];
    const currentIdx = simulated.indexOf(target);

    if (currentIdx !== i) {
      moves.push({ name: target, slot: i + 1 });
      simulated.splice(currentIdx, 1);
      simulated.splice(i, 0, target);
    }
  }

  return moves;
}

module.exports = router;
module.exports.computeMinimalMoves = computeMinimalMoves;
