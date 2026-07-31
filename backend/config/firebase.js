/**
 * Firebase Admin SDK Initialization
 *
 * IMPORTANT — ESM IMPORT HOISTING:
 * In Node.js ESM ("type":"module"), ALL import statements are statically hoisted
 * and evaluated BEFORE any line of the importing module's body runs — including
 * dotenv.config(). This means if we call initFirebaseAdmin() at module load time,
 * process.env.FIREBASE_SERVICE_ACCOUNT has NOT been populated yet.
 *
 * FIX: Use LAZY initialization. The Admin SDK is only initialized on the FIRST
 * call to getFirebaseAuth(). By that point, dotenv.config() has already run in
 * server.js and all env vars are available.
 */

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

// Internal cache — set on first successful init
let _firebaseAuth = null;
let _initialized = false;

/**
 * Returns the Firebase Auth instance, initializing on first call.
 * This defers reading process.env until AFTER dotenv.config() has run.
 */
function getFirebaseAuth() {
  if (_initialized) return _firebaseAuth;
  _initialized = true;

  // If already initialized by another module, reuse
  if (getApps().length > 0) {
    _firebaseAuth = getAuth();
    console.log('[Firebase Admin] Reusing existing app instance.');
    return _firebaseAuth;
  }

  const serviceAccountEnv = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (!serviceAccountEnv || serviceAccountEnv.trim() === '') {
    console.warn(
      '[Firebase Admin] FIREBASE_SERVICE_ACCOUNT is not set. ' +
        'Firebase authentication is unavailable. ' +
        'Local email/password login works normally.'
    );
    return null;
  }

  try {
    const serviceAccount =
      typeof serviceAccountEnv === 'string'
        ? JSON.parse(serviceAccountEnv)
        : serviceAccountEnv;

    const app = initializeApp({ credential: cert(serviceAccount) });
    _firebaseAuth = getAuth(app);
    console.log(
      `[Firebase Admin] Initialized for project: ${serviceAccount.project_id}`
    );
    return _firebaseAuth;
  } catch (err) {
    console.error('[Firebase Admin] Initialization failed:', err.message);
    console.error('[Firebase Admin] Check that FIREBASE_SERVICE_ACCOUNT is valid JSON and belongs to the same project as the frontend VITE_FIREBASE_PROJECT_ID.');
    return null;
  }
}

/**
 * Verify a Firebase ID Token server-side.
 * Lazy-initializes the Admin SDK on first call.
 *
 * @param {string} idToken - The raw Firebase ID token from the frontend
 * @returns {Promise<DecodedIdToken>} Decoded token payload
 * @throws {Error} If Admin SDK is not configured or token is invalid
 */
export const verifyFirebaseToken = async (idToken) => {
  const firebaseAuth = getFirebaseAuth();

  if (!firebaseAuth) {
    throw new Error(
      'Firebase Admin SDK is not configured. ' +
        'Add FIREBASE_SERVICE_ACCOUNT (service account JSON) to backend/.env.'
    );
  }

  // checkRevoked=false: avoids an extra network round-trip to Google's
  // revocation endpoint. Tokens expire in 1 hour anyway.
  return firebaseAuth.verifyIdToken(idToken, false);
};
