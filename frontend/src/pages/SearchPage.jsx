import { useMemo, useState } from 'react';
import api from '../services/api';
import { useToast } from '../components/ToastProvider';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const { addToast } = useToast();

  const debouncedQuery = useMemo(() => query, [query]);

  const handleSearch = async (value) => {
    setQuery(value);
    if (!value.trim()) {
      setResults([]);
      return;
    }
    try {
      const res = await api.get(`/search?q=${value}`);
      setResults(res.data.users);
    } catch {
      addToast('Unable to search right now.', 'error');
    }
  };

  return (
    <div className="page-card">
      <h2>Search creators</h2>
      <input className="search-input" value={query} onChange={(e) => handleSearch(e.target.value)} placeholder="Search by username or name" />
      <div className="results-list">
        {results.map((user) => (
          <div key={user._id} className="user-row spaced">
            <img src={user.avatar} alt="avatar" className="avatar" />
            <div>
              <h4>{user.fullname}</h4>
              <p>@{user.username}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
