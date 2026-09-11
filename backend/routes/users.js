const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const User = require('../models/User');
const Contest = require('../models/Contest');
const { protect } = require('../middleware/auth');
const { getUserSubmissions, getUserInfo } = require('../utils/codeforcesSync');

// Get user profile
router.get('/:username', protect, async (req, res) => {
  try {
    const user = await User.findOne({ username: req.params.username })
      .select('-password')
      .populate('friends', 'username avatar rating rank')
      .populate('friendRequests', 'username rating rank avatar'); 
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
    const senderId = req.user._id;
    const receiverId = req.params.userId;

    // Cannot send request to yourself
    if (senderId.toString() === receiverId.toString()) {
      return res.status(400).json({
        message: "Can't add yourself"
      });
    }

    const sender = await User.findById(senderId);
    const receiver = await User.findById(receiverId);

    if (!receiver) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Already friends
    if (
      receiver.friends.some(
        id => id.toString() === senderId.toString()
      )
    ) {
      return res.status(400).json({
        message: 'Already friends'
      });
    }

    // Request already exists
    if (
      receiver.friendRequests.some(
        id => id.toString() === senderId.toString()
      )
    ) {
      return res.status(400).json({
        message: 'Request already sent'
      });
    }

    // Add request
    receiver.friendRequests.push(senderId);

    // Add notification
    receiver.notifications.push({
      message: `${sender.username} sent you a friend request`,
      type: 'friend_request',

      // Keep profile link for navigation
      link: `/profile/${sender.username}`,

      // VERY IMPORTANT
      relatedUser: senderId
    });

    await receiver.save();

    res.json({
      message: 'Friend request sent'
    });

  } catch (err) {
    console.error('Send friend request error:', err);

    res.status(500).json({
      message: err.message
    });
  }
});


// Accept / reject friend request
router.post('/friends/respond/:userId', protect, async (req, res) => {
  try {
    const receiverId = req.user._id;
    const senderId = req.params.userId;
    const { accept } = req.body;

    // Validate sender ID
    if (!senderId || !mongoose.Types.ObjectId.isValid(senderId)) {
      return res.status(400).json({
        message: 'Invalid user ID'
      });
    }

    const me = await User.findById(receiverId);
    const other = await User.findById(senderId);

    if (!me || !other) {
      return res.status(404).json({
        message: 'User not found'
      });
    }

    // Make sure the request actually exists
    const requestExists = me.friendRequests.some(
      id => id.toString() === senderId.toString()
    );

    if (!requestExists) {
      return res.status(400).json({
        message: 'No pending friend request from this user'
      });
    }

    // Remove request from pending list
    me.friendRequests = me.friendRequests.filter(
      id => id.toString() !== senderId.toString()
    );

    if (accept) {

      // Add friendship only if not already present
      if (
        !me.friends.some(
          id => id.toString() === senderId.toString()
        )
      ) {
        me.friends.push(senderId);
      }

      if (
        !other.friends.some(
          id => id.toString() === receiverId.toString()
        )
      ) {
        other.friends.push(receiverId);
      }

      // Notify sender
      other.notifications.push({
        message: `${me.username} accepted your friend request`,
        type: 'friend',
        link: `/profile/${me.username}`,
        relatedUser: receiverId
      });
    }

    await me.save();
    await other.save();

    res.json({
      message: accept
        ? 'Friend added successfully'
        : 'Request rejected successfully'
    });

  } catch (err) {
    console.error('Friend respond error:', err);

    res.status(500).json({
      message: err.message
    });
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
