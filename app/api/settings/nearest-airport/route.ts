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

  // Try Overpass API with retries
  const query = `
    [out:json][timeout:10];
    node["aeroway"="aerodrome"]["iata"](around:150000,${lat},${lng});
    out body 5;
  `

  let airports = null

  // Retry logic for Overpass API
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://overpass-api.de/api/interpreter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`,
      })

      if (res.ok) {
        const data = await res.json()
        if (data.elements?.length) {
          airports = data.elements as Array<{
            tags: { iata?: string; name?: string }
            lat: number
            lon: number
          }>
          break
        }
      } else {
        const errorText = await res.text()
        console.error(`Overpass API attempt ${attempt + 1} failed:`, res.status, errorText)
      }
    } catch (error) {
      console.error(`Overpass API attempt ${attempt + 1} network error:`, error)
    }

    // Wait before retry (exponential backoff)
    if (attempt < 2) {
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempt + 1)))
    }
  }

  if (!airports) {
    console.error('All Overpass API attempts failed, using fallback')
    // Fallback: Use a simple distance-based lookup from a hardcoded list of major airports
    // This is a limited fallback for when Overpass is unavailable
    const majorAirports = [
      { iata: 'DEL', name: 'Indira Gandhi International', lat: 28.5562, lng: 77.1000 },
      { iata: 'BOM', name: 'Chhatrapati Shivaji', lat: 19.0896, lng: 72.8656 },
      { iata: 'BLR', name: 'Kempegowda International', lat: 13.1986, lng: 77.7066 },
      { iata: 'MAA', name: 'Chennai International', lat: 12.9941, lng: 80.1709 },
      { iata: 'CCU', name: 'Netaji Subhas Chandra', lat: 22.6547, lng: 88.4467 },
      { iata: 'HYD', name: 'Rajiv Gandhi International', lat: 17.2403, lng: 78.4294 },
      { iata: 'COK', name: 'Cochin International', lat: 10.1520, lng: 76.4019 },
    ]

    const userLat = parseFloat(lat)
    const userLng = parseFloat(lng)

    // Find nearest major airport
    const nearest = majorAirports.reduce((closest, airport) => {
      const dist = Math.hypot(airport.lat - userLat, airport.lng - userLng)
      const closestDist = Math.hypot(closest.lat - userLat, closest.lng - userLng)
      return dist < closestDist ? airport : closest
    })

    return NextResponse.json({
      airport: {
        iata: nearest.iata,
        name: nearest.name,
      },
    })
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
