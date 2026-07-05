import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const RAILWAY_URL = process.env.RAILWAY_ONBOARDING_URL || 'https://tilltalk1-production.up.railway.app'
const KEY = process.env.ONBOARDING_API_KEY || ''

// Vercel serverless functions cap the request body at ~4.5MB. Enforce a 4MB
// ceiling here (matched client-side) and return a clean JSON error rather than
// letting the platform 413 with an opaque page.
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024

async function getUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
}

export async function GET() {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const res = await fetch(
    `${RAILWAY_URL}/api/photos?supabase_user_id=${encodeURIComponent(user.id)}`,
    { headers: { 'X-Onboarding-Key': KEY }, cache: 'no-store' }
  )
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}

export async function POST(request: Request) {
  const user = await getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const form = await request.formData().catch(() => null)
  const file = form?.get('photo')
  if (!(file instanceof File) || !file.name) {
    return NextResponse.json({ error: 'No photo uploaded — choose a JPG or PNG file.' }, { status: 400 })
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return NextResponse.json(
      {
        error:
          'That photo is too large to upload here (4MB max). Email it to us or send ' +
          'it to the bot on WhatsApp as a document instead.',
      },
      { status: 413 }
    )
  }

  // Rebuild the multipart body server-side so the browser never sees the service
  // key and the client_id is set from the session, not the request.
  const outbound = new FormData()
  outbound.append('supabase_user_id', user.id)
  outbound.append('photo', file, file.name)

  const res = await fetch(`${RAILWAY_URL}/api/photos`, {
    method: 'POST',
    headers: { 'X-Onboarding-Key': KEY },
    body: outbound,
  })
  const data = await res.json()
  return NextResponse.json(data, { status: res.status })
}
