/**
 * EmailVerificationPage
 *
 * Shown after a Firebase Email/Password sign-up when the user's email
 * is not yet verified. Polls Firebase every 4 seconds to detect when
 * verification is complete, then automatically exchanges the Firebase
 * token for an app JWT and navigates to the home feed.
 */

import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FiMail, FiRefreshCw, FiCheckCircle, FiLogOut } from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import {
  reloadFirebaseUser,
  sendFirebaseVerificationEmail,
  getFirebaseIdToken,
  signOutFirebase,
} from '../firebase';

export default function EmailVerificationPage() {
  const { loginWithFirebase, logout } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  const [resending, setResending] = useState(false);
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const pollRef = useRef(null);
  const cooldownRef = useRef(null);

  // ── Automatically poll every 4 seconds to detect email verification ──────
  useEffect(() => {
    const poll = async () => {
      try {
        const verified = await reloadFirebaseUser();
        if (verified) {
          clearInterval(pollRef.current);
          setCheckingVerification(true);
          // Get a fresh Firebase ID token
          const idToken = await getFirebaseIdToken(true);
          if (!idToken) throw new Error('Unable to get Firebase token after verification.');
          // Exchange for app JWT
          await loginWithFirebase(idToken);
          addToast('Email verified! Welcome to GOsocial 🎉', 'success');
          navigate('/', { replace: true });
        }
      } catch (err) {
        console.error('[EmailVerification] Poll error:', err.message);
      }
    };

    pollRef.current = setInterval(poll, 4000);
    return () => clearInterval(pollRef.current);
  }, [loginWithFirebase, navigate, addToast]);

  // ── Resend verification email ─────────────────────────────────────────────
  const handleResend = async () => {
    if (resendCooldown > 0 || resending) return;
    setResending(true);
    try {
      await sendFirebaseVerificationEmail();
      addToast('Verification email sent! Check your inbox.', 'success');
      // 60-second cooldown to prevent spam
      setResendCooldown(60);
      cooldownRef.current = setInterval(() => {
        setResendCooldown((prev) => {
          if (prev <= 1) {
            clearInterval(cooldownRef.current);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } catch (err) {
      addToast(err.message || 'Failed to resend verification email.', 'error');
    } finally {
      setResending(false);
    }
  };

  // ── Cancel and sign out ───────────────────────────────────────────────────
  const handleCancel = async () => {
    clearInterval(pollRef.current);
    await signOutFirebase();
    await logout();
    navigate('/auth', { replace: true });
  };

  return (
    <div className="auth-page">
      <div className="auth-card verify-email-card">
        <div className="verify-email-icon-wrapper">
          <FiMail className="verify-email-icon" />
        </div>

        <div className="auth-hero" style={{ padding: '0 0 8px 0' }}>
          <div className="brand">GOsocial</div>
          <h1>Verify your email</h1>
          <p>
            We've sent a verification link to your email address. Please click the link in that
            email to continue.
          </p>
        </div>

        <div className="verify-email-status">
          {checkingVerification ? (
            <div className="verify-checking-row">
              <LoadingSpinner size={18} />
              <span>Verifying your email…</span>
            </div>
          ) : (
            <div className="verify-poll-row">
              <div className="verify-pulse-dot" />
              <span className="verify-poll-text">Checking for verification automatically…</span>
            </div>
          )}
        </div>

        <div className="verify-email-actions">
          <button
            type="button"
            className="primary-btn"
            onClick={handleResend}
            disabled={resending || resendCooldown > 0}
            aria-busy={resending}
          >
            {resending ? (
              <><LoadingSpinner size={14} className="white" /> Sending…</>
            ) : resendCooldown > 0 ? (
              <><FiRefreshCw /> Resend in {resendCooldown}s</>
            ) : (
              <><FiRefreshCw /> Resend verification email</>
            )}
          </button>

          <button
            type="button"
            className="ghost-btn"
            onClick={handleCancel}
            style={{ marginTop: '8px', fontSize: '0.85rem', color: 'var(--text-muted)' }}
          >
            <FiLogOut /> Back to login
          </button>
        </div>

        <p className="verify-email-hint">
          <FiCheckCircle style={{ verticalAlign: 'middle', marginRight: '6px', color: 'var(--primary)' }} />
          Once verified, you'll be signed in automatically.
        </p>
      </div>
    </div>
  );
}
