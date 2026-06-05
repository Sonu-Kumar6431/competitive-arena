# ⚡ CodeArena — Competitive Programming Arena
### DEVBITS PS-1 | UDYAM'25 | Electronics Engineering Society

A full-stack web platform for creating and participating in custom competitive programming contests, with real-time leaderboards and Codeforces integration.

---

## 🚀 Features

### Core Features (All Implemented)
| Feature | Status |
|---|---|
| User Authentication & Profiles | ✅ JWT auth, profile pages, CF handle sync |
| Contest Creation & Management | ✅ Private/public contests, invite codes, 3-step creator |
| Automated Scoring & Leaderboard | ✅ ICPC penalty system, real-time via Socket.io |
| Friend Invitations & Team Collaboration | ✅ Friend requests, contest invites |
| Problem Discovery & Customization | ✅ Browse by rating/tags, Codeforces redirect |
| Notifications & Reminders | ✅ In-app notification center |
| Analytics Dashboard | ✅ Charts, tag breakdown, weak topics |
| Comparison With Friends | ✅ Head-to-head radar chart + stats |

### Optional Features
| Feature | Status |
|---|---|
| Streak Tracker | ✅ Activity heatmap (365 days) |
| Smart Problem Recommendations | ✅ Weak topics suggestion |
| Live Discussion | 🔌 Socket.io ready (extend with chat room) |
| Virtual Rating Graph | 🔜 Scaffold in place |

---

## 🛠️ Tech Stack

**Frontend:** React 18, React Router v6, Chart.js, Socket.io-client, React Hot Toast  
**Backend:** Node.js, Express, MongoDB (Mongoose), Socket.io, JWT, bcryptjs, node-cron  
**API:** Codeforces Public API (no key needed for read-only)

---

## ⚙️ Setup & Installation

### Prerequisites
- Node.js ≥ 16
- MongoDB (local or Atlas)

### 1. Clone / Extract
```bash
cd competitive-arena
```

### 2. Backend Setup
```bash
cd backend
cp .env.example .env
# Edit .env with your MongoDB URI and JWT secret
npm install
npm run dev
```

### 3. Frontend Setup
```bash
cd frontend
npm install
npm start
```

### 4. Or run both together (from root)
```bash
npm install       # installs concurrently
npm run install:all  # installs backend + frontend deps
npm run dev       # starts both servers
```

Backend runs on: **http://localhost:5000**  
Frontend runs on: **http://localhost:3000**

---

## 📁 Project Structure

```
competitive-arena/
├── backend/
│   ├── models/          # Mongoose schemas (User, Contest)
│   ├── routes/          # Express routes
│   │   ├── auth.js      # Register, login, CF sync
│   │   ├── contests.js  # CRUD, join, invite, leaderboard
│   │   ├── problems.js  # CF problems browse + user solved
│   │   ├── users.js     # Profiles, friends, compare
│   │   ├── leaderboard.js
│   │   └── notifications.js
│   ├── middleware/      # JWT auth middleware
│   ├── utils/
│   │   └── codeforcesSync.js  # CF API + cron sync
│   └── server.js        # Express + Socket.io entry
│
├── frontend/
│   └── src/
│       ├── context/     # AuthContext (JWT + user state)
│       ├── pages/
│       │   ├── DashboardPage    # Overview + quick stats
│       │   ├── ContestsPage     # Browse + join by code
│       │   ├── ContestDetailPage # Problems, live leaderboard, invite
│       │   ├── CreateContestPage # 3-step contest creator
│       │   ├── ProblemsPage     # CF problem browser with filters
│       │   ├── LeaderboardPage  # Global user rankings
│       │   ├── ProfilePage      # User profile + heatmap + charts
│       │   ├── AnalyticsPage    # Personal analytics + charts
│       │   └── ComparePage      # Head-to-head comparison
│       └── components/layout/   # Navbar with notifications
```

---

## 🔌 Codeforces Integration

- **Problems API:** `GET /api/problems` — fetches from CF, filterable by rating & tags
- **User Stats:** `GET /api/problems/user-solved` — fetches accepted submissions
- **Contest Sync:** Cron job every 2 minutes checks active contest participants' CF submissions and updates scores automatically
- **Direct Links:** All problem links redirect to Codeforces for submission

---

## 🏆 Scoring System

**ICPC Style:**
- Score = number of problems solved
- Penalty = Σ(time of solve in minutes + 20 * wrong attempts)
- Lower penalty wins on tie

**Points Style:**
- Each problem has assigned points (based on CF difficulty rating)

---

## 📊 Assessment Criteria Coverage

| Criteria | Implementation |
|---|---|
| Functionality | All 8 core + 2 optional features |
| Code Quality | Modular routes, controllers, middleware, clean components |
| UI/UX | Dark theme, responsive, animations, intuitive flows |
| Deployment | Ready for Render/Railway (backend) + Vercel/Netlify (frontend) |
| Innovation | Real-time Socket.io leaderboard, CF auto-sync cron, radar comparison |
| Scalability | Pagination, indexed MongoDB queries, Socket.io rooms |

---

## 🚢 Deployment

### Backend (Railway / Render)
```
Build: npm install
Start: node server.js
Env: MONGO_URI, JWT_SECRET, FRONTEND_URL
```

### Frontend (Vercel / Netlify)
```
Build: npm run build
Publish: build/
Env: REACT_APP_API_URL (if not using proxy)
```
