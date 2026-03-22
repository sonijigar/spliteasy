const express = require('express');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// GET /api/friends — list all friends
router.get('/', auth, async (req, res) => {
  try {
    const user = await User.findById(req.user._id).populate('friends', 'name phone qrCode');
    res.json({ friends: user.friends });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch friends' });
  }
});

// POST /api/friends/add-by-phone
router.post('/add-by-phone', auth, async (req, res) => {
  try {
    const { phone } = req.body;

    if (!phone) {
      return res.status(400).json({ error: 'Phone number is required' });
    }

    const friend = await User.findOne({ phone });
    if (!friend) {
      return res.status(404).json({ error: 'No user found with that phone number' });
    }

    if (friend._id.equals(req.user._id)) {
      return res.status(400).json({ error: "You can't add yourself as a friend" });
    }

    // Check if already friends
    if (req.user.friends.includes(friend._id)) {
      return res.status(409).json({ error: 'Already friends with this user' });
    }

    // Add to both users' friend lists (bidirectional)
    await User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: friend._id } });
    await User.findByIdAndUpdate(friend._id, { $addToSet: { friends: req.user._id } });

    res.json({ friend: { _id: friend._id, name: friend.name, phone: friend.phone } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add friend' });
  }
});

// POST /api/friends/add-by-qr
router.post('/add-by-qr', auth, async (req, res) => {
  try {
    const { qrCode } = req.body;

    if (!qrCode) {
      return res.status(400).json({ error: 'QR code is required' });
    }

    // QR code format: spliteasy:<userId>
    const friendId = qrCode.replace('spliteasy:', '');
    const friend = await User.findById(friendId);

    if (!friend) {
      return res.status(404).json({ error: 'Invalid QR code' });
    }

    if (friend._id.equals(req.user._id)) {
      return res.status(400).json({ error: "You can't add yourself as a friend" });
    }

    if (req.user.friends.includes(friend._id)) {
      return res.status(409).json({ error: 'Already friends with this user' });
    }

    await User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: friend._id } });
    await User.findByIdAndUpdate(friend._id, { $addToSet: { friends: req.user._id } });

    res.json({ friend: { _id: friend._id, name: friend.name, phone: friend.phone } });
  } catch (error) {
    res.status(500).json({ error: 'Failed to add friend via QR' });
  }
});

// DELETE /api/friends/:friendId
router.delete('/:friendId', auth, async (req, res) => {
  try {
    const { friendId } = req.params;

    await User.findByIdAndUpdate(req.user._id, { $pull: { friends: friendId } });
    await User.findByIdAndUpdate(friendId, { $pull: { friends: req.user._id } });

    res.json({ message: 'Friend removed' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to remove friend' });
  }
});

module.exports = router;
