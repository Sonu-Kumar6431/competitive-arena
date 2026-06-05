const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { getUserInfo } = require('../utils/codeforcesSync');

const generateToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET || 'secret', { expiresIn: process.env.JWT_EXPIRE || '7d' });

// Register
router.post('/register', [
  body('username').trim().isLength({ min: 3 }).withMessage('Username min 3 chars'),
  body('email').isEmail().withMessage('Valid email required'),
  body('password').isLength({ min: 6 }).withMessage('Password min 6 chars')
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { username, email, password, codeforcesHandle } = req.body;
  try {
    if (await User.findOne({ $or: [{ email }, { username }] }))
      return res.status(400).json({ message: 'User already exists' });
    const user = new User({ username, email, password, codeforcesHandle: codeforcesHandle || '' });
    if (codeforcesHandle) {
      try {
        const cfUser = await getUserInfo([codeforcesHandle]);
        if (cfUser?.[0]) {
          user.rating = cfUser[0].rating || 1200;
          user.maxRating = cfUser[0].maxRating || 1200;
          user.rank = cfUser[0].rank || 'Newbie';
        }
      } catch (_) {}
    }
    await user.save();
    const userData = { _id: user._id, username: user.username, email: user.email, rating: user.rating, rank: user.rank, codeforcesHandle: user.codeforcesHandle };
    res.status(201).json({ token: generateToken(user._id), user: userData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').exists()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ email });
    if (!user || !(await user.matchPassword(password)))
      return res.status(401).json({ message: 'Invalid credentials' });
    user.lastActive = new Date();
    await user.save();
    const userData = { _id: user._id, username: user.username, email: user.email, rating: user.rating, rank: user.rank, codeforcesHandle: user.codeforcesHandle, avatar: user.avatar };
    res.json({ token: generateToken(user._id), user: userData });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get current user
router.get('/me', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('-password').populate('friends', 'username rating rank avatar');
  res.json(user);
});

// Sync CF handle
router.put('/sync-cf', protect, async (req, res) => {
  const { codeforcesHandle } = req.body;
  try {
    const cfUser = await getUserInfo([codeforcesHandle]);
    if (!cfUser?.[0]) return res.status(404).json({ message: 'CF handle not found' });
    const user = await User.findById(req.user._id);
    user.codeforcesHandle = codeforcesHandle;
    user.rating = cfUser[0].rating || user.rating;
    user.maxRating = cfUser[0].maxRating || user.maxRating;
    user.rank = cfUser[0].rank || user.rank;
    await user.save();
    res.json({ message: 'Synced', rating: user.rating, rank: user.rank });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
