import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getLoginIdentifier, getTokenFromRequest } from '../utils/auth.js';

const router = express.Router();

const buildToken = (user) => jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

router.post('/register', async (req, res, next) => {
  try {
    const username = (req.body.username || '').trim().toLowerCase();
    const fullname = (req.body.fullname || '').trim();
    const email = (req.body.email || '').trim().toLowerCase();
    const password = req.body.password;

    if (!username || !fullname || !email || !password) {
      return res.status(400).json({ message: 'Please fill in all fields' });
    }

    const existing = await User.findOne({ $or: [{ email }, { username }] });
    if (existing) {
      return res.status(400).json({ message: 'User already exists' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ username, fullname, email, password: hashed });

    const token = buildToken(user);
    setAuthCookie(res, token);
    res.status(201).json({ user: { ...user.toObject(), password: undefined }, token });
  } catch (error) {
    next(error);
  }
});

router.post('/login', async (req, res, next) => {
  try {
    const identifier = getLoginIdentifier(req.body).trim().toLowerCase();
    const { password } = req.body;

    if (!identifier || !password) {
      return res.status(400).json({ message: 'Please provide an email or username and password' });
    }

    const user = await User.findOne({ $or: [{ email: identifier }, { username: identifier }] });
    if (!user) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      return res.status(400).json({ message: 'Invalid credentials' });
    }

    const token = buildToken(user);
    setAuthCookie(res, token);
    res.json({ user: { ...user.toObject(), password: undefined }, token });
  } catch (error) {
    next(error);
  }
});

router.post('/logout', (_req, res) => {
  res.clearCookie('token', { path: '/' });
  res.json({ success: true });
});

router.get('/me', async (req, res, next) => {
  try {
    const token = getTokenFromRequest(req);
    if (!token) return res.status(401).json({ message: 'Not authorized' });

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'devsecret');
    const userId = decoded.id || decoded._id;
    const user = await User.findById(userId).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json({ user });
  } catch (error) {
    next(error);
  }
});

export default router;
