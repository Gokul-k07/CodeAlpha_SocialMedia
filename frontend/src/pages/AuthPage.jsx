import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { FiShield, FiArrowLeft } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  signInWithGoogle,
  signInWithEmailFirebase,
  registerWithEmailFirebase,
  sendFirebaseVerificationEmail,
  getFirebaseIdToken,
} from '../firebase';

// ── Google "G" SVG icon (matches the official brand mark) ────────────────────
function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
      <path fill="none" d="M0 0h48v48H0z" />
    </svg>
  );
}

export default function AuthPage() {
  const [mode, setMode] = useState('login'); // 'login' | 'signup' | '2fa'
  const [form, setForm] = useState({ email: '', password: '', username: '', fullname: '' });
  const [twoFactorEmail, setTwoFactorEmail] = useState('');
  const [twoFactorOtp, setTwoFactorOtp] = useState('');
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  const { login, verify2FaLogin, register, loginWithFirebase } = useAuth();
  const navigate = useNavigate();
  const { addToast } = useToast();

  // ── Existing local email + password submit handler (UNCHANGED) ────────────
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
        // Local registration (unchanged)
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

  // ── Google Sign-In ────────────────────────────────────────────────────────
  const handleGoogleSignIn = async () => {
    if (googleLoading) return;
    setGoogleLoading(true);
    try {
      const credential = await signInWithGoogle();
      const idToken = await credential.user.getIdToken();
      await loginWithFirebase(idToken);
      addToast(`Welcome, ${credential.user.displayName || 'User'}! 🎉`, 'success');
      navigate('/');
    } catch (err) {
      // User closed the popup — not an error worth showing
      if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') return;
      addToast(
        err.response?.data?.message || err.message || 'Google Sign-In failed. Please try again.',
        'error'
      );
    } finally {
      setGoogleLoading(false);
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

              {mode === 'login' && (
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', margin: '4px 0 10px 0' }}>
                  <Link to="/forgot-password" style={{ fontSize: '0.84rem', color: 'var(--primary)', textDecoration: 'none' }}>
                    Forgot password?
                  </Link>
                </div>
              )}

              <button className="primary-btn" type="submit" disabled={loading} aria-busy={loading}>
                {loading ? <LoadingSpinner size={14} className="white" /> : mode === 'login' ? 'Continue' : 'Create account'}
              </button>

              {/* ── OAuth Divider ──────────────────────────────────────── */}
              <div className="auth-divider">
                <span>or</span>
              </div>

              {/* ── Google Sign-In Button ─────────────────────────────── */}
              <button
                type="button"
                className="google-signin-btn"
                onClick={handleGoogleSignIn}
                disabled={googleLoading}
                aria-busy={googleLoading}
              >
                {googleLoading ? (
                  <LoadingSpinner size={16} />
                ) : (
                  <GoogleIcon />
                )}
                <span>{googleLoading ? 'Signing in…' : 'Continue with Google'}</span>
              </button>
            </>
          ) : (
            /* ── 2FA Verification (UNCHANGED) ─────────────────────────── */
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
