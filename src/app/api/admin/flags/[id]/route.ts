import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'

async function isAdmin(): Promise<boolean> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user?.email === 'daniel@tilltalk.ie'
}

// ── PATCH /api/admin/flags/[id] ───────────────────────────────────────────────
// Resolve a flag. Optionally send a WhatsApp to the client.
//
// Body (JSON):
//   resolution_notes  — optional free text
//   send_whatsapp     — boolean (default false)
//   client_name       — used in the WhatsApp message greeting

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!(await isAdmin())) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

  const admin = createServiceRoleClient()
  const { id } = await params

  try {
    const body = await req.json()
    const {
      resolution_notes = '',
      send_whatsapp    = false,
      client_name      = '',
    } = body

    // Resolve the flag
    const { data: flag, error } = await admin
      .from('flags')
      .update({
        resolved:         true,
        resolved_at:      new Date().toISOString(),
        resolved_by:      'admin',
        resolution_notes: resolution_notes || null,
      })
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    // Optionally send WhatsApp to the client
    if (send_whatsapp && flag?.phone_number) {
      const railwayUrl = process.env.RAILWAY_ONBOARDING_URL || ''
      const apiKey     = process.env.ONBOARDING_API_KEY     || ''
      const greeting   = client_name ? `Hi ${client_name.split(' ')[0]}` : 'Hi'
      const message    = (
        `${greeting}, we noticed you had an issue with TillTalk recently. ` +
        `We've looked into it and hope things are working better for you now. ` +
        `If you need any help, just reply to this message or email hello@tilltalk.ie 🙌`
      )

      if (railwayUrl && apiKey) {
        try {
          await fetch(`${railwayUrl}/api/admin/send-client-message`, {
            method:  'POST',
            headers: {
              'Content-Type':   'application/json',
              'X-Onboarding-Key': apiKey,
            },
            body: JSON.stringify({ phone_number: flag.phone_number, message }),
            signal: AbortSignal.timeout(8000),
          })
        } catch (waErr) {
          // Non-fatal — flag is still resolved even if WhatsApp fails
          console.error('[flags/resolve] WhatsApp send failed:', waErr)
        }
      }
    }

    return NextResponse.json({ ok: true, flag })
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err)
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
