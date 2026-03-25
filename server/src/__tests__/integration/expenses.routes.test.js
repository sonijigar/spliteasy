/**
 * Integration tests for expense and balance endpoints.
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

describe('POST /api/expenses', () => {
  test('creates an expense and returns it with populated fields', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Dinner', amount: 60, category: 'food', paidBy: user._id, splitWith: [user._id] });

    expect(res.status).toBe(201);
    expect(res.body.expense.description).toBe('Dinner');
    expect(res.body.expense.amount).toBe(60);
    expect(res.body.expense.category).toBe('food');
  });

  test('defaults category to "other" when omitted', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Misc', amount: 20, paidBy: user._id, splitWith: [user._id] });

    expect(res.status).toBe(201);
    expect(res.body.expense.category).toBe('other');
  });

  test('returns 400 when description is missing', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ amount: 60, splitWith: [user._id] });
    expect(res.status).toBe(400);
  });

  test('returns 400 when splitWith is empty', async () => {
    const { token } = await registerUser('Alice', '+1 555 0001');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({ description: 'Dinner', amount: 60, splitWith: [] });
    expect(res.status).toBe(400);
  });

  test('returns 401 without a token', async () => {
    const res = await request(app)
      .post('/api/expenses')
      .send({ description: 'Dinner', amount: 60, splitWith: ['fakeid'] });
    expect(res.status).toBe(401);
  });
});

describe('POST /api/expenses — unequal splits', () => {
  test('creates expense with equal split (default behavior)', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Dinner',
        amount: 60,
        paidBy: user._id,
        splitWith: [user._id, bob._id],
        splitType: 'equal'
      });

    expect(res.status).toBe(201);
    expect(res.body.expense.splitType).toBe('equal');
    // Each person owes $30
    expect(res.body.expense.splitWith).toHaveLength(2);
    res.body.expense.splitWith.forEach(s => {
      expect(s.amount).toBe(30);
    });
  });

  test('creates expense with percentage split', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Hotel',
        amount: 100,
        paidBy: user._id,
        splitWith: [user._id, bob._id],
        splitType: 'percentage',
        customSplits: [
          { userId: user._id, percentage: 70 },
          { userId: bob._id, percentage: 30 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.expense.splitType).toBe('percentage');
    const aliceSplit = res.body.expense.splitWith.find(s => s.user._id === user._id);
    const bobSplit = res.body.expense.splitWith.find(s => s.user._id === bob._id);
    expect(aliceSplit.amount).toBe(70);
    expect(bobSplit.amount).toBe(30);
  });

  test('creates expense with exact amount split', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Groceries',
        amount: 50,
        paidBy: user._id,
        splitWith: [user._id, bob._id],
        splitType: 'exact',
        customSplits: [
          { userId: user._id, amount: 20 },
          { userId: bob._id, amount: 30 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.expense.splitType).toBe('exact');
    const aliceSplit = res.body.expense.splitWith.find(s => s.user._id === user._id);
    const bobSplit = res.body.expense.splitWith.find(s => s.user._id === bob._id);
    expect(aliceSplit.amount).toBe(20);
    expect(bobSplit.amount).toBe(30);
  });

  test('creates expense with shares split', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Rent',
        amount: 90,
        paidBy: user._id,
        splitWith: [user._id, bob._id],
        splitType: 'shares',
        customSplits: [
          { userId: user._id, shares: 2 },
          { userId: bob._id, shares: 1 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.expense.splitType).toBe('shares');
    const aliceSplit = res.body.expense.splitWith.find(s => s.user._id === user._id);
    const bobSplit = res.body.expense.splitWith.find(s => s.user._id === bob._id);
    expect(aliceSplit.amount).toBe(60); // 2/3 of 90
    expect(bobSplit.amount).toBe(30);  // 1/3 of 90
  });

  test('returns 400 when percentages do not sum to 100', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Hotel',
        amount: 100,
        paidBy: user._id,
        splitWith: [user._id, bob._id],
        splitType: 'percentage',
        customSplits: [
          { userId: user._id, percentage: 60 },
          { userId: bob._id, percentage: 20 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sum to 100/i);
  });

  test('returns 400 when exact amounts do not sum to total', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Groceries',
        amount: 50,
        paidBy: user._id,
        splitWith: [user._id, bob._id],
        splitType: 'exact',
        customSplits: [
          { userId: user._id, amount: 10 },
          { userId: bob._id, amount: 10 }
        ]
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/sum to the total/i);
  });

  test('returns 400 when customSplits missing for non-equal split', async () => {
    const { token, user } = await registerUser('Alice', '+1 555 0001');
    const res = await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${token}`)
      .send({
        description: 'Dinner',
        amount: 60,
        paidBy: user._id,
        splitWith: [user._id],
        splitType: 'percentage'
      });

    expect(res.status).toBe(400);
  });
});

describe('GET /api/expenses/balances', () => {
  test('returns empty balances and zero summary when there are no expenses', async () => {
    const { token } = await registerUser('Alice', '+1 555 0001');
    const res = await request(app)
      .get('/api/expenses/balances')
      .set('Authorization', `Bearer ${token}`);

    expect(res.status).toBe(200);
    expect(res.body.balances).toHaveLength(0);
    expect(res.body.summary).toEqual({ totalOwedToYou: 0, totalYouOwe: 0, netBalance: 0 });
  });

  test('correctly calculates who owes whom after a shared expense', async () => {
    const { token: aliceToken, user: alice } = await registerUser('Alice', '+1 555 0001');
    const { token: bobToken, user: bob } = await registerUser('Bob', '+1 555 0002');

    // Alice pays $60 split equally between Alice and Bob → each owes $30
    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ description: 'Dinner', amount: 60, paidBy: alice._id, splitWith: [alice._id, bob._id] });

    const aliceRes = await request(app)
      .get('/api/expenses/balances')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(aliceRes.body.summary.totalOwedToYou).toBe(30);
    expect(aliceRes.body.summary.totalYouOwe).toBe(0);
    expect(aliceRes.body.summary.netBalance).toBe(30);

    const bobRes = await request(app)
      .get('/api/expenses/balances')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(bobRes.body.summary.totalYouOwe).toBe(30);
    expect(bobRes.body.summary.totalOwedToYou).toBe(0);
    expect(bobRes.body.summary.netBalance).toBe(-30);
  });

  test('accumulates multiple expenses between the same two people', async () => {
    const { token: aliceToken, user: alice } = await registerUser('Alice', '+1 555 0001');
    const { user: bob } = await registerUser('Bob', '+1 555 0002');

    // Two $60 expenses paid by Alice, split with Bob → Bob owes $60 total
    for (let i = 0; i < 2; i++) {
      await request(app)
        .post('/api/expenses')
        .set('Authorization', `Bearer ${aliceToken}`)
        .send({ description: `Expense ${i}`, amount: 60, paidBy: alice._id, splitWith: [alice._id, bob._id] });
    }

    const res = await request(app)
      .get('/api/expenses/balances')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(res.body.summary.totalOwedToYou).toBe(60);
  });

  test('a settlement fully offsets the outstanding balance', async () => {
    const { token: aliceToken, user: alice } = await registerUser('Alice', '+1 555 0001');
    const { token: bobToken, user: bob } = await registerUser('Bob', '+1 555 0002');

    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ description: 'Dinner', amount: 60, paidBy: alice._id, splitWith: [alice._id, bob._id] });

    await request(app)
      .post('/api/settlements')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ to: alice._id, amount: 30, note: 'Paying back' });

    const aliceRes = await request(app)
      .get('/api/expenses/balances')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(aliceRes.body.summary.netBalance).toBe(0);

    const bobRes = await request(app)
      .get('/api/expenses/balances')
      .set('Authorization', `Bearer ${bobToken}`);
    expect(bobRes.body.summary.netBalance).toBe(0);
  });

  test('a partial settlement reduces but does not clear the balance', async () => {
    const { token: aliceToken, user: alice } = await registerUser('Alice', '+1 555 0001');
    const { token: bobToken, user: bob } = await registerUser('Bob', '+1 555 0002');

    await request(app)
      .post('/api/expenses')
      .set('Authorization', `Bearer ${aliceToken}`)
      .send({ description: 'Dinner', amount: 60, paidBy: alice._id, splitWith: [alice._id, bob._id] });

    await request(app)
      .post('/api/settlements')
      .set('Authorization', `Bearer ${bobToken}`)
      .send({ to: alice._id, amount: 10 });

    const res = await request(app)
      .get('/api/expenses/balances')
      .set('Authorization', `Bearer ${aliceToken}`);
    expect(res.body.summary.totalOwedToYou).toBe(20);
  });
});
