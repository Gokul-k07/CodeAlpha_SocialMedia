import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import LoadingSpinner from '../components/LoadingSpinner';
import ProfileSkeleton from '../components/skeletons/ProfileSkeleton';

export default function ProfilePage() {
  const { username } = useParams();
  const { user: authUser, updateProfile } = useAuth();
  const [user, setUser] = useState(null);
  const [editing, setEditing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followBusy, setFollowBusy] = useState(false);
  const [form, setForm] = useState({ bio: '', website: '' });
  const { addToast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const id = username && username !== 'me' ? username : authUser?.username || authUser?._id;
        const res = await api.get(`/users/${id}`);
        const profile = res.data.user;
        setUser(profile);
        setFollowing(Boolean(profile.followers?.some((follower) => follower?._id === authUser?._id || follower === authUser?._id)));
        setForm({ bio: profile.bio || '', website: profile.website || '' });
      } catch {
        addToast('Unable to load profile.', 'error');
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [username, authUser, addToast]);

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

  const toggleFollow = async () => {
    if (!user || followBusy) return;
    setFollowBusy(true);
    try {
      const res = await api.post(`/follow/${user._id}`);
      const nextFollowing = res.data.following;
      setFollowing(nextFollowing);
      setUser((prev) => prev ? {
        ...prev,
        followers: nextFollowing
          ? [...(prev.followers || []), { _id: authUser?._id }]
          : (prev.followers || []).filter((follower) => follower?._id !== authUser?._id && follower !== authUser?._id),
      } : prev);
      addToast(nextFollowing ? `Following @${user.username}` : `Unfollowed @${user.username}`, 'success');
    } catch {
      addToast('Unable to follow user', 'error');
    } finally {
      setFollowBusy(false);
    }
  };

  if (loading) return <ProfileSkeleton />;
  if (!user) return <div className="page-card">Unable to load profile.</div>;

  return (
    <div className="page-card profile-card">
      <img src={user.cover} alt="cover" className="cover" />
      <div className="profile-header">
        <img src={user.avatar} alt="avatar" className="profile-avatar" />
        <div>
          <h2>{user.fullname}</h2>
          <p>@{user.username}</p>
        </div>
        {authUser?._id !== user._id ? (
          <button className="primary-btn" onClick={toggleFollow} disabled={followBusy} aria-busy={followBusy}>
            {followBusy ? <><LoadingSpinner size={14} /> {following ? 'Unfollowing...' : 'Following...'}</> : following ? 'Following' : 'Follow'}
          </button>
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
        <div><strong>{user.followers?.length || 0}</strong><span>Followers</span></div>
        <div><strong>{user.following?.length || 0}</strong><span>Following</span></div>
        <div><strong>{user.posts?.length || user.postCount || 0}</strong><span>Posts</span></div>
      </div>
    </div>
  );
}
