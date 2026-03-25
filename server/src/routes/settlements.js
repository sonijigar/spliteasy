const express = require('express');
const Settlement = require('../models/Settlement');
const User = require('../models/User');
const auth = require('../middleware/auth');
const { notifySettlementCreated } = require('../services/notifications');

const router = express.Router();

// POST /api/settlements — record a settlement
router.post('/', auth, async (req, res) => {
  try {
    const { to, amount, note } = req.body;

    if (!to || !amount) {
      return res.status(400).json({ error: 'Recipient and amount are required' });
    }

    const settlement = new Settlement({
      from: req.user._id,
      to,
      amount,
      note
    });

    await settlement.save();
    await settlement.populate('from', 'name');
    await settlement.populate('to', 'name');

    // Send push notification to recipient
    try {
      const recipient = await User.findById(to, 'pushToken');
      if (recipient && recipient.pushToken) {
        const fromName = settlement.from.name || req.user.name;
        notifySettlementCreated(recipient.pushToken, fromName, amount).catch(() => {});
      }
    } catch (notifyError) {
      console.error('Failed to send settlement notification:', notifyError);
    }

    res.status(201).json({ settlement });
  } catch (error) {
    res.status(500).json({ error: 'Failed to record settlement' });
  }
});

// GET /api/settlements — list user's settlements
router.get('/', auth, async (req, res) => {
  try {
    const settlements = await Settlement.find({
      $or: [{ from: req.user._id }, { to: req.user._id }]
    })
      .populate('from', 'name')
      .populate('to', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ settlements });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settlements' });
  }
});

module.exports = router;
