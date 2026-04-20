'use strict';
// Set env vars BEFORE requiring any project modules
process.env.DATABASE_PATH = ':memory:';
process.env.JWT_SECRET = 'test-secret';
process.env.BOT_SERVER_SECRET = 'test-bot-secret';
process.env.BOT_URL = 'http://localhost:19999'; // unreachable — we don't want real bot calls

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { randomUUID } = require('crypto');

const app = require('../index');
const { getDb, resetDb } = require('../db/migrate');
const { computeMinimalMoves } = require('../routes/discordSync');

function makeToken(userId) {
  return jwt.sign({ user_id: userId }, 'test-secret', { expiresIn: '1h' });
}

function seedUser(userId = 'user-test') {
  getDb()
    .prepare('INSERT OR IGNORE INTO users (id, username) VALUES (?, ?)')
    .run(userId, 'TestUser');
  return userId;
}

function seedCharacters(userId, list) {
  const stmt = getDb().prepare(
    'INSERT INTO characters (user_id, name, series, kakera, position) VALUES (?, ?, ?, ?, ?)'
  );
  list.forEach(({ name, series = 'S', kakera = 100, position }, i) =>
    stmt.run(userId, name, series, kakera, position ?? i + 1)
  );
}

// ─── computeMinimalMoves unit tests ──────────────────────────────────────────

describe('computeMinimalMoves', () => {
  it('returns empty array when order is already correct', () => {
    const current = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const desired = [{ id: 1, name: 'A' }, { id: 2, name: 'B' }, { id: 3, name: 'C' }];
    expect(computeMinimalMoves(current, desired)).toEqual([]);
  });

  it('handles fully reversed order', () => {
    const current = [{ name: 'A' }, { name: 'B' }, { name: 'C' }];
    const desired = [{ id: 3, name: 'C' }, { id: 2, name: 'B' }, { id: 1, name: 'A' }];
    const moves = computeMinimalMoves(current, desired);
    // C must reach slot 1, B must reach slot 2
    expect(moves.length).toBe(2);
    expect(moves[0]).toEqual({ name: 'C', slot: 1 });
    expect(moves[1]).toEqual({ name: 'B', slot: 2 });
  });

  it('moves only the characters that changed', () => {
    const current = [{ name: 'A' }, { name: 'B' }, { name: 'C' }, { name: 'D' }];
    // Only swap B and C
    const desired = [
      { id: 1, name: 'A' },
      { id: 3, name: 'C' },
      { id: 2, name: 'B' },
      { id: 4, name: 'D' },
    ];
    const moves = computeMinimalMoves(current, desired);
    expect(moves.length).toBe(1);
    expect(moves[0]).toEqual({ name: 'C', slot: 2 });
  });

  it('ignores names absent from current order', () => {
    const current = [{ name: 'A' }, { name: 'B' }];
    const desired = [{ id: 99, name: 'GHOST' }, { id: 1, name: 'A' }, { id: 2, name: 'B' }];
    const moves = computeMinimalMoves(current, desired);
    expect(moves).toEqual([]);
  });

  it('produces correct slot numbers (1-indexed)', () => {
    const current = [{ name: 'X' }, { name: 'Y' }];
    const desired = [{ id: 2, name: 'Y' }, { id: 1, name: 'X' }];
    const moves = computeMinimalMoves(current, desired);
    expect(moves[0].slot).toBe(1);
  });
});

// ─── API tests ────────────────────────────────────────────────────────────────

describe('POST /api/discord-sync', () => {
  let userId;
  let token;

  beforeEach(() => {
    resetDb();
    // Re-run migrations on fresh in-memory DB
    require('../db/migrate').migrate();
    userId = seedUser();
    token = makeToken(userId);
  });

  it('returns 401 without auth cookie', async () => {
    const res = await request(app)
      .post('/api/discord-sync')
      .send({ desiredOrder: [{ id: 1, name: 'A' }] });
    expect(res.status).toBe(401);
  });

  it('returns 400 for empty desiredOrder', async () => {
    const res = await request(app)
      .post('/api/discord-sync')
      .set('Cookie', `token=${token}`)
      .send({ desiredOrder: [] });
    expect(res.status).toBe(400);
  });

  it('returns 400 for missing desiredOrder', async () => {
    const res = await request(app)
      .post('/api/discord-sync')
      .set('Cookie', `token=${token}`)
      .send({});
    expect(res.status).toBe(400);
  });

  it('returns no-move message when order is already correct', async () => {
    seedCharacters(userId, [
      { name: 'Alice', position: 1 },
      { name: 'Bob', position: 2 },
    ]);
    const res = await request(app)
      .post('/api/discord-sync')
      .set('Cookie', `token=${token}`)
      .send({
        desiredOrder: [
          { id: 1, name: 'Alice' },
          { id: 2, name: 'Bob' },
        ],
      });
    expect(res.status).toBe(200);
    expect(res.body.moves).toBe(0);
  });

  it('returns 409 when a sync job is already running', async () => {
    seedCharacters(userId, [{ name: 'A', position: 1 }, { name: 'B', position: 2 }]);
    getDb()
      .prepare(
        `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'running', 1)`
      )
      .run(randomUUID(), userId);

    const res = await request(app)
      .post('/api/discord-sync')
      .set('Cookie', `token=${token}`)
      .send({
        desiredOrder: [
          { id: 2, name: 'B' },
          { id: 1, name: 'A' },
        ],
      });
    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/already in progress/i);
  });

  it('returns 503 when bot is unreachable and stores error job', async () => {
    seedCharacters(userId, [{ name: 'A', position: 1 }, { name: 'B', position: 2 }]);

    const res = await request(app)
      .post('/api/discord-sync')
      .set('Cookie', `token=${token}`)
      .send({
        desiredOrder: [
          { id: 2, name: 'B' },
          { id: 1, name: 'A' },
        ],
      });

    expect(res.status).toBe(503);
    expect(res.body.jobId).toBeDefined();

    const job = getDb()
      .prepare('SELECT * FROM discord_sync_jobs WHERE id = ?')
      .get(res.body.jobId);
    expect(job.status).toBe('error');
    expect(job.total).toBe(1); // only 1 move needed (swap A/B)
  });
});

describe('POST /api/discord-sync/:jobId/progress', () => {
  let userId;

  beforeEach(() => {
    resetDb();
    require('../db/migrate').migrate();
    userId = seedUser();
  });

  it('returns 401 without bot secret', async () => {
    const res = await request(app)
      .post('/api/discord-sync/fake-job/progress')
      .send({ status: 'progress', completed: 1, total: 3 });
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown jobId', async () => {
    const res = await request(app)
      .post('/api/discord-sync/nonexistent/progress')
      .set('x-bot-secret', 'test-bot-secret')
      .send({ status: 'progress', completed: 1, total: 3 });
    expect(res.status).toBe(404);
  });

  it('updates completed count and keeps status=running for progress events', async () => {
    const jobId = randomUUID();
    getDb()
      .prepare(
        `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'running', 5)`
      )
      .run(jobId, userId);

    const res = await request(app)
      .post(`/api/discord-sync/${jobId}/progress`)
      .set('x-bot-secret', 'test-bot-secret')
      .send({ status: 'progress', completed: 3, total: 5 });

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const job = getDb().prepare('SELECT * FROM discord_sync_jobs WHERE id = ?').get(jobId);
    expect(job.completed).toBe(3);
    expect(job.status).toBe('running');
  });

  it('marks job as completed', async () => {
    const jobId = randomUUID();
    getDb()
      .prepare(
        `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'running', 3)`
      )
      .run(jobId, userId);

    await request(app)
      .post(`/api/discord-sync/${jobId}/progress`)
      .set('x-bot-secret', 'test-bot-secret')
      .send({ status: 'completed', completed: 3, total: 3 });

    const job = getDb().prepare('SELECT * FROM discord_sync_jobs WHERE id = ?').get(jobId);
    expect(job.status).toBe('completed');
    expect(job.completed).toBe(3);
  });

  it('marks job as error with message', async () => {
    const jobId = randomUUID();
    getDb()
      .prepare(
        `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'running', 3)`
      )
      .run(jobId, userId);

    await request(app)
      .post(`/api/discord-sync/${jobId}/progress`)
      .set('x-bot-secret', 'test-bot-secret')
      .send({ status: 'error', completed: 1, total: 3, error: 'Mudae cooldown' });

    const job = getDb().prepare('SELECT * FROM discord_sync_jobs WHERE id = ?').get(jobId);
    expect(job.status).toBe('error');
    expect(job.error).toBe('Mudae cooldown');
  });
});

describe('DELETE /api/discord-sync/:jobId', () => {
  let userId;
  let token;

  beforeEach(() => {
    resetDb();
    require('../db/migrate').migrate();
    userId = seedUser();
    token = makeToken(userId);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).delete('/api/discord-sync/some-id');
    expect(res.status).toBe(401);
  });

  it('returns 404 for unknown job', async () => {
    const res = await request(app)
      .delete('/api/discord-sync/nonexistent')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(404);
  });

  it('returns 400 when job is already completed', async () => {
    const jobId = randomUUID();
    getDb()
      .prepare(
        `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'completed', 3)`
      )
      .run(jobId, userId);

    const res = await request(app)
      .delete(`/api/discord-sync/${jobId}`)
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(400);
  });

  it('cancels a running job even when bot is unreachable', async () => {
    const jobId = randomUUID();
    getDb()
      .prepare(
        `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'running', 5)`
      )
      .run(jobId, userId);

    const res = await request(app)
      .delete(`/api/discord-sync/${jobId}`)
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.ok).toBe(true);

    const job = getDb().prepare('SELECT * FROM discord_sync_jobs WHERE id = ?').get(jobId);
    expect(job.status).toBe('cancelled');
  });
});

describe('GET /api/discord-sync/jobs', () => {
  let userId;
  let token;

  beforeEach(() => {
    resetDb();
    require('../db/migrate').migrate();
    userId = seedUser();
    token = makeToken(userId);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/discord-sync/jobs');
    expect(res.status).toBe(401);
  });

  it('returns empty array when no jobs exist', async () => {
    const res = await request(app)
      .get('/api/discord-sync/jobs')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns only the authenticated user\'s jobs', async () => {
    const otherId = seedUser('other-user');
    getDb()
      .prepare(
        `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'completed', 2)`
      )
      .run(randomUUID(), userId);
    getDb()
      .prepare(
        `INSERT INTO discord_sync_jobs (id, user_id, status, total) VALUES (?, ?, 'completed', 1)`
      )
      .run(randomUUID(), otherId);

    const res = await request(app)
      .get('/api/discord-sync/jobs')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.length).toBe(1);
    expect(res.body[0].user_id).toBe(userId);
  });
});
