/**
 * SplitEasy Mock Server
 * Full in-memory implementation — no MongoDB needed.
 * Mirrors the exact same API as the real server.
 */
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'demo-secret-key';
const PORT = process.env.PORT || 3000;

// ── In-memory store ──────────────────────────────────────────────
let users = [];
let expenses = [];
let settlements = [];
let idCounter = 1;

const newId = () => String(idCounter++);

// Reset all state (used by tests to get a clean slate between runs)
const reset = () => {
  users = [];
  expenses = [];
  settlements = [];
  idCounter = 1;
};

// ── Helpers ──────────────────────────────────────────────────────
const findUser = (id) => users.find(u => u._id === id);

const userPublic = (u) => u ? { _id: u._id, name: u.name, phone: u.phone, qrCode: u.qrCode } : null;

const generateToken = (userId) =>
  jwt.sign({ userId }, JWT_SECRET, { expiresIn: '30d' });

// Auth middleware
const auth = (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'No token provided' });
  try {
    const { userId } = jwt.verify(token, JWT_SECRET);
    const user = findUser(userId);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// ── Auth routes ──────────────────────────────────────────────────
app.post('/api/auth/register', async (req, res) => {
  const { name, phone, password } = req.body;
  if (!name || !phone || !password)
    return res.status(400).json({ error: 'Name, phone, and password are required' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if (users.find(u => u.phone === phone))
    return res.status(409).json({ error: 'Phone number already registered' });

  const hash = await bcrypt.hash(password, 10);
  const user = { _id: newId(), name, phone, password: hash, friends: [], qrCode: `spliteasy:${newId()}` };
  users.push(user);
  const token = generateToken(user._id);
  res.status(201).json({ user: userPublic(user), token });
});

app.post('/api/auth/login', async (req, res) => {
  const { phone, password } = req.body;
  if (!phone || !password)
    return res.status(400).json({ error: 'Phone and password are required' });
  const user = users.find(u => u.phone === phone);
  if (!user) return res.status(401).json({ error: 'Invalid credentials' });
  const ok = await bcrypt.compare(password, user.password);
  if (!ok) return res.status(401).json({ error: 'Invalid credentials' });
  const token = generateToken(user._id);
  res.json({ user: userPublic(user), token });
});

app.get('/api/auth/me', auth, (req, res) => {
  res.json({ user: userPublic(req.user) });
});

// ── Friends routes ───────────────────────────────────────────────
app.get('/api/friends', auth, (req, res) => {
  const friends = req.user.friends.map(id => userPublic(findUser(id))).filter(Boolean);
  res.json({ friends });
});

app.post('/api/friends/add-by-phone', auth, (req, res) => {
  const { phone } = req.body;
  if (!phone) return res.status(400).json({ error: 'Phone number is required' });
  const friend = users.find(u => u.phone === phone);
  if (!friend) return res.status(404).json({ error: 'No user found with that phone number' });
  if (friend._id === req.user._id) return res.status(400).json({ error: "You can't add yourself as a friend" });
  if (req.user.friends.includes(friend._id)) return res.status(409).json({ error: 'Already friends with this user' });
  req.user.friends.push(friend._id);
  friend.friends.push(req.user._id);
  res.json({ friend: userPublic(friend) });
});

app.post('/api/friends/add-by-qr', auth, (req, res) => {
  const { qrCode } = req.body;
  if (!qrCode) return res.status(400).json({ error: 'QR code is required' });
  const friendId = qrCode.replace('spliteasy:', '');
  const friend = findUser(friendId);
  if (!friend) return res.status(404).json({ error: 'Invalid QR code' });
  if (friend._id === req.user._id) return res.status(400).json({ error: "You can't add yourself as a friend" });
  if (req.user.friends.includes(friend._id)) return res.status(409).json({ error: 'Already friends with this user' });
  req.user.friends.push(friend._id);
  friend.friends.push(req.user._id);
  res.json({ friend: userPublic(friend) });
});

app.delete('/api/friends/:friendId', auth, (req, res) => {
  const { friendId } = req.params;
  req.user.friends = req.user.friends.filter(id => id !== friendId);
  const friend = findUser(friendId);
  if (friend) friend.friends = friend.friends.filter(id => id !== req.user._id);
  res.json({ message: 'Friend removed' });
});

// ── Expenses routes ──────────────────────────────────────────────
// IMPORTANT: specific routes before parameterised ones
app.get('/api/expenses/balances', auth, (req, res) => {
  const userId = req.user._id;
  const balances = {};

  expenses.forEach(exp => {
    const payerId = exp.paidBy;
    exp.splitWith.forEach(split => {
      const debtorId = split.userId;
      if (payerId === debtorId) return;
      if (payerId === userId) {
        if (!balances[debtorId]) balances[debtorId] = { user: userPublic(findUser(debtorId)), amount: 0 };
        balances[debtorId].amount += split.amount;
      } else if (debtorId === userId) {
        if (!balances[payerId]) balances[payerId] = { user: userPublic(findUser(payerId)), amount: 0 };
        balances[payerId].amount -= split.amount;
      }
    });
  });

  settlements.forEach(s => {
    if (s.from === userId && balances[s.to]) balances[s.to].amount += s.amount;
    else if (s.to === userId && balances[s.from]) balances[s.from].amount -= s.amount;
  });

  const result = Object.entries(balances)
    .filter(([, v]) => Math.abs(v.amount) > 0.01)
    .map(([id, { user, amount }]) => ({
      userId: id,
      name: user ? user.name : 'Unknown',
      amount: Math.round(amount * 100) / 100
    }));

  const totalOwed = result.filter(b => b.amount > 0).reduce((s, b) => s + b.amount, 0);
  const totalOwe  = result.filter(b => b.amount < 0).reduce((s, b) => s + Math.abs(b.amount), 0);

  res.json({
    balances: result,
    summary: {
      totalOwedToYou: Math.round(totalOwed * 100) / 100,
      totalYouOwe:    Math.round(totalOwe  * 100) / 100,
      netBalance:     Math.round((totalOwed - totalOwe) * 100) / 100
    }
  });
});

app.get('/api/expenses', auth, (req, res) => {
  const userId = req.user._id;
  const result = expenses
    .filter(e => e.paidBy === userId || e.splitWith.some(s => s.userId === userId))
    .slice(-50)
    .reverse()
    .map(e => ({
      ...e,
      paidBy: userPublic(findUser(e.paidBy)),
      splitWith: e.splitWith.map(s => ({ user: userPublic(findUser(s.userId)), amount: s.amount }))
    }));
  res.json({ expenses: result });
});

app.post('/api/expenses', auth, (req, res) => {
  const { description, amount, category, paidBy, splitWith } = req.body;
  if (!description || !amount || !splitWith || splitWith.length === 0)
    return res.status(400).json({ error: 'Description, amount, and splitWith are required' });

  const splitAmount = amount / splitWith.length;
  const splits = splitWith.map(userId => ({
    userId,
    amount: Math.round(splitAmount * 100) / 100
  }));

  const expense = {
    _id: newId(),
    description,
    amount,
    category: category || 'other',
    paidBy: paidBy || req.user._id,
    splitWith: splits,
    createdBy: req.user._id,
    createdAt: new Date().toISOString()
  };
  expenses.push(expense);

  res.status(201).json({
    expense: {
      ...expense,
      paidBy: userPublic(findUser(expense.paidBy)),
      splitWith: splits.map(s => ({ user: userPublic(findUser(s.userId)), amount: s.amount }))
    }
  });
});

app.delete('/api/expenses/:id', auth, (req, res) => {
  const idx = expenses.findIndex(e => e._id === req.params.id && e.createdBy === req.user._id);
  if (idx === -1) return res.status(404).json({ error: 'Expense not found or unauthorized' });
  expenses.splice(idx, 1);
  res.json({ message: 'Expense deleted' });
});

// ── Settlements routes ───────────────────────────────────────────
app.get('/api/settlements', auth, (req, res) => {
  const userId = req.user._id;
  const result = settlements
    .filter(s => s.from === userId || s.to === userId)
    .slice(-50)
    .reverse()
    .map(s => ({
      ...s,
      from: userPublic(findUser(s.from)),
      to:   userPublic(findUser(s.to))
    }));
  res.json({ settlements: result });
});

app.post('/api/settlements', auth, (req, res) => {
  const { to, amount, note } = req.body;
  if (!to || !amount) return res.status(400).json({ error: 'Recipient and amount are required' });
  const settlement = { _id: newId(), from: req.user._id, to, amount, note, createdAt: new Date().toISOString() };
  settlements.push(settlement);
  res.status(201).json({
    settlement: {
      ...settlement,
      from: userPublic(findUser(settlement.from)),
      to:   userPublic(findUser(settlement.to))
    }
  });
});

// ── Health check ─────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', mode: 'mock', timestamp: new Date().toISOString() });
});

// Only start listening when run directly (not when imported by tests)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`✅ SplitEasy mock server running on port ${PORT} (in-memory mode)`);
    console.log(`   Health: http://localhost:${PORT}/api/health`);
  });
}

module.exports = { app, reset };
