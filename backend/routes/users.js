const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Contest = require('../models/Contest');
const { protect } = require('../middleware/auth');
const { getUserSubmissions, getUserInfo } = require('../utils/codeforcesSync');

// Get user profile
router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('friends', 'username avatar rating rank');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update profile
router.put('/profile/update', protect, async (req, res) => {
  try {
    const { bio, avatar } = req.body;
    const user = await User.findByIdAndUpdate(req.user._id, { bio, avatar }, { new: true }).select('-password');
    res.json(user);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user analytics
router.get('/:username/analytics', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username });
    if (!user) return res.status(404).json({ message: 'User not found' });
    const contests = await Contest.find({ 'participants.user': user._id });
    const tagStats = {};
    const ratingHistory = [];
    let totalSolved = 0;
    for (const contest of contests) {
      const part = contest.participants.find(p => p.user.toString() === user._id.toString());
      if (part) {
        for (const r of part.problemResults) {
          if (r.solved) totalSolved++;
        }
      }
    }
    // CF stats if handle available
    let cfStats = null;
    if (user.codeforcesHandle) {
      try {
        const subs = await getUserSubmissions(user.codeforcesHandle, 500);
        const solved = subs.filter(s => s.verdict === 'OK');
        for (const s of solved) {
          for (const tag of (s.problem.tags || [])) {
            tagStats[tag] = (tagStats[tag] || 0) + 1;
          }
        }
        cfStats = { totalSubmissions: subs.length, accepted: solved.length, tagStats };
      } catch (_) {}
    }
    res.json({
      user: { username: user.username, rating: user.rating, rank: user.rank, contestsParticipated: user.contestsParticipated, streakCurrent: user.streakCurrent, streakMax: user.streakMax },
      platformContestsSolved: totalSolved,
      cfStats
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Send friend request
router.post('/friends/request/:userId', protect, async (req, res) => {
  try {
    if (req.params.userId === req.user._id.toString())
      return res.status(400).json({ message: "Can't add yourself" });
    const target = await User.findById(req.params.userId);
    if (!target) return res.status(404).json({ message: 'User not found' });
    if (target.friendRequests.includes(req.user._id))
      return res.status(400).json({ message: 'Request already sent' });
    if (target.friends.includes(req.user._id))
      return res.status(400).json({ message: 'Already friends' });
    target.friendRequests.push(req.user._id);
    target.notifications.push({ message: `${req.user.username} sent you a friend request`, type: 'friend', link: `/profile/${req.user.username}` });
    await target.save();
    res.json({ message: 'Friend request sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Accept/reject friend request
router.post('/friends/respond/:userId', protect, async (req, res) => {
  try {
    const { accept } = req.body;
    const me = await User.findById(req.user._id);
    me.friendRequests = me.friendRequests.filter(id => id.toString() !== req.params.userId);
    if (accept) {
      me.friends.push(req.params.userId);
      const other = await User.findById(req.params.userId);
      if (other) {
        other.friends.push(req.user._id);
        other.notifications.push({ message: `${me.username} accepted your friend request`, type: 'friend', link: `/profile/${me.username}` });
        await other.save();
      }
    }
    await me.save();
    res.json({ message: accept ? 'Friend added' : 'Request rejected' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Compare with friend
router.get('/compare/:user1/:user2', protect, async (req, res) => {
  try {
    const [u1, u2] = await Promise.all([
      User.findOne({ username: req.params.user1 }).select('-password'),
      User.findOne({ username: req.params.user2 }).select('-password')
    ]);
    if (!u1 || !u2) return res.status(404).json({ message: 'User not found' });
    const [c1, c2] = await Promise.all([
      Contest.find({ 'participants.user': u1._id }),
      Contest.find({ 'participants.user': u2._id })
    ]);
    const getStats = (user, contests) => ({
      username: user.username, rating: user.rating, rank: user.rank,
      contestsParticipated: user.contestsParticipated,
      problemsSolved: user.problemsSolved,
      streak: user.streakCurrent
    });
    res.json({ user1: getStats(u1, c1), user2: getStats(u2, c2) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Search users
router.get('/', protect, async (req, res) => {
  try {
    const { q } = req.query;
    if (!q) return res.json([]);
    const users = await User.find({ username: { $regex: q, $options: 'i' } })
      .select('username avatar rating rank')
      .limit(10);
    res.json(users);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
