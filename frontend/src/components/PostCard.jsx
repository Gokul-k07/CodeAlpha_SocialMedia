import { useState, useEffect } from 'react';
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
} from 'react-icons/fi';
import api from '../services/api';
import LoadingSpinner from './LoadingSpinner';
import { useToast } from './ToastProvider';
import ImageLightboxModal from './ImageLightboxModal';
import EditPostModal from './EditPostModal';
import DocumentActionModal from './DocumentActionModal';

function FormattedCaption({ text = '' }) {
  if (!text) return null;

  // Regex for matching URLs, @mentions, #hashtags
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

export default function PostCard({
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
  busyIds,
  formatRelativeTime,
}) {
  const isExpanded = expandedPostId === post._id;
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showOptionsMenu, setShowOptionsMenu] = useState(false);
  const [expandedImageUrl, setExpandedImageUrl] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedDocForAction, setSelectedDocForAction] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleShareClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    const isDesktop = window.innerWidth >= 768;
    if (isDesktop) {
      setShowShareMenu((prev) => !prev);
    } else {
      if (navigator.share) {
        navigator.share({
          title: `Post by ${post.author?.fullname || 'NovaSocial'}`,
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
  const postAgeMs = post.createdAt ? Date.now() - new Date(post.createdAt).getTime() : 0;
  const canEdit = isAuthor && postAgeMs <= 3 * 60 * 60 * 1000;

  const imagesList = post.images?.length > 0 ? post.images : (post.image ? [post.image] : []);

  return (
    <article className="feed-card">
      <div className="post-header">
        <div className="user-row">
          <img src={post.author?.avatar} alt="avatar" className="avatar" />
          <div>
            <h3>
              <Link to={`/profile/${post.author?.username}`}>{post.author?.fullname}</Link>
            </h3>
            <p>
              <Link to={`/profile/${post.author?.username}`}>@{post.author?.username}</Link>
            </p>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
          {!isAuthor && (
            <button
              type="button"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onFollowToggle(post.author._id);
              }}
              className={isFollowing(post.author._id) ? 'secondary-btn follow-action-btn' : 'primary-btn follow-action-btn'}
              disabled={busyIds[post.author._id] === 'follow'}
              aria-busy={busyIds[post.author._id] === 'follow'}
            >
              {busyIds[post.author._id] === 'follow' ? <LoadingSpinner size={14} /> : isFollowing(post.author._id) ? 'Unfollow' : 'Follow'}
            </button>
          )}

          {/* 3-Dots Post Options Dropdown */}
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
                        <FiEdit2 /> Edit Post (3h limit)
                      </button>
                    )}
                    <button
                      type="button"
                      className="share-popover-option danger-option"
                      onClick={handleDeletePost}
                    >
                      <FiTrash2 /> Delete Post (Anytime)
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleLike(post._id);
          }}
          disabled={busyIds[post._id] === 'like'}
          aria-busy={busyIds[post._id] === 'like'}
        >
          {busyIds[post._id] === 'like' ? <LoadingSpinner size={14} /> : <FiHeart />}
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
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            onToggleBookmark(post._id);
          }}
          disabled={busyIds[post._id] === 'bookmark'}
          aria-busy={busyIds[post._id] === 'bookmark'}
        >
          {busyIds[post._id] === 'bookmark' ? <LoadingSpinner size={14} /> : <FiBookmark />}
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
              disabled={busyIds[post._id] === 'comment'}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  onAddComment(post._id);
                }
              }}
            />
            <button
              type="button"
              className="primary-btn comment-send"
              onClick={(e) => {
                e.preventDefault();
                onAddComment(post._id);
              }}
              disabled={busyIds[post._id] === 'comment' || !(commentDrafts[post._id] || '').trim()}
              aria-busy={busyIds[post._id] === 'comment'}
            >
              {busyIds[post._id] === 'comment' ? <LoadingSpinner size={14} /> : 'Send'}
            </button>
          </div>

          <div className="comment-list">
            {post.comments?.length ? (
              post.comments.map((comment) => (
                <div key={comment._id} className="comment-item">
                  <img src={comment.author?.avatar} alt="avatar" className="comment-avatar" />
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
    </article>
  );
}
