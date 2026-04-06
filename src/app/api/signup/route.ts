import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/sendgrid'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, restaurantName, posType, whatsappNumber, plan } = body

    console.log('[signup] request received:', { email, fullName, restaurantName, posType, whatsappNumber, plan })

    // Field validation
    if (!email || !password || !fullName || !restaurantName || !posType || !whatsappNumber) {
      const missing = { email: !!email, password: !!password, fullName: !!fullName, restaurantName: !!restaurantName, posType: !!posType, whatsappNumber: !!whatsappNumber }
      console.warn('[signup] missing required fields:', missing)
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    // TODO: add reCAPTCHA v3 verification here before processing signup

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

    // 2. Provision client in Railway (TillTalk bot database)
    const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
    const onboardingKey = process.env.ONBOARDING_API_KEY
    if (railwayUrl && onboardingKey) {
      console.log('[signup] calling Railway onboard for userId:', userId)
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
        })
        const railwayBody = await railwayRes.json().catch(() => ({}))
        console.log('[signup] Railway response — status:', railwayRes.status, 'body:', railwayBody)
        if (!railwayRes.ok) {
          if (railwayRes.status === 409) {
            await admin.auth.admin.deleteUser(userId)
            return NextResponse.json(
              { error: (railwayBody as { message?: string }).message || 'This POS account has already had a free trial.' },
              { status: 409 },
            )
          }
          console.error('[signup] Railway non-fatal error — continuing')
        }
      } catch (railwayErr) {
        console.error('[signup] Railway request threw (non-fatal):', railwayErr)
      }
    } else {
      console.warn('[signup] RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not set — skipping')
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
      plan: plan || 'pro',
    })

    if (profileError) {
      console.error('[signup] profile insert error:', { message: profileError.message, code: profileError.code, details: profileError.details })
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create profile. ' + profileError.message }, { status: 500 })
    }
    console.log('[signup] profile inserted for userId:', userId)

    // 4. Send welcome email with confirmation button
    const confirmButtonHtml = confirmationUrl
      ? `<div style="text-align:center;margin:32px 0;">
          <a href="${confirmationUrl}"
             style="display:inline-block;background-color:#16a34a;color:#ffffff;
                    font-size:18px;font-weight:bold;text-decoration:none;
                    padding:16px 40px;border-radius:8px;">
            Confirm my account
          </a>
          <p style="margin-top:12px;font-size:12px;color:#6b7280;">
            Button not working?
            <a href="${confirmationUrl}" style="color:#16a34a;">Copy this link</a>
          </p>
        </div>`
      : `<p>Please check your inbox for a separate confirmation email from Supabase.</p>`

    const welcomeHtml = `
      <div style="font-family:sans-serif;max-width:600px;margin:0 auto;">
        <h1 style="color:#16a34a;">Welcome to TillTalk, ${fullName}!</h1>
        <p>Your free 14-day trial has started. Confirm your email to activate your account.</p>
        ${confirmButtonHtml}
        <h2>What happens next?</h2>
        <ul>
          <li>You'll receive WhatsApp setup instructions within 24 hours</li>
          <li>Your 14-day free trial is now active — no credit card needed</li>
        </ul>
        <h2>Your account details</h2>
        <ul>
          <li><strong>Business:</strong> ${restaurantName}</li>
          <li><strong>POS System:</strong> ${posType}</li>
          <li><strong>Plan:</strong> ${plan || 'pro'}</li>
        </ul>
        <p>Questions? <a href="mailto:hello@tilltalk.ie">hello@tilltalk.ie</a></p>
        <p style="color:#6b7280;font-size:12px;">TillTalk · Built in Ireland 🇮🇪</p>
      </div>`

    console.log('[signup] sending welcome email to:', email)
    try {
      await sendEmail({
        to: email,
        subject: 'Welcome to TillTalk — confirm your account',
        text: `Welcome to TillTalk, ${fullName}! Confirm your account: ${confirmationUrl ?? '(see dashboard)'}`,
        html: welcomeHtml,
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
