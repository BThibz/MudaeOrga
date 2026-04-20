const request = require('supertest');
const jwt = require('jsonwebtoken');
const { DatabaseSync } = require('node:sqlite');

// Variables d'env de test
process.env.JWT_SECRET = 'test_secret_key';
process.env.DISCORD_CLIENT_ID = 'test_client_id';
process.env.DISCORD_CLIENT_SECRET = 'test_client_secret';
process.env.DISCORD_REDIRECT_URI = 'http://localhost:3001/auth/discord/callback';
process.env.FRONTEND_URL = 'http://localhost:5173';
process.env.NODE_ENV = 'test';

// Singleton en mémoire pour les tests (préfixe "mock" requis par Jest pour l'accès dans la factory)
let mockTestDb = null;

jest.mock('../db/database', () => ({
  getDb: () => {
    if (!mockTestDb) {
      mockTestDb = new (require('node:sqlite').DatabaseSync)(':memory:');
      mockTestDb.exec('PRAGMA foreign_keys = ON');
    }
    return mockTestDb;
  },
  closeDb: () => {
    if (mockTestDb) {
      mockTestDb.close();
      mockTestDb = null;
    }
  },
}));

// Mock global fetch
global.fetch = jest.fn();

const { getDb, closeDb } = require('../db/database');
const { migrate } = require('../db/migrate');
const app = require('../index');

beforeEach(() => {
  // Réinitialise le schéma avant chaque test
  const db = getDb();
  db.exec('DROP TABLE IF EXISTS characters');
  db.exec('DROP TABLE IF EXISTS groups');
  db.exec('DROP TABLE IF EXISTS users');
  migrate(db);
  jest.clearAllMocks();
});

afterAll(() => {
  closeDb();
});

// ─────────────────────────────────────────
//  GET /auth/discord
// ─────────────────────────────────────────
describe('GET /auth/discord', () => {
  it('redirige vers l\'URL d\'autorisation Discord', async () => {
    const res = await request(app).get('/auth/discord');
    expect(res.status).toBe(302);
    expect(res.headers.location).toContain('discord.com/api/v10/oauth2/authorize');
    expect(res.headers.location).toContain('client_id=test_client_id');
    expect(res.headers.location).toContain('scope=identify');
    expect(res.headers.location).toContain('response_type=code');
  });
});

// ─────────────────────────────────────────
//  GET /auth/discord/callback
// ─────────────────────────────────────────
describe('GET /auth/discord/callback', () => {
  it('retourne 400 si le paramètre code est absent', async () => {
    const res = await request(app).get('/auth/discord/callback');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/code/i);
  });

  it('retourne 400 si l\'échange de code échoue côté Discord', async () => {
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });
    const res = await request(app).get('/auth/discord/callback?code=bad_code');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/échange/i);
  });

  it('retourne 400 si la récupération du profil utilisateur échoue', async () => {
    global.fetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ access_token: 'discord_at' }),
    });
    global.fetch.mockResolvedValueOnce({ ok: false, json: async () => ({}) });

    const res = await request(app).get('/auth/discord/callback?code=valid_code');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/utilisateur/i);
  });

  it('crée un utilisateur en base et set le cookie JWT lors d\'un callback valide', async () => {
    const discordUser = {
      id: '123456789',
      username: 'TestUser',
      discriminator: '0001',
      avatar: 'abc123',
    };

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'discord_at' }) })
      .mockResolvedValueOnce({ ok: true, json: async () => discordUser });

    const res = await request(app).get('/auth/discord/callback?code=valid_code');

    // Doit rediriger vers le frontend
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('http://localhost:5173');

    // Cookie JWT présent
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/^token=/);
    expect(setCookie[0]).toMatch(/HttpOnly/i);

    // Utilisateur en base
    const db = getDb();
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get('123456789');
    expect(user).toBeDefined();
    expect(user.username).toBe('TestUser');
    expect(user.discriminator).toBe('0001');
  });

  it('met à jour l\'utilisateur existant lors d\'une reconnexion', async () => {
    const db = getDb();
    db.prepare('INSERT INTO users (id, username) VALUES (?, ?)').run('123456789', 'AncienNom');

    global.fetch
      .mockResolvedValueOnce({ ok: true, json: async () => ({ access_token: 'discord_at' }) })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          id: '123456789',
          username: 'NouveauNom',
          discriminator: '0002',
          avatar: null,
        }),
      });

    await request(app).get('/auth/discord/callback?code=valid_code');

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get('123456789');
    expect(user.username).toBe('NouveauNom');
  });

  it('retourne 502 si fetch lève une exception réseau', async () => {
    global.fetch.mockRejectedValueOnce(new Error('Network error'));
    const res = await request(app).get('/auth/discord/callback?code=any_code');
    expect(res.status).toBe(502);
  });
});

// ─────────────────────────────────────────
//  POST /auth/logout
// ─────────────────────────────────────────
describe('POST /auth/logout', () => {
  it('efface le cookie et retourne un message de succès', async () => {
    const res = await request(app).post('/auth/logout');
    expect(res.status).toBe(200);
    expect(res.body.message).toMatch(/déconnexion/i);
    const setCookie = res.headers['set-cookie'];
    expect(setCookie).toBeDefined();
    expect(setCookie[0]).toMatch(/token=;/);
  });
});

// ─────────────────────────────────────────
//  GET /auth/me
// ─────────────────────────────────────────
describe('GET /auth/me', () => {
  it('retourne 401 sans token', async () => {
    const res = await request(app).get('/auth/me');
    expect(res.status).toBe(401);
  });

  it('retourne le profil de l\'utilisateur connecté', async () => {
    const db = getDb();
    db.prepare('INSERT INTO users (id, username, discriminator, avatar) VALUES (?, ?, ?, ?)')
      .run('999', 'MonProfil', '0042', 'avatar_hash');

    const token = jwt.sign({ user_id: '999' }, process.env.JWT_SECRET, { expiresIn: '1h' });

    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe('999');
    expect(res.body.username).toBe('MonProfil');
  });

  it('retourne 404 si l\'utilisateur n\'existe pas en base', async () => {
    const token = jwt.sign({ user_id: 'ghost_id' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', `token=${token}`);
    expect(res.status).toBe(404);
  });
});
