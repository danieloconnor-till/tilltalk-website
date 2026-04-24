import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/sendgrid'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VISITOR_SYSTEM = `You are the TillTalk sales assistant chatting with a business owner on our website.

TillTalk connects to a business's POS (Point of Sale) system and lets the owner ask questions about their sales data — revenue, top items, busiest days, staff performance — directly on WhatsApp. No dashboard needed.

When asked what TillTalk can do or how you can help, explain:

I can help you with a few things:

📊 Your sales & business performance — ask me anything about your revenue, busiest days, top items, comparisons over time
📅 What's coming in your area — events, weather and a calendar so you're never caught off guard
🔔 Running your business — notes, reminders, staffing analysis, stock alerts and email reports
💻 You also get an interactive analytics dashboard at tilltalk.ie

If someone asks to know more about a specific area, go deeper on that topic only — not the full list.

PRICING:
- Starter: €29/month — 1 location, 2 WhatsApp numbers
- Pro: €49/month — 3 locations, 4 WhatsApp numbers (most popular)
- Business: €99/month — 10 locations, unlimited WhatsApp numbers
- All plans: 14-day free trial, no card required

POS COMPATIBILITY:
- Clover: live now ✅
- Square: live now ✅
- Other POS systems (Epos Now, Lightspeed, Toast, and others): integrations in progress — we will contact them as soon as a reliable connection is built for their system

WAITLIST COLLECTION — collect these naturally, one question at a time:
1. Their name
2. Business name
3. Town or city
4. POS system they use
5. Number of locations
6. How many WhatsApp numbers they'll need

Once you have all six, call the save_waitlist_lead tool. After calling it, respond with:
"We'll be in touch as soon as we're ready for you. In the meantime check us out at tilltalk.ie"

OUT OF SCOPE: Only discuss TillTalk and how it could help their business. If asked about anything else, say: "I'm only able to help with your business — happy to tell you more about what TillTalk can do for you."

TONE: Friendly, concise, conversational. Ask one question at a time.`

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

const WAITLIST_TOOLS: Anthropic.Tool[] = [
  {
    name: 'save_waitlist_lead',
    description: 'Save collected lead details to the waitlist. Call this once you have all six required fields.',
    input_schema: {
      type: 'object',
      properties: {
        name:           { type: 'string',  description: 'Contact name' },
        business_name:  { type: 'string',  description: 'Business name' },
        town:           { type: 'string',  description: 'Town or city' },
        pos_type:       { type: 'string',  description: 'POS system they use' },
        location_count: { type: 'integer', description: 'Number of locations' },
        whatsapp_count: { type: 'integer', description: 'Number of WhatsApp numbers needed' },
      },
      required: ['name', 'business_name', 'town', 'pos_type', 'location_count', 'whatsapp_count'],
    },
  },
]

const SIGN_OFF = "We'll be in touch as soon as we're ready for you. In the meantime check us out at tilltalk.ie"

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
    const callParams: Parameters<typeof client.messages.create>[0] = {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 512,
      system: isLoggedIn ? CLIENT_SYSTEM : VISITOR_SYSTEM,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      messages: messages as any,
    }

    if (!isLoggedIn) {
      callParams.tools = WAITLIST_TOOLS
    }

    const response = await client.messages.create(callParams)

    // Handle waitlist tool call (visitor mode only)
    if (!isLoggedIn && 'content' in response) {
      for (const block of response.content) {
        if (block.type === 'tool_use' && block.name === 'save_waitlist_lead') {
          const inp = block.input as Record<string, unknown>

          // Send email notification (non-fatal)
          sendEmail({
            to: process.env.NOTIFICATION_EMAIL || 'hello@tilltalk.ie',
            subject: `New TillTalk waitlist lead — ${inp.business_name}`,
            text: [
              'New waitlist lead from the website chat:',
              '',
              `Name: ${inp.name}`,
              `Business: ${inp.business_name}`,
              `Town: ${inp.town}`,
              `POS system: ${inp.pos_type}`,
              `Locations: ${inp.location_count}`,
              `WhatsApp numbers needed: ${inp.whatsapp_count}`,
            ].join('\n'),
          }).catch(err => console.error('[waitlist] Email send error:', err))

          return NextResponse.json({ response: SIGN_OFF })
        }
      }
    }

    const content = 'content' in response ? response.content : []
    const text = content
      .filter(b => b.type === 'text')
      .map(b => (b as { type: 'text'; text: string }).text)
      .join('')

    return NextResponse.json({ response: text })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Chat service error: ${msg}` }, { status: 500 })
  }
}
