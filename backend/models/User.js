import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, trim: true },
    fullname: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, trim: true },
    // Optional for Firebase/Google users — they have no local password.
    // Existing local users keep their hashed password as before.
    password: { type: String, default: null },
    bio: { type: String, default: 'Building something special on NovaSocial ✨' },
    avatar: { type: String, default: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80' },
    cover: { type: String, default: 'https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=1200&q=80' },
    website: { type: String, default: '' },
    followers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    following: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    bookmarks: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Post' }],
    isTwoFactorEnabled: { type: Boolean, default: false },
    twoFactorOtp: { type: String, default: null },
    twoFactorOtpExpires: { type: Date, default: null },
    resetPasswordOtp: { type: String, default: null },
    resetPasswordOtpExpires: { type: Date, default: null },
    passwordResetToken: { type: String, default: null },
    passwordResetExpires: { type: Date, default: null },
    whoCanMessageMe: { type: String, enum: ['anyone', 'followers'], default: 'anyone' },
    whoCanFollowMe: { type: String, enum: ['anyone', 'approval'], default: 'anyone' },
    emailNotifications: { type: Boolean, default: true },

    // ── Firebase / OAuth fields ────────────────────────────────────────────
    // provider: 'local' for email+password, 'firebase' for email (Firebase),
    //           'google' for Google Sign-In
    provider: { type: String, enum: ['local', 'firebase', 'google'], default: 'local' },
    // Unique Firebase UID — indexed as unique+sparse (sparse allows multiple null values
    // so existing local users without a firebaseUid don't conflict).
    firebaseUid: { type: String, default: null },
    emailVerified: { type: Boolean, default: false },
    lastLogin: { type: Date, default: null },
  },
  { timestamps: true }
);

// Sparse unique index on firebaseUid — allows multiple null values
userSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true });

export default mongoose.model('User', userSchema);
