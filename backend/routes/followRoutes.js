import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/:id', protect, async (req, res, next) => {
  try {
    if (req.user.id === req.params.id) return res.status(400).json({ message: 'Cannot follow yourself' });

    const currentUser = await User.findById(req.user.id);
    const targetUser = await User.findById(req.params.id);

    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const alreadyFollowing = currentUser.following.some((id) => id.toString() === req.params.id);
    if (alreadyFollowing) {
      currentUser.following = currentUser.following.filter((id) => id.toString() !== req.params.id);
      targetUser.followers = targetUser.followers.filter((id) => id.toString() !== req.user.id);
    } else {
      currentUser.following.push(targetUser._id);
      targetUser.followers.push(currentUser._id);
    }

    await currentUser.save();
    await targetUser.save();
    res.json({ success: true, following: !alreadyFollowing });
  } catch (error) {
    next(error);
  }
});

export default router;
