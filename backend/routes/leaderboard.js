const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Contest = require('../models/Contest');
const { protect } = require('../middleware/auth');

// Global leaderboard
router.get('/global', protect, async (req, res) => {
  try {
    const { page = 1, limit = 50 } = req.query;
    const users = await User.find()
      .select('username avatar rating rank maxRating contestsParticipated problemsSolved')
      .sort({ rating: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    const total = await User.countDocuments();
    res.json({ users, total });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
