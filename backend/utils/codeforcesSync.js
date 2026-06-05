const axios = require('axios');
const crypto = require('crypto');

const CF_BASE = 'https://codeforces.com/api';

const cfGet = async (method, params = {}) => {
  const url = `${CF_BASE}/${method}`;
  try {
    const response = await axios.get(url, { params, timeout: 10000 });
    if (response.data.status !== 'OK') throw new Error(response.data.comment || 'CF API error');
    return response.data.result;
  } catch (err) {
    throw new Error(`Codeforces API: ${err.message}`);
  }
};

// Get problems list with filters
const getProblems = async ({ tags = [], minRating, maxRating } = {}) => {
  const params = {};
  if (tags.length) params.tags = tags.join(';');
  const result = await cfGet('problemset.problems', params);
  let problems = result.problems || [];
  if (minRating) problems = problems.filter(p => p.rating >= minRating);
  if (maxRating) problems = problems.filter(p => p.rating <= maxRating);
  return problems;
};

// Get user submissions
const getUserSubmissions = async (handle, count = 100) => {
  return cfGet('user.status', { handle, count });
};

// Get user info
const getUserInfo = async (handles) => {
  const handleStr = Array.isArray(handles) ? handles.join(';') : handles;
  return cfGet('user.info', { handles: handleStr });
};

// Get contest submissions for a specific participant
const getContestSubmissions = async (contestId, handle) => {
  try {
    const subs = await cfGet('contest.status', { contestId, handle, count: 200 });
    return subs;
  } catch {
    return [];
  }
};

// Sync contest leaderboard by fetching CF submissions
const syncContestSubmissions = async (io) => {
  const Contest = require('../models/Contest');
  const now = new Date();
  const activeContests = await Contest.find({
    status: 'active',
    startTime: { $lte: now },
    endTime: { $gte: now }
  }).populate('participants.user', 'codeforcesHandle username');

  for (const contest of activeContests) {
    let updated = false;
    for (const participant of contest.participants) {
      const handle = participant.user?.codeforcesHandle;
      if (!handle) continue;
      for (const problem of contest.problems) {
        const existing = participant.problemResults.find(
          r => r.cfContestId === problem.cfContestId && r.cfIndex === problem.cfIndex
        );
        if (existing?.solved) continue;
        const subs = await getContestSubmissions(problem.cfContestId, handle);
        const relevant = subs.filter(s =>
          s.problem.index === problem.cfIndex &&
          s.contestId === problem.cfContestId
        );
        const accepted = relevant.find(s => s.verdict === 'OK');
        const wrongAttempts = relevant.filter(s => s.verdict !== 'OK' && s.verdict !== 'TESTING').length;
        if (!existing) {
          participant.problemResults.push({
            cfContestId: problem.cfContestId,
            cfIndex: problem.cfIndex,
            solved: !!accepted,
            attempts: wrongAttempts + (accepted ? 1 : 0),
            solvedAt: accepted ? new Date(accepted.creationTimeSeconds * 1000) : null,
            penalty: accepted ? wrongAttempts * 20 : 0
          });
        } else if (accepted) {
          existing.solved = true;
          existing.solvedAt = new Date(accepted.creationTimeSeconds * 1000);
          existing.attempts = wrongAttempts + 1;
          existing.penalty = wrongAttempts * 20;
        } else {
          existing.attempts = wrongAttempts;
        }
        updated = true;
      }
      // Recalculate score & penalty
      let score = 0, penalty = 0, solved = 0;
      for (const r of participant.problemResults) {
        if (r.solved) {
          solved++;
          score += problem?.points || 100;
          const elapsed = Math.floor((r.solvedAt - contest.startTime) / 60000);
          penalty += elapsed + r.penalty;
        }
      }
      participant.score = score;
      participant.penalty = penalty;
      participant.solvedCount = solved;
    }
    if (updated) {
      contest.lastSynced = new Date();
      await contest.save();
      // Emit live leaderboard
      const sorted = [...contest.participants].sort((a, b) =>
        b.solvedCount !== a.solvedCount ? b.solvedCount - a.solvedCount : a.penalty - b.penalty
      );
      io.to(`contest-${contest._id}`).emit('leaderboard-update', { contestId: contest._id, leaderboard: sorted });
    }
  }
};

module.exports = { cfGet, getProblems, getUserSubmissions, getUserInfo, syncContestSubmissions };
