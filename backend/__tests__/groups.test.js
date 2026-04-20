const request = require('supertest');
const { setupTestApp } = require('./helpers');

let app;

beforeAll(async () => {
  app = await setupTestApp();
});

describe('GET /api/groups', () => {
  it('returns an empty array initially', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });
});

describe('POST /api/groups', () => {
  it('creates a group', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Favorites', color: '#ff6b6b' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Favorites');
    expect(res.body.color).toBe('#ff6b6b');
  });

  it('uses default color when not provided', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Top Tier' });
    expect(res.status).toBe(201);
    expect(res.body.color).toBe('#6366f1');
  });

  it('rejects duplicate group name', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Favorites' });
    expect(res.status).toBe(409);
  });

  it('rejects missing name', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ color: '#aabbcc' });
    expect(res.status).toBe(400);
  });

  it('rejects invalid color format', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Invalid Color', color: 'red' });
    expect(res.status).toBe(400);
  });
});

describe('PUT /api/characters/:id/group', () => {
  let charId;
  let groupId;

  beforeAll(async () => {
    await request(app)
      .post('/api/characters/sync')
      .send({ characters: [{ name: 'Ram', series: 'Re:Zero', kakera: 800 }] });

    const listRes = await request(app).get('/api/characters');
    charId = listRes.body.find(c => c.name === 'Ram')?.id;

    const groupRes = await request(app)
      .post('/api/groups')
      .send({ name: 'Group For Assign' });
    groupId = groupRes.body.id;
  });

  it('assigns a character to a group', async () => {
    const res = await request(app)
      .put(`/api/characters/${charId}/group`)
      .send({ group_id: groupId });
    expect(res.status).toBe(200);

    const charRes = await request(app).get(`/api/characters/${charId}`);
    expect(charRes.body.groups).toContainEqual(
      expect.objectContaining({ id: groupId })
    );
  });

  it('removes character from groups when group_id is null', async () => {
    const res = await request(app)
      .put(`/api/characters/${charId}/group`)
      .send({ group_id: null });
    expect(res.status).toBe(200);

    const charRes = await request(app).get(`/api/characters/${charId}`);
    expect(charRes.body.groups).toHaveLength(0);
  });

  it('returns 404 for unknown group', async () => {
    const res = await request(app)
      .put(`/api/characters/${charId}/group`)
      .send({ group_id: 99999 });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/groups/:id', () => {
  it('deletes a group', async () => {
    const createRes = await request(app)
      .post('/api/groups')
      .send({ name: 'ToDeleteGroup' });
    const id = createRes.body.id;

    const delRes = await request(app).delete(`/api/groups/${id}`);
    expect(delRes.status).toBe(200);

    const listRes = await request(app).get('/api/groups');
    expect(listRes.body.find(g => g.id === id)).toBeUndefined();
  });

  it('returns 404 for unknown group', async () => {
    const res = await request(app).delete('/api/groups/99999');
    expect(res.status).toBe(404);
  });
});
