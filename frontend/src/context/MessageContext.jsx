import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const MessageContext = createContext();

// eslint-disable-next-line react-refresh/only-export-components
export const useMessages = () => useContext(MessageContext);

export function MessagesProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/messages/unread-count');
      setUnreadCount(res.data.count ?? 0);
    } catch {
      // Quiet fail during background check
    }
  }, [user]);

  const decrementUnreadBy = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  const refreshUnreadCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (!user) {
      Promise.resolve().then(() => setUnreadCount(0));
      return;
    }

    // 1. Initial fetch on login
    Promise.resolve().then(() => fetchUnreadCount());

    // 2. Event-driven updates on window focus / tab visibility
    const handleFocusOrVisible = () => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    // 3. Fallback poll (every 45 seconds instead of 3 seconds)
    const fallbackInterval = setInterval(() => {
      if (!document.hidden) {
        fetchUnreadCount();
      }
    }, 45000);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      clearInterval(fallbackInterval);
    };
  }, [user, fetchUnreadCount]);

  const value = {
    unreadCount,
    fetchUnreadCount,
    decrementUnreadBy,
    refreshUnreadCount,
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}
