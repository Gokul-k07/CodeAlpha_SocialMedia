import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiBookmark, FiSend, FiExternalLink, FiMaximize2, FiCopy } from 'react-icons/fi';
import LoadingSpinner from './LoadingSpinner';
import { useToast } from './ToastProvider';

export default function PostCard({
  post,
  user,
  isFollowing,
  onFollowToggle,
  onToggleLike,
  onToggleBookmark,
  onToggleComments,
  onAddComment,
  expandedPostId,
  commentDrafts,
  setCommentDrafts,
  busyIds,
  formatRelativeTime,
}) {
  const isExpanded = expandedPostId === post._id;
  const [showShareMenu, setShowShareMenu] = useState(false);
  const navigate = useNavigate();
  const { addToast } = useToast();

  useEffect(() => {
    if (!showShareMenu) return;
    const handleClickOutside = () => setShowShareMenu(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showShareMenu]);

  const getPostUrl = () => `${window.location.origin}/post/${post._id}`;

  const handleShareClick = (e) => {
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
        {user?._id !== post.author?._id && (
          <button
            onClick={() => onFollowToggle(post.author._id)}
            className={isFollowing(post.author._id) ? 'secondary-btn' : 'accent-btn'}
            disabled={busyIds[post.author._id] === 'follow'}
            aria-busy={busyIds[post.author._id] === 'follow'}
          >
            {isFollowing(post.author._id) ? 'Unfollow' : 'Follow'}
          </button>
        )}
      </div>
      <img
        src={post.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'}
        alt="post"
        className="post-image"
      />
      <div className="post-actions">
        <button onClick={() => onToggleLike(post._id)} disabled={busyIds[post._id] === 'like'} aria-busy={busyIds[post._id] === 'like'}>
          {busyIds[post._id] === 'like' ? <LoadingSpinner size={14} /> : <FiHeart />} {post.likes?.length || 0}
        </button>
        <button
          type="button"
          onClick={() => onToggleComments(post._id)}
          aria-expanded={isExpanded}
          aria-label={isExpanded ? 'Hide comments' : 'Show comments'}
        >
          <FiMessageCircle /> {post.comments?.length || 0}
        </button>
        <button onClick={() => onToggleBookmark(post._id)} disabled={busyIds[post._id] === 'bookmark'} aria-busy={busyIds[post._id] === 'bookmark'}>
          {busyIds[post._id] === 'bookmark' ? <LoadingSpinner size={14} /> : <FiBookmark />}
        </button>
        <div className="share-popover-wrapper">
          <button type="button" onClick={handleShareClick} aria-label="Share post" title="Share post">
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
      <p className="caption">{post.caption}</p>
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
              onClick={() => onAddComment(post._id)}
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
    </article>
  );
}
