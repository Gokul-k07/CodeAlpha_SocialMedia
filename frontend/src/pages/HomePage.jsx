import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { FiHeart, FiMessageCircle, FiBookmark, FiSend, FiPlus, FiTrendingUp } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import FeedSkeleton from '../components/skeletons/FeedSkeleton';

export default function HomePage() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [caption, setCaption] = useState('');
  const [suggested, setSuggested] = useState([]);
  const [busyIds, setBusyIds] = useState({});
  const [publishing, setPublishing] = useState(false);
  const { user, toggleFollow } = useAuth();
  const { addToast } = useToast();

  const loadPosts = async () => {
    try {
      const res = await api.get('/posts');
      setPosts(res.data.posts);
    } catch {
      addToast('Unable to load the feed right now.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSuggested = async () => {
    try {
      const res = await api.get('/search?q=al');
      setSuggested(res.data.users.slice(0, 4));
    } catch {
      addToast('Unable to load suggested creators.', 'error');
    }
  };

  useEffect(() => {
    loadPosts();
    loadSuggested();
  }, []);

  const handleCreatePost = async (e) => {
    e.preventDefault();
    if (!caption.trim() || publishing) return;
    setPublishing(true);
    try {
      await api.post('/posts', { caption, image: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80' });
      setCaption('');
      addToast('Post published successfully.', 'success');
      await loadPosts();
    } catch {
      addToast('Unable to publish the post.', 'error');
    } finally {
      setPublishing(false);
    }
  };

  const toggleLike = async (postId) => {
    if (busyIds[postId]) return;
    setBusyIds((prev) => ({ ...prev, [postId]: 'like' }));
    try {
      await api.post(`/posts/${postId}/like`);
      await loadPosts();
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
      await loadPosts();
      addToast('Post saved', 'success');
    } catch {
      addToast('Unable to update bookmark.', 'error');
    } finally {
      setBusyIds((prev) => ({ ...prev, [postId]: null }));
    }
  };

  const addComment = async (postId, text) => {
    if (!text.trim() || busyIds[postId]) return;
    setBusyIds((prev) => ({ ...prev, [postId]: 'comment' }));
    try {
      await api.post(`/posts/${postId}/comment`, { text });
      await loadPosts();
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

  return (
    <div className="home-grid">
      <section className="feed-column">
        <div className="composer-card">
          <div className="composer-top">
            <img src={user?.avatar} alt="avatar" className="avatar" />
            <form onSubmit={handleCreatePost} className="composer-form">
              <input value={caption} onChange={(e) => setCaption(e.target.value)} placeholder="What are you sharing today?" />
              <button type="submit" className="primary-btn" disabled={publishing} aria-busy={publishing}>
                {publishing ? <><LoadingSpinner size={14} className="white" /> Publishing...</> : 'Publish'}
              </button>
            </form>
          </div>
        </div>

        {loading ? (
          <FeedSkeleton />
        ) : (
          posts.map((post) => (
            <article key={post._id} className="feed-card">
              <div className="post-header">
                <div className="user-row">
                  <img src={post.author?.avatar} alt="avatar" className="avatar" />
                  <div>
                    <h3><Link to={`/profile/${post.author?.username}`}>{post.author?.fullname}</Link></h3>
                    <p><Link to={`/profile/${post.author?.username}`}>@{post.author?.username}</Link></p>
                  </div>
                </div>
                {user?._id !== post.author?._id && (
                  <button
                    onClick={() => handleFollowToggle(post.author._id)}
                    className={isFollowing(post.author._id) ? 'secondary-btn' : 'accent-btn'}
                    disabled={busyIds[post.author._id] === 'follow'}
                    aria-busy={busyIds[post.author._id] === 'follow'}
                  >
                    {isFollowing(post.author._id) ? 'Unfollow' : 'Follow'}
                  </button>
                )}
              </div>
              <img src={post.image || 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=1200&q=80'} alt="post" className="post-image" />
              <div className="post-actions">
                <button onClick={() => toggleLike(post._id)} disabled={busyIds[post._id] === 'like'} aria-busy={busyIds[post._id] === 'like'}>
                  {busyIds[post._id] === 'like' ? <LoadingSpinner size={14} /> : <FiHeart />} {post.likes?.length || 0}
                </button>
                <button disabled><FiMessageCircle /> {post.comments?.length || 0}</button>
                <button onClick={() => toggleBookmark(post._id)} disabled={busyIds[post._id] === 'bookmark'} aria-busy={busyIds[post._id] === 'bookmark'}>
                  {busyIds[post._id] === 'bookmark' ? <LoadingSpinner size={14} /> : <FiBookmark />}
                </button>
                <button disabled><FiSend /></button>
              </div>
              <p className="caption">{post.caption}</p>
              <div className="comment-box">
                <input
                  placeholder="Add a comment"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') addComment(post._id, e.target.value);
                  }}
                  disabled={busyIds[post._id] === 'comment'}
                />
              </div>
            </article>
          ))
        )}
      </section>

      <aside className="sidebar-column">
        <div className="card">
          <div className="card-title-row">
            <h3>Trending</h3>
            <FiTrendingUp />
          </div>
          <ul className="list">
            <li>#DesignSystems</li>
            <li>#AIProduct</li>
            <li>#CreatorEconomy</li>
          </ul>
        </div>
        <div className="card">
          <h3>Suggested creators</h3>
          {suggested.map((item) => (
            <Link key={item._id} to={`/profile/${item.username}`} className="user-row spaced">
              <img src={item.avatar} alt="avatar" className="avatar" />
              <div>
                <h4>{item.fullname}</h4>
                <p>@{item.username}</p>
              </div>
            </Link>
          ))}
        </div>
        <button className="fab"><FiPlus /></button>
      </aside>
    </div>
  );
}
