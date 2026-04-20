const request = require('supertest');
const { setupTestApp } = require('./helpers');

let app;

beforeAll(async () => {
  app = await setupTestApp();
});

const validChar = {
  name: 'Rem',
  series: 'Re:Zero',
  kakera: 1200,
  image_url: 'https://example.com/rem.jpg',
  rank: 1,
  likes: 50,
};

describe('GET /api/characters', () => {
  it('returns an empty array initially', async () => {
    const res = await request(app).get('/api/characters');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/sync', () => {
  it('syncs a list of characters', async () => {
    const res = await request(app)
      .post('/api/characters/sync')
      .send({ characters: [validChar] });
    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(1);
    expect(res.body.updated).toBe(0);
  });

  it('updates existing characters on re-sync', async () => {
    const res = await request(app)
      .post('/api/characters/sync')
      .send({ characters: [{ ...validChar, kakera: 1500 }] });
    expect(res.status).toBe(201);
    expect(res.body.inserted).toBe(0);
    expect(res.body.updated).toBe(1);
  });

  it('rejects malformed data - missing name', async () => {
    const res = await request(app)
      .post('/api/characters/sync')
      .send({ characters: [{ series: 'Test', kakera: 100 }] });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Validation error');
  });

  it('rejects empty characters array', async () => {
    const res = await request(app)
      .post('/api/characters/sync')
      .send({ characters: [] });
    expect(res.status).toBe(400);
  });

  it('rejects invalid image_url', async () => {
    const res = await request(app)
      .post('/api/characters/sync')
      .send({ characters: [{ ...validChar, image_url: 'not-a-url' }] });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/characters/:id', () => {
  let charId;

  beforeAll(async () => {
    const res = await request(app).get('/api/characters');
    charId = res.body[0]?.id;
  });

  it('returns a character by id', async () => {
    const res = await request(app).get(`/api/characters/${charId}`);
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('Rem');
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).get('/api/characters/99999');
    expect(res.status).toBe(404);
  });

  it('returns 400 for non-numeric id', async () => {
    const res = await request(app).get('/api/characters/abc');
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/characters/reorder', () => {
  it('reorders characters', async () => {
    // Add a second character first
    await request(app)
      .post('/api/characters/sync')
      .send({ characters: [{ name: 'Emilia', series: 'Re:Zero', kakera: 900 }] });

    const listRes = await request(app).get('/api/characters');
    const ids = listRes.body.map(c => c.id);

    const res = await request(app)
      .put('/api/characters/reorder')
      .send({ ids: ids.reverse() });
    expect(res.status).toBe(200);
    expect(res.body.count).toBe(ids.length);
  });

  it('rejects missing IDs', async () => {
    const res = await request(app)
      .put('/api/characters/reorder')
      .send({ ids: [99999] });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/Unknown character IDs/);
  });

  it('rejects empty ids array', async () => {
    const res = await request(app)
      .put('/api/characters/reorder')
      .send({ ids: [] });
    expect(res.status).toBe(400);
  });
});

describe('DELETE /api/characters/:id', () => {
  it('deletes an existing character', async () => {
    await request(app)
      .post('/api/characters/sync')
      .send({ characters: [{ name: 'ToDelete', series: 'TestSeries', kakera: 100 }] });

    const listRes = await request(app).get('/api/characters');
    const target = listRes.body.find(c => c.name === 'ToDelete');

    const delRes = await request(app).delete(`/api/characters/${target.id}`);
    expect(delRes.status).toBe(200);

    const getRes = await request(app).get(`/api/characters/${target.id}`);
    expect(getRes.status).toBe(404);
  });

  it('returns 404 for unknown id', async () => {
    const res = await request(app).delete('/api/characters/99999');
    expect(res.status).toBe(404);
  });
});
