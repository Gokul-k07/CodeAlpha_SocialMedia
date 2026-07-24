import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { getLoginIdentifier, getTokenFromRequest } from '../utils/auth.js';
import { protect } from '../middleware/auth.js';

const router = express.Router();

const buildToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });

const setAuthCookie = (res, token) => {
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

const generate6DigitOtp = () => Math.floor(100000 + Math.random() * 900000).toString();

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

    // Two-Factor Authentication Check
    if (user.isTwoFactorEnabled) {
      const otp = generate6DigitOtp();
      user.twoFactorOtp = otp;
      user.twoFactorOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
      await user.save();

      // Secure OTP log for environment / SMTP delivery
      console.log(`[SECURITY 2FA OTP] Sent 2FA OTP to ${user.email}: ${otp}`);

      return res.json({
        requireTwoFactor: true,
        email: user.email,
        message: 'A 6-digit 2FA verification code has been sent to your email.',
      });
    }

    const token = buildToken(user);
    setAuthCookie(res, token);
    res.json({ user: { ...user.toObject(), password: undefined }, token });
  } catch (error) {
    next(error);
  }
});

// @desc    Verify 2FA OTP during Login
// @route   POST /api/auth/verify-2fa-login
// @access  Public
router.post('/verify-2fa-login', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp = (req.body.otp || '').trim();

    if (!email || !otp) {
      return res.status(400).json({ message: 'Email and 6-digit OTP are required.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.twoFactorOtp) {
      return res.status(400).json({ message: 'Invalid 2FA request or expired code.' });
    }

    if (new Date() > new Date(user.twoFactorOtpExpires)) {
      user.twoFactorOtp = null;
      user.twoFactorOtpExpires = null;
      await user.save();
      return res.status(400).json({ message: '2FA verification code has expired. Please log in again.' });
    }

    if (user.twoFactorOtp !== otp) {
      return res.status(400).json({ message: 'Invalid 6-digit 2FA verification code.' });
    }

    // Clear 2FA OTP after successful verification
    user.twoFactorOtp = null;
    user.twoFactorOtpExpires = null;
    await user.save();

    const token = buildToken(user);
    setAuthCookie(res, token);
    res.json({ user: { ...user.toObject(), password: undefined }, token });
  } catch (error) {
    next(error);
  }
});

// @desc    Toggle 2FA Status in Settings
// @route   POST /api/auth/2fa/toggle
// @access  Private
router.post('/2fa/toggle', protect, async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const enable = req.body.enable;
    if (enable) {
      const otp = generate6DigitOtp();
      user.twoFactorOtp = otp;
      user.twoFactorOtpExpires = new Date(Date.now() + 10 * 60 * 1000);
      await user.save();

      console.log(`[SECURITY 2FA TOGGLE OTP] Sent 2FA Setup OTP to ${user.email}: ${otp}`);
      return res.json({
        requireVerification: true,
        message: 'A 6-digit setup code has been sent to your email to confirm 2FA enablement.',
      });
    } else {
      user.isTwoFactorEnabled = false;
      user.twoFactorOtp = null;
      user.twoFactorOtpExpires = null;
      await user.save();
      return res.json({ isTwoFactorEnabled: false, message: 'Two-Factor Authentication has been disabled.' });
    }
  } catch (error) {
    next(error);
  }
});

// @desc    Confirm 2FA Enablement OTP
// @route   POST /api/auth/2fa/confirm
// @access  Private
router.post('/2fa/confirm', protect, async (req, res, next) => {
  try {
    const { otp } = req.body;
    const user = await User.findById(req.user.id);

    if (!user || !user.twoFactorOtp) {
      return res.status(400).json({ message: 'No 2FA setup request found.' });
    }

    if (new Date() > new Date(user.twoFactorOtpExpires)) {
      user.twoFactorOtp = null;
      user.twoFactorOtpExpires = null;
      await user.save();
      return res.status(400).json({ message: 'Setup OTP code expired.' });
    }

    if (user.twoFactorOtp !== String(otp).trim()) {
      return res.status(400).json({ message: 'Invalid 6-digit OTP code.' });
    }

    user.isTwoFactorEnabled = true;
    user.twoFactorOtp = null;
    user.twoFactorOtpExpires = null;
    await user.save();

    res.json({ isTwoFactorEnabled: true, message: 'Two-Factor Authentication is now active on your account.' });
  } catch (error) {
    next(error);
  }
});

// @desc    Request Password Reset 6-Digit OTP
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Please enter your account email address.' });

    const user = await User.findOne({ email });
    if (!user) {
      // Return neutral response to prevent account enumeration attacks
      return res.json({ message: 'If an account exists for that email, a 6-digit OTP code has been sent.' });
    }

    const otp = generate6DigitOtp();
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    console.log(`[SECURITY PASSWORD RESET OTP] Sent Password Reset OTP to ${email}: ${otp}`);

    res.json({ message: 'If an account exists for that email, a 6-digit OTP code has been sent.' });
  } catch (error) {
    next(error);
  }
});

// @desc    Reset Password with 6-Digit OTP
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    const otp = (req.body.otp || '').trim();
    const newPassword = req.body.newPassword;

    if (!email || !otp || !newPassword) {
      return res.status(400).json({ message: 'Email, 6-digit OTP, and new password are required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    const user = await User.findOne({ email });
    if (!user || !user.resetPasswordOtp) {
      return res.status(400).json({ message: 'Invalid request or expired OTP code.' });
    }

    if (new Date() > new Date(user.resetPasswordOtpExpires)) {
      user.resetPasswordOtp = null;
      user.resetPasswordOtpExpires = null;
      await user.save();
      return res.status(400).json({ message: 'OTP code has expired. Please request a new code.' });
    }

    if (user.resetPasswordOtp !== otp) {
      return res.status(400).json({ message: 'Invalid 6-digit OTP code.' });
    }

    // Hash new password and clear OTP immediately
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;
    user.resetPasswordOtp = null;
    user.resetPasswordOtpExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password has been reset successfully. Please sign in with your new password.' });
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
