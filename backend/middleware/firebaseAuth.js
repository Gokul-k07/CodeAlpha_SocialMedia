/**
 * Firebase Auth Middleware & Helpers
 *
 * verifyFirebaseToken  — verifies Firebase ID token server-side
 * findOrCreateMongoUser — finds existing MongoDB user or creates new one
 * buildAppToken         — issues the existing application JWT
 */

import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import User from '../models/User.js';
import { verifyFirebaseToken } from '../config/firebase.js';

// ── Reuse the same JWT builder used by the rest of the app ──────────────────
export const buildAppToken = (user) =>
  jwt.sign(
    { id: user._id.toString(), role: user.role },
    process.env.JWT_SECRET || 'devsecret',
    { expiresIn: '7d' }
  );

// ── Set the http-only auth cookie (same settings as existing routes) ─────────
export const setAuthCookie = (res, token) => {
  const isProd = process.env.NODE_ENV === 'production';
  res.cookie('token', token, {
    httpOnly: true,
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
    path: '/',
    maxAge: 1000 * 60 * 60 * 24 * 7,
  });
};

/**
 * Generate a deterministic, URL-safe username from an email address.
 * Appends a short random suffix to avoid collisions.
 */
const generateUsername = (email = '') => {
  const base = email
    .split('@')[0]
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .slice(0, 20);
  const suffix = crypto.randomBytes(3).toString('hex'); // 6 hex chars
  return `${base}_${suffix}`;
};

/**
 * Given a decoded Firebase ID token, find the matching MongoDB user.
 * If no user exists yet, create one using the Firebase profile data.
 *
 * Lookup priority:
 *   1. firebaseUid (most reliable, won't change)
 *   2. email       (fallback for existing local users linking Firebase)
 */
export const findOrCreateMongoUser = async (decoded) => {
  const { uid, email, name, picture, email_verified, firebase } = decoded;

  // Determine provider (google.com → 'google', password → 'firebase', etc.)
  const rawProvider = firebase?.sign_in_provider || 'firebase';
  const provider = rawProvider.includes('google') ? 'google' : 'firebase';

  // ── 1. Try lookup by firebaseUid ─────────────────────────────────────────
  let user = await User.findOne({ firebaseUid: uid });

  if (user) {
    // Update last login + sync email_verified flag
    user.lastLogin = new Date();
    user.emailVerified = email_verified || false;
    await user.save();
    return user;
  }

  // ── 2. Try lookup by email (existing local user linking Firebase) ─────────
  if (email) {
    user = await User.findOne({ email: email.toLowerCase() });
    if (user) {
      // Link existing local account to Firebase
      user.firebaseUid = uid;
      user.provider = user.provider === 'local' ? 'local' : provider; // keep local if already local
      user.emailVerified = email_verified || false;
      user.lastLogin = new Date();
      if (picture && !user.avatar.includes('unsplash')) {
        user.avatar = picture;
      }
      await user.save();
      return user;
    }
  }

  // ── 3. Create new MongoDB user from Firebase profile ─────────────────────
  const username = await generateUniqueUsername(email || uid);
  const fullname = name || email?.split('@')[0] || 'GOsocial User';

  // Firebase users don't have a local password.
  // We store a random unusable hash so existing validation doesn't break.
  const unusablePasswordHash = await bcrypt.hash(crypto.randomBytes(32).toString('hex'), 10);

  user = await User.create({
    username,
    fullname,
    email: email ? email.toLowerCase() : `firebase_${uid}@noemail.gosocial`,
    password: unusablePasswordHash,
    avatar: picture || undefined,
    provider,
    firebaseUid: uid,
    emailVerified: email_verified || false,
    lastLogin: new Date(),
  });

  return user;
};

/**
 * Generates a unique username, retrying with new suffixes on collision.
 */
async function generateUniqueUsername(seed, attempts = 0) {
  if (attempts > 10) throw new Error('Failed to generate a unique username.');
  const candidate = generateUsername(seed);
  const exists = await User.findOne({ username: candidate });
  if (!exists) return candidate;
  return generateUniqueUsername(seed + attempts, attempts + 1);
}

/**
 * Express middleware — verifies a Firebase ID token from the Authorization header.
 * Sets req.mongoUser on success and calls next().
 *
 * Usage: router.post('/firebase', verifyFirebaseMiddleware, handler)
 * NOT used on existing JWT-protected routes — those keep using protect().
 */
export const verifyFirebaseMiddleware = async (req, res, next) => {
  const authHeader = req.headers.authorization || '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) {
    console.warn('[Firebase Middleware] No Authorization header or Bearer token found.');
    return res.status(401).json({ message: 'Firebase ID token is required.' });
  }

  try {
    console.log('[Firebase Middleware] Verifying token (first 20 chars):', idToken.slice(0, 20) + '...');
    const decoded = await verifyFirebaseToken(idToken);
    console.log('[Firebase Middleware] Token verified OK. uid:', decoded.uid, '| email:', decoded.email, '| email_verified:', decoded.email_verified, '| provider:', decoded.firebase?.sign_in_provider);
    req.firebaseDecoded = decoded;
    next();
  } catch (err) {
    // Print the FULL error so we can diagnose exactly why verifyIdToken() failed.
    // Common codes: auth/id-token-expired | auth/argument-error | auth/project-not-found
    console.error('[Firebase Middleware] verifyIdToken FAILED:');
    console.error('  code   :', err.code || '(no code)');
    console.error('  message:', err.message);
    console.error('  stack  :', err.stack?.split('\n')[1] || '');
    return res.status(401).json({
      message: 'Invalid or expired Firebase token.',
      // Include the Firebase error code in dev so the frontend can surface it
      ...(process.env.NODE_ENV !== 'production' && { firebaseCode: err.code, detail: err.message }),
    });
  }
};
