/**
 * Firebase Web SDK Initialization & Auth Helpers
 *
 * This file is the ONLY place Firebase is imported in the frontend.
 * All other files import from here — never directly from 'firebase/auth'.
 *
 * HOW TO CONFIGURE:
 *   1. Go to Firebase Console → Project Settings → Your apps → Web app
 *   2. Copy your firebaseConfig object
 *   3. Set each value in frontend/.env (VITE_FIREBASE_*)
 */

import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  signOut,
  onAuthStateChanged,
  reload,
} from 'firebase/auth';

// ── Config loaded from env vars (never hardcode credentials) ─────────────────
const firebaseConfig = {
  apiKey:             import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain:         import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId:          import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket:      import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId:  import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId:              import.meta.env.VITE_FIREBASE_APP_ID,
};

// Only initialize once (Vite HMR can re-execute this module)
const firebaseApp = getApps().length === 0
  ? initializeApp(firebaseConfig)
  : getApps()[0];

export const auth = getAuth(firebaseApp);

// ── Google Provider ───────────────────────────────────────────────────────────
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Sign in with Google popup.
 * Returns the Firebase UserCredential.
 */
export const signInWithGoogle = () => signInWithPopup(auth, googleProvider);

/**
 * Sign in an existing Firebase Email/Password user.
 */
export const signInWithEmailFirebase = (email, password) =>
  signInWithEmailAndPassword(auth, email, password);

/**
 * Register a new Firebase Email/Password user.
 * Does NOT send verification email automatically — call sendFirebaseVerificationEmail().
 */
export const registerWithEmailFirebase = (email, password) =>
  createUserWithEmailAndPassword(auth, email, password);

/**
 * Send Firebase email verification to the currently signed-in Firebase user.
 */
export const sendFirebaseVerificationEmail = async () => {
  const currentUser = auth.currentUser;
  if (currentUser && !currentUser.emailVerified) {
    await sendEmailVerification(currentUser, {
      url: `${window.location.origin}/auth`,
    });
  }
};

/**
 * Reload the current Firebase user and return their emailVerified status.
 */
export const reloadFirebaseUser = async () => {
  const currentUser = auth.currentUser;
  if (!currentUser) return false;
  await reload(currentUser);
  return auth.currentUser?.emailVerified || false;
};

/**
 * Sign out from Firebase (called alongside the backend /auth/logout).
 */
export const signOutFirebase = () => signOut(auth);

/**
 * Subscribe to Firebase auth state changes.
 * Returns an unsubscribe function.
 */
export const onFirebaseAuthStateChanged = (callback) =>
  onAuthStateChanged(auth, callback);

/**
 * Get the current Firebase ID token for backend verification.
 * Pass forceRefresh=true to ensure token is fresh.
 */
export const getFirebaseIdToken = async (forceRefresh = false) => {
  const currentUser = auth.currentUser;
  if (!currentUser) return null;
  return currentUser.getIdToken(forceRefresh);
};

export default firebaseApp;
