import { useState } from 'react';
import { useNavigate, NavLink, Outlet } from 'react-router-dom';
import {
  FiHome,
  FiCompass,
  FiUser,
  FiLogOut,
  FiShield,
  FiBell,
  FiMessageSquare,
  FiBookmark,
  FiSettings,
  FiMenu,
  FiX
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useMessages } from '../context/MessageContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { unreadCount: messageUnreadCount } = useMessages();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const closeMenu = () => setIsMobileMenuOpen(false);

  return (
    <div className="app-shell">
      {/* Mobile Top Header (Visible only on small screens) */}
      <header className="mobile-header">
        <button 
          className="ghost-btn icon-only-btn" 
          onClick={() => setIsMobileMenuOpen(true)}
          aria-label="Open menu"
        >
          <FiMenu size={24} />
        </button>
        <div className="brand" style={{ fontSize: '1.4rem', marginLeft: '12px' }}>GOsocial</div>
      </header>

      {/* Sidebar Navigation */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        <div className="sidebar-brand-box">
          <div>
            <div className="brand">GOsocial</div>
            <p className="brand-subtitle">Share moments. Build connections.</p>
          </div>
          <button 
            className="ghost-btn icon-only-btn mobile-close-btn"
            onClick={closeMenu}
            aria-label="Close menu"
          >
            <FiX size={24} />
          </button>
        </div>

        <nav className="nav-links">
          <NavLink to="/" end onClick={closeMenu}>
            <FiHome /> <span>Home</span>
          </NavLink>
          <NavLink to="/explore" onClick={closeMenu}>
            <FiCompass /> <span>Explore</span>
          </NavLink>
          <NavLink to="/messages" onClick={closeMenu}>
            <FiMessageSquare /> <span>Messages</span>
            {messageUnreadCount > 0 && (
              <span className="nav-unread-badge">{messageUnreadCount > 99 ? '99+' : messageUnreadCount}</span>
            )}
          </NavLink>
          <NavLink to="/notifications" onClick={closeMenu}>
            <FiBell /> <span>Notifications</span>
            {notificationUnreadCount > 0 && (
              <span className="nav-unread-badge">{notificationUnreadCount > 99 ? '99+' : notificationUnreadCount}</span>
            )}
          </NavLink>
          <NavLink to="/bookmarks" onClick={closeMenu}>
            <FiBookmark /> <span>Saved Posts</span>
          </NavLink>
          <NavLink to="/settings" onClick={closeMenu}>
            <FiSettings /> <span>Settings</span>
          </NavLink>
          <NavLink to={`/profile/${user?.username || 'me'}`} onClick={closeMenu}>
            <FiUser /> <span>Profile</span>
          </NavLink>
          {user?.role === 'admin' && (
            <NavLink to="/admin" onClick={closeMenu}>
              <FiShield /> <span>Admin</span>
            </NavLink>
          )}
        </nav>

        <div className="sidebar-spacer" />

        <button
          type="button"
          className="ghost-btn sidebar-logout-btn"
          onClick={handleLogout}
          aria-label="Logout"
          title="Log out of GOsocial"
        >
          <FiLogOut /> <span>Logout</span>
        </button>
      </aside>

      {/* Mobile Backdrop for clicking outside to close */}
      {isMobileMenuOpen && (
        <div className="sidebar-backdrop" onClick={closeMenu} />
      )}

      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
