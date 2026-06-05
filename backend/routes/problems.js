const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const { getProblems, getUserSubmissions } = require('../utils/codeforcesSync');

// Browse problems from Codeforces
router.get('/', protect, async (req, res) => {
  try {
    const { tags, minRating, maxRating, page = 1, limit = 50 } = req.query;
    const tagArr = tags ? tags.split(',').map(t => t.trim()).filter(Boolean) : [];
    let problems = await getProblems({ tags: tagArr, minRating: +minRating || null, maxRating: +maxRating || null });
    // Sort by rating
    problems = problems.filter(p => p.rating).sort((a, b) => a.rating - b.rating);
    const total = problems.length;
    const start = (page - 1) * limit;
    const paginated = problems.slice(start, start + parseInt(limit));
    res.json({ problems: paginated, total, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get user's solved problems from CF
router.get('/user-solved', protect, async (req, res) => {
  try {
    const { handle } = req.query;
    if (!handle) return res.status(400).json({ message: 'CF handle required' });
    const subs = await getUserSubmissions(handle, 500);
    const solved = subs.filter(s => s.verdict === 'OK').map(s => ({
      contestId: s.problem.contestId,
      index: s.problem.index,
      name: s.problem.name,
      rating: s.problem.rating,
      tags: s.problem.tags,
      solvedAt: s.creationTimeSeconds
    }));
    // Deduplicate
    const seen = new Set();
    const unique = solved.filter(p => {
      const key = `${p.contestId}-${p.index}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    res.json({ solved: unique });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Get CF problem link
router.get('/cf-link/:contestId/:index', (req, res) => {
  const { contestId, index } = req.params;
  res.json({ url: `https://codeforces.com/problemset/problem/${contestId}/${index}` });
});

// Get available tags
router.get('/tags', async (req, res) => {
  const tags = [
    'implementation', 'math', 'greedy', 'dp', 'data structures', 'brute force',
    'constructive algorithms', 'graphs', 'sortings', 'binary search', 'dfs and similar',
    'trees', 'strings', 'number theory', 'combinatorics', 'geometry', 'bitmasks',
    'two pointers', 'dsu', 'shortest paths', 'probabilities', 'divide and conquer',
    'hashing', 'games', 'flows', 'interactive', 'matrices', 'string suffix structures'
  ];
  res.json({ tags });
});

module.exports = router;
