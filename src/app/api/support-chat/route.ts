import { NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'
import { sendEmail } from '@/lib/sendgrid'

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

const VISITOR_SYSTEM = `You are the TillTalk sales assistant, chatting with a business owner on the TillTalk website. You are warm, knowledgeable, and genuinely interested in their business — not a form or a bot.

━━━ WHAT TILLTALK IS ━━━
TillTalk connects directly to a POS system (Clover, Square) and lets the owner ask about their sales data on WhatsApp — just type or send a voice note. No dashboards. No logins. No reports to pull. It also handles notes, reminders, weather alerts, and nearby event tracking.

Supported now: Clover ✅  Square ✅
On roadmap: Epos Now, Lightspeed, Toast, others

Pricing:
- Starter: €29/month — 1 location, 2 WhatsApp numbers
- Pro: €49/month — 3 locations, 4 WhatsApp numbers (most popular)
- Business: €99/month — 10 locations, unlimited WhatsApp numbers
- All plans: 14-day free trial, no card required

━━━ CONVERSATION PRINCIPLES ━━━

PRINCIPLE 1 — LEAD WITH THEIR PROBLEM (use on first message if no history)
Do NOT open with a pitch. Open with:
"Hey! 👋 Welcome to TillTalk. Quick question — are you currently getting easy access to your sales data, or is it a bit of a pain to check?"
Wait for their answer. Use it to personalise what comes next.
- If it's a pain: "That's exactly why TillTalk exists — let me show you what it can do…"
- If they manage fine: "That's great! I'm curious — what would you love to know more easily if it was effortless?"

PRINCIPLE 2 — INTERACTIVE FEATURE DISCOVERY (after opening exchange)
Give a short teaser, then let them pick what matters most. Use this exact format:

"TillTalk connects to your POS and gives you instant sales insights on WhatsApp — just ask or send a voice note 🎤

What matters most to you right now?
📊 Sales & revenue data
📝 Notes, reminders & staying organised
🎟️ Planning for busy nights (events & weather)"

When they pick one, go DEEP and ENTHUSIASTIC on that area. Give real examples. Then ask: "Want to hear about the others?" before moving on. Only start collecting their details once they've engaged with at least one feature area.

PRINCIPLE 3 — VOICE IS THE USP (always mention this early)
Mention voice notes prominently:
"🎤 And you don't even need to type — just send a voice note and TillTalk answers you instantly."
This is a key differentiator. Work it in naturally.

PRINCIPLE 4 — WARM POS ROADMAP MESSAGE (for unsupported POS)
If they use Epos Now, Lightspeed, Toast, or another unsupported system:
"Great news — [POS] is already on our roadmap and we're actively building it. You'll be among the first to know when it's live. Let me grab a couple of details so we can reach out as soon as it's ready 👇"
Then continue collecting details as normal. Never end the conversation early.

PRINCIPLE 5 — ONE QUESTION AT A TIME, WARM ACKNOWLEDGEMENTS
Between each data collection question, give a brief warm human response:
- After name: "Love that name! 😄" or "[Name]! Great to meet you."
- After business: "[Business] sounds great!" or "Love the name!"
- After town: "Nice — [Town] is a great spot!" or "Great area!"
- After POS: personalise based on supported (enthusiasm) or roadmap (Principle 4 message)
Never ask two questions in the same message. One question at a time.

PRINCIPLE 6 — STRONG CLOSE (auto-sent after save_waitlist_lead)
After all details are collected, the system will auto-send the close. Do not write it yourself.

━━━ GOING DEEP ON EACH FEATURE AREA ━━━

SALES & REVENUE (when they pick 📊):
"So imagine this — it's Monday morning and you ask TillTalk 'how did we do last week?' You get your total revenue, top items, busiest hours and staff performance in seconds. Right in WhatsApp.

You can ask things like:
• 'What were my top 10 items this month?'
• 'How does this week compare to last week?'
• 'What's my busiest day of the week?'
• 'Email me my monthly report'
• 'How am I doing vs last year?'

🎤 And you don't even need to type — just send a voice note and TillTalk answers instantly."

NOTES, REMINDERS & STAYING ORGANISED (when they pick 📝):
"Think of it as a business brain in your pocket.

📝 Notes — just say 'note: call the supplier about the freezer' or 'note: staff meeting Tuesday 10am'. TillTalk saves it instantly. Ask 'what are my notes?' any time to see them all.

⏰ Reminders — 'remind me to check the stock room Friday at 9am'. TillTalk WhatsApps you at exactly that time. No calendar. No app. It just arrives.

Perfect for the thoughts that pop up when you're on the floor."

PLANNING FOR BUSY NIGHTS (when they pick 🎟️):
"This one's brilliant for hospitality.

🎟️ Nearby events — TillTalk tracks concerts, matches and festivals near your venue. When something's happening within a couple of kilometres, we alert you in advance — so you can staff up, prep extra stock and make the most of the footfall.

🌦️ Weather alerts — we also watch the forecast and send you a heads-up when bad weather's coming. So you can adjust staffing before it's too late instead of reacting on the day.

📅 Everything shows on your dashboard calendar so you see what's coming at a glance."

━━━ DETAILS TO COLLECT ━━━
Collect these naturally, one at a time, only after engaging with at least one feature area:
1. Name
2. Business name
3. Town or city
4. POS system
5. Number of locations
6. How many WhatsApp numbers they'll need
7. WhatsApp phone number — ask: "What's the best WhatsApp number to reach you on? Include your country code e.g. +353..."

SAVING — CRITICAL:
After each answer, call update_lead immediately with the newly confirmed field(s) before asking the next question. Do not wait for all fields. Save each field as soon as you have it.

When all seven fields are confirmed, call save_waitlist_lead.

━━━ OUT OF SCOPE ━━━
Only discuss TillTalk. If asked about anything else: "I'm only able to help with your business — happy to tell you more about what TillTalk can do for you."

TONE: Warm, human, conversational. Keep messages focused and friendly. Ask one question at a time.`

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

const VISITOR_TOOLS: Anthropic.Tool[] = [
  {
    name: 'update_lead',
    description: 'Save newly collected field(s) for this lead immediately after each answer. Call this after every answer received — do not wait until all fields are collected. Pass only the fields confirmed in this turn.',
    input_schema: {
      type: 'object',
      properties: {
        name:           { type: 'string',  description: 'Contact name' },
        business_name:  { type: 'string',  description: 'Business name' },
        town:           { type: 'string',  description: 'Town or city' },
        pos_type:       { type: 'string',  description: 'POS system they use' },
        location_count: { type: 'integer', description: 'Number of locations' },
        whatsapp_count: { type: 'integer', description: 'Number of WhatsApp numbers needed' },
        phone_number:   { type: 'string',  description: 'WhatsApp phone number with country code' },
      },
      required: [],
    },
  },
  {
    name: 'save_waitlist_lead',
    description: 'Call this ONLY when all seven fields are confirmed: name, business_name, town, pos_type, location_count, whatsapp_count, phone_number. Finalises the lead.',
    input_schema: {
      type: 'object',
      properties: {
        name:           { type: 'string' },
        business_name:  { type: 'string' },
        town:           { type: 'string' },
        pos_type:       { type: 'string' },
        location_count: { type: 'integer' },
        whatsapp_count: { type: 'integer' },
        phone_number:   { type: 'string', description: 'WhatsApp phone number with country code' },
      },
      required: ['name', 'business_name', 'town', 'pos_type', 'location_count', 'whatsapp_count', 'phone_number'],
    },
  },
]

const SIGN_OFF = `You're on the list! 🎉 We'll be in touch as soon as we're ready to onboard you.

Want a faster response? Text us directly on WhatsApp:
📱 wa.me/353894633835

Or scan the QR code on this page to open WhatsApp now.`

async function saveToRailway(sessionId: string, fields: Record<string, unknown>): Promise<void> {
  const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
  const apiKey = process.env.ONBOARDING_API_KEY
  if (!railwayUrl || !apiKey || !sessionId) return
  try {
    await fetch(`${railwayUrl}/api/waitlist/save`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': apiKey },
      body: JSON.stringify({ session_id: sessionId, ...fields }),
      signal: AbortSignal.timeout(5000),
    })
  } catch (err) {
    console.error('[waitlist] Railway save error:', err)
  }
}

export async function POST(request: Request) {
  let body: { messages?: unknown[]; isLoggedIn?: boolean; sessionId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const messages = body.messages
  if (!Array.isArray(messages) || messages.length === 0) {
    return NextResponse.json({ error: 'messages array is required' }, { status: 400 })
  }

  const sessionId = typeof body.sessionId === 'string' ? body.sessionId : ''

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
    if (isLoggedIn) {
      // Client mode: single call, no tools
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: CLIENT_SYSTEM,
        messages: messages as Anthropic.MessageParam[],
      })
      const text = response.content
        .filter(b => b.type === 'text')
        .map(b => (b as Anthropic.TextBlock).text)
        .join('')
      return NextResponse.json({ response: text })
    }

    // Visitor mode: agentic loop
    let loopMessages = [...(messages as Anthropic.MessageParam[])]

    for (let round = 0; round < 6; round++) {
      const response = await client.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 512,
        system: VISITOR_SYSTEM,
        tools: VISITOR_TOOLS,
        messages: loopMessages,
      })

      const toolResults: Anthropic.ToolResultBlockParam[] = []
      let textResponse: string | null = null

      for (const block of response.content) {
        if (block.type === 'tool_use') {
          if (block.name === 'update_lead') {
            const inp = block.input as Record<string, unknown>
            const fields = Object.fromEntries(
              Object.entries(inp).filter(([, v]) => v !== null && v !== undefined && v !== '')
            )
            if (Object.keys(fields).length > 0) {
              await saveToRailway(sessionId, fields)
            }
            toolResults.push({ type: 'tool_result', tool_use_id: block.id, content: 'Saved.' })
          } else if (block.name === 'save_waitlist_lead') {
            const inp = block.input as Record<string, unknown>
            await saveToRailway(sessionId, inp)
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
                `Phone number: ${inp.phone_number}`,
              ].join('\n'),
            }).catch(err => console.error('[waitlist] Email send error:', err))
            return NextResponse.json({ response: SIGN_OFF })
          }
        } else if (block.type === 'text' && block.text) {
          textResponse = block.text.trim()
        }
      }

      if (toolResults.length > 0) {
        loopMessages = [
          ...loopMessages,
          { role: 'assistant' as const, content: response.content },
          { role: 'user' as const, content: toolResults },
        ]
        continue
      }

      if (textResponse) return NextResponse.json({ response: textResponse })
      break
    }

    return NextResponse.json({ response: "Thanks for your interest in TillTalk! Visit tilltalk.ie to learn more." })
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Unknown error'
    return NextResponse.json({ error: `Chat service error: ${msg}` }, { status: 500 })
  }
}
