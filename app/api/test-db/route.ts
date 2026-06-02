import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';

export async function GET() {
  try {
    console.log('Testing MongoDB connection...');
    await connectDB();
    console.log('MongoDB connected successfully');

    const userCount = await User.countDocuments();
    console.log('User count:', userCount);

    const users = await User.find().select('email name').limit(5);
    console.log('Sample users:', users.map(u => ({ email: u.email, name: u.name })));

    return NextResponse.json({
      status: 'success',
      message: 'MongoDB connection successful',
      userCount,
      users: users.map(u => ({ email: u.email, name: u.name, hasPassword: !!u.password })),
    });
  } catch (error) {
    console.error('MongoDB connection error:', error);
    return NextResponse.json({
      status: 'error',
      message: 'MongoDB connection failed',
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 });
  }
}
