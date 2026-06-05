const express = require('express');
const router = express.Router();
const Contest = require('../models/Contest');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { v4: uuidv4 } = require('uuid');

// Create contest
router.post('/', protect, async (req, res) => {
  try {
    const { title, description, startTime, endTime, problems, isPrivate, type, scoringType } = req.body;
    const duration = Math.floor((new Date(endTime) - new Date(startTime)) / 60000);
    const contest = new Contest({
      title, description,
      startTime: new Date(startTime),
      endTime: new Date(endTime),
      duration,
      problems: problems || [],
      isPrivate: isPrivate !== false,
      type: type || 'individual',
      scoringType: scoringType || 'icpc',
      creator: req.user._id,
      inviteCode: uuidv4().substring(0, 8).toUpperCase()
    });
    await contest.save();
    // Notify friends
    const creator = await User.findById(req.user._id).populate('friends', '_id');
    for (const friend of creator.friends) {
      await User.findByIdAndUpdate(friend._id, {
        $push: { notifications: { message: `${req.user.username} created a new contest: ${title}`, type: 'contest', link: `/contests/${contest._id}` } }
      });
    }
    res.status(201).json(contest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get all public contests + user's contests
router.get('/', protect, async (req, res) => {
  try {
    const { status, page = 1, limit = 20 } = req.query;
    const query = { $or: [{ isPrivate: false }, { creator: req.user._id }, { 'participants.user': req.user._id }] };
    if (status) query.status = status;
    const contests = await Contest.find(query)
      .populate('creator', 'username avatar')
      .sort({ startTime: -1 })
      .skip((page - 1) * limit)
      .limit(parseInt(limit));
    // Update statuses
    for (const c of contests) { c.updateStatus(); }
    const total = await Contest.countDocuments(query);
    res.json({ contests, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get single contest
router.get('/:id', protect, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('creator', 'username avatar rating')
      .populate('participants.user', 'username avatar rating codeforcesHandle');
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    contest.updateStatus();
    await contest.save();
    res.json(contest);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Join contest by invite code
router.post('/join/:code', protect, async (req, res) => {
  try {
    const contest = await Contest.findOne({ inviteCode: req.params.code.toUpperCase() });
    if (!contest) return res.status(404).json({ message: 'Invalid invite code' });
    contest.updateStatus();
    if (contest.status === 'finished') return res.status(400).json({ message: 'Contest has ended' });
    const alreadyJoined = contest.participants.find(p => p.user.toString() === req.user._id.toString());
    if (alreadyJoined) return res.status(400).json({ message: 'Already joined', contestId: contest._id });
    contest.participants.push({ user: req.user._id, username: req.user.username });
    await contest.save();
    await User.findByIdAndUpdate(req.user._id, { $inc: { contestsParticipated: 1 } });
    res.json({ message: 'Joined successfully', contestId: contest._id });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Join public contest
router.post('/:id/join', protect, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    contest.updateStatus();
    if (contest.status === 'finished') return res.status(400).json({ message: 'Contest has ended' });
    const alreadyJoined = contest.participants.find(p => p.user.toString() === req.user._id.toString());
    if (alreadyJoined) return res.status(400).json({ message: 'Already joined' });
    contest.participants.push({ user: req.user._id, username: req.user.username });
    await contest.save();
    res.json({ message: 'Joined successfully' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get leaderboard
router.get('/:id/leaderboard', protect, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id)
      .populate('participants.user', 'username avatar rating rank');
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    const sorted = [...contest.participants].sort((a, b) => {
      if (b.solvedCount !== a.solvedCount) return b.solvedCount - a.solvedCount;
      return a.penalty - b.penalty;
    });
    res.json({ leaderboard: sorted, problems: contest.problems });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Invite friend
router.post('/:id/invite', protect, async (req, res) => {
  try {
    const { friendId } = req.body;
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Contest not found' });
    const friend = await User.findById(friendId);
    if (!friend) return res.status(404).json({ message: 'User not found' });
    await User.findByIdAndUpdate(friendId, {
      $push: { notifications: { message: `${req.user.username} invited you to contest: ${contest.title}`, type: 'contest', link: `/contests/${contest._id}` } }
    });
    res.json({ message: 'Invitation sent' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Delete contest (creator only)
router.delete('/:id', protect, async (req, res) => {
  try {
    const contest = await Contest.findById(req.params.id);
    if (!contest) return res.status(404).json({ message: 'Not found' });
    if (contest.creator.toString() !== req.user._id.toString())
      return res.status(403).json({ message: 'Not authorized' });
    await contest.deleteOne();
    res.json({ message: 'Deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
