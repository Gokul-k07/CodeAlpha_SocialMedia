import mongoose from 'mongoose';

export const buildUserLookupQuery = (identifier) => {
  const trimmed = String(identifier || '').trim();
  if (!trimmed) return {};

  if (mongoose.Types.ObjectId.isValid(trimmed)) {
    return { _id: trimmed };
  }

  return {
    $or: [{ username: trimmed }, { email: trimmed }],
  };
};
