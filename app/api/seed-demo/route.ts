import { NextResponse } from 'next/server';
import { connectDB } from '@/lib/mongodb';
import { User } from '@/lib/models/User';
import { FiatCard } from '@/lib/models/FiatCard';
import { buildDemoCards } from '@/lib/fixtures/demo-cards';


export async function POST(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 403 });
  }

  try {
    const { email } = await request.json();
    
    if (!email) {
      return NextResponse.json({ error: 'Email required' }, { status: 400 });
    }

    await connectDB();
    
    const user = await User.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const userId = user._id.toString();
    
    // Delete existing cards
    await FiatCard.deleteMany({ user_id: userId });
    
    // Seed new cards
    const cards = buildDemoCards(userId);
    await FiatCard.insertMany(cards);
    
    return NextResponse.json({ 
      message: 'Cards seeded successfully',
      userId,
      cardCount: cards.length 
    });
  } catch (error) {
    console.error('Seed error:', error);
    return NextResponse.json({ error: 'Failed to seed cards' }, { status: 500 });
  }
}
