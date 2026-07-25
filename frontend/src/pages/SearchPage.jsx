import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { FiSearch, FiX, FiRefreshCw } from 'react-icons/fi';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../components/ToastProvider';
import UserCardSkeleton from '../components/skeletons/UserCardSkeleton';
import LoadingSpinner from '../components/LoadingSpinner';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [followBusyIds, setFollowBusyIds] = useState({});

  const { user: authUser, toggleFollow: authToggleFollow } = useAuth();
  const { addToast } = useToast();

  const searchDebounceRef = useRef(null);
  const activeRequestIdRef = useRef(0);

  const performSearch = async (searchQuery, requestId) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    setError(false);

    try {
      const res = await api.get(`/search?q=${encodeURIComponent(searchQuery)}`);

      // Prevent stale response from overwriting newer query results
      if (requestId === activeRequestIdRef.current) {
        setResults(res.data.users || []);
      }
    } catch {
      if (requestId === activeRequestIdRef.current) {
        setError(true);
        addToast('Unable to complete search right now.', 'error');
      }
    } finally {
      if (requestId === activeRequestIdRef.current) {
        setLoading(false);
      }
    }
  };

  const handleInputChange = (val) => {
    setQuery(val);
    const newRequestId = activeRequestIdRef.current + 1;
    activeRequestIdRef.current = newRequestId;

    if (searchDebounceRef.current) {
      clearTimeout(searchDebounceRef.current);
    }

    if (!val.trim()) {
      setResults([]);
      setLoading(false);
      setError(false);
      return;
    }

    setLoading(true);
    searchDebounceRef.current = setTimeout(() => {
      performSearch(val.trim(), newRequestId);
    }, 300);
  };

  const handleClear = () => {
    setQuery('');
    setResults([]);
    setLoading(false);
    setError(false);
    activeRequestIdRef.current += 1;
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
  };

  const handleFollowToggle = async (userId, username) => {
    if (followBusyIds[userId]) return;
    setFollowBusyIds((prev) => ({ ...prev, [userId]: true }));
    try {
      const res = await authToggleFollow(userId);
      addToast(res.following ? `Following @${username}` : `Unfollowed @${username}`, 'success');
    } catch {
      addToast('Could not update follow status.', 'error');
    } finally {
      setFollowBusyIds((prev) => ({ ...prev, [userId]: false }));
    }
  };

  const isFollowing = (userId) => authUser?.following?.some((id) => String(id) === String(userId));

  return (
    <div className="search-page-container">
      <div className="page-header-card">
        <h2>
          <FiSearch className="search-header-icon" /> Search Creators
        </h2>
        <p>Find and connect with creators on GOsocial</p>

        <div className="search-input-wrapper">
          <FiSearch className="search-left-icon" />
          <input
            type="text"
            className="search-input-field"
            value={query}
            onChange={(e) => handleInputChange(e.target.value)}
            placeholder="Search by username or display name..."
            aria-label="Search users by name or username"
            autoFocus
          />
          {query && (
            <button type="button" className="search-clear-btn" onClick={handleClear} aria-label="Clear search">
              <FiX />
            </button>
          )}
        </div>
      </div>

      <div className="search-results-section">
        {loading ? (
          <UserCardSkeleton />
        ) : error ? (
          <div className="page-card search-empty-state">
            <p>Something went wrong while searching.</p>
            <button
              type="button"
              className="secondary-btn"
              onClick={() => performSearch(query.trim(), activeRequestIdRef.current)}
            >
              <FiRefreshCw /> Retry Search
            </button>
          </div>
        ) : !query.trim() ? (
          <div className="page-card search-empty-state">
            <FiSearch size={40} className="empty-search-icon" />
            <h3>Search GOsocial Creators</h3>
            <p>Enter a username or display name above to discover creators and profiles.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="page-card search-empty-state">
            <h3>No users found</h3>
            <p>No creators matched "{query}". Try searching with a different username or name.</p>
          </div>
        ) : (
          <div className="search-results-grid">
            {results.map((person) => {
              const isSelf = authUser?._id === person._id;
              const following = isFollowing(person._id);
              const busy = !!followBusyIds[person._id];

              return (
                <div key={person._id} className="search-user-card">
                  <Link to={`/profile/${person.username}`} className="search-user-info">
                    <img src={person.avatar} alt="avatar" className="avatar" />
                    <div className="user-details">
                      <h4>{person.fullname}</h4>
                      <p className="username">@{person.username}</p>
                      {person.bio && <p className="bio-snippet">{person.bio}</p>}
                    </div>
                  </Link>

                  {!isSelf && (
                    <button
                      type="button"
                      className={following ? 'secondary-btn' : 'primary-btn'}
                      onClick={() => handleFollowToggle(person._id, person.username)}
                      disabled={busy}
                      aria-busy={busy}
                    >
                      {busy ? <LoadingSpinner size={14} /> : following ? 'Unfollow' : 'Follow'}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
