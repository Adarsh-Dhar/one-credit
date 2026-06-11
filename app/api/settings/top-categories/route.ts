import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'
import { connectDB } from '@/lib/mongodb'
import { Transaction } from '@/lib/models/Transaction'

const _VALID_CATEGORIES = [
  'dining',
  'groceries',
  'travel',
  'airlines',
  'gas',
  'streaming',
  'shopping',
  'luxury',
  'electronics',
  'apparel',
  'jewelry',
  'home',
  'health',
  'fitness',
  'education',
  'entertainment',
  'transportation',
  'utilities',
  'insurance',
  'professional_services',
  'other'
] as const
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
    { $group: { _id: '$category', txCount: { $sum: 1 }, totalSpend: { $sum: '$amountUsd' } } },
    { $sort: { txCount: -1, totalSpend: -1 } },
    { $limit: 5 },
  ])

  // Map raw category names to the valid enum values the profile schema accepts
  const categoryMap: Record<string, ValidCategory> = {
    // Dining
    grocery: 'groceries',
    groceries: 'groceries',
    supermarket: 'groceries',
    dining: 'dining',
    restaurant: 'dining',
    food: 'dining',
    cafe: 'dining',
    bar: 'dining',
    pub: 'dining',
    fast_food: 'dining',
    takeaway: 'dining',

    // Travel
    travel: 'travel',
    hotel: 'travel',
    accommodation: 'travel',
    lodging: 'travel',
    vacation: 'travel',
    tourism: 'travel',
    car_rental: 'travel',
    taxi: 'travel',
    uber: 'travel',
    lyft: 'travel',

    // Airlines
    airlines: 'airlines',
    flight: 'airlines',
    airline: 'airlines',
    airways: 'airlines',
    airport: 'airlines',
    goindigo: 'airlines',
    indigo: 'airlines',
    airindia: 'airlines',
    vistara: 'airlines',
    spicejet: 'airlines',
    makemytrip: 'airlines',
    cleartrip: 'airlines',
    yatra: 'airlines',
    expedia: 'airlines',
    booking: 'airlines',

    // Gas
    gas: 'gas',
    fuel: 'gas',
    petrol: 'gas',
    gasoline: 'gas',
    station: 'gas',
    shell: 'gas',
    bp: 'gas',
    chevron: 'gas',

    // Streaming & Entertainment
    streaming: 'streaming',
    netflix: 'streaming',
    spotify: 'streaming',
    disney: 'streaming',
    hulu: 'streaming',
    amazon_prime: 'streaming',
    apple_tv: 'streaming',
    youtube: 'streaming',
    entertainment: 'entertainment',
    movies: 'entertainment',
    cinema: 'entertainment',
    theater: 'entertainment',
    concert: 'entertainment',
    games: 'entertainment',
    gaming: 'entertainment',
    playstation: 'entertainment',
    xbox: 'entertainment',
    nintendo: 'entertainment',
    steam: 'entertainment',

    // Shopping
    shopping: 'shopping',
    retail: 'shopping',
    store: 'shopping',
    mall: 'shopping',
    amazon: 'shopping',
    walmart: 'shopping',
    target: 'shopping',
    ebay: 'shopping',
    etsy: 'shopping',
    online_shopping: 'shopping',
    e_commerce: 'shopping',

    // Luxury
    luxury: 'luxury',
    watches: 'luxury',
    watch: 'luxury',
    jewelry: 'jewelry',
    jewellery: 'jewelry',
    gems: 'jewelry',
    gold: 'jewelry',
    silver: 'jewelry',
    diamonds: 'jewelry',
    designer: 'luxury',
    boutique: 'luxury',
    high_end: 'luxury',
    premium: 'luxury',

    // Electronics
    electronics: 'electronics',
    tech: 'electronics',
    computer: 'electronics',
    laptop: 'electronics',
    phone: 'electronics',
    mobile: 'electronics',
    tablet: 'electronics',
    apple: 'electronics',
    samsung: 'electronics',
    sony: 'electronics',
    gadgets: 'electronics',
    appliances: 'electronics',

    // Apparel
    apparel: 'apparel',
    clothing: 'apparel',
    clothes: 'apparel',
    fashion: 'apparel',
    shoes: 'apparel',
    footwear: 'apparel',
    accessories: 'apparel',
    bags: 'apparel',
    handbags: 'apparel',
    luggage: 'apparel',

    // Home
    home: 'home',
    furniture: 'home',
    decor: 'home',
    home_improvement: 'home',
    hardware: 'home',
    garden: 'home',
    kitchen: 'home',
    bedding: 'home',
    bath: 'home',

    // Health
    health: 'health',
    medical: 'health',
    pharmacy: 'health',
    doctor: 'health',
    hospital: 'health',
    clinic: 'health',
    wellness: 'health',
    personal_care: 'health',

    // Fitness
    fitness: 'fitness',
    gym: 'fitness',
    workout: 'fitness',
    sports: 'fitness',
    exercise: 'fitness',
    yoga: 'fitness',
    pilates: 'fitness',

    // Education
    education: 'education',
    school: 'education',
    university: 'education',
    college: 'education',
    tuition: 'education',
    books: 'education',
    course: 'education',
    training: 'education',

    // Transportation
    transportation: 'transportation',
    transit: 'transportation',
    public_transport: 'transportation',
    metro: 'transportation',
    bus: 'transportation',
    train: 'transportation',
    subway: 'transportation',
    parking: 'transportation',

    // Utilities
    utilities: 'utilities',
    electricity: 'utilities',
    water: 'utilities',
    gas_bill: 'utilities',
    internet: 'utilities',
    phone_bill: 'utilities',
    mobile_bill: 'utilities',

    // Insurance
    insurance: 'insurance',
    car_insurance: 'insurance',
    health_insurance: 'insurance',
    life_insurance: 'insurance',
    home_insurance: 'insurance',

    // Professional Services
    professional_services: 'professional_services',
    legal: 'professional_services',
    lawyer: 'professional_services',
    accounting: 'professional_services',
    consulting: 'professional_services',
    business: 'professional_services',
    software: 'professional_services',
    subscription: 'professional_services',
    service: 'professional_services',
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
