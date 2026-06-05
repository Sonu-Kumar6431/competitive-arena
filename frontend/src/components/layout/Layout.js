import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import './Layout.css';

const Layout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);
  const notifRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      axios.get('/api/notifications', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => setNotifs(r.data))
        .catch(() => {});
    }
  }, [location]);

  useEffect(() => {
    const handler = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setShowNotifs(false);
        setShowMenu(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleLogout = () => { logout(); navigate('/login'); };
  const unread = notifs.filter(n => !n.read).length;

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/contests', label: 'Contests', icon: '🏆' },
    { to: '/problems', label: 'Problems', icon: '💡' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '📊' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
    { to: '/compare', label: 'Compare', icon: '⚔️' },
  ];

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-inner">
          <Link to="/dashboard" className="navbar-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">CodeArena</span>
          </Link>
          <button className="mobile-menu-btn" onClick={() => setMobileNav(!mobileNav)}>☰</button>
          <div className={`navbar-links ${mobileNav ? 'open' : ''}`}>
            {navLinks.map(l => (
              <Link key={l.to} to={l.to} className={`nav-link ${location.pathname.startsWith(l.to) ? 'active' : ''}`} onClick={() => setMobileNav(false)}>
                <span>{l.icon}</span> {l.label}
              </Link>
            ))}
          </div>
          <div className="navbar-right" ref={notifRef}>
            <div className="notif-wrapper">
              <button className="icon-btn" onClick={() => { setShowNotifs(!showNotifs); setShowMenu(false); }}>
                🔔 {unread > 0 && <span className="badge-count">{unread}</span>}
              </button>
              {showNotifs && (
                <div className="dropdown notif-dropdown">
                  <div className="dropdown-header">
                    <span>Notifications</span>
                    {unread > 0 && <button onClick={() => {
                      axios.put('/api/notifications/mark-read', {}, { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } });
                      setNotifs(prev => prev.map(n => ({ ...n, read: true })));
                    }} className="btn btn-sm">Mark all read</button>}
                  </div>
                  {notifs.length === 0 ? <p className="notif-empty">No notifications</p> :
                    notifs.slice(0, 10).map(n => (
                      <div key={n._id} className={`notif-item ${!n.read ? 'unread' : ''}`} onClick={() => { if (n.link) navigate(n.link); setShowNotifs(false); }}>
                        <span className="notif-dot" style={{ background: n.read ? 'transparent' : 'var(--accent)' }} />
                        <div>
                          <p>{n.message}</p>
                          <small>{new Date(n.createdAt).toLocaleDateString()}</small>
                        </div>
                      </div>
                    ))
                  }
                </div>
              )}
            </div>
            <div className="user-menu-wrapper">
              <button className="user-btn" onClick={() => { setShowMenu(!showMenu); setShowNotifs(false); }}>
                <div className="avatar">{user?.username?.[0]?.toUpperCase()}</div>
                <span className="username-text">{user?.username}</span>
                <span>▾</span>
              </button>
              {showMenu && (
                <div className="dropdown user-dropdown">
                  <Link to={`/profile/${user?.username}`} className="dropdown-item" onClick={() => setShowMenu(false)}>👤 Profile</Link>
                  <hr />
                  <button className="dropdown-item danger" onClick={handleLogout}>🚪 Logout</button>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
