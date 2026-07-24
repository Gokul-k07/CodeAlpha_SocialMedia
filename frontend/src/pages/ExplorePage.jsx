import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { FiSearch, FiUser, FiGrid, FiHash, FiLayers } from 'react-icons/fi';
import api from '../services/api';
import PostCard from '../components/PostCard';
import FeedSkeleton from '../components/skeletons/FeedSkeleton';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';

export default function ExplorePage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const initialQuery = searchParams.get('q') || '';
  const initialTab = searchParams.get('type') || 'all';

  const [query, setQuery] = useState(initialQuery);
  const [activeTab, setActiveTab] = useState(initialTab); // 'all' | 'profiles' | 'posts' | 'hashtags'
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [busyIds, setBusyIds] = useState({});
  const [expandedCommentPostId, setExpandedCommentPostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  const { user, toggleFollow } = useAuth();
  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchExploreData(query);
  }, [activeTab]);

  const fetchExploreData = async (searchQuery = '') => {
    setLoading(true);
    try {
      if (!searchQuery.trim()) {
        // Default Explore Feed
        const res = await api.get('/posts?limit=12');
        setPosts(res.data.posts || []);

        const usersRes = await api.get('/search?q=a');
        setUsers(usersRes.data.users || []);
      } else {
        const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);
        setUsers(res.data.users || []);
        setPosts(res.data.posts || []);
      }
    } catch {
      addToast('Unable to fetch explore items.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    setSearchParams({ q: query.trim(), type: activeTab });
    fetchExploreData(query.trim());
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
        setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, comments: updatedPost.comments } : p)));
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

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
  };

  const isFollowing = (authorId) => user?.following?.includes(authorId);
  const toggleComments = (postId) => setExpandedCommentPostId((prev) => (prev === postId ? null : postId));

  const filteredPosts = posts.filter((p) => {
    if (activeTab === 'hashtags') {
      return p.caption?.toLowerCase().includes('#') || p.hashtags?.length > 0;
    }
    return true;
  });

  return (
    <div className="explore-page-container">
      {/* Integrated Explore Header with Search */}
      <div className="explore-header-card">
        <h2>Explore NovaSocial</h2>
        <form onSubmit={handleSearchSubmit} className="explore-search-bar">
          <FiSearch className="search-icon" size={20} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search #hashtags, @creators, or keywords..."
          />
          <button type="submit" className="primary-btn search-btn">
            Search
          </button>
        </form>

        {/* Category Filters */}
        <div className="explore-filter-tabs">
          <button
            type="button"
            className={`filter-tab ${activeTab === 'all' ? 'active' : ''}`}
            onClick={() => setActiveTab('all')}
          >
            <FiLayers /> All
          </button>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'profiles' ? 'active' : ''}`}
            onClick={() => setActiveTab('profiles')}
          >
            <FiUser /> Profiles
          </button>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'posts' ? 'active' : ''}`}
            onClick={() => setActiveTab('posts')}
          >
            <FiGrid /> Posts
          </button>
          <button
            type="button"
            className={`filter-tab ${activeTab === 'hashtags' ? 'active' : ''}`}
            onClick={() => setActiveTab('hashtags')}
          >
            <FiHash /> Hashtags
          </button>
        </div>
      </div>

      {loading ? (
        <FeedSkeleton />
      ) : (
        <div className="explore-content-grid">
          {/* User Profiles Result Section */}
          {(activeTab === 'all' || activeTab === 'profiles') && users.length > 0 && (
            <section className="explore-profiles-section">
              <h3>Creators & Profiles</h3>
              <div className="explore-profiles-grid">
                {users.map((u) => (
                  <div key={u._id} className="explore-profile-card">
                    <img src={u.avatar} alt="avatar" className="avatar" />
                    <div className="profile-info">
                      <h4>
                        <Link to={`/profile/${u.username}`}>{u.fullname}</Link>
                      </h4>
                      <p>@{u.username}</p>
                      {u.bio && <small>{u.bio.substring(0, 40)}...</small>}
                    </div>
                    <button
                      type="button"
                      className={isFollowing(u._id) ? 'secondary-btn' : 'primary-btn'}
                      onClick={() => handleFollowToggle(u._id)}
                    >
                      {isFollowing(u._id) ? 'Unfollow' : 'Follow'}
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Posts Result Section */}
          {(activeTab === 'all' || activeTab === 'posts' || activeTab === 'hashtags') && (
            <section className="explore-posts-section">
              {filteredPosts.length > 0 ? (
                filteredPosts.map((post) => (
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
                    formatRelativeTime={(d) => new Date(d).toLocaleDateString()}
                  />
                ))
              ) : (
                <div className="page-card empty-state">No matching posts found. Try searching for a different keyword or #hashtag.</div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}
