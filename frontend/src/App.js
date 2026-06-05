import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/layout/Layout';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import ContestsPage from './pages/ContestsPage';
import ContestDetailPage from './pages/ContestDetailPage';
import CreateContestPage from './pages/CreateContestPage';
import ProblemsPage from './pages/ProblemsPage';
import LeaderboardPage from './pages/LeaderboardPage';
import ProfilePage from './pages/ProfilePage';
import AnalyticsPage from './pages/AnalyticsPage';
import ComparePage from './pages/ComparePage';
import './index.css';

const PrivateRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  return user ? children : <Navigate to="/login" />;
};

const PublicRoute = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return <div className="loading-spinner"><div className="spinner"/></div>;
  return !user ? children : <Navigate to="/dashboard" />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Toaster position="top-right" toastOptions={{ style: { background: '#21262d', color: '#e6edf3', border: '1px solid #30363d' } }} />
        <Routes>
          <Route path="/login" element={<PublicRoute><LoginPage /></PublicRoute>} />
          <Route path="/register" element={<PublicRoute><RegisterPage /></PublicRoute>} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<Navigate to="/dashboard" />} />
            <Route path="dashboard" element={<DashboardPage />} />
            <Route path="contests" element={<ContestsPage />} />
            <Route path="contests/create" element={<CreateContestPage />} />
            <Route path="contests/:id" element={<ContestDetailPage />} />
            <Route path="problems" element={<ProblemsPage />} />
            <Route path="leaderboard" element={<LeaderboardPage />} />
            <Route path="profile/:username" element={<ProfilePage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="compare" element={<ComparePage />} />
          </Route>
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;
