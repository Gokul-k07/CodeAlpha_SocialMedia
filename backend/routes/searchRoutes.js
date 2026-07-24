import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const query = (req.query.q || '').trim();
    if (!query) return res.json({ users: [], posts: [] });

    // Clean hashtag keyword (e.g. "#world" -> "world", "trending" -> "trending")
    const cleanTag = query.replace(/^#/, '').toLowerCase();
    const cleanUsername = query.replace(/^@/, '');

    const users = await User.find({
      $or: [
        { username: { $regex: cleanUsername, $options: 'i' } },
        { fullname: { $regex: query, $options: 'i' } },
      ],
    })
      .select('-password')
      .limit(10);

    const posts = await Post.find({
      $or: [
        { hashtags: { $in: [cleanTag] } },
        { caption: { $regex: query, $options: 'i' } },
      ],
    })
      .sort({ createdAt: -1 })
      .limit(15)
      .populate('author', 'username fullname avatar bio')
      .populate('comments.author', 'username fullname avatar');

    res.json({ users, posts });
  } catch (error) {
    next(error);
  }
});

export default router;
