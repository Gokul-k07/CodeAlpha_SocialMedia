import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { FiArrowLeft } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import FeedSkeleton from '../components/skeletons/FeedSkeleton';
import PostCard from '../components/PostCard';

export default function PostDetailPage() {
  const { id } = useParams();
  const { user: authUser, toggleFollow: authToggleFollow } = useAuth();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState({});
  const [expandedCommentPostId, setExpandedCommentPostId] = useState(id);
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

  const loadPost = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/posts/${id}`);
      setPost(res.data.post);
    } catch {
      addToast('Unable to load post.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPost();
    setExpandedCommentPostId(id);
  }, [id]);

  const toggleComments = (postId) => {
    setExpandedCommentPostId((prev) => (prev === postId ? null : postId));
  };

  const toggleLike = async (postId) => {
    if (busyIds[postId]) return;
    setBusyIds((prev) => ({ ...prev, [postId]: 'like' }));
    try {
      const res = await api.post(`/posts/${postId}/like`);
      const updated = res.data.post;
      if (updated) setPost(updated);
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
      addToast('Post saved', 'success');
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
      setPost(res.data.post);
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

  const isFollowing = (authorId) => authUser?.following?.includes(authorId);

  return (
    <div className="post-detail-column">
      <Link to="/" className="back-link">
        <FiArrowLeft /> Back to Feed
      </Link>
      {loading ? (
        <FeedSkeleton />
      ) : post ? (
        <PostCard
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
      ) : (
        <div className="page-card empty-state">Post not found.</div>
      )}
    </div>
  );
}
