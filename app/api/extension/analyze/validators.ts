// Request validation and rate limiting for the analyze endpoint
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { ratelimit } from '@/lib/rateLimit'

const AnalyzeSchema = z.object({
  product: z.object({
    name: z.string().max(500),
    price: z.number().positive().max(1_000_000),
    url: z.string().url().optional(),
    source: z.string().max(50).optional(),
    website: z.string().max(255).optional(),
  }),
  userId: z.string().max(100),
})

export async function validateRequestAndApiKey(request: NextRequest, getEnv: () => any): Promise<
  { success: true; data: { product: z.infer<typeof AnalyzeSchema>['product']; userId: string }; env: ReturnType<typeof getEnv> } |
  { success: false; response: NextResponse }
> {
  const env = getEnv()
  const apiKey = env.GOOGLE_API_KEY
  if (!apiKey) {
    return { success: false, response: NextResponse.json({ error: 'GOOGLE_API_KEY not set on server' }, { status: 500 }) }
  }

  const parsed = AnalyzeSchema.safeParse(await request.json())
  if (!parsed.success) {
    return { success: false, response: NextResponse.json({ error: parsed.error.flatten() }, { status: 400 }) }
  }

  const { product, userId } = parsed.data
  if (!userId) {
    return { success: false, response: NextResponse.json({ error: 'userId is required' }, { status: 400 }) }
  }

  return { success: true, data: { product, userId }, env }
}

export async function checkRateLimit(userId: string): Promise<NextResponse | null> {
  const { success } = await ratelimit.limit(userId)
  if (!success) {
    return NextResponse.json({ error: 'Rate limit exceeded' }, { status: 429 })
  }
  return null
}
