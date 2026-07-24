import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { FiHome, FiCompass, FiSearch, FiUser, FiLogOut, FiShield, FiBell, FiMessageSquare, FiBookmark, FiSettings } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useNotifications } from '../context/NotificationContext';
import { useMessages } from '../context/MessageContext';
import NotificationsDropdown from './NotificationsDropdown';

export default function Layout() {
  const { user, logout } = useAuth();
  const { unreadCount: notificationUnreadCount } = useNotifications();
  const { unreadCount: messageUnreadCount } = useMessages();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const toggleDropdown = () => setDropdownOpen(prev => !prev);

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div>
          <div className="brand">NovaSocial</div>
          <p className="brand-subtitle">Share moments. Build connections.</p>
        </div>
        <nav className="nav-links">
          <NavLink to="/" end><FiHome /> Home</NavLink>
          <NavLink to="/explore"><FiCompass /> Explore</NavLink>
          <NavLink to="/search"><FiSearch /> Search</NavLink>
          <NavLink to="/messages">
            <FiMessageSquare /> Messages
            {messageUnreadCount > 0 && <span className="notification-badge">{messageUnreadCount}</span>}
          </NavLink>
          <NavLink to="/notifications">
            <FiBell /> Notifications
            {notificationUnreadCount > 0 && <span className="notification-badge">{notificationUnreadCount}</span>}
          </NavLink>
          <NavLink to="/bookmarks"><FiBookmark /> Saved Posts</NavLink>
          <NavLink to="/settings"><FiSettings /> Settings</NavLink>
          <NavLink to={`/profile/${user?.username || 'me'}`}><FiUser /> Profile</NavLink>
          {user?.role === 'admin' && <NavLink to="/admin"><FiShield /> Admin</NavLink>}
        </nav>
        <button className="ghost-btn" onClick={handleLogout} aria-label="Logout"><FiLogOut /> Logout</button>
      </aside>
      <main className="main-panel">
        <Outlet />
      </main>
    </div>
  );
}
