import { createContext, useContext, useEffect, useState } from 'react';
import api from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

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

  const login = async (credentials) => {
    const res = await api.post('/auth/login', credentials);
    if (!res.data.requireTwoFactor) {
      setUser(res.data.user);
    }
    return res.data;
  };

  const verify2FaLogin = async (payload) => {
    const res = await api.post('/auth/verify-2fa-login', payload);
    setUser(res.data.user);
    return res.data;
  };

  const register = async (payload) => {
    const res = await api.post('/auth/register', payload);
    setUser(res.data.user);
    return res.data;
  };

  const logout = async () => {
    try {
      await api.post('/auth/logout');
    } catch {
      // Quiet fail
    } finally {
      setUser(null);
      localStorage.removeItem('GOsocial-token');
    }
  };

  const updateProfile = async (payload) => {
    const res = await api.put('/users/profile', payload);
    setUser(res.data.user);
    return res.data.user;
  };

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
      value={{ user, loading, login, verify2FaLogin, register, logout, updateProfile, toggleFollow }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
