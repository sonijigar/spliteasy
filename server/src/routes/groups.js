const express = require('express');
const Group = require('../models/Group');
const Expense = require('../models/Expense');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// POST /api/groups — create a group
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, memberIds } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json({ error: 'Group name is required' });
    }

    // Build member list: creator + provided members (deduplicated)
    const memberSet = new Set([req.user._id.toString()]);
    if (memberIds && Array.isArray(memberIds)) {
      for (const id of memberIds) {
        memberSet.add(id.toString());
      }
    }

    const group = new Group({
      name: name.trim(),
      description: description ? description.trim() : undefined,
      members: Array.from(memberSet),
      createdBy: req.user._id
    });

    await group.save();
    await group.populate('members', 'name phone');
    await group.populate('createdBy', 'name phone');

    res.status(201).json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group' });
  }
});

// GET /api/groups — list groups the user is a member of
router.get('/', auth, async (req, res) => {
  try {
    const groups = await Group.find({ members: req.user._id })
      .populate('members', 'name phone')
      .populate('createdBy', 'name phone')
      .sort({ createdAt: -1 });

    res.json({ groups });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch groups' });
  }
});

// GET /api/groups/:groupId — get group with balances
router.get('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId)
      .populate('members', 'name phone')
      .populate('createdBy', 'name phone');

    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify the user is a member
    const isMember = group.members.some(m => m._id.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Get group expenses
    const expenses = await Expense.find({ group: group._id })
      .populate('paidBy', 'name')
      .populate('splitWith.user', 'name')
      .sort({ createdAt: -1 });

    // Calculate balances within the group
    const balances = {};

    expenses.forEach(exp => {
      const payerId = exp.paidBy._id.toString();
      exp.splitWith.forEach(split => {
        const debtorId = split.user._id.toString();
        if (payerId === debtorId) return;

        const key = [payerId, debtorId].sort().join(':');
        if (!balances[key]) {
          balances[key] = { from: null, to: null, amount: 0 };
        }

        // payer is owed by debtor
        if (payerId < debtorId) {
          balances[key].from = { _id: debtorId, name: split.user.name };
          balances[key].to = { _id: payerId, name: exp.paidBy.name };
          balances[key].amount += split.amount;
        } else {
          balances[key].from = { _id: payerId, name: exp.paidBy.name };
          balances[key].to = { _id: debtorId, name: split.user.name };
          balances[key].amount -= split.amount;
        }
      });
    });

    // Format balances as simple from/to/amount
    const formattedBalances = Object.values(balances)
      .filter(b => Math.abs(b.amount) > 0.01)
      .map(b => ({
        from: b.amount > 0 ? b.from : b.to,
        to: b.amount > 0 ? b.to : b.from,
        amount: Math.round(Math.abs(b.amount) * 100) / 100
      }));

    res.json({ group, expenses, balances: formattedBalances });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch group' });
  }
});

// POST /api/groups/:groupId/members — add a member
router.post('/:groupId/members', auth, async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }

    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    // Verify requester is a member
    const isMember = group.members.some(m => m.toString() === req.user._id.toString());
    if (!isMember) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Check user to add exists
    const userToAdd = await User.findById(userId);
    if (!userToAdd) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add member if not already in group
    const alreadyMember = group.members.some(m => m.toString() === userId.toString());
    if (!alreadyMember) {
      group.members.push(userId);
      await group.save();
    }

    await group.populate('members', 'name phone');
    await group.populate('createdBy', 'name phone');

    res.json({ group });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// DELETE /api/groups/:groupId — delete group (creator only)
router.delete('/:groupId', auth, async (req, res) => {
  try {
    const group = await Group.findById(req.params.groupId);
    if (!group) {
      return res.status(404).json({ error: 'Group not found' });
    }

    if (group.createdBy.toString() !== req.user._id.toString()) {
      return res.status(403).json({ error: 'Only the group creator can delete the group' });
    }

    await Group.findByIdAndDelete(req.params.groupId);

    res.json({ message: 'Group deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete group' });
  }
});

module.exports = router;
