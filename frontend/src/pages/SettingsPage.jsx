import { useState } from 'react';
import { FiSettings, FiSun, FiMoon, FiMonitor, FiUser, FiShield, FiLock, FiLogOut } from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, updateProfile, logout } = useAuth();
  const { addToast } = useToast();

  const [fullname, setFullname] = useState(user?.fullname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [updating, setUpdating] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (updating) return;
    setUpdating(true);
    try {
      await updateProfile({ fullname, bio });
      addToast('Profile updated successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to update profile.', 'error');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="settings-page-container">
      <div className="page-header-card">
        <h2>
          <FiSettings className="settings-icon" /> Settings
        </h2>
        <p>Manage your account preferences, appearance, and security</p>
      </div>

      {/* Appearance Section */}
      <section className="settings-section">
        <h3 className="settings-section-title">
          <FiSun /> Appearance
        </h3>
        <div className="card">
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Choose how NovaSocial looks to you. Select a light, dark, or system theme.
          </p>
          <div className="theme-options-grid">
            <button
              type="button"
              className={`theme-card-option ${theme === 'light' ? 'active' : ''}`}
              onClick={() => setTheme('light')}
            >
              <FiSun className="theme-icon" />
              <span>Light</span>
            </button>

            <button
              type="button"
              className={`theme-card-option ${theme === 'dark' ? 'active' : ''}`}
              onClick={() => setTheme('dark')}
            >
              <FiMoon className="theme-icon" />
              <span>Dark</span>
            </button>

            <button
              type="button"
              className={`theme-card-option ${theme === 'system' ? 'active' : ''}`}
              onClick={() => setTheme('system')}
            >
              <FiMonitor className="theme-icon" />
              <span>System</span>
            </button>
          </div>
        </div>
      </section>

      {/* Account Profile Section */}
      <section className="settings-section">
        <h3 className="settings-section-title">
          <FiUser /> Account Profile
        </h3>
        <div className="card edit-profile-card">
          <form onSubmit={handleProfileSubmit} className="edit-profile-form">
            <div className="form-group">
              <label htmlFor="fullname">Full Name</label>
              <input
                id="fullname"
                type="text"
                value={fullname}
                onChange={(e) => setFullname(e.target.value)}
                placeholder="Your display name"
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                id="username"
                type="text"
                value={`@${user?.username || ''}`}
                disabled
                style={{ opacity: 0.7, cursor: 'not-allowed' }}
              />
            </div>

            <div className="form-group">
              <label htmlFor="bio">Bio</label>
              <textarea
                id="bio"
                rows={3}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell the community about yourself..."
                className="search-input-field"
                style={{ resize: 'vertical' }}
              />
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={updating}
              style={{ alignSelf: 'flex-start', marginTop: '6px' }}
            >
              {updating ? (
                <>
                  <LoadingSpinner size={14} className="white" /> Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Security & Privacy */}
      <section className="settings-section">
        <h3 className="settings-section-title">
          <FiShield /> Security & Privacy
        </h3>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div className="user-row spaced">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <FiLock style={{ color: '#10b981' }} />
              <div>
                <strong>Authentication</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Secured with JWT HttpOnly authentication cookies
                </p>
              </div>
            </div>
            <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#10b981' }}>Active</span>
          </div>
        </div>
      </section>

      {/* Account Actions */}
      <section className="settings-section">
        <h3 className="settings-section-title" style={{ color: '#ef4444' }}>
          <FiLogOut /> Account Actions
        </h3>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Log out of NovaSocial</strong>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              End your active session on this device
            </p>
          </div>
          <button
            type="button"
            className="secondary-btn"
            onClick={logout}
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            Log Out
          </button>
        </div>
      </section>
    </div>
  );
}
