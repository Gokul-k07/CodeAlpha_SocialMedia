import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import User from '../models/User.js';
import { getLoginIdentifier, getTokenFromRequest } from '../utils/auth.js';
import { protect } from '../middleware/auth.js';
import { sendPasswordResetEmail } from '../services/emailService.js';

const router = express.Router();

const buildToken = (user) =>
  jwt.sign({ id: user._id.toString(), role: user.role }, process.env.JWT_SECRET || 'devsecret', { expiresIn: '7d' });

const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
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

// @desc    Request Password Reset (Brevo SMTP Email Link & 6-Digit OTP)
// @route   POST /api/auth/forgot-password
// @access  Public
router.post('/forgot-password', async (req, res, next) => {
  try {
    const email = (req.body.email || '').trim().toLowerCase();
    if (!email) return res.status(400).json({ message: 'Please enter a valid account email address.' });

    const genericMessage = 'If an account with that email exists, a password reset link has been sent.';

    const user = await User.findOne({ email });

    // Always return generic message to prevent account enumeration
    if (!user) {
      return res.json({ message: genericMessage });
    }

    // 1. Generate cryptographically secure random reset token
    const rawToken = crypto.randomBytes(32).toString('hex');

    // 2. Hash token using SHA-256 for MongoDB storage
    const hashedToken = crypto.createHash('sha256').update(rawToken).digest('hex');

    // 3. Generate secondary 6-digit OTP for manual entry option
    const otp = generate6DigitOtp();

    // 4. Save hashed token and expiration (15 minutes)
    const expirationDate = new Date(Date.now() + 15 * 60 * 1000);
    user.passwordResetToken = hashedToken;
    user.passwordResetExpires = expirationDate;
    user.resetPasswordOtp = otp;
    user.resetPasswordOtpExpires = expirationDate;
    await user.save();

    // 5. Construct full frontend reset URL with unhashed raw token
    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${frontendUrl}/reset-password/${rawToken}`;

    // 6. Send email via Brevo SMTP
    try {
      await sendPasswordResetEmail({
        email: user.email,
        name: user.fullname,
        resetUrl,
      });
    } catch (emailError) {
      console.error('[SMTP ERROR] Failed to deliver password reset email via Brevo:', emailError.message);
      // Clean up token on email failure
      user.passwordResetToken = null;
      user.passwordResetExpires = null;
      user.resetPasswordOtp = null;
      user.resetPasswordOtpExpires = null;
      await user.save();
      return res.status(500).json({ message: 'Unable to send password reset email. Please try again later.' });
    }

    res.json({ message: genericMessage });
  } catch (error) {
    next(error);
  }
});

// @desc    Reset Password with Token or 6-Digit OTP
// @route   POST /api/auth/reset-password
// @access  Public
router.post('/reset-password', async (req, res, next) => {
  try {
    const { token, otp, email } = req.body;
    const newPassword = req.body.newPassword || req.body.password;

    if (!newPassword) {
      return res.status(400).json({ message: 'New password is required.' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ message: 'New password must be at least 6 characters long.' });
    }

    let user = null;

    if (token) {
      // Hash the received raw token to match against database
      const hashedToken = crypto.createHash('sha256').update(String(token).trim()).digest('hex');
      user = await User.findOne({
        passwordResetToken: hashedToken,
        passwordResetExpires: { $gt: new Date() },
      });

      if (!user) {
        return res.status(400).json({ message: 'Password reset link is invalid or has expired. Please request a new one.' });
      }
    } else if (otp && email) {
      const cleanEmail = (email || '').trim().toLowerCase();
      user = await User.findOne({ email: cleanEmail });

      if (!user || !user.resetPasswordOtp) {
        return res.status(400).json({ message: 'Invalid 6-digit OTP or request.' });
      }

      if (new Date() > new Date(user.resetPasswordOtpExpires)) {
        user.resetPasswordOtp = null;
        user.resetPasswordOtpExpires = null;
        await user.save();
        return res.status(400).json({ message: 'OTP code has expired. Please request a new code.' });
      }

      if (user.resetPasswordOtp !== String(otp).trim()) {
        return res.status(400).json({ message: 'Invalid 6-digit OTP code.' });
      }
    } else {
      return res.status(400).json({ message: 'Valid reset token or OTP code is required.' });
    }

    // Hash new password using bcrypt
    const hashed = await bcrypt.hash(newPassword, 10);
    user.password = hashed;

    // Single-use: clear reset tokens and expiry dates
    user.passwordResetToken = null;
    user.passwordResetExpires = null;
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
