import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { FiSearch, FiSend, FiArrowLeft, FiMessageSquare, FiUser } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useMessages } from '../context/MessageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ConversationListSkeleton from '../components/skeletons/ConversationListSkeleton';
import MessageSkeleton from '../components/skeletons/MessageSkeleton';

export default function MessagesPage() {
  const { userId: activeUserId } = useParams();
  const navigate = useNavigate();
  const { user: authUser } = useAuth();
  const { addToast } = useToast();
  const { refreshUnreadCount } = useMessages();

  const [conversations, setConversations] = useState([]);
  const [loadingConversations, setLoadingConversations] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const [messages, setMessages] = useState([]);
  const [partner, setPartner] = useState(null);
  const [loadingMessages, setLoadingMessages] = useState(false);

  const [textDraft, setTextDraft] = useState('');
  const [sending, setSending] = useState(false);

  const messagesEndRef = useRef(null);

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.round(hours / 24);
    return `${days}d ago`;
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const loadConversations = useCallback(async (isInitial = false) => {
    try {
      if (isInitial) setLoadingConversations(true);
      const res = await api.get('/messages/conversations');
      setConversations(res.data.conversations || []);
    } catch {
      if (isInitial) addToast('Unable to load conversations.', 'error');
    } finally {
      if (isInitial) setLoadingConversations(false);
    }
  }, [addToast]);

  const loadMessages = useCallback(async (targetUserId, isInitial = false) => {
    if (!targetUserId) return;
    try {
      if (isInitial) setLoadingMessages(true);
      const res = await api.get(`/messages/${targetUserId}`);
      const fetchedMessages = res.data.messages || [];

      // Update state only if new messages arrive or first load to avoid unnecessary DOM jitter
      setMessages((prev) => {
        if (isInitial || prev.length !== fetchedMessages.length || (prev.length > 0 && prev[prev.length - 1]._id !== fetchedMessages[fetchedMessages.length - 1]._id)) {
          return fetchedMessages;
        }
        return prev;
      });

      setPartner(res.data.partner);

      // Mark unread messages from target user as read
      await api.put(`/messages/${targetUserId}/read`);
      
      // Update local unread state for this conversation
      setConversations((prev) =>
        prev.map((c) => (c.partner?._id === targetUserId ? { ...c, unreadCount: 0 } : c))
      );
      refreshUnreadCount();
    } catch (err) {
      if (isInitial) addToast(err.response?.data?.message || 'Unable to load chat messages.', 'error');
    } finally {
      if (isInitial) setLoadingMessages(false);
    }
  }, [addToast, refreshUnreadCount]);

  useEffect(() => {
    loadConversations(true);
  }, [loadConversations]);

  useEffect(() => {
    if (activeUserId) {
      loadMessages(activeUserId, true);
    } else {
      setMessages([]);
      setPartner(null);
    }
  }, [activeUserId, loadMessages]);

  // Real-time background polling (every 2s when tab is active)
  useEffect(() => {
    const interval = setInterval(() => {
      if (!document.hidden) {
        loadConversations(false);
        if (activeUserId) {
          loadMessages(activeUserId, false);
        }
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [activeUserId, loadConversations, loadMessages]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (e) => {
    if (e) e.preventDefault();
    const trimmed = textDraft.trim();
    if (!trimmed || !activeUserId || sending) return;

    setSending(true);
    try {
      const res = await api.post(`/messages/${activeUserId}`, { text: trimmed });
      const newMsg = res.data.message;

      // Optimistically append new message to state
      setMessages((prev) => [...prev, newMsg]);
      setTextDraft('');

      // Update or insert conversation in sidebar list
      setConversations((prev) => {
        const existingIndex = prev.findIndex((c) => c.partner?._id === activeUserId);
        if (existingIndex > -1) {
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            lastMessage: trimmed,
            lastMessageAt: newMsg.createdAt,
            lastMessageSender: authUser._id,
          };
          const [moved] = updated.splice(existingIndex, 1);
          return [moved, ...updated];
        } else if (partner) {
          return [
            {
              _id: Date.now().toString(),
              partner,
              lastMessage: trimmed,
              lastMessageAt: newMsg.createdAt,
              lastMessageSender: authUser._id,
              unreadCount: 0,
            },
            ...prev,
          ];
        }
        return prev;
      });
    } catch (err) {
      addToast(err.response?.data?.message || 'Failed to send message.', 'error');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const filteredConversations = conversations.filter((c) => {
    const q = searchQuery.toLowerCase().trim();
    if (!q) return true;
    return (
      c.partner?.username?.toLowerCase().includes(q) ||
      c.partner?.fullname?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="messages-container">
      {/* Sidebar: Conversation List */}
      <aside className={`conversations-sidebar ${activeUserId ? 'mobile-hidden' : ''}`}>
        <div className="conversations-header">
          <h2>Messages</h2>
          <div className="messages-search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        <div className="conversations-list">
          {loadingConversations ? (
            <ConversationListSkeleton />
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isSelected = conv.partner?._id === activeUserId;
              return (
                <div
                  key={conv._id || conv.partner?._id}
                  className={`conversation-item ${isSelected ? 'active' : ''} ${conv.unreadCount > 0 ? 'unread' : ''}`}
                  onClick={() => navigate(`/messages/${conv.partner?._id}`)}
                >
                  <img src={conv.partner?.avatar} alt="avatar" className="avatar" />
                  <div className="conversation-info">
                    <div className="conversation-top-row">
                      <strong className="partner-name">{conv.partner?.fullname}</strong>
                      <span className="time-ago">{formatRelativeTime(conv.lastMessageAt)}</span>
                    </div>
                    <div className="conversation-bottom-row">
                      <p className="preview-text">
                        {conv.lastMessageSender === authUser?._id ? 'You: ' : ''}
                        {conv.lastMessage}
                      </p>
                      {conv.unreadCount > 0 && (
                        <span className="unread-dot-badge">{conv.unreadCount}</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-conversations">
              <FiMessageSquare size={32} />
              <p>No conversations found.</p>
              <small>Search for a user or start a chat from a profile page.</small>
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Panel */}
      <section className={`chat-panel ${!activeUserId ? 'mobile-hidden' : ''}`}>
        {activeUserId ? (
          <>
            <div className="chat-header">
              <button
                type="button"
                className="ghost-btn back-btn"
                onClick={() => navigate('/messages')}
                aria-label="Back to conversations"
              >
                <FiArrowLeft size={20} />
              </button>
              {partner && (
                <div className="chat-header-user">
                  <img src={partner.avatar} alt="avatar" className="avatar" />
                  <div>
                    <h3>{partner.fullname}</h3>
                    <p>@{partner.username}</p>
                  </div>
                </div>
              )}
              {partner && (
                <Link to={`/profile/${partner.username}`} className="ghost-btn profile-link-btn" title="View Profile">
                  <FiUser /> Profile
                </Link>
              )}
            </div>

            <div className="messages-scroll">
              {loadingMessages ? (
                <MessageSkeleton />
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isSentByMe = msg.sender === authUser?._id || msg.sender?._id === authUser?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`message-bubble-wrapper ${isSentByMe ? 'sent' : 'received'}`}
                    >
                      <div className="message-bubble">
                        <p>{msg.text}</p>
                        <span className="message-time">{formatRelativeTime(msg.createdAt)}</span>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-chat-state">
                  <p>Say hello to {partner?.fullname || 'your friend'}! 👋</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSendMessage} className="chat-input-bar">
              <textarea
                placeholder="Write a message..."
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                onKeyDown={handleKeyDown}
                rows={1}
                disabled={sending}
              />
              <button
                type="submit"
                className="primary-btn send-btn"
                disabled={!textDraft.trim() || sending}
                aria-busy={sending}
              >
                {sending ? <LoadingSpinner size={16} className="white" /> : <FiSend />}
              </button>
            </form>
          </>
        ) : (
          <div className="no-chat-selected">
            <FiMessageSquare size={48} />
            <h3>Select a conversation</h3>
            <p>Choose from your existing chats or visit a profile to start a new message.</p>
          </div>
        )}
      </section>
    </div>
  );
}
