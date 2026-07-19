import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { connectDB } from './config/db.js';
import User from './models/User.js';
import Post from './models/Post.js';

dotenv.config();

const seed = async () => {
  await connectDB();

  await User.deleteMany({ email: { $regex: 'demo@' } });
  await Post.deleteMany({ caption: { $regex: 'Demo' } });

  const users = [];
  for (let index = 0; index < 5; index += 1) {
    const username = `demo${index + 1}`;
    const email = `demo${index + 1}@example.com`;
    const password = await bcrypt.hash('password123', 10);
    const user = await User.create({
      username,
      fullname: `Demo User ${index + 1}`,
      email,
      password,
      bio: `Building a better community with NovaSocial ${index + 1}`,
      avatar: `https://i.pravatar.cc/150?img=${index + 1}`,
      cover: 'https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=1200&q=80',
      website: 'https://novasocial.dev',
    });
    users.push(user);
  }

  const posts = [];
  for (let index = 0; index < 10; index += 1) {
    const author = users[index % users.length];
    const post = await Post.create({
      author: author._id,
      image: 'https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80',
      caption: `Demo post ${index + 1} from ${author.username}`,
      location: 'San Francisco',
      likes: [users[(index + 1) % users.length]._id],
    });
    posts.push(post);
  }

  for (let index = 0; index < 15; index += 1) {
    const post = posts[index % posts.length];
    const author = users[index % users.length];
    await Post.findByIdAndUpdate(post._id, {
      $push: { comments: { author: author._id, text: `Demo comment ${index + 1}` } },
    });
  }

  for (let index = 0; index < users.length; index += 1) {
    const current = users[index];
    const target = users[(index + 1) % users.length];
    await User.findByIdAndUpdate(current._id, { $push: { following: target._id } });
    await User.findByIdAndUpdate(target._id, { $push: { followers: current._id } });
  }

  console.log('Seed completed successfully');
  process.exit(0);
};

seed().catch((error) => {
  console.error('Seed failed:', error.message);
  process.exit(1);
});
