import * as api from '../services/api';

beforeEach(() => {
  api.setToken(null);
  global.fetch = jest.fn();
});

afterEach(() => {
  jest.resetAllMocks();
});

const mockFetch = (body, ok = true, status = 200) => {
  global.fetch.mockResolvedValueOnce({
    ok,
    status,
    json: async () => body,
  });
};

describe('token management', () => {
  it('getToken returns null by default', () => {
    expect(api.getToken()).toBeNull();
  });

  it('setToken / getToken round-trips', () => {
    api.setToken('abc123');
    expect(api.getToken()).toBe('abc123');
  });
});

describe('auth endpoints', () => {
  it('login sends phone and password, returns user and token', async () => {
    mockFetch({ user: { _id: '1', name: 'Alice' }, token: 'tok' });
    const res = await api.login('+1555', 'pass');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/login'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.token).toBe('tok');
  });

  it('register sends name, phone, and password', async () => {
    mockFetch({ user: { _id: '2', name: 'Bob' }, token: 'tok2' });
    const res = await api.register('Bob', '+1556', 'pass');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/auth/register'),
      expect.objectContaining({ method: 'POST' })
    );
    expect(res.token).toBe('tok2');
  });

  it('throws on non-ok response', async () => {
    mockFetch({ error: 'Invalid credentials' }, false, 401);
    await expect(api.login('+1555', 'wrong')).rejects.toThrow('Invalid credentials');
  });
});

describe('expenses endpoints', () => {
  it('getExpenses calls GET /expenses', async () => {
    mockFetch({ expenses: [] });
    const res = await api.getExpenses();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/expenses'),
      expect.not.objectContaining({ method: expect.stringMatching(/POST|DELETE/) })
    );
    expect(res.expenses).toEqual([]);
  });

  it('createExpense posts correct payload', async () => {
    mockFetch({ expense: { _id: 'e1' } });
    await api.createExpense('Dinner', 60, 'food', 'uid1', ['uid1', 'uid2']);
    const [, options] = global.fetch.mock.calls[0];
    const body = JSON.parse(options.body);
    expect(body).toMatchObject({
      description: 'Dinner',
      amount: 60,
      category: 'food',
      paidBy: 'uid1',
      splitWith: ['uid1', 'uid2'],
    });
  });

  it('deleteExpense sends DELETE to correct URL', async () => {
    mockFetch({ success: true });
    await api.deleteExpense('e1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/expenses/e1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });

  it('getBalances calls /expenses/balances', async () => {
    mockFetch({ balances: [], summary: {} });
    await api.getBalances();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/expenses/balances'),
      expect.anything()
    );
  });
});

describe('friends endpoints', () => {
  it('getFriends calls /friends', async () => {
    mockFetch({ friends: [] });
    const res = await api.getFriends();
    expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('/friends'), expect.anything());
    expect(res.friends).toEqual([]);
  });

  it('addFriendByPhone posts phone', async () => {
    mockFetch({ friend: { _id: 'f1' } });
    await api.addFriendByPhone('+1999');
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toEqual({ phone: '+1999' });
  });

  it('removeFriend sends DELETE', async () => {
    mockFetch({ success: true });
    await api.removeFriend('f1');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('/friends/f1'),
      expect.objectContaining({ method: 'DELETE' })
    );
  });
});

describe('settlements endpoints', () => {
  it('createSettlement posts to/amount/note', async () => {
    mockFetch({ settlement: {} });
    await api.createSettlement('uid2', 25, 'lunch');
    const [, options] = global.fetch.mock.calls[0];
    expect(JSON.parse(options.body)).toMatchObject({ to: 'uid2', amount: 25, note: 'lunch' });
  });
});

describe('Authorization header', () => {
  it('includes Bearer token when set', async () => {
    api.setToken('mytoken');
    mockFetch({ expenses: [] });
    await api.getExpenses();
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBe('Bearer mytoken');
  });

  it('omits Authorization header when token is null', async () => {
    api.setToken(null);
    mockFetch({ expenses: [] });
    await api.getExpenses();
    const [, options] = global.fetch.mock.calls[0];
    expect(options.headers.Authorization).toBeUndefined();
  });
});
