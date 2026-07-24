import { useEffect, useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { FiPlus, FiTrendingUp, FiRefreshCw, FiPaperclip } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import FeedSkeleton from '../components/skeletons/FeedSkeleton';
import PostCard from '../components/PostCard';
import PostComposerModal from '../components/PostComposerModal';

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [initialLoading, setInitialLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [errorMore, setErrorMore] = useState(false);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);

  const [caption, setCaption] = useState('');
  const [suggested, setSuggested] = useState([]);
  const [busyIds, setBusyIds] = useState({});
  const [publishing, setPublishing] = useState(false);
  const [isComposerOpen, setIsComposerOpen] = useState(false);

  const { user, toggleFollow } = useAuth();
  const { addToast } = useToast();

  const [expandedCommentPostId, setExpandedCommentPostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  const isFetchingRef = useRef(false);
  const observerTargetRef = useRef(null);

  const formatRelativeTime = (dateString) => {
    if (!dateString) return 'Just now';
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

  const fetchPage = useCallback(
    async (targetPage, isInitial = false) => {
      if (isFetchingRef.current) return;
      isFetchingRef.current = true;

      if (isInitial) {
        setInitialLoading(true);
      } else {
        setLoadingMore(true);
        setErrorMore(false);
      }

      try {
        const res = await api.get(`/posts?page=${targetPage}&limit=6`);
        const fetchedPosts = res.data.posts || [];
        const totalPages = res.data.pages || 1;

        setPosts((prev) => {
          if (isInitial) return fetchedPosts;
          const existingIds = new Set(prev.map((p) => p._id));
          const uniqueNewPosts = fetchedPosts.filter((p) => !existingIds.has(p._id));
          return [...prev, ...uniqueNewPosts];
        });

        setPage(targetPage);
        setHasMore(targetPage < totalPages && fetchedPosts.length > 0);
      } catch {
        if (isInitial) {
          addToast('Unable to load home feed.', 'error');
        } else {
          setErrorMore(true);
        }
      } finally {
        isFetchingRef.current = false;
        if (isInitial) {
          setInitialLoading(false);
        } else {
          setLoadingMore(false);
        }
      }
    },
    [addToast]
  );

  useEffect(() => {
    fetchPage(1, true);
    loadSuggested();
  }, [fetchPage]);

  const loadSuggested = async () => {
    try {
      const res = await api.get('/search?q=a');
      setSuggested((res.data.users || []).slice(0, 4));
    } catch {
      // Quiet background failure
    }
  };

  // IntersectionObserver for infinite scrolling
  useEffect(() => {
    if (initialLoading || !hasMore || loadingMore || errorMore) return;

    const target = observerTargetRef.current;
    if (!target) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !isFetchingRef.current) {
          fetchPage(page + 1, false);
        }
      },
      { threshold: 0.1, rootMargin: '200px' }
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [initialLoading, hasMore, loadingMore, errorMore, page, fetchPage]);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!caption.trim() || publishing) return;
    setPublishing(true);
    try {
      const res = await api.post('/posts', {
        caption: caption.trim(),
      });
      setCaption('');
      addToast('Post published successfully.', 'success');
      if (res.data.post) {
        setPosts((prev) => [res.data.post, ...prev]);
      }
    } catch (err) {
      addToast(err.response?.data?.message || 'Unable to publish post.', 'error');
    } finally {
      setPublishing(false);
    }
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
      const updatedPost = res.data.post;
      if (updatedPost) {
        setPosts((prev) => prev.map((post) => (post._id === postId ? { ...post, comments: updatedPost.comments } : post)));
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
      const res = await toggleFollow(authorId);
      addToast(res.following ? 'User followed' : 'User unfollowed', 'success');
    } catch {
      addToast('Could not update follow status.', 'error');
    } finally {
      setBusyIds((prev) => ({ ...prev, [authorId]: null }));
    }
  };

  const isFollowing = (authorId) => user?.following?.includes(authorId);
  const toggleComments = (postId) => setExpandedCommentPostId((prev) => (prev === postId ? null : postId));

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  return (
    <div className="home-grid">
      <section className="feed-column">
        <div className="composer-card">
          <div className="composer-top">
            <img src={user?.avatar} alt="avatar" className="avatar" />
            <form onSubmit={handleCreatePost} className="composer-form">
              <input
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="What are you sharing today?"
              />
              <button
                type="button"
                className="ghost-btn attach-btn"
                onClick={() => setIsComposerOpen(true)}
                title="Add rich media, documents & tags"
              >
                <FiPaperclip size={18} />
              </button>
              <button type="submit" className="primary-btn" disabled={publishing || !caption.trim()} aria-busy={publishing}>
                {publishing ? (
                  <>
                    <LoadingSpinner size={14} className="white" /> Publishing...
                  </>
                ) : (
                  'Publish'
                )}
              </button>
            </form>
          </div>
        </div>

        {initialLoading ? (
          <FeedSkeleton />
        ) : (
          <>
            {posts.map((post) => (
              <PostCard
                key={post._id}
                post={post}
                user={user}
                isFollowing={isFollowing}
                onFollowToggle={handleFollowToggle}
                onToggleLike={toggleLike}
                onToggleBookmark={toggleBookmark}
                onToggleComments={toggleComments}
                onAddComment={addComment}
                onPostUpdated={handlePostUpdated}
                onPostDeleted={handlePostDeleted}
                expandedPostId={expandedCommentPostId}
                commentDrafts={commentDrafts}
                setCommentDrafts={setCommentDrafts}
                busyIds={busyIds}
                formatRelativeTime={formatRelativeTime}
              />
            ))}

            {/* Sentinel for IntersectionObserver */}
            <div ref={observerTargetRef} className="feed-bottom-sentinel" />

            {/* Infinite Scroll Loaders & Indicators */}
            {loadingMore && (
              <div className="feed-infinite-loader">
                <LoadingSpinner size={18} />
                <span>Loading more posts...</span>
              </div>
            )}

            {errorMore && (
              <div className="feed-infinite-error">
                <span>Unable to load more posts.</span>
                <button type="button" className="secondary-btn" onClick={() => fetchPage(page + 1, false)}>
                  <FiRefreshCw /> Retry
                </button>
              </div>
            )}

            {!hasMore && posts.length > 0 && (
              <div className="feed-infinite-end">
                <span>🎉 You've reached the end of the feed</span>
              </div>
            )}
          </>
        )}
      </section>

      <aside className="sidebar-column">
        <div className="card">
          <div className="card-title-row" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h3 style={{ margin: 0 }}>Trending</h3>
            <FiTrendingUp style={{ color: '#6366f1' }} />
          </div>
          <ul className="list" style={{ listStyle: 'none', padding: 0, margin: '12px 0 0 0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <li>#DesignSystems</li>
            <li>#AIProduct</li>
            <li>#CreatorEconomy</li>
          </ul>
        </div>

        <div className="card">
          <h3 style={{ margin: '0 0 12px 0' }}>Suggested creators</h3>
          {suggested.map((item) => (
            <Link key={item._id} to={`/profile/${item.username}`} className="user-row spaced">
              <img src={item.avatar} alt="avatar" className="avatar" />
              <div>
                <h4>{item.fullname}</h4>
                <p className="username">@{item.username}</p>
              </div>
            </Link>
          ))}
        </div>

        {/* Floating + FAB Button */}
        <button
          type="button"
          className="fab"
          aria-label="Create Post"
          onClick={() => setIsComposerOpen(true)}
          title="Create a new post"
        >
          <FiPlus size={24} />
        </button>
      </aside>

      {/* Rich Post Composer Modal */}
      <PostComposerModal
        isOpen={isComposerOpen}
        onClose={() => setIsComposerOpen(false)}
        onPostCreated={(newPost) => setPosts((prev) => [newPost, ...prev])}
      />
    </div>
  );
}
