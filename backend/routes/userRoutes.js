import express from 'express';
import User from '../models/User.js';
import Post from '../models/Post.js';
import { protect } from '../middleware/auth.js';
import { buildUserLookupQuery } from '../utils/userLookup.js';
import { attachPostCount } from '../utils/profile.js';

const router = express.Router();

router.get('/me', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('-password').populate('followers', 'username fullname avatar').populate('following', 'username fullname avatar');
    const postCount = await Post.countDocuments({ author: req.user.id });
    res.json({ user: attachPostCount(user.toObject(), postCount) });
  } catch (error) {
    next(error);
  }
});

router.get('/:identifier', async (req, res, next) => {
  try {
    const query = buildUserLookupQuery(req.params.identifier);
    const user = await User.findOne(query)
      .select('-password')
      .populate('followers', 'username fullname avatar')
      .populate('following', 'username fullname avatar');

    if (!user) return res.status(404).json({ message: 'User not found' });
    const postCount = await Post.countDocuments({ author: user._id });
    res.json({ user: attachPostCount(user.toObject(), postCount) });
  } catch (error) {
    next(error);
  }
});

router.put('/profile', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    const allowed = ['fullname', 'bio', 'website', 'avatar', 'cover'];
    allowed.forEach((field) => {
      if (req.body[field] !== undefined) user[field] = req.body[field];
    });
    await user.save();
    res.json({ user: { ...user.toObject(), password: undefined } });
  } catch (error) {
    next(error);
  }
});

export default router;
