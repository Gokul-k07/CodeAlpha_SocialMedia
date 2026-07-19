import express from 'express';
import Post from '../models/Post.js';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';
import { buildUserLookupQuery } from '../utils/userLookup.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 8;
    const author = String(req.query.author || '').trim();
    const filter = {};

    if (author) {
      const authorUser = await User.findOne(buildUserLookupQuery(author)).select('_id');
      if (!authorUser) {
        return res.json({ posts: [], total: 0, page, pages: 0 });
      }
      filter.author = authorUser._id;
    }

    const posts = await Post.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate('author', 'username fullname avatar bio')
      .populate('comments.author', 'username fullname avatar');

    const total = await Post.countDocuments(filter);
    res.json({ posts, total, page, pages: Math.ceil(total / limit) });
  } catch (error) {
    next(error);
  }
});

router.post('/', protect, async (req, res, next) => {
  try {
    const post = await Post.create({ ...req.body, author: req.user.id });
    const populated = await Post.findById(post._id).populate('author', 'username fullname avatar bio');
    res.status(201).json({ post: populated });
  } catch (error) {
    next(error);
  }
});

router.put('/:id', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });

    Object.assign(post, req.body);
    await post.save();
    res.json({ post });
  } catch (error) {
    next(error);
  }
});

router.delete('/:id', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (post.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });
    await post.deleteOne();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/like', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const hasLiked = post.likes.includes(req.user.id);
    if (hasLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.user.id);
    } else {
      post.likes.push(req.user.id);
    }

    await post.save();
    res.json({ post });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/comment', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    post.comments.push({ author: req.user.id, text: req.body.text });
    await post.save();
    const populated = await Post.findById(post._id).populate('comments.author', 'username fullname avatar');
    res.status(201).json({ post: populated });
  } catch (error) {
    next(error);
  }
});

router.delete('/:postId/comments/:commentId', protect, async (req, res, next) => {
  try {
    const post = await Post.findById(req.params.postId);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    const comment = post.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (comment.author.toString() !== req.user.id) return res.status(403).json({ message: 'Not allowed' });
    comment.deleteOne();
    await post.save();
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/:id/bookmark', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const bookmarked = user.bookmarks.some((id) => id.toString() === req.params.id);
    if (bookmarked) {
      user.bookmarks = user.bookmarks.filter((id) => id.toString() !== req.params.id);
    } else {
      user.bookmarks.push(req.params.id);
    }
    await user.save();
    res.json({ bookmarks: user.bookmarks });
  } catch (error) {
    next(error);
  }
});

export default router;
