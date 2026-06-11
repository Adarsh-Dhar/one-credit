import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  geminiApiKey: { type: String },
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function checkProfile() {
  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI not found in environment variables');
    }

    await mongoose.connect(mongoUri);

    const email = 'dharadarsh0@gmail.com';

    const user = await User.findOne({ email });
    if (!user) {
      console.log('No user found for email:', email);
      return;
    }

    console.log('User profile:', {
      email: user.email,
      hasGeminiApiKey: !!user.geminiApiKey,
    });

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error checking profile:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

checkProfile();
