// =============================================================
// API Service — Update API_URL before running!
// =============================================================
// For local development: http://localhost:3000/api
// After deploying backend: https://your-app.railway.app/api
// =============================================================

const API_URL = 'http://localhost:3000/api';

let authToken = null;

export const setToken = (token) => { authToken = token; };
export const getToken = () => authToken;

const request = async (endpoint, options = {}) => {
  const headers = {
    'Content-Type': 'application/json',
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
    ...options.headers,
  };

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
};

// ── Auth ────────────────────────────────────────────────────
export const register = (name, phone, password) =>
  request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ name, phone, password }),
  });

export const login = (phone, password) =>
  request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ phone, password }),
  });

export const getMe = () => request('/auth/me');

// ── Friends ─────────────────────────────────────────────────
export const getFriends = () => request('/friends');

export const addFriendByPhone = (phone) =>
  request('/friends/add-by-phone', {
    method: 'POST',
    body: JSON.stringify({ phone }),
  });

export const addFriendByQR = (qrCode) =>
  request('/friends/add-by-qr', {
    method: 'POST',
    body: JSON.stringify({ qrCode }),
  });

export const removeFriend = (friendId) =>
  request(`/friends/${friendId}`, { method: 'DELETE' });

// ── Expenses ────────────────────────────────────────────────
export const getExpenses = () => request('/expenses');

export const createExpense = (description, amount, category, paidBy, splitWith) =>
  request('/expenses', {
    method: 'POST',
    body: JSON.stringify({ description, amount, category, paidBy, splitWith }),
  });

export const deleteExpense = (id) =>
  request(`/expenses/${id}`, { method: 'DELETE' });

export const getBalances = () => request('/expenses/balances');

// ── Settlements ─────────────────────────────────────────────
export const getSettlements = () => request('/settlements');

export const createSettlement = (to, amount, note) =>
  request('/settlements', {
    method: 'POST',
    body: JSON.stringify({ to, amount, note }),
  });
