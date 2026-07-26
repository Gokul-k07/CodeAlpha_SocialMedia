import { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff, FiCheckCircle, FiAlertCircle, FiArrowLeft } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ResetPasswordPage() {
  const { token: paramToken } = useParams();
  const [searchParams] = useSearchParams();
  const queryToken = searchParams.get('token');
  const token = paramToken || queryToken || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleReset = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      const msg = 'Missing reset token. Please request a new password reset link.';
      setErrorMsg(msg);
      addToast(msg, 'error');
      return;
    }

    if (newPassword.length < 6) {
      const msg = 'New password must be at least 6 characters long.';
      setErrorMsg(msg);
      addToast(msg, 'error');
      return;
    }

    if (newPassword !== confirmPassword) {
      const msg = 'Passwords do not match. Please verify and try again.';
      setErrorMsg(msg);
      addToast(msg, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        token: token.trim(),
        newPassword,
      });

      const msg = res.data.message || 'Password has been reset successfully!';
      addToast(msg, 'success');
      setSuccess(true);
    } catch (err) {
      const msg = err.response?.data?.message || 'Password reset failed. Link may be invalid or expired.';
      setErrorMsg(msg);
      addToast(msg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '520px', gridTemplateColumns: '1fr' }}>
        <div className="auth-hero" style={{ textAlign: 'center', padding: '28px 24px 16px 24px' }}>
          <FiLock size={48} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px 0' }}>Set New Password</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Please enter your new password below to update your GOsocial account credentials.
          </p>
        </div>

        {success ? (
          <div className="auth-form" style={{ textAlign: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--input-border)', borderRadius: '16px', padding: '24px' }}>
              <FiCheckCircle size={48} style={{ color: 'var(--success)', marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.2rem' }}>Password Updated!</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                Your password has been reset successfully. You can now sign in with your new credentials.
              </p>
            </div>

            <button
              type="button"
              className="primary-btn"
              onClick={() => navigate('/login')}
              style={{ width: '100%' }}
            >
              Sign In to GOsocial
            </button>
          </div>
        ) : (
          <form onSubmit={handleReset} className="auth-form">
            {!token && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)', fontSize: '0.88rem' }}>
                <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>No password reset token found in URL. Please click the link from your email or request a new reset link.</span>
              </div>
            )}

            {errorMsg && token && (
              <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--danger)', borderRadius: '12px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--danger)', fontSize: '0.88rem' }}>
                <FiAlertCircle size={20} style={{ flexShrink: 0 }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="form-group">
              <label htmlFor="new-password">New Password</label>
              <div className="messages-search-bar" style={{ background: 'var(--input-bg)' }}>
                <FiLock style={{ color: 'var(--text-muted)' }} />
                <input
                  id="new-password"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  minLength={6}
                  required
                  autoFocus
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="confirm-password">Confirm New Password</label>
              <div className="messages-search-bar" style={{ background: 'var(--input-bg)' }}>
                <FiLock style={{ color: 'var(--text-muted)' }} />
                <input
                  id="confirm-password"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  minLength={6}
                  required
                  disabled={loading}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', display: 'flex', padding: 0 }}
                  aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
                >
                  {showConfirmPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="primary-btn" disabled={loading || !token} aria-busy={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size={16} /> Updating Password...
                </>
              ) : (
                'Update Password'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Link to="/forgot-password" className="back-link" style={{ fontSize: '0.88rem', justifyContent: 'center' }}>
                <FiArrowLeft /> Request New Reset Link
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
