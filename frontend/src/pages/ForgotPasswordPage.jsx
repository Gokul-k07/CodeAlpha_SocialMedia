import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiLock, FiMail, FiCheckCircle, FiArrowLeft, FiShield } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1); // 1: Email Request | 2: Enter OTP & New Password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const { addToast } = useToast();
  const navigate = useNavigate();

  const handleRequestOtp = async (e) => {
    e.preventDefault();
    if (!email.trim()) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      addToast(res.data.message || '6-digit OTP sent to your email.', 'success');
      setStep(2);
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to request password reset.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    if (!otp.trim() || !newPassword) return;

    if (newPassword !== confirmPassword) {
      addToast('Passwords do not match.', 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/auth/reset-password', {
        email: email.trim(),
        otp: otp.trim(),
        newPassword,
      });

      addToast(res.data.message || 'Password reset successfully! Please sign in.', 'success');
      navigate('/login');
    } catch (err) {
      addToast(err.response?.data?.message || 'Password reset failed.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '520px', gridTemplateColumns: '1fr' }}>
        <div className="auth-hero" style={{ textAlign: 'center', padding: '24px' }}>
          <FiShield size={44} style={{ color: '#6366f1', marginBottom: '12px' }} />
          <h2>Password Recovery</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            {step === 1
              ? 'Enter your registered email address to receive a secure 6-digit OTP code.'
              : 'Enter the 6-digit OTP code sent to your email and your new password.'}
          </p>
        </div>

        {step === 1 ? (
          <form onSubmit={handleRequestOtp} className="auth-form">
            <div className="form-group">
              <label>Email Address</label>
              <div className="messages-search-bar" style={{ background: 'var(--input-bg)' }}>
                <FiMail style={{ color: 'var(--text-muted)' }} />
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  autoFocus
                />
              </div>
            </div>

            <button type="submit" className="primary-btn" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size={14} className="white" /> Sending OTP...
                </>
              ) : (
                'Send 6-Digit OTP'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Link to="/login" className="back-link" style={{ fontSize: '0.88rem' }}>
                <FiArrowLeft /> Back to Sign In
              </Link>
            </div>
          </form>
        ) : (
          <form onSubmit={handleResetPassword} className="auth-form">
            <div className="form-group">
              <label>6-Digit OTP Code</label>
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                className="composer-textarea"
                style={{ height: '46px', textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 700 }}
                required
                autoFocus
              />
            </div>

            <div className="form-group">
              <label>New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="At least 6 characters"
                minLength={6}
                required
              />
            </div>

            <div className="form-group">
              <label>Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter new password"
                minLength={6}
                required
              />
            </div>

            <button type="submit" className="primary-btn" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size={14} className="white" /> Resetting Password...
                </>
              ) : (
                'Reset Password'
              )}
            </button>

            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '12px' }}>
              <button type="button" className="ghost-btn" onClick={() => setStep(1)} style={{ fontSize: '0.85rem' }}>
                Resend Code
              </button>
              <Link to="/login" className="back-link" style={{ fontSize: '0.88rem' }}>
                <FiArrowLeft /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
