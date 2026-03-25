/**
 * Integration-style tests for push notification logic.
 *
 * Uses jest mocks for Mongoose models and expo-server-sdk so no real
 * database or network connections are required.
 *
 * Covers:
 *  - PATCH /api/users/push-token  — push token registration endpoint
 *  - sendPushNotification         — guards against invalid tokens
 *  - notifyExpenseCreated         — sends to all recipients with tokens
 *  - notifySettlementCreated      — sends to recipient with token
 */

// ── Mock expo-server-sdk ─────────────────────────────────────────────────────
const mockSendPushNotificationsAsync = jest.fn().mockResolvedValue([{ status: 'ok' }]);

jest.mock('expo-server-sdk', () => {
  const MockExpo = jest.fn().mockImplementation(() => ({
    sendPushNotificationsAsync: mockSendPushNotificationsAsync,
  }));
  MockExpo.isExpoPushToken = jest.fn(
    (token) => typeof token === 'string' && token.startsWith('ExponentPushToken'),
  );
  return { Expo: MockExpo };
});

// ── Mock mongoose models ─────────────────────────────────────────────────────
const mockUserSave = jest.fn().mockResolvedValue(true);
const mockUserDoc = {
  _id: 'user-alice-id',
  name: 'Alice',
  pushToken: null,
  save: mockUserSave,
  toJSON() { return { _id: this._id, name: this.name }; },
};

jest.mock('../../models/User', () => ({
  findById: jest.fn(),
  find: jest.fn(),
  findOne: jest.fn(),
}));

jest.mock('../../models/Expense', () => {
  function MockExpense(data) {
    Object.assign(this, data);
    this._id = 'expense-id-1';
  }
  MockExpense.prototype.save = jest.fn().mockResolvedValue(true);
  MockExpense.prototype.populate = jest.fn().mockImplementation(function () {
    return Promise.resolve(this);
  });
  MockExpense.find = jest.fn();
  return MockExpense;
});

jest.mock('../../models/Settlement', () => {
  function MockSettlement(data) {
    Object.assign(this, data);
    this._id = 'settlement-id-1';
  }
  MockSettlement.prototype.save = jest.fn().mockResolvedValue(true);
  MockSettlement.prototype.populate = jest.fn().mockImplementation(function () {
    // Simulate populate by attaching mock objects
    if (arguments[0] === 'from') this.from = { _id: 'alice-id', name: 'Alice' };
    if (arguments[0] === 'to') this.to = { _id: 'bob-id', name: 'Bob' };
    return Promise.resolve(this);
  });
  MockSettlement.find = jest.fn();
  return MockSettlement;
});

// ── Mock auth middleware ─────────────────────────────────────────────────────
jest.mock('../../middleware/auth', () => (req, res, next) => {
  // Attach a fresh user-like object for each request
  req.user = {
    _id: 'user-alice-id',
    name: 'Alice',
    pushToken: null,
    save: mockUserSave,
    toJSON() { return { _id: this._id, name: this.name }; },
  };
  next();
});

// ── Build the Express app under test ─────────────────────────────────────────
process.env.JWT_SECRET = 'test-secret';

const express = require('express');
const cors = require('cors');
const supertest = require('supertest');

const userRoutes = require('../../routes/users');
const expenseRoutes = require('../../routes/expenses');
const settlementRoutes = require('../../routes/settlements');

const app = express();
app.use(cors());
app.use(express.json());
app.use('/api/users', userRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/settlements', settlementRoutes);

const request = supertest(app);

// ── Import modules under test ────────────────────────────────────────────────
const {
  sendPushNotification,
  notifyExpenseCreated,
  notifySettlementCreated,
} = require('../../services/notifications');

const User = require('../../models/User');

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/push-token
// ─────────────────────────────────────────────────────────────────────────────
describe('PATCH /api/users/push-token', () => {
  beforeEach(() => {
    mockUserSave.mockClear();
  });

  it('returns 200 and saves the push token', async () => {
    const res = await request
      .patch('/api/users/push-token')
      .set('Authorization', 'Bearer fake-token')
      .send({ pushToken: 'ExponentPushToken[abc]' });

    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Push token registered');
    expect(mockUserSave).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when pushToken is missing', async () => {
    const res = await request
      .patch('/api/users/push-token')
      .set('Authorization', 'Bearer fake-token')
      .send({});

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/pushToken/i);
  });

  it('returns 400 when pushToken is not a string', async () => {
    const res = await request
      .patch('/api/users/push-token')
      .set('Authorization', 'Bearer fake-token')
      .send({ pushToken: 12345 });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// sendPushNotification (unit)
// ─────────────────────────────────────────────────────────────────────────────
describe('sendPushNotification', () => {
  beforeEach(() => mockSendPushNotificationsAsync.mockClear());

  it('sends a notification for a valid Expo push token', async () => {
    await sendPushNotification('ExponentPushToken[valid]', 'Title', 'Body');
    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    const [msgs] = mockSendPushNotificationsAsync.mock.calls[0];
    expect(msgs[0].to).toBe('ExponentPushToken[valid]');
    expect(msgs[0].title).toBe('Title');
    expect(msgs[0].body).toBe('Body');
  });

  it('does not send when token is null', async () => {
    await sendPushNotification(null, 'Title', 'Body');
    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('does not send when token is invalid', async () => {
    await sendPushNotification('invalid-token', 'Title', 'Body');
    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// notifyExpenseCreated (unit)
// ─────────────────────────────────────────────────────────────────────────────
describe('notifyExpenseCreated', () => {
  beforeEach(() => mockSendPushNotificationsAsync.mockClear());

  it('sends notifications to recipients who have push tokens', async () => {
    const splitWithUsers = [
      { user: { pushToken: 'ExponentPushToken[bob]', name: 'Bob' }, amount: 25 },
      { user: { pushToken: null, name: 'Charlie' }, amount: 25 },
    ];

    await notifyExpenseCreated(splitWithUsers, 'Alice', 'Dinner');

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    const [msgs] = mockSendPushNotificationsAsync.mock.calls[0];
    expect(msgs[0].to).toBe('ExponentPushToken[bob]');
    expect(msgs[0].body).toContain('Dinner');
    expect(msgs[0].body).toContain('25.00');
  });

  it('sends to multiple recipients each with a token', async () => {
    const splitWithUsers = [
      { user: { pushToken: 'ExponentPushToken[bob]', name: 'Bob' }, amount: 10 },
      { user: { pushToken: 'ExponentPushToken[eve]', name: 'Eve' }, amount: 10 },
    ];

    await notifyExpenseCreated(splitWithUsers, 'Alice', 'Coffee');

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(2);
  });

  it('sends no notifications when no recipient has a push token', async () => {
    const splitWithUsers = [
      { user: { pushToken: null, name: 'Dave' }, amount: 15 },
    ];

    await notifyExpenseCreated(splitWithUsers, 'Alice', 'Lunch');

    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// notifySettlementCreated (unit)
// ─────────────────────────────────────────────────────────────────────────────
describe('notifySettlementCreated', () => {
  beforeEach(() => mockSendPushNotificationsAsync.mockClear());

  it('sends a notification to the recipient when they have a push token', async () => {
    await notifySettlementCreated('ExponentPushToken[bob]', 'Alice', 50);

    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
    const [msgs] = mockSendPushNotificationsAsync.mock.calls[0];
    expect(msgs[0].to).toBe('ExponentPushToken[bob]');
    expect(msgs[0].body).toContain('Alice');
    expect(msgs[0].body).toContain('50.00');
  });

  it('does not send when recipient has no push token', async () => {
    await notifySettlementCreated(null, 'Alice', 30);
    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/expenses — notification trigger
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/expenses — expense notification integration', () => {
  beforeEach(() => {
    mockSendPushNotificationsAsync.mockClear();
    User.find.mockClear();
  });

  it('calls User.find to look up recipients and sends notification if token exists', async () => {
    const bobId = 'bob-user-id';
    User.find.mockResolvedValueOnce([
      { _id: bobId, pushToken: 'ExponentPushToken[bob]', name: 'Bob' },
    ]);

    const res = await request
      .post('/api/expenses')
      .set('Authorization', 'Bearer fake-token')
      .send({
        description: 'Dinner',
        amount: 60,
        category: 'food',
        paidBy: 'user-alice-id',
        splitWith: [bobId],
      });

    expect(res.status).toBe(201);
    // Allow the async notification fire
    await new Promise((r) => setTimeout(r, 50));
    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request
      .post('/api/expenses')
      .set('Authorization', 'Bearer fake-token')
      .send({ description: 'Partial' });

    expect(res.status).toBe(400);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/settlements — notification trigger
// ─────────────────────────────────────────────────────────────────────────────
describe('POST /api/settlements — settlement notification integration', () => {
  beforeEach(() => {
    mockSendPushNotificationsAsync.mockClear();
    User.findById.mockClear();
  });

  it('sends a notification to the recipient when they have a push token', async () => {
    User.findById.mockResolvedValueOnce({ pushToken: 'ExponentPushToken[bob]' });

    const res = await request
      .post('/api/settlements')
      .set('Authorization', 'Bearer fake-token')
      .send({ to: 'bob-user-id', amount: 25, note: 'splitting dinner' });

    expect(res.status).toBe(201);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockSendPushNotificationsAsync).toHaveBeenCalledTimes(1);
  });

  it('does not send a notification when recipient has no push token', async () => {
    User.findById.mockResolvedValueOnce({ pushToken: null });

    const res = await request
      .post('/api/settlements')
      .set('Authorization', 'Bearer fake-token')
      .send({ to: 'dave-user-id', amount: 10 });

    expect(res.status).toBe(201);
    await new Promise((r) => setTimeout(r, 50));
    expect(mockSendPushNotificationsAsync).not.toHaveBeenCalled();
  });

  it('returns 400 when recipient or amount is missing', async () => {
    const res = await request
      .post('/api/settlements')
      .set('Authorization', 'Bearer fake-token')
      .send({ amount: 10 });

    expect(res.status).toBe(400);
  });
});
