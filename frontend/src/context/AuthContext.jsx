import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { signOutFirebase, onFirebaseAuthStateChanged } from '../firebase';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // ── Bootstrap: restore session from existing app JWT (cookie or localStorage) ──
  useEffect(() => {
    const bootstrap = async () => {
      try {
        const res = await api.get('/auth/me');
        setUser(res.data.user);
      } catch {
        setUser(null);
      } finally {
        setLoading(false);
      }
    };

    bootstrap();
  }, []);

  // ── Existing local email + password login (unchanged) ─────────────────────
  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (!res.data.requireTwoFactor) {
      setUser(res.data.user);
    }
    return res.data;
  };

  // ── Existing 2FA verification (unchanged) ─────────────────────────────────
  const verify2FaLogin = async (payload) => {
    const res = await api.post('/auth/verify-2fa-login', payload);
    setUser(res.data.user);
    return res.data;
  };

  // ── Existing local registration (unchanged) ───────────────────────────────
  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    setUser(res.data.user);
    return res.data;
  };

  /**
   * Exchange a Firebase ID token for the application's JWT.
   * Called after Google Sign-In or after email verification is confirmed.
   *
   * Flow:
   *   1. Frontend obtains Firebase ID token via getIdToken()
   *   2. POSTs to /api/auth/firebase (server verifies token with Admin SDK)
   *   3. Server returns MongoDB user + sets httpOnly JWT cookie
   *   4. We store the user in state exactly like a local login
   */
  const loginWithFirebase = async (idToken) => {
    const res = await api.post('/auth/firebase', {}, {
      headers: { Authorization: `Bearer ${idToken}` },
    });
    setUser(res.data.user);
    return res.data;
  };

  // ── Logout: clear app JWT cookie + sign out from Firebase session ─────────
  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Quiet fail
    }
    try {
      await signOutFirebase();
    } catch {
      // Firebase sign-out may fail if user was local-only
    }
    setUser(null);
    localStorage.removeItem('GOsocial-token');
  };

  // ── Update profile (unchanged) ────────────────────────────────────────────
  const updateProfile = async (payload) => {
    const res = await api.put('/users/profile', payload);
    setUser(res.data.user);
    return res.data.user;
  };

  // ── Toggle follow (unchanged) ─────────────────────────────────────────────
  const toggleFollow = async (userId) => {
    const res = await api.post(`/follow/${userId}`);
    if (res.data.success) {
      setUser((prevUser) => ({
        ...prevUser,
        following: res.data.followingList,
      }));
    }
    return res.data;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        // Existing functions — unchanged
        login,
        verify2FaLogin,
        register,
        logout,
        updateProfile,
        toggleFollow,
        // New Firebase function
        loginWithFirebase,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
