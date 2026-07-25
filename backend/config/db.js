import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI || process.env.MONGO_URI;

  if (!uri) {
    throw new Error('Missing MongoDB connection string. Set MONGODB_URI in your environment.');
  }

  try {
    await mongoose.connect(uri);
    console.log('MongoDB connected successfully 💚🎉');
  } catch (error) {
    console.error('MongoDB connection failed:', error.message);
    throw error;
  }
};
