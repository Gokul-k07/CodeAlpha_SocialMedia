import { useEffect, useState, useRef } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import {
  FiX,
  FiMessageSquare,
  FiCamera,
  FiShare2,
  FiCopy,
  FiLogOut,
  FiSend,
  FiCheckCircle,
} from 'react-icons/fi';
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
  const { user: authUser, updateProfile, toggleFollow: authToggleFollow, logout } = useAuth();
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

  const [savingAvatar, setSavingAvatar] = useState(false);
  const [savingCover, setSavingCover] = useState(false);
  const [showShareMenu, setShowShareMenu] = useState(false);
  const [showShareMsgModal, setShowShareMsgModal] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [sharingMsg, setSharingMsg] = useState(false);

  const [followBusyIds, setFollowBusyIds] = useState({});
  const [postBusyIds, setPostBusyIds] = useState({});
  const [activeList, setActiveList] = useState(null);
  const [form, setForm] = useState({ bio: '', website: '' });
  const [expandedCommentPostId, setExpandedCommentPostId] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});

  const avatarInputRef = useRef(null);
  const coverInputRef = useRef(null);

  const { addToast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!showShareMenu) return;
    const handleClickOutside = () => setShowShareMenu(false);
    window.addEventListener('click', handleClickOutside);
    return () => window.removeEventListener('click', handleClickOutside);
  }, [showShareMenu]);

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
    const hours = Math.round(seconds / 60);
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
      setUser((prev) => (prev ? { ...prev, ...updated } : prev));
      setEditing(false);
      addToast('Profile updated.', 'success');
    } catch {
      addToast('Unable to update profile.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Avatar Image Upload Handler
  const handleAvatarUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Profile image must be smaller than 5MB.', 'error');
      return;
    }

    setSavingAvatar(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        try {
          const updated = await updateProfile({ avatar: dataUrl });
          setUser((prev) => (prev ? { ...prev, avatar: updated.avatar } : prev));
          addToast('Profile picture updated successfully!', 'success');
        } catch {
          addToast('Failed to update profile picture.', 'error');
        } finally {
          setSavingAvatar(false);
        }
      }
    };
    reader.readAsDataURL(file);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  // Cover Image Upload Handler
  const handleCoverUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      addToast('Please select a valid image file.', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      addToast('Cover background image must be smaller than 5MB.', 'error');
      return;
    }

    setSavingCover(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const dataUrl = event.target?.result;
      if (dataUrl) {
        try {
          const updated = await updateProfile({ cover: dataUrl });
          setUser((prev) => (prev ? { ...prev, cover: updated.cover } : prev));
          addToast('Cover background image updated successfully!', 'success');
        } catch {
          addToast('Failed to update cover background image.', 'error');
        } finally {
          setSavingCover(false);
        }
      }
    };
    reader.readAsDataURL(file);
    if (coverInputRef.current) coverInputRef.current.value = '';
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

  const handleCopyProfileLink = () => {
    setShowShareMenu(false);
    const profileUrl = `${window.location.origin}/profile/${user.username}`;
    navigator.clipboard.writeText(profileUrl);
    addToast('Profile link copied to clipboard!', 'success');
  };

  const handleOpenShareInMessageModal = async () => {
    setShowShareMenu(false);
    setShowShareMsgModal(true);
    try {
      const res = await api.get('/messages/conversations');
      setConversations(res.data.conversations || []);
    } catch {
      addToast('Unable to fetch conversation partners.', 'error');
    }
  };

  const handleSendProfileCardInMessage = async (targetPartnerId) => {
    if (sharingMsg) return;
    setSharingMsg(true);
    try {
      await api.post(`/messages/${targetPartnerId}`, {
        sharedProfile: user._id,
      });
      addToast(`Shared @${user.username}'s profile in chat!`, 'success');
      setShowShareMsgModal(false);
    } catch {
      addToast('Failed to share profile in message.', 'error');
    } finally {
      setSharingMsg(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    addToast('Logged out of GOsocial.', 'info');
    navigate('/login');
  };

  if (loading) return <ProfileSkeleton />;
  if (!user) return <div className="page-card">Unable to load profile.</div>;

  const followingCount = user.followingCount ?? user.following?.length ?? 0;
  const isOwnProfile = matchesId(user, authUserId);
  const isFollowing = authUser?.following?.some((followingId) => String(followingId) === String(user._id));
  const isFollowingUser = (authorId) => authUser?.following?.some((followingId) => String(followingId) === String(authorId));

  const handlePostUpdated = (updatedPost) => {
    setPosts((prev) => prev.map((p) => (p._id === updatedPost._id ? updatedPost : p)));
  };

  const handlePostDeleted = (deletedPostId) => {
    setPosts((prev) => prev.filter((p) => p._id !== deletedPostId));
    setPostCount((prev) => Math.max(0, prev - 1));
  };

  return (
    <div className="profile-feed-column">
      <div className="page-card profile-card">
        {/* Cover Background Image Container */}
        <div className="cover-container" style={{ position: 'relative' }}>
          <img src={user.cover} alt="cover" className="cover" />
          {isOwnProfile && (
            <>
              <button
                type="button"
                className="cover-upload-btn"
                onClick={() => coverInputRef.current?.click()}
                disabled={savingCover}
                title="Change Cover Image"
              >
                {savingCover ? <LoadingSpinner size={14} className="white" /> : <><FiCamera /> Edit Cover</>}
              </button>
              <input
                ref={coverInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleCoverUpload}
              />
            </>
          )}
        </div>

        <div className="profile-header">
          {/* Avatar Container with Upload Icon */}
          <div className="profile-avatar-wrapper" style={{ position: 'relative' }}>
            <img src={user.avatar} alt="avatar" className="profile-avatar" />
            {isOwnProfile && (
              <>
                <button
                  type="button"
                  className="avatar-upload-btn"
                  onClick={() => avatarInputRef.current?.click()}
                  disabled={savingAvatar}
                  title="Change Profile Picture"
                >
                  {savingAvatar ? <LoadingSpinner size={12} className="white" /> : <FiCamera size={14} />}
                </button>
                <input
                  ref={avatarInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={handleAvatarUpload}
                />
              </>
            )}
          </div>

          <div>
            <h2>{user.fullname}</h2>
            <p>@{user.username}</p>
          </div>

          {/* Action Area */}
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
            {!isOwnProfile ? (
              <>
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
              </>
            ) : (
              <>
                <button className="primary-btn" onClick={() => setEditing(!editing)}>
                  {editing ? 'Cancel' : 'Edit profile'}
                </button>
                <button type="button" className="ghost-btn logout-btn" onClick={handleLogout} title="Log out">
                  <FiLogOut />
                </button>
              </>
            )}

            {/* Profile Share Button */}
            <div className="options-dropdown-wrapper">
              <button
                type="button"
                className="secondary-btn icon-only-btn"
                onClick={(e) => {
                  e.stopPropagation();
                  setShowShareMenu((prev) => !prev);
                }}
                title="Share profile"
              >
                <FiShare2 />
              </button>

              {showShareMenu && (
                <div className="share-popover options-popover" onClick={(e) => e.stopPropagation()}>
                  <button type="button" className="share-popover-option" onClick={handleCopyProfileLink}>
                    <FiCopy /> Copy profile link
                  </button>
                  <button type="button" className="share-popover-option" onClick={handleOpenShareInMessageModal}>
                    <FiSend /> Share in message
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {editing ? (
          <div className="edit-box">
            <textarea value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Bio" />
            <input value={form.website} onChange={(e) => setForm({ ...form, website: e.target.value })} placeholder="Website URL" />
            <button className="primary-btn" onClick={saveProfile} disabled={saving} aria-busy={saving}>
              {saving ? <><LoadingSpinner size={14} /> Saving...</> : 'Save Profile'}
            </button>
          </div>
        ) : (
          <div className="profile-meta">
            <p>{user.bio}</p>
            {user.website ? (
              <a href={user.website} target="_blank" rel="noopener noreferrer">
                {user.website}
              </a>
            ) : null}
          </div>
        )}

        <div className="stats-row">
          <div>
            <strong>{postCount}</strong>
            <span>Posts</span>
          </div>
          <button type="button" className="stat-button" onClick={() => setActiveList('followers')}>
            <strong>{followersCount}</strong>
            <span>Followers</span>
          </button>
          <button type="button" className="stat-button" onClick={() => setActiveList('following')}>
            <strong>{followingCount}</strong>
            <span>Following</span>
          </button>
        </div>
      </div>

      {/* Profile Post Feed */}
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
            onPostUpdated={handlePostUpdated}
            onPostDeleted={handlePostDeleted}
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

      {/* Followers / Following Modal */}
      {activeList && (
        <div className="modal-backdrop" onClick={() => setActiveList(null)}>
          <div className="composer-modal-card" style={{ maxWidth: '420px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeList === 'followers' ? 'Followers' : 'Following'}</h3>
              <button type="button" className="modal-close" onClick={() => setActiveList(null)}>
                <FiX />
              </button>
            </div>
            <div className="search-results-picker" style={{ maxHeight: '400px', padding: '8px 4px' }}>
              {(() => {
                const listData = activeList === 'followers' ? (user.followers || []) : (user.following || []);
                if (!listData.length) {
                  return (
                    <p style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)' }}>
                      {activeList === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                    </p>
                  );
                }
                return listData.map((u) => {
                  const uId = u?._id || u;
                  const uUsername = u?.username || '';
                  const uFullname = u?.fullname || uUsername;
                  const uAvatar = u?.avatar || '';
                  if (!uUsername) return null;
                  return (
                    <div key={String(uId)} className="picker-row" onClick={() => { setActiveList(null); navigate(`/profile/${uUsername}`); }} style={{ cursor: 'pointer' }}>
                      <img src={uAvatar} alt="avatar" className="avatar" style={{ width: 40, height: 40 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <strong style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{uFullname}</strong>
                        <small style={{ color: 'var(--text-muted)' }}>@{uUsername}</small>
                      </div>
                      <Link
                        to={`/profile/${uUsername}`}
                        className="secondary-btn"
                        style={{ fontSize: '0.8rem', padding: '6px 12px' }}
                        onClick={(e) => { e.stopPropagation(); setActiveList(null); }}
                      >
                        View
                      </Link>
                    </div>
                  );
                });
              })()}
            </div>
          </div>
        </div>
      )}

      {/* Share Profile in Message Modal */}
      {showShareMsgModal && (
        <div className="modal-backdrop" onClick={() => setShowShareMsgModal(false)}>
          <div className="composer-modal-card" style={{ maxWidth: '460px' }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Share Profile in Chat</h3>
              <button type="button" className="modal-close" onClick={() => setShowShareMsgModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="composer-modal-form">
              <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-muted)' }}>
                Select a conversation partner to send @{user?.username}'s mini profile card to:
              </p>
              <div className="search-results-picker" style={{ maxHeight: '280px' }}>
                {conversations.length > 0 ? (
                  conversations.map((c) => (
                    <div
                      key={c._id}
                      className="picker-row"
                      onClick={() => handleSendProfileCardInMessage(c.partner?._id)}
                      style={{ cursor: sharingMsg ? 'not-allowed' : 'pointer' }}
                    >
                      <img src={c.partner?.avatar} alt="avatar" className="avatar" style={{ width: 36, height: 36 }} />
                      <div style={{ flex: 1 }}>
                        <strong>{c.partner?.fullname}</strong>
                        <small style={{ display: 'block', color: 'var(--text-muted)' }}>@{c.partner?.username}</small>
                      </div>
                      <FiSend style={{ color: '#6366f1' }} />
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
    </div>
  );
}
