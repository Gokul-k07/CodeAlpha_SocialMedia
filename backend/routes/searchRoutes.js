import express from 'express';
import User from '../models/User.js';

const router = express.Router();

router.get('/', async (req, res, next) => {
  try {
    const query = req.query.q || '';
    if (!query.trim()) return res.json({ users: [] });

    const users = await User.find({
      $or: [
        { username: { $regex: query, $options: 'i' } },
        { fullname: { $regex: query, $options: 'i' } },
      ],
    }).select('-password').limit(8);

    res.json({ users });
  } catch (error) {
    next(error);
  }
});

export default router;
