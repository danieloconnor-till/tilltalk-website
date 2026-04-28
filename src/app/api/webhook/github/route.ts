import { NextResponse } from 'next/server'

const RAILWAY_URL = 'https://web-production-548ae.up.railway.app/webhook/github'

export async function POST(request: Request) {
  const rawBody = await request.arrayBuffer()

  const forwardHeaders: Record<string, string> = {
    'Content-Type': request.headers.get('Content-Type') ?? 'application/json',
  }

  const sig = request.headers.get('X-Hub-Signature-256')
  const event = request.headers.get('X-GitHub-Event')
  const delivery = request.headers.get('X-GitHub-Delivery')

  if (sig)      forwardHeaders['X-Hub-Signature-256'] = sig
  if (event)    forwardHeaders['X-GitHub-Event']      = event
  if (delivery) forwardHeaders['X-GitHub-Delivery']   = delivery

  try {
    const res = await fetch(RAILWAY_URL, {
      method: 'POST',
      headers: forwardHeaders,
      body: rawBody,
      signal: AbortSignal.timeout(10000),
    })

    const text = await res.text()

    return new NextResponse(text, {
      status: res.status,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (err) {
    console.error('[webhook/github] forward failed:', err)
    return NextResponse.json({ error: 'Failed to forward webhook' }, { status: 502 })
  }
}
