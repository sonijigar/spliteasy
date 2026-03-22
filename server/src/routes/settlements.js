const express = require('express');
const Settlement = require('../models/Settlement');
const auth = require('../middleware/auth');

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
