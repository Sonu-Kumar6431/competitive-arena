const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect } = require('../middleware/auth');

router.get('/', protect, async (req, res) => {
  const user = await User.findById(req.user._id).select('notifications');
  const sorted = [...(user.notifications || [])].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  res.json(sorted.slice(0, 50));
});

router.put('/mark-read', protect, async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $set: { 'notifications.$[].read': true } });
  res.json({ message: 'Marked as read' });
});

router.delete('/:notifId', protect, async (req, res) => {
  await User.updateOne({ _id: req.user._id }, { $pull: { notifications: { _id: req.params.notifId } } });
  res.json({ message: 'Deleted' });
});

module.exports = router;
