require('dotenv').config();
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const mongoose = require('mongoose');
const cron = require('node-cron');

const authRoutes = require('./routes/auth');
const contestRoutes = require('./routes/contests');
const problemRoutes = require('./routes/problems');
const userRoutes = require('./routes/users');
const leaderboardRoutes = require('./routes/leaderboard');
const notificationRoutes = require('./routes/notifications');
const { syncContestSubmissions } = require('./utils/codeforcesSync');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: process.env.FRONTEND_URL || 'http://localhost:3000', methods: ['GET', 'POST'] }
});

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:3000' }));
app.use(express.json());

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/contests', contestRoutes);
app.use('/api/problems', problemRoutes);
app.use('/api/users', userRoutes);
app.use('/api/leaderboard', leaderboardRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/health', (req, res) => res.json({ status: 'OK', timestamp: new Date() }));

// Socket.io for live leaderboard
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  socket.on('join-contest', (contestId) => socket.join(`contest-${contestId}`));
  socket.on('leave-contest', (contestId) => socket.leave(`contest-${contestId}`));
  socket.on('disconnect', () => console.log('Client disconnected:', socket.id));
});
app.set('io', io);

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/competitive_arena';
const mongoOptions = {
  serverSelectionTimeoutMS: 5000,
  retryWrites: true,
};

mongoose.connect(MONGO_URI, mongoOptions)
  .then(() => console.log('MongoDB connected'))
  .catch(err => {
    console.error('MongoDB connection failed. Server will keep running without DB:', err.message);
  });

mongoose.connection.on('disconnected', () => console.warn('MongoDB disconnected'));
mongoose.connection.on('reconnected', () => console.log('MongoDB reconnected'));

// Cron: sync active contest submissions every 2 minutes
cron.schedule('*/2 * * * *', async () => {
  try {
    await syncContestSubmissions(io);
  } catch (e) {
    console.error('Sync error:', e.message);
  }
});

const PORT = Number(process.env.PORT) || 5004;

const startServer = (port) => {
  const serverInstance = server.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });

  serverInstance.on('error', (error) => {
    if (error.code === 'EADDRINUSE') {
      const fallbackPort = port + 1;
      console.warn(`Port ${port} is busy. Retrying on port ${fallbackPort}...`);
      startServer(fallbackPort);
      return;
    }

    console.error('Server failed to start:', error);
    process.exit(1);
  });
};

startServer(PORT);
module.exports = { app, io };
