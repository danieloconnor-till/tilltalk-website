import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import Anthropic from '@anthropic-ai/sdk'

export async function POST(request: Request) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user || user.email !== 'daniel@tilltalk.ie') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()
  const { originalQuery, originalResponse, retryResponse, clientName } = body as {
    originalQuery: string
    originalResponse: string | null
    retryResponse: string | null
    clientName: string
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const prompt = `You are analysing a failed bot interaction from TillTalk — a WhatsApp-based POS analytics assistant for hospitality businesses. The bot uses Claude Haiku for simple queries and Claude Sonnet for complex ones, with tool use to fetch live POS data (Clover/Square).

Client: ${clientName || 'Unknown'}

Original query:
"${originalQuery}"

Bot's original response (Haiku):
${originalResponse ? `"${originalResponse}"` : '(no response recorded)'}

Sonnet retry response:
${retryResponse ? `"${retryResponse}"` : '(no retry recorded)'}

Please:
1. Identify the root cause of failure (e.g. wrong tool selection, bad period parsing, model hallucination, missing data handling, ambiguous intent, prompt gap)
2. Provide a concrete implementable fix — a specific code change, system prompt addition, or new query handler that would prevent this failure class

Format your response exactly as:

**Root cause:** [1–2 sentences on why the bot failed]

**Fix:** [Specific change with file name, location, and exact wording/code. Be precise enough that a developer can implement it immediately.]`

  try {
    const response = await anthropic.messages.create({
      model: 'claude-opus-4-6',
      max_tokens: 1024,
      messages: [{ role: 'user', content: prompt }],
    })

    const analysis =
      response.content[0].type === 'text' ? response.content[0].text : ''

    return NextResponse.json({ analysis })
  } catch (err) {
    console.error('[admin/analyse-query] Anthropic error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
