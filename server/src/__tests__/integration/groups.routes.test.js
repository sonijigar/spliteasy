/**
 * Integration tests for groups API endpoints.
 *
 * Tests run against the in-memory mock server — no database or network required.
 */
const request = require('supertest');
const { app, reset } = require('../../../mock-server');

beforeEach(reset);

// Register a user and return their token + user object
async function registerUser(name, phone) {
  const res = await request(app)
    .post('/api/auth/register')
    .send({ name, phone, password: 'password123' });
  return { token: res.body.token, user: res.body.user };
}

// ── POST /api/groups ─────────────────────────────────────────

describe('POST /api/groups', () => {
  test('creates a group successfully', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Road Trip 2024', description: 'Summer road trip', memberIds: [bob._id] });

    expect(res.status).toBe(201);
    expect(res.body.group.name).toBe('Road Trip 2024');
    expect(res.body.group.description).toBe('Summer road trip');
    expect(res.body.group.members).toHaveLength(2);
    const memberIds = res.body.group.members.map(m => m._id.toString());
    expect(memberIds).toContain(user._id.toString());
    expect(memberIds).toContain(bob._id.toString());
  });

  test('creates group without optional members', async () => {
    const { token } = await registerUser('Alice', '+1 555 0001');

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ name: 'Solo Group' });

    expect(res.status).toBe(201);
    expect(res.body.group.name).toBe('Solo Group');
    expect(res.body.group.members).toHaveLength(1);
  });

  test('returns 400 when name is missing', async () => {
    const { token } = await registerUser('Alice', '+1 555 0001');

    const res = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'No name group' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBeDefined();
  });

  test('requires authentication', async () => {
    const res = await request(app)
      .post('/api/groups')
      .send({ name: 'Unauthorized Group' });

    expect(res.status).toBe(401);
  });
});

// ── GET /api/groups ──────────────────────────────────────────

describe('GET /api/groups', () => {
  test('returns groups the user is a member of', async () => {
    const { token: aliceToken, user: alice } = await registerUser('Alice', '+1 555 0001');
    const { token: bobToken } = await registerUser('Bob', '+1 555 0002');

    // Alice creates a group
    await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Alice Group' });

    // Bob creates a group
    await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ name: 'Bob Group' });

    const res = await request(app)
      .get('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(1);
    expect(res.body.groups[0].name).toBe('Alice Group');
  });

  test('returns empty array when user has no groups', async () => {
    const { token } = await registerUser('Alice', '+1 555 0001');

    const res = await request(app)
      .get('/api/groups')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.groups).toHaveLength(0);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/groups');
    expect(res.status).toBe(401);
  });
});

// ── GET /api/groups/:groupId ─────────────────────────────────

describe('GET /api/groups/:groupId', () => {
  test('returns group details for a member', async () => {
    const { token: aliceToken } = await registerUser('Alice', '+1 555 0001');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Apartment' });

    const groupId = createRes.body.group._id;

    const res = await request(app)
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);
    expect(res.body.group.name).toBe('Apartment');
    expect(res.body.group.members).toHaveLength(1);
    expect(res.body.expenses).toBeDefined();
    expect(res.body.balances).toBeDefined();
  });

  test('returns 403 for non-members', async () => {
    const { token: aliceToken } = await registerUser('Alice', '+1 555 0001');
    const { token: bobToken } = await registerUser('Bob', '+1 555 0002');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Private Group' });

    const groupId = createRes.body.group._id;

    const res = await request(app)
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(403);
  });

  test('returns 404 for non-existent group', async () => {
    const { token } = await registerUser('Alice', '+1 555 0001');

    const res = await request(app)
      .get('/api/groups/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('requires authentication', async () => {
    const res = await request(app).get('/api/groups/some-id');
    expect(res.status).toBe(401);
  });
});

// ── POST /api/groups/:groupId/members ────────────────────────

describe('POST /api/groups/:groupId/members', () => {
  test('adds a member to the group', async () => {
    const { token: aliceToken } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Trip' });

    const groupId = createRes.body.group._id;

    const res = await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: bob._id });

    expect(res.status).toBe(200);
    const memberIds = res.body.group.members.map(m => m._id.toString());
    expect(memberIds).toContain(bob._id.toString());
  });

  test('does not add duplicate members', async () => {
    const { token: aliceToken, user: alice } = await registerUser('Alice', '+1 555 0001');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Trip' });

    const groupId = createRes.body.group._id;

    // Try to add Alice again
    await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ userId: alice._id });

    const res = await request(app)
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.body.group.members).toHaveLength(1);
  });

  test('returns 400 when userId is missing', async () => {
    const { token: aliceToken } = await registerUser('Alice', '+1 555 0001');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Trip' });

    const groupId = createRes.body.group._id;

    const res = await request(app)
      .post(`/api/groups/${groupId}/members`)
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({});

    expect(res.status).toBe(400);
  });

  test('returns 404 for non-existent group', async () => {
    const { token } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');

    const res = await request(app)
      .post('/api/groups/nonexistent-id/members')
      .set('Authorization', `Bearer ${token}`)
      .send({ userId: bob._id });

    expect(res.status).toBe(404);
  });

  test('requires authentication', async () => {
    const res = await request(app)
      .post('/api/groups/some-id/members')
      .send({ userId: 'some-user-id' });
    expect(res.status).toBe(401);
  });
});

// ── DELETE /api/groups/:groupId ──────────────────────────────

describe('DELETE /api/groups/:groupId', () => {
  test('allows creator to delete group', async () => {
    const { token: aliceToken } = await registerUser('Alice', '+1 555 0001');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Deletable Group' });

    const groupId = createRes.body.group._id;

    const res = await request(app)
      .delete(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${aliceToken}`);

    expect(res.status).toBe(200);

    // Verify group is gone
    const checkRes = await request(app)
      .get(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(checkRes.status).toBe(404);
  });

  test('prevents non-creators from deleting group', async () => {
    const { token: aliceToken } = await registerUser('Alice', '+1 555 0001');
    const { token: bobToken, user: bob } = await registerUser('Bob', '+1 555 0002');

    const createRes = await request(app)
      .post('/api/groups')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ name: 'Alice Group', memberIds: [bob._id] });

    const groupId = createRes.body.group._id;

    const res = await request(app)
      .delete(`/api/groups/${groupId}`)
      .set('Authorization', `Bearer ${bobToken}`);

    expect(res.status).toBe(403);
  });

  test('returns 404 for non-existent group', async () => {
    const { token } = await registerUser('Alice', '+1 555 0001');

    const res = await request(app)
      .delete('/api/groups/nonexistent-id')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(404);
  });

  test('requires authentication', async () => {
    const res = await request(app).delete('/api/groups/some-id');
    expect(res.status).toBe(401);
  });
});
