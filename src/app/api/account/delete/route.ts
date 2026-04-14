import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/sendgrid'

export async function DELETE() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Fetch name for the email before deleting
  const admin = createServiceRoleClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, restaurant_name')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name || profile?.restaurant_name || 'there'
  const userEmail   = user.email!

  // Hard delete — GDPR right to erasure, profile cascades via FK
  const { error } = await admin.auth.admin.deleteUser(user.id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Send deletion confirmation email (non-fatal)
  sendEmail({
    to: userEmail,
    subject: 'Your TillTalk account has been deleted',
    text: [
      `Hi ${displayName},`,
      '',
      'This email confirms that your TillTalk account and all associated data have been permanently deleted.',
      '',
      'The following data has been removed:',
      '  • Your account details (name, email, business info)',
      '  • All POS connections and API credentials',
      '  • All WhatsApp numbers registered to your account',
      '  • All sales reports and analytics history',
      '  • All notes and reminders',
      '',
      'If you did not request this deletion or believe this was a mistake, please contact us immediately at hello@tilltalk.ie.',
      '',
      'Thank you for using TillTalk.',
      '',
      'The TillTalk Team',
      'hello@tilltalk.ie',
    ].join('\n'),
    html: `
      <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
        <p>Hi ${displayName},</p>
        <p>This email confirms that your <strong>TillTalk account and all associated data have been permanently deleted</strong>.</p>
        <p><strong>The following data has been removed:</strong></p>
        <ul>
          <li>Your account details (name, email, business info)</li>
          <li>All POS connections and API credentials</li>
          <li>All WhatsApp numbers registered to your account</li>
          <li>All sales reports and analytics history</li>
          <li>All notes and reminders</li>
        </ul>
        <p>If you did not request this deletion or believe this was a mistake, please contact us immediately at
          <a href="mailto:hello@tilltalk.ie">hello@tilltalk.ie</a>.
        </p>
        <p>Thank you for using TillTalk.</p>
        <p style="color:#666;font-size:13px">The TillTalk Team · hello@tilltalk.ie</p>
      </div>
    `,
  }).catch(err => console.error('[account/delete] Confirmation email failed:', err))

  return NextResponse.json({ ok: true })
}
