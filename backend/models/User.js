const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true, minlength: 3, maxlength: 30 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  password: { type: String, required: true, minlength: 6 },
  codeforcesHandle: { type: String, default: '' },
  avatar: { type: String, default: '' },
  bio: { type: String, default: '', maxlength: 200 },
  rating: { type: Number, default: 1200 },
  maxRating: { type: Number, default: 1200 },
  rank: { type: String, default: 'Newbie' },
  friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  friendRequests: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  contestsParticipated: { type: Number, default: 0 },
  problemsSolved: { type: Number, default: 0 },
  streakCurrent: { type: Number, default: 0 },
  streakMax: { type: Number, default: 0 },
  lastActive: { type: Date, default: Date.now },
  solvedDates: [{ type: String }], // YYYY-MM-DD
  notifications: [{
    message: String,
    type: { type: String, enum: ['contest', 'friend', 'leaderboard', 'reminder'] },
    read: { type: Boolean, default: false },
    link: String,
    createdAt: { type: Date, default: Date.now }
  }],
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.matchPassword = async function (enteredPassword) {
  return bcrypt.compare(enteredPassword, this.password);
};

userSchema.methods.updateRank = function () {
  const r = this.rating;
  if (r < 1200) this.rank = 'Newbie';
  else if (r < 1400) this.rank = 'Pupil';
  else if (r < 1600) this.rank = 'Specialist';
  else if (r < 1900) this.rank = 'Expert';
  else if (r < 2100) this.rank = 'Candidate Master';
  else if (r < 2300) this.rank = 'Master';
  else if (r < 2400) this.rank = 'International Master';
  else if (r < 2600) this.rank = 'Grandmaster';
  else if (r < 3000) this.rank = 'International Grandmaster';
  else this.rank = 'Legendary Grandmaster';
};

module.exports = mongoose.model('User', userSchema);
