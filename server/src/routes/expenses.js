const express = require('express');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/expenses — create expense
router.post('/', auth, async (req, res) => {
  try {
    const { description, amount, category, paidBy, splitWith, groupId } = req.body;

    if (!description || !amount || !splitWith || splitWith.length === 0) {
      return res.status(400).json({ error: 'Description, amount, and splitWith are required' });
    }

    // Equal split
    const splitAmount = amount / splitWith.length;
    const splits = splitWith.map(userId => ({
      user: userId,
      amount: Math.round(splitAmount * 100) / 100
    }));

    const expense = new Expense({
      description,
      amount,
      category: category || 'other',
      paidBy: paidBy || req.user._id,
      splitWith: splits,
      group: groupId || null,
      createdBy: req.user._id
    });

    await expense.save();
    await expense.populate('paidBy', 'name');
    await expense.populate('splitWith.user', 'name');

    res.status(201).json({ expense });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create expense' });
  }
});

// GET /api/expenses — list expenses involving the user
router.get('/', auth, async (req, res) => {
  try {
    const { groupId } = req.query;

    const query = groupId
      ? { group: groupId }
      : {
          $or: [
            { paidBy: req.user._id },
            { 'splitWith.user': req.user._id }
          ]
        };

    const expenses = await Expense.find(query)
      .populate('paidBy', 'name')
      .populate('splitWith.user', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ expenses });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

// DELETE /api/expenses/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const expense = await Expense.findOneAndDelete({
      _id: req.params.id,
      createdBy: req.user._id
    });

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found or unauthorized' });
    }

    res.json({ message: 'Expense deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// GET /api/expenses/balances — calculate all balances for the user
router.get('/balances', auth, async (req, res) => {
  try {
    const userId = req.user._id;
    const { groupId } = req.query;

    // Get all expenses involving this user (optionally filtered by group)
    const expenseQuery = groupId
      ? { group: groupId }
      : {
          $or: [
            { paidBy: userId },
            { 'splitWith.user': userId }
          ]
        };

    const expenses = await Expense.find(expenseQuery)
      .populate('paidBy', 'name').populate('splitWith.user', 'name');

    // Get all settlements involving this user
    const settlements = await Settlement.find({
      $or: [{ from: userId }, { to: userId }]
    }).populate('from', 'name').populate('to', 'name');

    // Calculate net balances: positive = they owe you, negative = you owe them
    const balances = {};

    expenses.forEach(exp => {
      const payerId = exp.paidBy._id.toString();
      exp.splitWith.forEach(split => {
        const debtorId = split.user._id.toString();
        if (payerId === debtorId) return; // skip self

        // Only track balances involving the current user
        if (payerId === userId.toString()) {
          // User paid, debtor owes user
          if (!balances[debtorId]) balances[debtorId] = { user: split.user, amount: 0 };
          balances[debtorId].amount += split.amount;
        } else if (debtorId === userId.toString()) {
          // User is a debtor, owes the payer
          if (!balances[payerId]) balances[payerId] = { user: exp.paidBy, amount: 0 };
          balances[payerId].amount -= split.amount;
        }
      });
    });

    // Apply settlements
    settlements.forEach(s => {
      const fromId = s.from._id.toString();
      const toId = s.to._id.toString();

      if (fromId === userId.toString() && balances[toId]) {
        balances[toId].amount += s.amount; // user paid, reduce debt
      } else if (toId === userId.toString() && balances[fromId]) {
        balances[fromId].amount -= s.amount; // someone paid user
      }
    });

    // Format response
    const result = Object.entries(balances)
      .filter(([, v]) => Math.abs(v.amount) > 0.01)
      .map(([id, { user, amount }]) => ({
        userId: id,
        name: user.name,
        amount: Math.round(amount * 100) / 100
      }));

    const totalOwed = result.filter(b => b.amount > 0).reduce((s, b) => s + b.amount, 0);
    const totalOwe = result.filter(b => b.amount < 0).reduce((s, b) => s + Math.abs(b.amount), 0);

    res.json({
      balances: result,
      summary: {
        totalOwedToYou: Math.round(totalOwed * 100) / 100,
        totalYouOwe: Math.round(totalOwe * 100) / 100,
        netBalance: Math.round((totalOwed - totalOwe) * 100) / 100
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to calculate balances' });
  }
});

module.exports = router;
