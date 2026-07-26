import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft, FiShield, FiCheckCircle } from 'react-icons/fi';
import api from '../services/api';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const { addToast } = useToast();

  const handleRequestResetLink = async (e) => {
    e.preventDefault();
    if (!email.trim() || loading) return;

    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email: email.trim() });
      const msg = res.data.message || 'If an account with that email exists, you will receive a password reset link shortly.';
      setSuccessMessage(msg);
      setSubmitted(true);
      addToast(msg, 'info');
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to process password reset request. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card" style={{ maxWidth: '520px', gridTemplateColumns: '1fr' }}>
        <div className="auth-hero" style={{ textAlign: 'center', padding: '28px 24px 16px 24px' }}>
          <FiShield size={48} style={{ color: 'var(--primary)', marginBottom: '12px' }} />
          <h2 style={{ fontSize: '1.6rem', fontWeight: 700, margin: '0 0 8px 0' }}>Forgot Password</h2>
          <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>
            Enter your registered email address to receive a secure password reset link via Brevo.
          </p>
        </div>

        {submitted ? (
          <div className="auth-form" style={{ textAlign: 'center', gap: '20px' }}>
            <div style={{ background: 'var(--card-bg)', border: '1px solid var(--input-border)', borderRadius: '16px', padding: '24px' }}>
              <FiCheckCircle size={42} style={{ color: 'var(--success)', marginBottom: '12px' }} />
              <h3 style={{ margin: '0 0 8px 0', fontSize: '1.15rem' }}>Check Your Email</h3>
              <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>
                {successMessage}
              </p>
            </div>

            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', margin: 0 }}>
              Didn't receive an email? Check your spam folder or click below to try again.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <button
                type="button"
                className="secondary-btn"
                onClick={() => {
                  setSubmitted(false);
                  setSuccessMessage('');
                }}
              >
                Resend Reset Link
              </button>

              <Link to="/login" className="back-link" style={{ fontSize: '0.9rem', justifyContent: 'center' }}>
                <FiArrowLeft /> Return to Sign In
              </Link>
            </div>
          </div>
        ) : (
          <form onSubmit={handleRequestResetLink} className="auth-form">
            <div className="form-group">
              <label htmlFor="email">Email Address</label>
              <div className="messages-search-bar" style={{ background: 'var(--input-bg)' }}>
                <FiMail style={{ color: 'var(--text-muted)' }} />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@domain.com"
                  required
                  autoFocus
                  disabled={loading}
                />
              </div>
            </div>

            <button type="submit" className="primary-btn" disabled={loading} aria-busy={loading}>
              {loading ? (
                <>
                  <LoadingSpinner size={16} /> Sending Reset Link...
                </>
              ) : (
                'Send Password Reset Link'
              )}
            </button>

            <div style={{ textAlign: 'center', marginTop: '12px' }}>
              <Link to="/login" className="back-link" style={{ fontSize: '0.88rem', justifyContent: 'center' }}>
                <FiArrowLeft /> Back to Sign In
              </Link>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
