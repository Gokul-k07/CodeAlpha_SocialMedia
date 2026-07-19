import { useEffect, useState } from 'react';
import api from '../services/api';

export default function ExplorePage() {
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    api.get('/posts').then((res) => setPosts(res.data.posts));
  }, []);

  return (
    <div className="page-card">
      <h2>Explore the latest</h2>
      <div className="grid-cards">
        {posts.map((post) => (
          <div key={post._id} className="mini-card">
            <img src={post.image} alt="explore" />
            <p>{post.caption}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
