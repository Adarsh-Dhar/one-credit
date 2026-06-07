import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/app/api/auth/[...nextauth]/route'

// Uses the free open-source Overpass API (OpenStreetMap) — no API key needed
export async function GET(request: NextRequest) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { searchParams } = new URL(request.url)
  const lat = searchParams.get('lat')
  const lng = searchParams.get('lng')

  if (!lat || !lng) {
    return NextResponse.json({ error: 'lat and lng required' }, { status: 400 })
  }

  // Overpass query: find aerodrome nodes within 150km, sorted by distance
  const query = `
    [out:json][timeout:10];
    node["aeroway"="aerodrome"]["iata"](around:150000,${lat},${lng});
    out body 5;
  `

  const res = await fetch('https://overpass-api.de/api/interpreter', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `data=${encodeURIComponent(query)}`,
  })

  if (!res.ok) {
    return NextResponse.json({ error: 'Airport lookup failed' }, { status: 502 })
  }

  const data = await res.json()
  const airports = data.elements as Array<{
    tags: { iata?: string; name?: string }
    lat: number
    lon: number
  }>

  if (!airports.length) {
    return NextResponse.json({ airport: null })
  }

  // Sort by distance from user (Overpass doesn't guarantee order)
  const userLat = parseFloat(lat)
  const userLng = parseFloat(lng)

  airports.sort((a, b) => {
    const distA = Math.hypot(a.lat - userLat, a.lon - userLng)
    const distB = Math.hypot(b.lat - userLat, b.lon - userLng)
    return distA - distB
  })

  const nearest = airports[0]
  return NextResponse.json({
    airport: {
      iata: nearest.tags.iata,
      name: nearest.tags.name,
    },
  })
}
