/**
 * Unit tests for the auth middleware.
 *
 * User.findById is mocked so no database is required.
 */
const jwt = require('jsonwebtoken');

// Mock the User model BEFORE requiring the middleware
jest.mock('../../../models/User');
const User = require('../../../models/User');
const auth = require('../../../middleware/auth');

const FAKE_USER = { _id: 'user-123', name: 'Alice' };

// Minimal request/response stubs
const makeReq = (authHeader) => ({ header: () => authHeader });
const makeRes = () => {
  const res = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
};

beforeEach(() => {
  jest.clearAllMocks();
  User.findById.mockResolvedValue(FAKE_USER);
});

describe('auth middleware', () => {
  test('returns 401 when Authorization header is absent', async () => {
    const res = makeRes();
    const next = jest.fn();
    await auth(makeReq(undefined), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 when header scheme is not Bearer', async () => {
    const res = makeRes();
    const next = jest.fn();
    await auth(makeReq('Basic dXNlcjpwYXNz'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 for a malformed / tampered token', async () => {
    const res = makeRes();
    const next = jest.fn();
    await auth(makeReq('Bearer this.is.not.valid'), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  test('returns 401 with "User not found" when the user no longer exists in the DB', async () => {
    User.findById.mockResolvedValue(null);
    const token = jwt.sign({ userId: 'ghost-id' }, process.env.JWT_SECRET);
    const res = makeRes();
    const next = jest.fn();
    await auth(makeReq(`Bearer ${token}`), res, next);
    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith({ error: 'User not found' });
  });

  test('calls next() and attaches req.user + req.token for a valid token', async () => {
    const token = jwt.sign({ userId: FAKE_USER._id }, process.env.JWT_SECRET);
    const req = makeReq(`Bearer ${token}`);
    const res = makeRes();
    const next = jest.fn();
    await auth(req, res, next);
    expect(next).toHaveBeenCalled();
    expect(req.user).toBe(FAKE_USER);
    expect(req.token).toBe(token);
  });
});
