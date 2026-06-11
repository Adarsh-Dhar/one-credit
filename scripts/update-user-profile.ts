import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const UserSchema = new mongoose.Schema({
  email: { type: String, required: true },
  name: String,
  password: { type: String, select: false },
  settings: {
    preferredCurrency: { type: String, default: 'USD' },
    notifications: { type: Boolean, default: true },
  },
  portfolio: {
    cards: { type: mongoose.Schema.Types.Mixed, default: {} },
    lastSyncTime: Date,
  },
  profile: {
    homeAirport: String,
    homeAirportName: String,
    topSpendCategories: [{ type: String }],
    carryBalance: { type: String, enum: ['yes', 'sometimes', 'never'] },
  },
  geminiApiKey: String,
}, { timestamps: true });

const User = mongoose.models.User || mongoose.model('User', UserSchema);

async function updateUserProfile() {
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

    console.log('Current profile:', user.profile);

    // Update the profile to have the correct categories
    const updatedProfile = {
      ...user.profile,
      topSpendCategories: ['travel', 'other'], // Based on the transaction breakdown: 4 travel, 1 other
    };

    user.profile = updatedProfile;
    await user.save();

    console.log('Updated profile:', user.profile);

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error('Error updating profile:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

updateUserProfile();
