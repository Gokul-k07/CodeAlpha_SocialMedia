import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from './AuthContext';

const MessageContext = createContext();

export const useMessages = () => useContext(MessageContext);

export function MessagesProvider({ children }) {
  const [unreadCount, setUnreadCount] = useState(0);
  const { user } = useAuth();

  const fetchUnreadCount = useCallback(async () => {
    if (!user) return;
    try {
      const res = await api.get('/messages/unread-count');
      setUnreadCount(res.data.count);
    } catch {
      // Quiet fail during background poll
    }
  }, [user]);

  const decrementUnreadBy = useCallback((amount = 1) => {
    setUnreadCount((prev) => Math.max(0, prev - amount));
  }, []);

  const refreshUnreadCount = useCallback(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(() => {
        if (!document.hidden) {
          fetchUnreadCount();
        }
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [user, fetchUnreadCount]);

  const value = {
    unreadCount,
    fetchUnreadCount,
    decrementUnreadBy,
    refreshUnreadCount,
  };

  return <MessageContext.Provider value={value}>{children}</MessageContext.Provider>;
}
