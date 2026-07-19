import express from 'express';
import User from '../models/User.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

router.post('/:id', protect, async (req, res, next) => {
  try {
    const currentUserId = req.user.id;
    const targetUserId = req.params.id;
    const action = req.body?.action;

    if (currentUserId === targetUserId) {
      return res.status(400).json({ message: 'Cannot follow yourself' });
    }

    if (action && !['follow', 'unfollow'].includes(action)) {
      return res.status(400).json({ message: 'Invalid follow action' });
    }

    const [currentUser, targetUser] = await Promise.all([
      User.findById(currentUserId).select('following'),
      User.findById(targetUserId).select('followers'),
    ]);

    if (!currentUser) return res.status(404).json({ message: 'Current user not found' });
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const alreadyFollowing = currentUser.following.some((id) => id.toString() === targetUserId);
    const shouldFollow = action === 'follow' || (!action && !alreadyFollowing);

    if (shouldFollow) {
      await Promise.all([
        User.updateOne({ _id: currentUserId }, { $addToSet: { following: targetUser._id } }),
        User.updateOne({ _id: targetUserId }, { $addToSet: { followers: currentUser._id } }),
      ]);
    } else {
      await Promise.all([
        User.updateOne({ _id: currentUserId }, { $pull: { following: targetUser._id } }),
        User.updateOne({ _id: targetUserId }, { $pull: { followers: currentUser._id } }),
      ]);
    }

    const [updatedCurrentUser, updatedTargetUser] = await Promise.all([
      User.findById(currentUserId).select('following'),
      User.findById(targetUserId).select('followers'),
    ]);

    res.json({
      success: true,
      following: shouldFollow,
      followersCount: updatedTargetUser.followers.length,
      followingCount: updatedCurrentUser.following.length,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
