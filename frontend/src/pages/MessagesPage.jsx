import { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiSearch,
  FiSend,
  FiArrowLeft,
  FiMessageSquare,
  FiUser,
  FiPaperclip,
  FiX,
  FiFileText,
  FiRefreshCw,
  FiExternalLink,
} from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import { useMessages } from '../context/MessageContext';
import LoadingSpinner from '../components/LoadingSpinner';
import ConversationListSkeleton from '../components/skeletons/ConversationListSkeleton';
import MessageSkeleton from '../components/skeletons/MessageSkeleton';
import MessageAttachmentModal from '../components/MessageAttachmentModal';
import DocumentActionModal from '../components/DocumentActionModal';
import ImageLightboxModal from '../components/ImageLightboxModal';

const URL_REGEX = /(https?:\/\/[^\s]+|www\.[^\s]+)/gi;
const IMAGE_EXT_REGEX = /\.(jpg|jpeg|png|gif|webp|avif)($|\?)/i;

function renderMessageTextWithLinks(text, onOpenImage) {
  if (!text) return null;

  const parts = text.split(URL_REGEX);
  const detectedPhotoUrls = [];

  const elements = parts.map((part, idx) => {
    if (part.match(URL_REGEX)) {
      const href = part.toLowerCase().startsWith('www.') ? `http://${part}` : part;
      if (IMAGE_EXT_REGEX.test(part)) {
        if (!detectedPhotoUrls.includes(part)) {
          detectedPhotoUrls.push(part);
        }
      }
      return (
        <a
          key={idx}
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="msg-text-link"
          onClick={(e) => e.stopPropagation()}
        >
          {part}
        </a>
      );
    }
    return part;
  });

  return (
    <>
      <p className="msg-text">{elements}</p>
      {detectedPhotoUrls.length > 0 && (
        <div className="msg-photo-urls-grid">
          {detectedPhotoUrls.map((url, i) => (
            <div
              key={i}
              className="msg-photo-url-preview"
              onClick={() => onOpenImage(url)}
              title="Click to view image"
            >
              <img src={url} alt="Photo URL preview" className="msg-photo-url-img" />
            </div>
          ))}
        </div>
      )}
    </>
  );
}

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
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const [textDraft, setTextDraft] = useState('');
  const [imagesDraft, setImagesDraft] = useState([]);
  const [attachmentsDraft, setAttachmentsDraft] = useState([]);
  const [sharedProfileDraft, setSharedProfileDraft] = useState(null);
  const [sharedPostDraft, setSharedPostDraft] = useState(null);
  const [isAttachModalOpen, setIsAttachModalOpen] = useState(false);
  const [selectedDocForAction, setSelectedDocForAction] = useState(null);
  const [expandedImageUrl, setExpandedImageUrl] = useState(null);

  const messagesEndRef = useRef(null);
  const chatBodyRef = useRef(null);

  const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const seconds = Math.round((now - date) / 1000);
    if (seconds < 60) return `${seconds}s ago`;
    const minutes = Math.round(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.round(seconds / 60);
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
      if (isInitial) {
        setLoadingMessages(true);
        setPage(1);
      }
      const res = await api.get(`/messages/${targetUserId}?page=1&limit=10`);
      const fetchedMessages = res.data.messages || [];

      setMessages((prev) => {
        if (isInitial) return fetchedMessages;
        // Merge without losing pending local failed/sending messages
        const pending = prev.filter((m) => m.status === 'sending' || m.status === 'failed');
        const existingIds = new Set(fetchedMessages.map((m) => m._id));
        const filteredPending = pending.filter((m) => !existingIds.has(m._id));
        return [...fetchedMessages, ...filteredPending];
      });

      setPartner(res.data.partner);
      setHasMore(res.data.hasMore || false);

      await api.put(`/messages/${targetUserId}/read`);
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
    Promise.resolve().then(() => loadConversations(true));
  }, [loadConversations]);

  useEffect(() => {
    if (activeUserId) {
      Promise.resolve().then(() => loadMessages(activeUserId, true));
    } else {
      Promise.resolve().then(() => {
        setMessages([]);
        setPartner(null);
      });
    }
  }, [activeUserId, loadMessages]);

  // Event-driven & low-frequency fallback refresh for messages
  useEffect(() => {
    const handleFocusOrVisible = () => {
      if (!document.hidden) {
        loadConversations(false);
        if (activeUserId && page === 1) {
          loadMessages(activeUserId, false);
        }
      }
    };

    window.addEventListener('focus', handleFocusOrVisible);
    document.addEventListener('visibilitychange', handleFocusOrVisible);

    const interval = setInterval(handleFocusOrVisible, 15000);

    return () => {
      window.removeEventListener('focus', handleFocusOrVisible);
      document.removeEventListener('visibilitychange', handleFocusOrVisible);
      clearInterval(interval);
    };
  }, [activeUserId, page, loadConversations, loadMessages]);

  useEffect(() => {
    if (page === 1) {
      scrollToBottom();
    }
  }, [messages, page]);

  // Upward pagination scroll handler
  const handleScroll = () => {
    const el = chatBodyRef.current;
    if (!el || loadingMore || !hasMore) return;
    if (el.scrollTop === 0) {
      loadOlderMessages();
    }
  };

  const loadOlderMessages = async () => {
    const el = chatBodyRef.current;
    if (!el || loadingMore || !hasMore) return;

    const oldScrollHeight = el.scrollHeight;
    setLoadingMore(true);

    try {
      const nextPage = page + 1;
      const res = await api.get(`/messages/${activeUserId}?page=${nextPage}&limit=10`);
      const olderMessages = res.data.messages || [];

      setMessages((prev) => [...olderMessages, ...prev]);
      setPage(nextPage);
      setHasMore(res.data.hasMore);

      requestAnimationFrame(() => {
        if (el) {
          el.scrollTop = el.scrollHeight - oldScrollHeight;
        }
      });
    } catch {
      // Quiet background error
    } finally {
      setLoadingMore(false);
    }
  };

  const executeSend = async (payloadMsg, tempId) => {
    try {
      const res = await api.post(
        `/messages/${activeUserId}`,
        {
          text: payloadMsg.text,
          images: payloadMsg.images,
          attachments: payloadMsg.attachments,
          sharedProfile: payloadMsg.sharedProfile?._id || payloadMsg.sharedProfile,
          sharedPost: payloadMsg.sharedPost?._id || payloadMsg.sharedPost,
        },
        { timeout: 5000 }
      );

      const confirmed = { ...res.data.message, status: 'sent' };
      setMessages((prev) => prev.map((m) => (m._id === tempId ? confirmed : m)));
    } catch {
      setMessages((prev) => prev.map((m) => (m._id === tempId ? { ...m, status: 'failed' } : m)));
      addToast('Message delivery failed. Tap retry to resend.', 'error');
    }
  };

  const handleSendMessage = (e) => {
    if (e) e.preventDefault();

    const trimmedText = textDraft.trim();
    const hasText = trimmedText.length > 0;
    const hasImages = imagesDraft.length > 0;
    const hasDocs = attachmentsDraft.length > 0;
    const hasProfile = !!sharedProfileDraft;
    const hasPost = !!sharedPostDraft;

    if (!hasText && !hasImages && !hasDocs && !hasProfile && !hasPost) {
      addToast('Message cannot be empty. Attach text, image, document, profile, or post.', 'error');
      return;
    }

    if (!activeUserId) return;

    const tempId = `temp-${Date.now()}`;
    const newPendingMsg = {
      _id: tempId,
      sender: { _id: authUser._id },
      recipient: activeUserId,
      text: trimmedText,
      images: [...imagesDraft],
      attachments: [...attachmentsDraft],
      sharedProfile: sharedProfileDraft,
      sharedPost: sharedPostDraft,
      createdAt: new Date().toISOString(),
      status: 'sending',
    };

    // Optimistically update message state
    setMessages((prev) => [...prev, newPendingMsg]);

    // Clear drafts
    setTextDraft('');
    setImagesDraft([]);
    setAttachmentsDraft([]);
    setSharedProfileDraft(null);
    setSharedPostDraft(null);

    // Execute delivery with 5s timeout
    executeSend(newPendingMsg, tempId);
  };

  const handleRetrySend = (failedMsg) => {
    setMessages((prev) => prev.map((m) => (m._id === failedMsg._id ? { ...m, status: 'sending' } : m)));
    executeSend(failedMsg, failedMsg._id);
  };

  const filteredConversations = conversations.filter((conv) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      conv.partner?.fullname?.toLowerCase().includes(q) ||
      conv.partner?.username?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="messages-container">
      {/* Conversations Sidebar */}
      <aside className={`conversations-sidebar ${activeUserId ? 'mobile-hidden' : ''}`}>
        <div className="conversations-header">
          <h2>Messages</h2>
          <div className="messages-search-bar">
            <FiSearch className="search-icon" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search conversations..."
            />
          </div>
        </div>

        <div className="conversations-list">
          {loadingConversations ? (
            <ConversationListSkeleton />
          ) : filteredConversations.length > 0 ? (
            filteredConversations.map((conv) => {
              const isActive = conv.partner?._id === activeUserId;
              const isUnread = conv.unreadCount > 0;
              return (
                <div
                  key={conv._id}
                  className={`conversation-item ${isActive ? 'active' : ''} ${isUnread ? 'unread' : ''}`}
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
                        {conv.lastMessageSender === authUser?._id && 'You: '}
                        {conv.lastMessage}
                      </p>
                      {isUnread && <span className="unread-dot-badge">{conv.unreadCount}</span>}
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="empty-conversations">
              <FiMessageSquare size={36} />
              <p>No conversations found.</p>
            </div>
          )}
        </div>
      </aside>

      {/* Main Chat Thread Area */}
      <section className={`chat-panel ${!activeUserId ? 'mobile-hidden' : ''}`}>
        {activeUserId && partner ? (
          <>
            {/* Header */}
            <div className="chat-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Link to="/messages" className="ghost-btn mobile-only-back" aria-label="Back">
                  <FiArrowLeft size={20} />
                </Link>
                <img src={partner.avatar} alt="avatar" className="avatar" />
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.05rem' }}>
                    <Link to={`/profile/${partner.username}`}>{partner.fullname}</Link>
                  </h3>
                  <small style={{ color: 'var(--text-muted)' }}>@{partner.username}</small>
                </div>
              </div>
              <Link to={`/profile/${partner.username}`} className="secondary-btn" style={{ padding: '6px 14px', fontSize: '0.82rem' }}>
                <FiUser /> Profile
              </Link>
            </div>

            {/* Message Feed Body (Upward Scroll Pagination) */}
            <div className="messages-chat-body" ref={chatBodyRef} onScroll={handleScroll}>
              {loadingMore && (
                <div style={{ textAlign: 'center', padding: '10px 0' }}>
                  <LoadingSpinner size={16} /> <small>Loading older messages...</small>
                </div>
              )}

              {loadingMessages ? (
                <MessageSkeleton />
              ) : messages.length > 0 ? (
                messages.map((msg) => {
                  const isMine = String(msg.sender?._id || msg.sender) === String(authUser._id);
                  const isFailed = msg.status === 'failed';
                  const isSending = msg.status === 'sending';

                  return (
                    <div key={msg._id} className={`msg-bubble-wrapper ${isMine ? 'mine' : 'theirs'}`}>
                      {!isMine && <img src={partner.avatar} alt="avatar" className="comment-avatar" />}

                      <div className={`msg-bubble ${isMine ? 'mine' : 'theirs'} ${isFailed ? 'failed-bubble' : ''}`}>
                        {/* Text */}
                        {renderMessageTextWithLinks(msg.text, setExpandedImageUrl)}

                        {/* Images Attachment */}
                        {msg.images?.length > 0 && (
                          <div className="msg-images-grid">
                            {msg.images.map((imgUrl, i) => (
                              <img
                                key={i}
                                src={imgUrl}
                                alt="attached media"
                                className="msg-image-item"
                                onClick={() => setExpandedImageUrl(imgUrl)}
                                style={{ cursor: 'pointer' }}
                              />
                            ))}
                          </div>
                        )}

                        {/* Documents Attachment */}
                        {msg.attachments?.length > 0 && (
                          <div className="msg-docs-list">
                            {msg.attachments.map((doc, i) => (
                              <button
                                key={i}
                                type="button"
                                className="document-attachment-card msg-doc-card"
                                onClick={() => setSelectedDocForAction(doc)}
                              >
                                <FiFileText size={20} />
                                <div className="doc-meta">
                                  <strong className="doc-name">{doc.name}</strong>
                                  <small>{doc.fileType?.toUpperCase()}</small>
                                </div>
                              </button>
                            ))}
                          </div>
                        )}

                        {/* Shared Profile Card */}
                        {msg.sharedProfile && (
                          <Link to={`/profile/${msg.sharedProfile.username}`} className="msg-shared-profile-card">
                            <img src={msg.sharedProfile.avatar} alt="avatar" className="avatar" />
                            <div className="profile-card-info">
                              <strong>{msg.sharedProfile.fullname}</strong>
                              <span>@{msg.sharedProfile.username}</span>
                              {msg.sharedProfile.bio && <small>{msg.sharedProfile.bio.substring(0, 35)}...</small>}
                            </div>
                            <FiExternalLink size={16} />
                          </Link>
                        )}

                        {/* Shared Post Card */}
                        {msg.sharedPost && (
                          <Link to={`/post/${msg.sharedPost._id}`} className="msg-shared-post-card">
                            <div className="shared-post-header">
                              <img src={msg.sharedPost.author?.avatar} alt="avatar" className="comment-avatar" />
                              <strong>{msg.sharedPost.author?.fullname || 'Creator'}</strong>
                            </div>
                            {msg.sharedPost.image && (
                              <img src={msg.sharedPost.image} alt="post media" className="shared-post-thumb" />
                            )}
                            <p>{msg.sharedPost.caption?.substring(0, 50)}...</p>
                            <FiExternalLink size={14} className="link-icon" />
                          </Link>
                        )}

                        <div className="msg-time-row">
                          <small>{formatRelativeTime(msg.createdAt)}</small>
                          {isSending && <small style={{ color: '#818cf8', marginLeft: '6px' }}>Sending...</small>}
                          {isFailed && (
                            <button
                              type="button"
                              className="msg-retry-btn"
                              onClick={() => handleRetrySend(msg)}
                              title="Message failed to send. Click to retry."
                            >
                              <FiRefreshCw size={12} /> Retry
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="empty-conversations" style={{ margin: 'auto' }}>
                  <FiMessageSquare size={40} />
                  <p>No messages yet. Send a message to start chatting!</p>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Pre-Send Attachment Previews */}
            {(imagesDraft.length > 0 || attachmentsDraft.length > 0 || sharedProfileDraft || sharedPostDraft) && (
              <div className="msg-draft-previews-bar">
                {imagesDraft.map((url, i) => (
                  <div key={i} className="draft-chip">
                    <span>📷 Image</span>
                    <button type="button" onClick={() => setImagesDraft((prev) => prev.filter((_, idx) => idx !== i))}>
                      <FiX />
                    </button>
                  </div>
                ))}

                {attachmentsDraft.map((doc, i) => (
                  <div key={i} className="draft-chip">
                    <span>📄 {doc.name}</span>
                    <button type="button" onClick={() => setAttachmentsDraft((prev) => prev.filter((_, idx) => idx !== i))}>
                      <FiX />
                    </button>
                  </div>
                ))}

                {sharedProfileDraft && (
                  <div className="draft-chip">
                    <span>👤 @{sharedProfileDraft.username}</span>
                    <button type="button" onClick={() => setSharedProfileDraft(null)}>
                      <FiX />
                    </button>
                  </div>
                )}

                {sharedPostDraft && (
                  <div className="draft-chip">
                    <span>📌 Shared Post</span>
                    <button type="button" onClick={() => setSharedPostDraft(null)}>
                      <FiX />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Input Footer Toolbar */}
            <form onSubmit={handleSendMessage} className="chat-footer">
              <button
                type="button"
                className="ghost-btn attach-btn"
                onClick={() => setIsAttachModalOpen(true)}
                title="Add Attachment"
              >
                <FiPaperclip size={20} />
              </button>

              <input
                type="text"
                value={textDraft}
                onChange={(e) => setTextDraft(e.target.value)}
                placeholder="Type a message..."
              />

              <button
                type="submit"
                className="primary-btn send-btn"
                disabled={
                  !textDraft.trim() &&
                  imagesDraft.length === 0 &&
                  attachmentsDraft.length === 0 &&
                  !sharedProfileDraft &&
                  !sharedPostDraft
                }
              >
                <FiSend />
              </button>
            </form>
          </>
        ) : (
          <div className="empty-conversations" style={{ margin: 'auto' }}>
            <FiMessageSquare size={48} />
            <h2>Select a Conversation</h2>
            <p>Pick a user from your left sidebar to open or start a chat thread.</p>
          </div>
        )}
      </section>

      {/* Rich Attachment Modal */}
      <MessageAttachmentModal
        isOpen={isAttachModalOpen}
        onClose={() => setIsAttachModalOpen(false)}
        onAddImage={(url) => setImagesDraft((prev) => [...prev, url])}
        onAddDocument={(doc) => setAttachmentsDraft((prev) => [...prev, doc])}
        onShareProfile={(p) => setSharedProfileDraft(p)}
        onSharePost={(post) => setSharedPostDraft(post)}
        onAddHashtag={(tag) => setTextDraft((prev) => (prev ? `${prev} ${tag}` : tag))}
      />

      {/* Document Action Modal */}
      <DocumentActionModal
        document={selectedDocForAction}
        isOpen={!!selectedDocForAction}
        onClose={() => setSelectedDocForAction(null)}
      />

      {/* Image Lightbox Modal */}
      <ImageLightboxModal
        imageUrl={expandedImageUrl}
        onClose={() => setExpandedImageUrl(null)}
      />
    </div>
  );
}
