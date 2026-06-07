// app/api/ai/analyze/route.ts
//
// ⚠️  DEPRECATED — this route is kept alive only to avoid breaking any
// existing bookmarks or external callers. All new code should use
// POST /api/rum/analyze instead.
//
// This module simply proxies to the unified endpoint.
export async function POST(request: Request) {
  const url = new URL(request.url);
  url.pathname = '/api/rum/analyze';

  // Forward the original request (headers + body) to the canonical route
  const forwarded = new Request(url.toString(), {
    method: 'POST',
    headers: request.headers,
    body: request.body,
    // @ts-expect-error — duplex is required for streaming bodies in Node 18+
    duplex: 'half',
  });

  return fetch(forwarded);
}
