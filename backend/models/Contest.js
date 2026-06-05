const mongoose = require('mongoose');

const problemSchema = new mongoose.Schema({
  cfContestId: { type: Number, required: true },
  cfIndex: { type: String, required: true },
  name: { type: String, required: true },
  rating: Number,
  tags: [String],
  points: { type: Number, default: 100 }
});

const participantSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  username: String,
  teamName: String,
  joinedAt: { type: Date, default: Date.now },
  score: { type: Number, default: 0 },
  penalty: { type: Number, default: 0 },
  solvedCount: { type: Number, default: 0 },
  problemResults: [{
    cfContestId: Number,
    cfIndex: String,
    solved: { type: Boolean, default: false },
    attempts: { type: Number, default: 0 },
    solvedAt: Date,
    penalty: { type: Number, default: 0 }
  }]
});

const contestSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: '' },
  creator: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  startTime: { type: Date, required: true },
  endTime: { type: Date, required: true },
  duration: Number, // minutes
  isPrivate: { type: Boolean, default: true },
  inviteCode: { type: String, unique: true },
  problems: [problemSchema],
  participants: [participantSchema],
  teams: [{
    name: String,
    members: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  }],
  status: { type: String, enum: ['upcoming', 'active', 'finished'], default: 'upcoming' },
  type: { type: String, enum: ['individual', 'team'], default: 'individual' },
  maxParticipants: { type: Number, default: 500 },
  scoringType: { type: String, enum: ['icpc', 'points'], default: 'icpc' },
  lastSynced: Date,
  createdAt: { type: Date, default: Date.now }
}, { timestamps: true });

contestSchema.pre('save', async function (next) {
  if (!this.inviteCode) {
    const { v4: uuidv4 } = require('uuid');
    this.inviteCode = uuidv4().substring(0, 8).toUpperCase();
  }
  next();
});

contestSchema.methods.updateStatus = function () {
  const now = new Date();
  if (now < this.startTime) this.status = 'upcoming';
  else if (now >= this.startTime && now <= this.endTime) this.status = 'active';
  else this.status = 'finished';
};

module.exports = mongoose.model('Contest', contestSchema);
