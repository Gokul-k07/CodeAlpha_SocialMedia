import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  FiSettings,
  FiSun,
  FiMoon,
  FiMonitor,
  FiUser,
  FiShield,
  FiLock,
  FiLogOut,
  FiCheckCircle,
  FiBell,
  FiMessageSquare,
  FiUserCheck,
  FiX,
} from 'react-icons/fi';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import api from '../services/api';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { user, updateProfile, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [fullname, setFullname] = useState(user?.fullname || '');
  const [bio, setBio] = useState(user?.bio || '');
  const [whoCanMessageMe, setWhoCanMessageMe] = useState(user?.whoCanMessageMe || 'anyone');
  const [whoCanFollowMe, setWhoCanFollowMe] = useState(user?.whoCanFollowMe || 'anyone');
  const [emailNotifications, setEmailNotifications] = useState(user?.emailNotifications ?? true);

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [updatingPrivacy, setUpdatingPrivacy] = useState(false);

  // 2FA Setup State
  const [show2FaModal, setShow2FaModal] = useState(false);
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [toggling2Fa, setToggling2Fa] = useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (updatingProfile) return;
    setUpdatingProfile(true);
    try {
      await updateProfile({ fullname, bio });
      addToast('Profile updated successfully.', 'success');
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to update profile.', 'error');
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handlePrivacySubmit = async (e) => {
    e.preventDefault();
    if (updatingPrivacy) return;
    setUpdatingPrivacy(true);
    try {
      await updateProfile({
        whoCanMessageMe,
        whoCanFollowMe,
        emailNotifications,
      });
      addToast('Privacy preferences saved.', 'success');
    } catch {
      addToast('Unable to save privacy settings.', 'error');
    } finally {
      setUpdatingPrivacy(false);
    }
  };

  const handleToggle2Fa = async () => {
    if (toggling2Fa) return;
    setToggling2Fa(true);

    try {
      if (user?.isTwoFactorEnabled) {
        // Disable 2FA
        const res = await api.post('/auth/2fa/toggle', { enable: false });
        await updateProfile({ isTwoFactorEnabled: false });
        addToast(res.data.message || 'Two-Factor Authentication disabled.', 'success');
      } else {
        // Request 2FA Setup OTP
        const res = await api.post('/auth/2fa/toggle', { enable: true });
        addToast(res.data.message || '6-digit setup code sent to your email.', 'info');
        setShow2FaModal(true);
      }
    } catch (err) {
      addToast(err.response?.data?.message || '2FA operation failed.', 'error');
    } finally {
      setToggling2Fa(false);
    }
  };

  const handleConfirm2Fa = async (e) => {
    e.preventDefault();
    if (!twoFactorOtp.trim() || toggling2Fa) return;

    setToggling2Fa(true);
    try {
      const res = await api.post('/auth/2fa/confirm', { otp: twoFactorOtp.trim() });
      await updateProfile({ isTwoFactorEnabled: true });
      addToast(res.data.message || 'Two-Factor Authentication active!', 'success');
      setShow2FaModal(false);
      setTwoFactorOtp('');
    } catch (err) {
      addToast(err.response?.data?.message || 'Invalid setup OTP code.', 'error');
    } finally {
      setToggling2Fa(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast('Logged out of GOsocial.', 'info');
    navigate('/login');
  };

  return (
    <div className="settings-page-container">
      <div className="page-header-card">
        <h2>
          <FiSettings className="settings-icon" /> Settings
        </h2>
        <p>Manage your account preferences, appearance, security, and privacy</p>
      </div>

      {/* Appearance Section */}
      <section className="settings-section">
        <h3 className="settings-section-title">
          <FiSun /> Appearance
        </h3>
        <div className="card">
          <p style={{ margin: '0 0 10px 0', fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Choose how GOsocial looks to you. Select a light, dark, or system theme.
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
              disabled={updatingProfile}
              style={{ alignSelf: 'flex-start', marginTop: '6px' }}
            >
              {updatingProfile ? (
                <>
                  <LoadingSpinner size={14} className="white" /> Saving...
                </>
              ) : (
                'Save Profile Changes'
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Security & 2FA Section */}
      <section className="settings-section">
        <h3 className="settings-section-title">
          <FiShield /> Security & Authentication
        </h3>
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Two-Factor Authentication Toggle */}
          <div className="user-row spaced">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiShield size={22} style={{ color: user?.isTwoFactorEnabled ? '#10b981' : 'var(--text-muted)' }} />
              <div>
                <strong>Two-Factor Authentication (2FA)</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Require a secure 6-digit email OTP verification code upon login
                </p>
              </div>
            </div>
            <button
              type="button"
              className={user?.isTwoFactorEnabled ? 'secondary-btn' : 'primary-btn'}
              onClick={handleToggle2Fa}
              disabled={toggling2Fa}
            >
              {toggling2Fa ? <LoadingSpinner size={14} /> : user?.isTwoFactorEnabled ? 'Disable 2FA' : 'Enable 2FA'}
            </button>
          </div>

          <hr style={{ border: 'none', borderTop: '1px solid var(--input-border)', margin: 0 }} />

          {/* Change Password OTP Flow Link */}
          <div className="user-row spaced">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <FiLock size={20} style={{ color: '#818cf8' }} />
              <div>
                <strong>Change Password</strong>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Reset password via secure 6-digit OTP verification code
                </p>
              </div>
            </div>
            <Link to="/forgot-password" className="secondary-btn" style={{ textDecoration: 'none' }}>
              Change Password
            </Link>
          </div>
        </div>
      </section>

      {/* Working Privacy & Notification Settings */}
      <section className="settings-section">
        <h3 className="settings-section-title">
          <FiLock /> Privacy & Preferences
        </h3>
        <div className="card">
          <form onSubmit={handlePrivacySubmit} className="edit-profile-form">
            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiMessageSquare /> Who can message me
              </label>
              <select
                value={whoCanMessageMe}
                onChange={(e) => setWhoCanMessageMe(e.target.value)}
                className="search-input-field"
                style={{ height: '42px' }}
              >
                <option value="anyone">🌐 Anyone on GOsocial</option>
                <option value="followers">🔒 Only accounts who follow me</option>
              </select>
            </div>

            <div className="form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FiUserCheck /> Who can follow me
              </label>
              <select
                value={whoCanFollowMe}
                onChange={(e) => setWhoCanFollowMe(e.target.value)}
                className="search-input-field"
                style={{ height: '42px' }}
              >
                <option value="anyone">🌐 Anyone (Public)</option>
                <option value="approval">🔒 Require follow approval</option>
              </select>
            </div>

            <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
                <FiBell /> Email Notification Preferences
              </label>
              <input
                type="checkbox"
                checked={emailNotifications}
                onChange={(e) => setEmailNotifications(e.target.checked)}
                style={{ width: '20px', height: '20px', cursor: 'pointer' }}
              />
            </div>

            <button
              type="submit"
              className="primary-btn"
              disabled={updatingPrivacy}
              style={{ alignSelf: 'flex-start', marginTop: '6px' }}
            >
              {updatingPrivacy ? (
                <>
                  <LoadingSpinner size={14} className="white" /> Saving Preferences...
                </>
              ) : (
                'Save Privacy Settings'
              )}
            </button>
          </form>
        </div>
      </section>

      {/* Account Logout */}
      <section className="settings-section">
        <h3 className="settings-section-title" style={{ color: '#ef4444' }}>
          <FiLogOut /> Account Actions
        </h3>
        <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong>Log out of GOsocial</strong>
            <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              End your active session on this device securely
            </p>
          </div>
          <button
            type="button"
            className="secondary-btn"
            onClick={handleLogout}
            style={{ color: '#ef4444', borderColor: '#ef4444' }}
          >
            Log Out
          </button>
        </div>
      </section>

      {/* 2FA Confirmation Modal */}
      {show2FaModal && (
        <div className="modal-backdrop" onClick={() => setShow2FaModal(false)}>
          <div className="composer-modal-card" style={{ maxWidth: '440px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm 2FA Enablement</h3>
              <button type="button" className="modal-close" onClick={() => setShow2FaModal(false)}>
                <FiX />
              </button>
            </div>
            <form onSubmit={handleConfirm2Fa} className="composer-modal-form">
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
                Enter the 6-digit setup code sent to <strong>{user?.email}</strong> to activate Two-Factor Authentication:
              </p>
              <input
                type="text"
                value={twoFactorOtp}
                onChange={(e) => setTwoFactorOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 700, height: '46px' }}
                required
                autoFocus
              />
              <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-btn" onClick={() => setShow2FaModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn" disabled={toggling2Fa}>
                  Confirm & Enable
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
