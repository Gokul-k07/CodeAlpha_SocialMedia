import { NavLink, Outlet } from 'react-router-dom';
import { FiHome, FiCompass, FiSearch, FiUser, FiLogOut, FiShield } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function Layout() {
  const { user, logout } = useAuth();
  const handleLogout = async () => {
    await logout();
  };

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
