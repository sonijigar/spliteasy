/**
 * Integration tests for auth API endpoints.
 *
 * Tests run against the in-memory mock server which mirrors the real API
 * contract exactly — no database or network required.
 */
const request = require('supertest');
const { app, reset } = require('../../../mock-server');

beforeEach(reset);   // fresh state before every test

const ALICE = { name: 'Alice', phone: '+1 555 0001', password: 'password123' };

describe('POST /api/auth/register', () => {
  test('creates a user and returns a JWT token', async () => {
    const res = await request(app).post('/api/auth/register').send(ALICE);
    expect(res.status).toBe(201);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Alice');
    expect(res.body.user.phone).toBe(ALICE.phone);
  });

  test('never exposes the password hash in the response', async () => {
    const res = await request(app).post('/api/auth/register').send(ALICE);
    expect(res.body.user.password).toBeUndefined();
  });

  test('rejects a duplicate phone number with 409', async () => {
    await request(app).post('/api/auth/register').send(ALICE);
    const res = await request(app).post('/api/auth/register').send({ ...ALICE, name: 'Bob' });
    expect(res.status).toBe(409);
  });

  test('returns 400 when required fields are missing', async () => {
    const res = await request(app).post('/api/auth/register').send({ name: 'Alice' });
    expect(res.status).toBe(400);
  });

  test('returns 400 for a password shorter than 6 characters', async () => {
    const res = await request(app).post('/api/auth/register').send({ ...ALICE, password: 'abc' });
    expect(res.status).toBe(400);
  });
});

describe('POST /api/auth/login', () => {
  beforeEach(async () => {
    await request(app).post('/api/auth/register').send(ALICE);
  });

  test('returns a token on valid credentials', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: ALICE.phone, password: ALICE.password });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.name).toBe('Alice');
  });

  test('returns 401 on wrong password', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: ALICE.phone, password: 'wrongpassword' });
    expect(res.status).toBe(401);
  });

  test('returns 401 for an unregistered phone number', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ phone: '+1 999 9999', password: ALICE.password });
    expect(res.status).toBe(401);
  });

  test('returns 400 when credentials are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({ phone: ALICE.phone });
    expect(res.status).toBe(400);
  });
});

describe('GET /api/auth/me', () => {
  test('returns the authenticated user', async () => {
    const { body: { token } } = await request(app).post('/api/auth/register').send(ALICE);
    const res = await request(app).get('/api/auth/me').set('Authorization', `Bearer ${token}`);
    expect(res.status).toBe(200);
    expect(res.body.user.name).toBe('Alice');
    expect(res.body.user.password).toBeUndefined();
  });

  test('returns 401 without a token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });
});
