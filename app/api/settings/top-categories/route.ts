import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Transaction } from '@/lib/models/Transaction'

const _VALID_CATEGORIES = ['dining', 'groceries', 'travel', 'gas', 'streaming', 'other'] as const
type ValidCategory = typeof _VALID_CATEGORIES[number]

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  await connectDB()

  // Aggregate total spend per category for this user
  const result = await Transaction.aggregate([
    { $match: { userId: session.user.id, type: 'spend' } },
    { $group: { _id: '$category', totalSpend: { $sum: '$amountUsd' } } },
    { $sort: { totalSpend: -1 } },
    { $limit: 5 },
  ])

  // Map raw category names to the valid enum values the profile schema accepts
  const categoryMap: Record<string, ValidCategory> = {
    grocery: 'groceries',
    groceries: 'groceries',
    dining: 'dining',
    restaurant: 'dining',
    food: 'dining',
    travel: 'travel',
    flight: 'travel',
    hotel: 'travel',
    gas: 'gas',
    fuel: 'gas',
    streaming: 'streaming',
    entertainment: 'streaming',
  }

  const topCategories: ValidCategory[] = []
  for (const row of result) {
    const mapped = categoryMap[row._id?.toLowerCase()] ?? 'other'
    if (!topCategories.includes(mapped)) {
      topCategories.push(mapped)
    }
    if (topCategories.length === 2) {
break
}
  }

  return NextResponse.json({ topCategories })
}
