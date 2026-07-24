import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiBookmark } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import FeedSkeleton from '../components/skeletons/FeedSkeleton';
import PostCard from '../components/PostCard';

export default function BookmarksPage() {
  const { user: authUser, toggleFollow: authToggleFollow } = useAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState({});
  const [expandedCommentPostId, setExpandedCommentPostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const { addToast } = useToast();

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
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

  const loadBookmarks = async () => {
    try {
      setLoading(true);
      const res = await api.get('/posts/bookmarks');
      setPosts(res.data.posts || []);
    } catch {
      addToast('Unable to load saved posts.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadBookmarks();
  }, []);

  const toggleComments = (postId) => {
    setExpandedCommentPostId((prev) => (prev === postId ? null : postId));
  };

  const toggleLike = async (postId) => {
    if (busyIds[postId]) return;
    setBusyIds((prev) => ({ ...prev, [postId]: 'like' }));
    try {
      const res = await api.post(`/posts/${postId}/like`);
      const updated = res.data.post;
      if (updated) {
        setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, likes: updated.likes } : p)));
      }
      addToast('Post liked', 'success');
    } catch {
      addToast('Unable to update like state.', 'error');
    } finally {
      setBusyIds((prev) => ({ ...prev, [postId]: null }));
    }
  };

  const toggleBookmark = async (postId) => {
    if (busyIds[postId]) return;
    setBusyIds((prev) => ({ ...prev, [postId]: 'bookmark' }));
    try {
      await api.post(`/posts/${postId}/bookmark`);
      // Immediately remove from saved posts page without full page reload
      setPosts((prev) => prev.filter((p) => p._id !== postId));
      addToast('Post removed from saved posts', 'success');
    } catch {
      addToast('Unable to update bookmark.', 'error');
    } finally {
      setBusyIds((prev) => ({ ...prev, [postId]: null }));
    }
  };

  const addComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text || busyIds[postId]) return;
    setBusyIds((prev) => ({ ...prev, [postId]: 'comment' }));
    try {
      const res = await api.post(`/posts/${postId}/comment`, { text });
      const updated = res.data.post;
      if (updated) {
        setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, comments: updated.comments } : p)));
      }
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      addToast('Comment added', 'success');
    } catch {
      addToast('Unable to add comment.', 'error');
    } finally {
      setBusyIds((prev) => ({ ...prev, [postId]: null }));
    }
  };

  const handleFollowToggle = async (authorId) => {
    if (busyIds[authorId]) return;
    setBusyIds((prev) => ({ ...prev, [authorId]: 'follow' }));
    try {
      const res = await authToggleFollow(authorId);
      addToast(res.following ? 'User followed' : 'User unfollowed', 'success');
    } catch {
      addToast('Could not update follow status.', 'error');
    } finally {
      setBusyIds((prev) => ({ ...prev, [authorId]: null }));
    }
  };

  const isFollowing = (authorId) => authUser?.following?.some((id) => String(id) === String(authorId));

  return (
    <div className="bookmarks-page-container">
      <div className="page-header-card">
        <h2>
          <FiBookmark className="bookmark-icon" /> Saved Posts
        </h2>
        <p>Posts you have bookmarked for later reading</p>
      </div>

      <div className="bookmarks-feed-column">
        {loading ? (
          <FeedSkeleton />
        ) : posts.length > 0 ? (
          posts.map((post) => (
            <PostCard
              key={post._id}
              post={post}
              user={authUser}
              isFollowing={isFollowing}
              onFollowToggle={handleFollowToggle}
              onToggleLike={toggleLike}
              onToggleBookmark={toggleBookmark}
              onToggleComments={toggleComments}
              onAddComment={addComment}
              expandedPostId={expandedCommentPostId}
              commentDrafts={commentDrafts}
              setCommentDrafts={setCommentDrafts}
              busyIds={busyIds}
              formatRelativeTime={formatRelativeTime}
            />
          ))
        ) : (
          <div className="page-card empty-state bookmarks-empty">
            <FiBookmark size={48} className="empty-bookmark-icon" />
            <h3>No saved posts yet</h3>
            <p>When you find something worth coming back to, bookmark it and it will appear here.</p>
            <Link to="/" className="primary-btn explore-btn">
              Explore Feed
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
