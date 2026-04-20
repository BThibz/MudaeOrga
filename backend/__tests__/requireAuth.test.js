const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');

process.env.JWT_SECRET = 'test_secret_key';

const requireAuth = require('../middleware/requireAuth');

// Mini-app Express pour tester le middleware isolément
function makeApp() {
  const app = express();
  app.use(cookieParser());
  app.get('/protected', requireAuth, (req, res) => {
    res.json({ user_id: req.user_id });
  });
  return app;
}

describe('requireAuth middleware', () => {
  it('laisse passer une requête avec un token valide et attache user_id', async () => {
    const token = jwt.sign({ user_id: 'user_42' }, process.env.JWT_SECRET, { expiresIn: '1h' });
    const res = await request(makeApp())
      .get('/protected')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(200);
    expect(res.body.user_id).toBe('user_42');
  });

  it('retourne 401 si aucun cookie token', async () => {
    const res = await request(makeApp()).get('/protected');
    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/authentifié/i);
  });

  it('retourne 401 si le token est signé avec un mauvais secret', async () => {
    const token = jwt.sign({ user_id: 'user_42' }, 'wrong_secret', { expiresIn: '1h' });
    const res = await request(makeApp())
      .get('/protected')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
    expect(res.body.error).toMatch(/invalide/i);
  });

  it('retourne 401 si le token est expiré', async () => {
    const token = jwt.sign({ user_id: 'user_42' }, process.env.JWT_SECRET, { expiresIn: '-1s' });
    const res = await request(makeApp())
      .get('/protected')
      .set('Cookie', `token=${token}`);

    expect(res.status).toBe(401);
  });

  it('retourne 401 si le token est malformé', async () => {
    const res = await request(makeApp())
      .get('/protected')
      .set('Cookie', 'token=not.a.valid.jwt');

    expect(res.status).toBe(401);
  });
});
