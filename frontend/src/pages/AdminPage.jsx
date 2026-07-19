import { useEffect, useState } from 'react';
import api from '../services/api';

export default function AdminPage() {
  const [stats, setStats] = useState({ users: 0, posts: 0 });
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const load = async () => {
      const res = await api.get('/admin/stats');
      setStats(res.data.stats);
      const usersRes = await api.get('/admin/users');
      setUsers(usersRes.data.users);
    };
    load();
  }, []);

  return (
    <div className="page-card">
      <h2>Admin console</h2>
      <div className="stats-row">
        <div><strong>{stats.users}</strong><span>Users</span></div>
        <div><strong>{stats.posts}</strong><span>Posts</span></div>
      </div>
      <div className="results-list">
        {users.map((user) => (
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
