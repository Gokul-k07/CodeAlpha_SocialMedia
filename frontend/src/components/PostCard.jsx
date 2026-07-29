import { useState, useEffect, useCallback, memo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiHeart,
  FiMessageCircle,
  FiBookmark,
  FiSend,
  FiExternalLink,
  FiMaximize2,
  FiCopy,
  FiFileText,
  FiEdit2,
  FiTrash2,
  FiMoreVertical,
  FiUserCheck,
  FiUserPlus,
  FiX,
} from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { useToast } from './ToastProvider';
import ImageLightboxModal from './ImageLightboxModal';
import EditPostModal from './EditPostModal';
import DocumentActionModal from './DocumentActionModal';

function FormattedCaption({ text = '' }) {
  if (!text) return null;

  const tokenRegex = /(https?:\/\/[^\s]+|@[a-zA-Z0-9_.]+|#[a-zA-Z0-9_]+)/g;
  const parts = text.split(tokenRegex);

  return (
    <p className="caption">
      {parts.map((part, index) => {
        if (part.startsWith('http://') || part.startsWith('https://')) {
          return (
            <a
              key={index}
              href={part}
              target="_blank"
              rel="noopener noreferrer"
              className="post-inline-link"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </a>
          );
        }
        if (part.startsWith('@')) {
          const username = part.slice(1);
          return (
            <Link
              key={index}
              to={`/profile/${username}`}
              className="post-inline-mention"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        if (part.startsWith('#')) {
          const tag = part.slice(1);
          return (
            <Link
              key={index}
              to={`/search?q=${encodeURIComponent(tag)}`}
              className="post-inline-hashtag"
              onClick={(e) => e.stopPropagation()}
            >
              {part}
            </Link>
          );
        }
        return part;
      })}
    </p>
  );
}

function formatFileSize(bytes = 0) {
  if (bytes === 0) return 'Document';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

// ─── PostCard wrapped in React.memo to prevent re-renders when unrelated posts update ───
const PostCard = memo(function PostCard({
  post,
  user,
  isFollowing,
  onFollowToggle,
  onToggleLike,
  onToggleBookmark,
  onToggleComments,
  onAddComment,
  onPostUpdated,
  onPostDeleted,
  expandedPostId,
  commentDrafts,
  setCommentDrafts,
  formatRelativeTime,
}) {
  const isExpanded = expandedPostId === post._id;
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDocForAction, setSelectedDocForAction] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [showShareMsgModal, setShowShareMsgModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [sharingMsg, setSharingMsg] = useState(false);

  // ── Per-action keyed loading: { like: bool, bookmark: bool, comment: bool, follow: bool }
  const [busy, setBusy] = useState({});
  const setBusyAction = useCallback((action, value) => {
    setBusy((prev) => ({ ...prev, [action]: value }));
  }, []);

  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (!showShareMenu && !showOptionsMenu) return;
    const handleClickOutside = () => {
      setShowShareMenu(false);
      setShowOptionsMenu(false);
    };
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showShareMenu, showOptionsMenu]);

  const getPostUrl = () => `${window.location.origin}/post/${post._id}`;

  const handleOpenShareInMessageModal = async () => {
    setShowShareMenu(false);
    setShowOptionsMenu(false);
    setShowShareMsgModal(true);
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.conversations || []);
    } catch {
      addToast('Unable to fetch conversation partners.', 'error');
    }
  };

  const handleSendPostInMessage = async (targetPartnerId) => {
    if (sharingMsg) return;
    setSharingMsg(true);
    try {
      await api.post(`/messages/${targetPartnerId}`, {
        sharedPost: post._id,
      });
      addToast('Shared post in chat!', 'success');
      setShowShareMsgModal(false);
    } catch {
      addToast('Failed to share post in message.', 'error');
    } finally {
      setSharingMsg(false);
    }
  };

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop) {
      setShowShareMenu((prev) => !prev);
    } else {
      if (navigator.share) {
        navigator.share({
          title: `Post by ${post.author?.fullname || 'GOsocial'}`,
          text: post.caption,
          url: getPostUrl(),
        }).catch(() => {});
      } else {
        navigator.clipboard.writeText(getPostUrl());
        addToast('Post link copied to clipboard!', 'success');
      }
    }
  };

  const handleOpenNewWindow = () => {
    setShowShareMenu(false);
    window.open(getPostUrl(), '_blank', 'noopener,noreferrer');
    addToast('Opened post in new window', 'success');
  };

  const handleOpenSameWindow = () => {
    setShowShareMenu(false);
    navigate(`/post/${post._id}`);
  };

  const handleCopyLink = () => {
    setShowShareMenu(false);
    navigator.clipboard.writeText(getPostUrl());
    addToast('Post link copied to clipboard!', 'success');
  };

  const handleDeletePost = async () => {
    setShowOptionsMenu(false);
    if (!window.confirm('Are you sure you want to delete this post?')) return;

    setDeleting(true);
    try {
      await api.delete(`/posts/${post._id}`);
      addToast('Post deleted successfully', 'success');
      if (onPostDeleted) {
        onPostDeleted(post._id);
      }
    } catch {
      addToast('Unable to delete post.', 'error');
    } finally {
      setDeleting(false);
    }
  };

  const isAuthor = String(user?._id) === String(post.author?._id);
  // eslint-disable-next-line react-hooks/purity
  const postAgeMs = post.createdAt ? Date.now() - new Date(post.createdAt).getTime() : 0;
  const canEdit = isAuthor && postAgeMs <= 3 * 60 * 60 * 1000;

  const imagesList = post.images?.length > 0 ? post.images : (post.image ? [post.image] : []);

  return (
    <article className="feed-card">
      <div className="post-header">
        {/* Single full-width user-row: avatar+name on left, buttons on right */}
        <div className="user-row post-header-row">
          {/* Left: Avatar + name block */}
          <div className="user-row-identity">
            <Link to={`/profile/${post.author?.username}`}>
              <img src={post.author?.avatar} alt="avatar" className="avatar" />
            </Link>
            <div>
              <h3>
                <Link to={`/profile/${post.author?.username}`}>{post.author?.fullname}</Link>
              </h3>
              <p>
                <Link to={`/profile/${post.author?.username}`}>@{post.author?.username}</Link>
              </p>
            </div>
          </div>

          {/* Right: Follow button (non-authors) + 3-dot options */}
          <div className="post-header-actions">
            {!isAuthor && (
              <button
                type="button"
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (busy.follow) return;
                  setBusyAction('follow', true);
                  await onFollowToggle(post.author._id);
                  setBusyAction('follow', false);
                }}
                className={isFollowing(post.author._id) ? 'secondary-btn follow-action-btn' : 'primary-btn follow-action-btn'}
                disabled={busy.follow}
                aria-busy={busy.follow}
              >
                {busy.follow ? <LoadingSpinner size={14} /> : isFollowing(post.author._id) ? 'Unfollow' : 'Follow'}
              </button>
            )}

            {/* 3-Dot Options — anchored INSIDE user-row to avoid nav-bar clipping */}
            <div className="options-dropdown-wrapper">
              <button
                type="button"
                className="ghost-btn icon-only-btn"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setShowOptionsMenu((prev) => !prev);
                }}
                aria-label="Post options"
                title="Options"
                disabled={deleting}
              >
                {deleting ? <LoadingSpinner size={14} /> : <FiMoreVertical size={18} />}
              </button>

              {showOptionsMenu && (
                <div className="share-popover options-popover" onClick={(e) => e.stopPropagation()}>
                  {isAuthor ? (
                    <>
                      {canEdit && (
                        <button
                          type="button"
                          className="share-popover-option"
                          onClick={() => {
                            setShowOptionsMenu(false);
                            setIsEditModalOpen(true);
                          }}
                        >
                          <FiEdit2 /> Edit Post <small style={{ opacity: 0.6, fontSize: '0.75rem' }}>(3h window)</small>
                        </button>
                      )}
                      <button
                        type="button"
                        className="share-popover-option danger-option"
                        onClick={handleDeletePost}
                      >
                        <FiTrash2 /> Delete Post
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        type="button"
                        className="share-popover-option"
                        onClick={() => {
                          setShowOptionsMenu(false);
                          onFollowToggle(post.author._id);
                        }}
                      >
                        {isFollowing(post.author._id) ? <><FiUserCheck /> Unfollow creator</> : <><FiUserPlus /> Follow creator</>}
                      </button>
                      <button type="button" className="share-popover-option" onClick={handleOpenShareInMessageModal}>
                        <FiSend /> Share in message
                      </button>
                      <button type="button" className="share-popover-option" onClick={handleCopyLink}>
                        <FiCopy /> Copy share link
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Post Images Layout with Responsive Aspect Ratio */}
      {imagesList.length > 0 && (
        <div className={`post-media-container ${imagesList.length > 1 ? `grid-${Math.min(imagesList.length, 4)}` : ''}`}>
          {imagesList.map((imgUrl, idx) => (
            <img
              key={idx}
              src={imgUrl}
              alt={`post media ${idx + 1}`}
              className="post-image-item expandable"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setExpandedImageUrl(imgUrl);
              }}
              title="Click to view full image"
            />
          ))}
        </div>
      )}

      {/* Document Attachments with Permission Prompt Modal */}
      {post.attachments?.length > 0 && (
        <div className="post-attachments-list">
          {post.attachments.map((doc, idx) => (
            <button
              key={idx}
              type="button"
              className="document-attachment-card doc-button-card"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setSelectedDocForAction(doc);
              }}
            >
              <div className="doc-icon-wrapper">
                <FiFileText size={22} />
              </div>
              <div className="doc-meta">
                <strong className="doc-name">{doc.name}</strong>
                <span className="doc-details">{doc.fileType?.toUpperCase()} · {formatFileSize(doc.fileSize)}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      <FormattedCaption text={post.caption} />

      {/* Uniform Action Bar (In-Place Updates Without Page Reload) */}
      <div className="post-actions">
        <button
          type="button"
          className="post-action-btn"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (busy.like) return;
            setBusyAction('like', true);
            await onToggleLike(post._id);
            setBusyAction('like', false);
          }}
          disabled={busy.like}
          aria-busy={busy.like}
        >
          {busy.like ? <LoadingSpinner size={14} /> : <FiHeart />}
          <span>{post.likes?.length || 0}</span>
        </button>

        <button
          type="button"
          className="post-action-btn"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleComments(post._id);
          }}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Hide comments' : 'Show comments'}
        >
          <FiMessageCircle />
          <span>{post.comments?.length || 0}</span>
        </button>

        <button
          type="button"
          className="post-action-btn"
          onClick={async (e) => {
            e.preventDefault();
            e.stopPropagation();
            if (busy.bookmark) return;
            setBusyAction('bookmark', true);
            await onToggleBookmark(post._id);
            setBusyAction('bookmark', false);
          }}
          disabled={busy.bookmark}
          aria-busy={busy.bookmark}
        >
          {busy.bookmark ? <LoadingSpinner size={14} /> : <FiBookmark />}
        </button>

        <div className="share-popover-wrapper">
          <button
            type="button"
            className="post-action-btn"
            onClick={handleShareClick}
            aria-label="Share post"
            title="Share post"
          >
            <FiSend />
          </button>

          {showShareMenu && (
            <div className="share-popover" onClick={(e) => e.stopPropagation()}>
              <button type="button" className="share-popover-option" onClick={handleOpenShareInMessageModal}>
                <FiSend /> Share in message
              </button>
              <button type="button" className="share-popover-option" onClick={handleOpenNewWindow}>
                <FiExternalLink /> Open in new window
              </button>
              <button type="button" className="share-popover-option" onClick={handleOpenSameWindow}>
                <FiMaximize2 /> Open in same window
              </button>
              <button type="button" className="share-popover-option" onClick={handleCopyLink}>
                <FiCopy /> Copy share link
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Comment Section */}
      <div className={`comment-panel ${isExpanded ? 'expanded' : ''}`}>
        <div>
          <div className="comment-entry">
            <img src={user?.avatar} alt="your avatar" className="comment-avatar" />
            <textarea
              value={commentDrafts[post._id] || ''}
              onChange={(e) => setCommentDrafts((prev) => ({ ...prev, [post._id]: e.target.value }))}
              placeholder="Write a comment..."
              aria-label="Write a comment"
              disabled={busy.comment}
              onKeyDown={async (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  if (busy.comment) return;
                  setBusyAction('comment', true);
                  await onAddComment(post._id);
                  setBusyAction('comment', false);
                }
              }}
            />
            <button
              type="button"
              className="primary-btn comment-send"
              onClick={async (e) => {
                e.preventDefault();
                if (busy.comment) return;
                setBusyAction('comment', true);
                await onAddComment(post._id);
                setBusyAction('comment', false);
              }}
              disabled={busy.comment || !(commentDrafts[post._id] || '').trim()}
              aria-busy={busy.comment}
            >
              {busy.comment ? <LoadingSpinner size={14} /> : 'Send'}
            </button>
          </div>

          <div className="comment-list">
            {post.comments?.length ? (
              post.comments.map((comment) => (
                <div key={comment._id} className="comment-item">
                  <Link to={`/profile/${comment.author?.username}`}>
                    <img src={comment.author?.avatar} alt="avatar" className="comment-avatar" />
                  </Link>
                  <div className="comment-body">
                    <div className="comment-author">
                      <strong>{comment.author?.fullname || 'Unknown'}</strong>
                      <span>@{comment.author?.username || 'unknown'}</span>
                    </div>
                    <p>{comment.text}</p>
                    <small>{comment.createdAt ? formatRelativeTime(comment.createdAt) : 'Just now'}</small>
                  </div>
                </div>
              ))
            ) : (
              <div className="comment-empty">No comments yet. Start the conversation.</div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox Modal */}
      <ImageLightboxModal imageUrl={expandedImageUrl} onClose={() => setExpandedImageUrl(null)} />

      {/* Edit Post Modal */}
      <EditPostModal
        post={post}
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onPostUpdated={onPostUpdated}
      />

      {/* Document Permission Action Modal */}
      <DocumentActionModal
        document={selectedDocForAction}
        isOpen={!!selectedDocForAction}
        onClose={() => setSelectedDocForAction(null)}
      />

      {/* Share Post in Message Modal */}
      {showShareMsgModal && (
        <div className="modal-backdrop" onClick={() => setShowShareMsgModal(false)}>
          <div className="composer-modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Post in Chat</h3>
              <button type="button" className="modal-close" onClick={() => setShowShareMsgModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="composer-modal-form">
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Select a conversation partner to send this post card to:
              </p>
              <div className="search-results-picker" style={{ maxHeight: '280px' }}>
                {conversations.length > 0 ? (
                  conversations.map((c) => (
                    <div
                      key={c._id}
                      className="picker-row"
                      onClick={() => handleSendPostInMessage(c.partner?._id)}
                      style={{ cursor: sharingMsg ? 'not-allowed' : 'pointer' }}
                    >
                      <img src={c.partner?.avatar} alt="avatar" className="avatar" style={{ width: 36, height: 36 }} />
                      <div style={{ flex: 1 }}>
                        <strong>{c.partner?.fullname}</strong>
                        <small style={{ display: 'block', color: 'var(--text-muted)' }}>@{c.partner?.username}</small>
                      </div>
                      <FiSend style={{ color: 'var(--primary)' }} />
                    </div>
                  ))
                ) : (
                  <p style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)' }}>
                    No active chat conversations. Start a message first!
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </article>
  );
});

export default PostCard;
