import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/sendgrid'
import { welcomeEmail } from '@/lib/email-templates'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, restaurantName, posType, whatsappNumber, plan, turnstileToken, utmSource } = body

    console.log('[signup] request received:', { email, fullName, restaurantName, posType, whatsappNumber, plan })

    // Verify Turnstile token
    if (!turnstileToken) {
      return NextResponse.json({ error: 'Security check failed. Please refresh and try again.' }, { status: 400 })
    }
    const turnstileRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        secret: process.env.TURNSTILE_SECRET_KEY ?? '',
        response: turnstileToken,
      }),
    })
    const turnstileData = await turnstileRes.json() as { success: boolean }
    if (!turnstileData.success) {
      console.warn('[signup] Turnstile verification failed for:', email)
      return NextResponse.json({ error: 'Security check failed. Please refresh and try again.' }, { status: 400 })
    }

    // Field validation
    if (!email || !password || !fullName || !restaurantName || !posType || !whatsappNumber) {
      const missing = { email: !!email, password: !!password, fullName: !!fullName, restaurantName: !!restaurantName, posType: !!posType, whatsappNumber: !!whatsappNumber }
      console.warn('[signup] missing required fields:', missing)
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const OWNER_EMAIL = 'daniel@tilltalk.ie'
    const isOwner = email.toLowerCase() === OWNER_EMAIL

    const admin = createServiceRoleClient()

    // 1. Create Supabase auth user and generate confirmation link
    console.log('[signup] calling supabase generateLink for:', email)
    const { data: authData, error: authError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: 'https://tilltalk.ie/dashboard',
      },
    })

    if (authError) {
      console.error('[signup] supabase generateLink error:', { message: authError.message, status: authError.status })
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      console.error('[signup] supabase generateLink returned no user id for:', email)
      return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 })
    }

    const confirmationUrl = authData.properties?.action_link ?? null
    console.log('[signup] user created — userId:', userId, 'confirmationUrl present:', !!confirmationUrl)

    // 2. Provision client in Railway (skip for owner account)
    // NON-FATAL — a Railway failure must never prevent the user's account being created.
    // The only deliberate early-return here is a 409 (duplicate trial), which is
    // user-facing and intentional.  All other Railway errors are logged and swallowed.
    const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
    const onboardingKey = process.env.ONBOARDING_API_KEY
    if (!isOwner && railwayUrl && onboardingKey) {
      console.log('[signup] calling Railway onboard for userId:', userId)
      let earlyReturn: NextResponse | null = null
      try {
        const railwayRes = await fetch(`${railwayUrl}/api/onboard`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Onboarding-Key': onboardingKey },
          body: JSON.stringify({
            full_name: fullName,
            email,
            restaurant_name: restaurantName,
            pos_type: posType,
            whatsapp_number: whatsappNumber,
            plan: plan || 'pro',
            supabase_user_id: userId,
          }),
          // Timeout: don't let a slow/down Railway hang the whole Vercel function
          // and trigger the outer catch with a generic 500.
          signal: AbortSignal.timeout(8000),
        })
        const railwayBody = await railwayRes.json().catch(() => ({}))
        console.log('[signup] Railway response — status:', railwayRes.status, 'body:', railwayBody)

        if (railwayRes.status === 409) {
          // Intentional early-return: this POS account already had a free trial.
          // Clean up the auth user we just created, then tell the user why.
          console.warn('[signup] Railway 409 — duplicate trial, deleting auth user and aborting')
          await admin.auth.admin.deleteUser(userId).catch((e: unknown) =>
            console.error('[signup] deleteUser after 409 failed (non-fatal):', e)
          )
          earlyReturn = NextResponse.json(
            { error: (railwayBody as { message?: string }).message || 'This POS account has already had a free trial.' },
            { status: 409 },
          )
        } else if (!railwayRes.ok) {
          // Any other non-ok status from Railway is non-fatal — log and continue.
          console.error('[signup] Railway returned non-ok status (non-fatal, continuing):', railwayRes.status, railwayBody)
        }
      } catch (railwayErr) {
        // Network error, timeout, or JSON parse error — all non-fatal.
        console.error('[signup] Railway request failed (non-fatal, continuing):', railwayErr)
      }
      // Return 409 outside the try/catch so deleteUser errors don't suppress it.
      if (earlyReturn) return earlyReturn
    } else {
      console.warn('[signup] RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not set — skipping Railway onboard')
    }

    // 3. Insert Supabase profile
    console.log('[signup] inserting profile for userId:', userId)
    const { error: profileError } = await admin.from('profiles').insert({
      id: userId,
      email,
      full_name: fullName,
      restaurant_name: restaurantName,
      pos_type: posType,
      whatsapp_number: whatsappNumber,
      plan: isOwner ? 'owner' : (plan || 'pro'),
      // Owner account: no trial expiry
      ...(isOwner ? { trial_start: null, trial_end: null } : {}),
      ...(utmSource ? { utm_source: utmSource } : {}),
    })

    if (profileError) {
      console.error('[signup] profile insert error:', { message: profileError.message, code: profileError.code, details: profileError.details })
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create profile. ' + profileError.message }, { status: 500 })
    }
    console.log('[signup] profile inserted for userId:', userId)

    // 4. Send welcome email with confirmation button
    const welcome = welcomeEmail(
      fullName,
      confirmationUrl ?? 'https://tilltalk.ie/login',
      restaurantName,
      posType,
      plan || 'pro',
    )

    console.log('[signup] sending welcome email to:', email)
    try {
      await sendEmail({
        to: email,
        subject: welcome.subject,
        text: welcome.text,
        html: welcome.html,
      })
      console.log('[signup] welcome email sent')
    } catch (emailErr) {
      console.error('[signup] welcome email failed (non-fatal):', emailErr)
    }

    // 5. Admin notification
    const notificationEmail = process.env.NOTIFICATION_EMAIL || 'daniel@tilltalk.ie'
    try {
      await sendEmail({
        to: notificationEmail,
        subject: `New TillTalk signup: ${restaurantName}`,
        text: `New signup\n\nName: ${fullName}\nEmail: ${email}\nBusiness: ${restaurantName}\nPOS: ${posType}\nPlan: ${plan || 'pro'}\nWhatsApp: ${whatsappNumber}`,
        html: `<h2>New TillTalk Signup</h2>
          <table>
            <tr><td><strong>Name:</strong></td><td>${fullName}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
            <tr><td><strong>Business:</strong></td><td>${restaurantName}</td></tr>
            <tr><td><strong>POS:</strong></td><td>${posType}</td></tr>
            <tr><td><strong>Plan:</strong></td><td>${plan || 'pro'}</td></tr>
            <tr><td><strong>WhatsApp:</strong></td><td>${whatsappNumber}</td></tr>
          </table>`,
      })
      console.log('[signup] admin notification sent to:', notificationEmail)
    } catch (adminEmailErr) {
      console.error('[signup] admin notification failed (non-fatal):', adminEmailErr)
    }

    console.log('[signup] completed successfully for:', email)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[signup] unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
