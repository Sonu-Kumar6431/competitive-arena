import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import axios from 'axios';
import toast from 'react-hot-toast';
import './Layout.css';

const Layout = () => {
  const { user, logout, refreshUser } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  const [notifs, setNotifs] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [showRequests, setShowRequests] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [mobileNav, setMobileNav] = useState(false);

  const notifRef = useRef(null);
  const requestsRef = useRef(null);

  useEffect(() => {
    const token = localStorage.getItem('token');

    if (token) {
      axios
        .get('/api/notifications', {
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        .then(r => setNotifs(r.data))
        .catch(() => {});
    }
  }, [location]);

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handler = (e) => {
      if (
        notifRef.current &&
        !notifRef.current.contains(e.target)
      ) {
        setShowNotifs(false);
      }

      if (
        requestsRef.current &&
        !requestsRef.current.contains(e.target)
      ) {
        setShowRequests(false);
      }
    };

    document.addEventListener('mousedown', handler);

    return () => {
      document.removeEventListener('mousedown', handler);
    };
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const unread = notifs.filter(n => !n.read).length;

  /*
   * Respond to a friend request.
   *
   * userId = ID of the user who sent the request
   * accept = true  -> accept
   * accept = false -> decline
   */
  const respondToFriendRequest = async (notification, accept) => {
  try {
    if (!notification.relatedUser) {
      toast.error('Invalid friend request');
      return;
    }

    const token = localStorage.getItem('token');

    await axios.post(
      `/api/users/friends/respond/${notification.relatedUser}`,
      { accept },
      {
        headers: {
          Authorization: `Bearer ${token}`
        }
      }
    );

    // Remove this notification from UI
    setNotifs(prev =>
      prev.filter(n => n._id !== notification._id)
    );

    if (accept) {
      toast.success('Friend request accepted!');
    } else {
      toast.success('Friend request rejected!');
    }

  } catch (err) {
    console.error('Friend request response error:', err);

    toast.error(
      err.response?.data?.message ||
      'Failed to respond to friend request'
    );
  }
};

  const navLinks = [
    { to: '/dashboard', label: 'Dashboard', icon: '🏠' },
    { to: '/contests', label: 'Contests', icon: '🏆' },
    { to: '/problems', label: 'Problems', icon: '💡' },
    { to: '/leaderboard', label: 'Leaderboard', icon: '📊' },
    { to: '/analytics', label: 'Analytics', icon: '📈' },
    { to: '/compare', label: 'Compare', icon: '⚔️' },
  ];

  // Pending friend requests received by the current user.
  const friendRequests = user?.friendRequests || [];

  return (
    <div className="layout">
      <nav className="navbar">
        <div className="navbar-inner">

          <Link to="/dashboard" className="navbar-logo">
            <span className="logo-icon">⚡</span>
            <span className="logo-text">CodeArena</span>
          </Link>

          <button
            className="mobile-menu-btn"
            onClick={() => setMobileNav(!mobileNav)}
          >
            ☰
          </button>

          <div className={`navbar-links ${mobileNav ? 'open' : ''}`}>
            {navLinks.map(l => (
              <Link
                key={l.to}
                to={l.to}
                className={`nav-link ${
                  location.pathname.startsWith(l.to)
                    ? 'active'
                    : ''
                }`}
                onClick={() => setMobileNav(false)}
              >
                <span>{l.icon}</span> {l.label}
              </Link>
            ))}
          </div>

          <div className="navbar-right">

            {/* Notifications */}
            <div className="notif-wrapper" ref={notifRef}>
              <button
                className="icon-btn"
                onClick={() => {
                  setShowNotifs(!showNotifs);
                  setShowRequests(false);
                  setShowMenu(false);
                }}
              >
                🔔

                {unread > 0 && (
                  <span className="badge-count">
                    {unread}
                  </span>
                )}
              </button>

              {showNotifs && (
                <div className="dropdown notif-dropdown">

                  <div className="dropdown-header">
                    <span>Notifications</span>

                    {unread > 0 && (
                      <button
                        onClick={() => {
                          axios.put(
                            '/api/notifications/mark-read',
                            {},
                            {
                              headers: {
                                Authorization: `Bearer ${localStorage.getItem('token')}`
                              }
                            }
                          );

                          setNotifs(prev =>
                            prev.map(n => ({
                              ...n,
                              read: true
                            }))
                          );
                        }}
                        className="btn btn-sm"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>

                  {notifs.length === 0 ? (
                    <p className="notif-empty">
                      No notifications
                    </p>
                  ) : (
                    notifs.slice(0, 10).map(n => (
                    <div
                      key={n._id}
                      className={`notif-item ${!n.read ? 'unread' : ''}`}
                    >
                      <span
                        className="notif-dot"
                        style={{
                          background: n.read
                            ? 'transparent'
                            : 'var(--accent)'
                        }}
                      />

                      <div style={{ flex: 1 }}>
                        <p>{n.message}</p>

                        <small>
                          {new Date(n.createdAt).toLocaleDateString()}
                        </small>

                        {n.type === 'friend_request' && n.relatedUser && (
                          <div
                            style={{
                              display: 'flex',
                              gap: 8,
                              marginTop: 8
                            }}
                          >
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() =>
                                respondToFriendRequest(n, true)
                              }
                            >
                              Accept
                            </button>

                            <button
                              className="btn btn-sm btn-secondary"
                              onClick={() =>
                                respondToFriendRequest(n, false)
                              }
                            >
                              Reject
                            </button>

                            <button
                              className="btn btn-sm"
                              onClick={() => {
                                if (n.link) {
                                  navigate(n.link);
                                }

                                setShowNotifs(false);
                              }}
                            >
                              Profile
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                  )}
                </div>
              )}
            </div>

            {/* Friend Requests */}
            <div
              className="notif-wrapper"
              ref={requestsRef}
            >
              <button
                className="icon-btn"
                onClick={() => {
                  setShowRequests(!showRequests);
                  setShowNotifs(false);
                  setShowMenu(false);
                }}
                title="Friend requests"
              >
                👥

                {friendRequests.length > 0 && (
                  <span className="badge-count">
                    {friendRequests.length}
                  </span>
                )}
              </button>

              {showRequests && (
                <div className="dropdown notif-dropdown">

                  <div className="dropdown-header">
                    <span>Friend Requests</span>
                  </div>

                  {friendRequests.length === 0 ? (
                    <p className="notif-empty">
                      No pending friend requests
                    </p>
                  ) : (
                    friendRequests.map(request => {

                      /*
                       * Depending on how the backend populates
                       * friendRequests, the sender may either be
                       * the request itself or request.sender.
                       */
                      const sender =
                        request.sender || request;

                      const senderId =
                        sender._id || request.userId;

                      const username =
                        sender.username ||
                        request.username ||
                        'Unknown user';

                      return (
                        <div
                          key={request._id || senderId}
                          className="notif-item"
                        >
                          <div style={{ width: '100%' }}>

                            <p>
                              <strong>
                                {username}
                              </strong>{' '}
                              sent you a friend request.
                            </p>

                            <div
                              style={{
                                display: 'flex',
                                gap: '8px',
                                marginTop: '8px'
                              }}
                            >
                              <button
                                className="btn btn-sm"
                                onClick={() =>
                                  respondToFriendRequest(
                                    senderId,
                                    true
                                  )
                                }
                              >
                                Accept
                              </button>

                              <button
                                className="btn btn-sm"
                                onClick={() =>
                                  respondToFriendRequest(
                                    senderId,
                                    false
                                  )
                                }
                              >
                                Decline
                              </button>
                            </div>

                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="user-menu-wrapper">
              <button
                className="user-btn"
                onClick={() => {
                  setShowMenu(!showMenu);
                  setShowNotifs(false);
                  setShowRequests(false);
                }}
              >
                <div className="avatar">
                  {user?.username?.[0]?.toUpperCase()}
                </div>

                <span className="username-text">
                  {user?.username}
                </span>

                <span>▾</span>
              </button>

              {showMenu && (
                <div className="dropdown user-dropdown">

                  <Link
                    to={`/profile/${user?.username}`}
                    className="dropdown-item"
                    onClick={() => setShowMenu(false)}
                  >
                    👤 Profile
                  </Link>

                  <hr />

                  <button
                    className="dropdown-item danger"
                    onClick={handleLogout}
                  >
                    🚪 Logout
                  </button>

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