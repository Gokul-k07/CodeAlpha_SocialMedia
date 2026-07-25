import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiShield, FiArrowLeft, FiLock } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | '2fa'
  const [form, setForm] = useState({ email: '', password: '', username: '', fullname: '' });
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [loading, setLoading] = useState(false);

  const { login, verify2FaLogin, register } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setLoading(true);
    try {
      if (mode === '2fa') {
        await verify2FaLogin({ email: twoFactorEmail, otp: twoFactorOtp.trim() });
        addToast('2FA verification successful! Welcome back.', 'success');
        navigate('/');
        return;
      }

      if (mode === 'login') {
        const res = await login({ identifier: form.email, password: form.password });
        if (res?.requireTwoFactor) {
          setTwoFactorEmail(res.email || form.email);
          setMode('2fa');
          addToast(res.message || 'Please enter the 6-digit 2FA code sent to your email.', 'info');
          return;
        }
        addToast('Welcome back to GOsocial', 'success');
        navigate('/');
      } else {
        await register(form);
        addToast('Account created successfully', 'success');
        navigate('/');
      }
    } catch (error) {
      addToast(error.response?.data?.message || 'Something went wrong', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-hero">
          <div className="brand">GOsocial</div>
          <h1>Share moments. Build connections.</h1>
          <p>A polished social platform for creators, founders, and communities.</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {mode !== '2fa' ? (
            <>
              <div className="switch-row">
                <button
                  type="button"
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
                <button
                  type="button"
                  className={mode === 'signup' ? 'active' : ''}
                  onClick={() => setMode('signup')}
                >
                  Sign up
                </button>
              </div>

              {mode === 'signup' && (
                <>
                  <input
                    value={form.fullname}
                    onChange={(e) => setForm({ ...form, fullname: e.target.value })}
                    placeholder="Full name"
                    required
                  />
                  <input
                    value={form.username}
                    onChange={(e) => setForm({ ...form, username: e.target.value })}
                    placeholder="Username"
                    required
                  />
                </>
              )}

              <input
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="Email or username"
                required
              />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
                placeholder="Password"
                required
              />

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px 0' }}>
                <Link to="/forgot-password" style={{ fontSize: '0.84rem', color: 'var(--primary)', textDecoration: 'none' }}>
                  Forgot password?
                </Link>
              </div>

              <button className="primary-btn" type="submit" disabled={loading} aria-busy={loading}>
                {loading ? <LoadingSpinner size={14} className="white" /> : mode === 'login' ? 'Continue' : 'Create account'}
              </button>
            </>
          ) : (
            <>
              <div style={{ textAlign: 'center', padding: '10px 0' }}>
                <FiShield size={36} style={{ color: '#6366f1' }} />
                <h3 style={{ margin: '8px 0 4px 0' }}>Two-Factor Verification</h3>
                <p style={{ margin: 0, fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                  Enter the 6-digit 2FA code sent to <strong>{twoFactorEmail}</strong>
                </p>
              </div>

              <input
                type="text"
                value={twoFactorOtp}
                onChange={(e) => setTwoFactorOtp(e.target.value)}
                placeholder="123456"
                maxLength={6}
                style={{ textAlign: 'center', letterSpacing: '4px', fontSize: '1.2rem', fontWeight: 700 }}
                required
                autoFocus
              />

              <button className="primary-btn" type="submit" disabled={loading} aria-busy={loading}>
                {loading ? <LoadingSpinner size={14} className="white" /> : 'Verify & Sign In'}
              </button>

              <button
                type="button"
                className="ghost-btn"
                onClick={() => setMode('login')}
                style={{ marginTop: '8px', fontSize: '0.85rem' }}
              >
                <FiArrowLeft /> Back to Login
              </button>
            </>
          )}
        </form>
      </div>
    </div>
  );
}
