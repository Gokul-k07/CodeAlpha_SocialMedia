import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FiX, FiMessageSquare } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import FeedSkeleton from '../components/skeletons/FeedSkeleton';
import ProfileSkeleton from '../components/skeletons/ProfileSkeleton';
import PostCard from '../components/PostCard';

const getEntityId = (entity) => entity?._id || entity;

const matchesId = (entity, id) => String(getEntityId(entity)) === String(id);

export default function ProfilePage() {
  const { username } = useParams();
  const { user: authUser, updateProfile, toggleFollow: authToggleFollow } = useAuth();
  const authUserId = authUser?._id;
  const authUsername = authUser?.username;
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [postCount, setPostCount] = useState(0);
  const [followersCount, setFollowersCount] = useState(0);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [postsLoading, setPostsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [followBusyIds, setFollowBusyIds] = useState({});
  const [postBusyIds, setPostBusyIds] = useState({});
  const [activeList, setActiveList] = useState(null);
  const [form, setForm] = useState({ bio: '', website: '' });
  const [expandedCommentPostId, setExpandedCommentPostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const { addToast } = useToast();

  const toggleComments = (postId) => {
    setExpandedCommentPostId((prev) => (prev === postId ? null : postId));
  };

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

  const loadProfilePosts = async (profileId, showSkeleton = false) => {
    if (!profileId) return;
    if (showSkeleton) setPostsLoading(true);
    try {
      const res = await api.get(`/posts?author=${profileId}&limit=50`);
      const sortedPosts = [...(res.data.posts || [])].sort((first, second) => new Date(second.createdAt) - new Date(first.createdAt));
      setPosts(sortedPosts);
      setPostCount(res.data.total ?? sortedPosts.length);
    } catch {
      addToast('Unable to load profile posts.', 'error');
    } finally {
      if (showSkeleton) setPostsLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const id = username && username !== 'me' ? username : authUsername || authUserId;
        const res = await api.get(`/users/${id}`);
        const profile = res.data.user;
        setUser(profile);
        setPostCount(profile.postCount || 0);
        setFollowersCount(profile.followersCount ?? profile.followers?.length ?? 0);
        setForm({ bio: profile.bio || '', website: profile.website || '' });
        await loadProfilePosts(profile._id, true);
      } catch {
        addToast('Unable to load profile.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, authUserId, authUsername]);

  const saveProfile = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await updateProfile(form);
      setUser((prev) => prev ? { ...prev, ...updated } : prev);
      setEditing(false);
      addToast('Profile updated.', 'success');
    } catch {
      addToast('Unable to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleFollowToggle = async (userId, userFullname) => {
    if (followBusyIds[userId]) return;
    setFollowBusyIds((prev) => ({ ...prev, [userId]: true }));
    try {
      await authToggleFollow(userId);
      const isNowFollowing = authUser?.following?.some((followingId) => String(followingId) === String(userId));
      if (matchesId(user, userId)) {
        setFollowersCount((current) => current + (isNowFollowing ? -1 : 1));
      }
      addToast(isNowFollowing ? `Unfollowed @${userFullname || 'user'}` : `Following @${userFullname || 'user'}`, 'success');
    } catch {
      addToast('Unable to update follow status', 'error');
    } finally {
      setFollowBusyIds((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const toggleLike = async (postId) => {
    if (postBusyIds[postId]) return;
    setPostBusyIds((prev) => ({ ...prev, [postId]: 'like' }));
    try {
      const res = await api.post(`/posts/${postId}/like`);
      const updatedPost = res.data.post;
      if (updatedPost) {
        setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, likes: updatedPost.likes } : p)));
      } else {
        await loadProfilePosts(user?._id);
      }
      addToast('Post liked', 'success');
    } catch {
      addToast('Unable to update like state.', 'error');
    } finally {
      setPostBusyIds((prev) => ({ ...prev, [postId]: null }));
    }
  };

  const toggleBookmark = async (postId) => {
    if (postBusyIds[postId]) return;
    setPostBusyIds((prev) => ({ ...prev, [postId]: 'bookmark' }));
    try {
      await api.post(`/posts/${postId}/bookmark`);
      addToast('Post saved', 'success');
    } catch {
      addToast('Unable to update bookmark.', 'error');
    } finally {
      setPostBusyIds((prev) => ({ ...prev, [postId]: null }));
    }
  };

  const addComment = async (postId) => {
    const text = (commentDrafts[postId] || '').trim();
    if (!text || postBusyIds[postId]) return;
    setPostBusyIds((prev) => ({ ...prev, [postId]: 'comment' }));
    try {
      const res = await api.post(`/posts/${postId}/comment`, { text });
      const updatedPost = res.data.post;
      setPosts((prev) => prev.map((p) => (p._id === postId ? { ...p, comments: updatedPost.comments } : p)));
      setCommentDrafts((prev) => ({ ...prev, [postId]: '' }));
      addToast('Comment added', 'success');
    } catch {
      addToast('Unable to add comment.', 'error');
    } finally {
      setPostBusyIds((prev) => ({ ...prev, [postId]: null }));
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (!user) return <div className="page-card">Unable to load profile.</div>;

  const followingCount = user.followingCount ?? user.following?.length ?? 0;
  const isOwnProfile = matchesId(user, authUserId);
  const isFollowing = authUser?.following?.some((followingId) => String(followingId) === String(user._id));
  const isFollowingUser = (authorId) => authUser?.following?.some((followingId) => String(followingId) === String(authorId));
  const activeUsers = activeList === 'followers' ? user.followers || [] : user.following || [];
  const activeTitle = activeList === 'followers' ? 'Followers' : 'Following';

  return (
    <div className="profile-feed-column">
      <div className="page-card profile-card">
        <img src={user.cover} alt="cover" className="cover" />
        <div className="profile-header">
          <img src={user.avatar} alt="avatar" className="profile-avatar" />
          <div>
            <h2>{user.fullname}</h2>
            <p>@{user.username}</p>
          </div>
          {!isOwnProfile ? (
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                className={isFollowing ? 'secondary-btn' : 'primary-btn'}
                onClick={() => handleFollowToggle(user._id, user.username)}
                disabled={!!followBusyIds[user._id]}
                aria-busy={!!followBusyIds[user._id]}
              >
                {!!followBusyIds[user._id] ? <><LoadingSpinner size={14} /> Loading...</> : isFollowing ? 'Unfollow' : 'Follow'}
              </button>
              <Link to={`/messages/${user._id}`} className="secondary-btn" style={{ display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
                <FiMessageSquare /> Message
              </Link>
            </div>
          ) : (
            <button className="primary-btn" onClick={() => setEditing(!editing)}>{editing ? 'Cancel' : 'Edit profile'}</button>
          )}
        </div>
        {editing ? (
          <div className="edit-box">
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} />
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website" />
            <button className="primary-btn" onClick={saveProfile} disabled={saving} aria-busy={saving}>
              {saving ? <><LoadingSpinner size={14} /> Saving...</> : 'Save'}
            </button>
          </div>
        ) : (
          <div className="profile-meta">
            <p>{user.bio}</p>
            {user.website ? <a href={user.website} target="_blank" rel="noopener noreferrer">{user.website}</a> : null}
          </div>
        )}
        <div className="stats-row">
          <div><strong>{postCount}</strong><span>Posts</span></div>
          <button type="button" className="stat-button" onClick={() => setActiveList('followers')}>
            <strong>{followersCount}</strong><span>Followers</span>
          </button>
          <button type="button" className="stat-button" onClick={() => setActiveList('following')}>
            <strong>{followingCount}</strong><span>Following</span>
          </button>
        </div>
      </div>

      {postsLoading ? (
        <FeedSkeleton />
      ) : posts.length ? (
        posts.map((post) => (
          <PostCard
            key={post._id}
            post={post}
            user={authUser}
            isFollowing={isFollowingUser}
            onFollowToggle={(authorId) => handleFollowToggle(authorId, post.author?.username)}
            onToggleLike={toggleLike}
            onToggleBookmark={toggleBookmark}
            onToggleComments={toggleComments}
            onAddComment={addComment}
            expandedPostId={expandedCommentPostId}
            commentDrafts={commentDrafts}
            setCommentDrafts={setCommentDrafts}
            busyIds={postBusyIds}
            formatRelativeTime={formatRelativeTime}
          />
        ))
      ) : (
        <div className="page-card empty-state">No posts yet.</div>
      )}

      {activeList ? (
        <div className="modal-backdrop" onClick={() => setActiveList(null)}>
          <div className="profile-list-modal" role="dialog" aria-modal="true" aria-label={activeTitle} onClick={(event) => event.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeTitle}</h3>
              <button type="button" className="modal-close" onClick={() => setActiveList(null)} aria-label="Close">
                <FiX />
              </button>
            </div>
            <div className="modal-list">
              {activeUsers.length ? activeUsers.map((person) => (
                <div key={getEntityId(person)} className="user-row spaced">
                  <Link to={`/profile/${person.username}`} className="user-row" onClick={() => setActiveList(null)}>
                    <img src={person.avatar} alt="avatar" className="avatar" />
                    <div>
                      <h4>{person.fullname}</h4>
                      <p>@{person.username}</p>
                    </div>
                  </Link>
                  {authUser?._id !== person._id && (
                     <button
                      onClick={() => handleFollowToggle(person._id, person.username)}
                      className={authUser?.following?.some((followingId) => String(followingId) === String(person._id)) ? 'secondary-btn' : 'accent-btn'}
                      disabled={!!followBusyIds[person._id]}
                      aria-busy={!!followBusyIds[person._id]}
                    >
                      {authUser?.following?.some((followingId) => String(followingId) === String(person._id)) ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
              )) : <div className="empty-state">No users to show.</div>}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
