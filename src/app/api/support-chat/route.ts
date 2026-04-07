import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VISITOR_SYSTEM = `You are TillTalk's friendly sales assistant on the tilltalk.ie website.

TillTalk lets hospitality and retail businesses in Ireland query their POS system via WhatsApp — no dashboards needed. They message a WhatsApp number and get instant answers about their sales data.

Key facts:
- Supported POS systems: Clover, Square, Epos Now
- Pricing: Starter €29/mo (1 location, 2 numbers), Pro €49/mo (3 locations, 4 numbers), Business €99/mo (10 locations, unlimited numbers)
- All plans include a free 14-day trial, no credit card required
- Sign up at https://tilltalk.ie/signup
- Contact: hello@tilltalk.ie

Be helpful, concise, and guide visitors toward signing up. If asked about technical details you don't know, suggest they email hello@tilltalk.ie. Do not make up features or pricing that aren't listed above.`

const CLIENT_SYSTEM = `You are TillTalk's support assistant helping an existing customer on the tilltalk.ie dashboard.

TillTalk connects to Clover, Square, and Epos Now POS systems and lets users query sales data via WhatsApp.

Common issues you can help with:
- Login problems: suggest checking email/password, using "Forgot password" link at tilltalk.ie/forgot-password
- WhatsApp not responding: check the WhatsApp number is registered in Dashboard → Manage → Numbers; ensure it's in E.164 format (e.g. +353861234567)
- POS credentials: found in Dashboard → Manage → Locations → Edit. For Clover: merchant dashboard → Account & Setup → API Tokens. For Square: developer.squareup.com → Credentials → Production. For Epos Now: Back Office → App Store → API Settings.
- No sales data showing: POS credentials may not be set — go to Dashboard → Manage → Locations and add your Merchant ID and API Key
- Bot gives wrong answers: the bot uses live POS data; if data looks wrong, check your POS system directly

If you cannot resolve an issue, tell the user to email daniel@tilltalk.ie with a description of the problem.

Be concise, friendly, and solution-focused. Don't speculate — if unsure, escalate to daniel@tilltalk.ie.`

export async function POST(request: Request) {
  let body: { messages?: unknown[]; isLoggedIn?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const messages = body.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  // For client mode, verify the Supabase session
  let isLoggedIn = false
  if (body.isLoggedIn) {
    try {
      const supabase = await createClient()
      const { data: { user } } = await supabase.auth.getUser()
      isLoggedIn = !!user
    } catch {
      isLoggedIn = false
    }
  }

  try {
    const response = await client.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: isLoggedIn ? CLIENT_SYSTEM : VISITOR_SYSTEM,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    })

    const text = response.content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json({ response: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Chat service error: ${msg}` }, { status: 500 })
  }
}
