const express = require('express');
const auth = require('../middleware/auth');

const router = express.Router();

// PATCH /api/users/push-token — register/update device push token
router.patch('/push-token', auth, async (req, res) => {
  try {
    const { pushToken } = req.body;

    if (!pushToken || typeof pushToken !== 'string') {
      return res.status(400).json({ error: 'pushToken is required' });
    }

    req.user.pushToken = pushToken;
    await req.user.save();

    res.json({ message: 'Push token registered' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register push token' });
  }
});

module.exports = router;
