import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/sendgrid'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, restaurantName, posType, whatsappNumber, plan, recaptchaToken } = body

    console.log('[signup] request received:', { email, fullName, restaurantName, posType, whatsappNumber, plan, hasRecaptchaToken: !!recaptchaToken })

    if (!email || !password || !fullName || !restaurantName || !posType || !whatsappNumber) {
      console.warn('[signup] missing required fields:', { email: !!email, password: !!password, fullName: !!fullName, restaurantName: !!restaurantName, posType: !!posType, whatsappNumber: !!whatsappNumber })
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      console.warn('[signup] password too short for:', email)
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    // Verify reCAPTCHA token
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
    if (!recaptchaSecret) {
      console.error('[signup] RECAPTCHA_SECRET_KEY is not set — cannot verify token')
      return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })
    }
    if (!recaptchaToken) {
      console.warn('[signup] recaptchaToken missing from request body for:', email)
      return NextResponse.json({ error: 'reCAPTCHA token missing.' }, { status: 400 })
    }

    console.log('[signup] verifying reCAPTCHA token for:', email)
    let verifyData: { success: boolean; score?: number; action?: string; 'error-codes'?: string[] }
    try {
      const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `secret=${recaptchaSecret}&response=${recaptchaToken}`,
      })
      verifyData = await verifyRes.json()
      console.log('[signup] reCAPTCHA verification response:', verifyData)
    } catch (recaptchaErr) {
      console.error('[signup] reCAPTCHA fetch error:', recaptchaErr)
      return NextResponse.json({ error: 'reCAPTCHA verification failed. Please try again.' }, { status: 400 })
    }

    if (!verifyData.success || (verifyData.score ?? 1) < 0.5) {
      console.warn('[signup] reCAPTCHA rejected — success:', verifyData.success, 'score:', verifyData.score, 'errors:', verifyData['error-codes'])
      return NextResponse.json({ error: 'reCAPTCHA verification failed. Please try again.' }, { status: 400 })
    }
    console.log('[signup] reCAPTCHA passed — score:', verifyData.score)

    const admin = createServiceRoleClient()

    // 1. Create Supabase auth user and generate confirmation link in one call
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
      console.error('[signup] supabase generateLink error:', { message: authError.message, status: authError.status, code: (authError as { code?: string }).code })
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
    console.log('[signup] supabase user created — userId:', userId, 'confirmationUrl present:', !!confirmationUrl)

    // 2. Provision client in Railway (TillTalk bot database)
    const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
    const onboardingKey = process.env.ONBOARDING_API_KEY
    if (railwayUrl && onboardingKey) {
      console.log('[signup] calling Railway onboard for userId:', userId, 'url:', railwayUrl)
      try {
        const railwayRes = await fetch(`${railwayUrl}/api/onboard`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Onboarding-Key': onboardingKey,
          },
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
        console.log('[signup] Railway onboard response — status:', railwayRes.status, 'body:', railwayBody)
        if (!railwayRes.ok) {
          if (railwayRes.status === 409) {
            console.warn('[signup] Railway 409 duplicate trial — deleting supabase user:', userId)
            await admin.auth.admin.deleteUser(userId)
            return NextResponse.json(
              { error: (railwayBody as { message?: string }).message || 'This POS account has already had a free trial.' },
              { status: 409 },
            )
          }
          console.error('[signup] Railway onboard non-fatal error — status:', railwayRes.status, 'body:', railwayBody)
        }
      } catch (railwayErr) {
        console.error('[signup] Railway onboard request threw (non-fatal):', railwayErr)
      }
    } else {
      console.warn('[signup] RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not set — skipping Railway provisioning')
    }

    // 3. Insert Supabase profile record
    console.log('[signup] inserting supabase profile for userId:', userId)
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
      console.error('[signup] supabase profile insert error:', { message: profileError.message, code: profileError.code, details: profileError.details, hint: profileError.hint })
      console.log('[signup] cleaning up supabase auth user:', userId)
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create profile. ' + profileError.message }, { status: 500 })
    }
    console.log('[signup] supabase profile inserted for userId:', userId)

    // 4. Send welcome email
    const confirmButtonHtml = confirmationUrl
      ? `
        <div style="text-align: center; margin: 32px 0;">
          <a href="${confirmationUrl}"
             style="display: inline-block; background-color: #16a34a; color: #ffffff;
                    font-size: 18px; font-weight: bold; text-decoration: none;
                    padding: 16px 40px; border-radius: 8px;">
            Confirm my account
          </a>
          <p style="margin-top: 12px; font-size: 12px; color: #6b7280;">
            Button not working? <a href="${confirmationUrl}" style="color: #16a34a;">Copy this link</a>
          </p>
        </div>`
      : `<p>Please check your inbox for a separate confirmation email.</p>`

    const welcomeHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Welcome to TillTalk, ${fullName}!</h1>
        <p>Your free 14-day trial has started.</p>
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
        <p>Questions? Reply to this email or contact <a href="mailto:hello@tilltalk.ie">hello@tilltalk.ie</a></p>
        <p style="color: #6b7280; font-size: 12px;">TillTalk · Built in Ireland 🇮🇪</p>
      </div>
    `

    console.log('[signup] sending welcome email to:', email)
    try {
      await sendEmail({
        to: email,
        subject: `Welcome to TillTalk — your free trial has started`,
        text: `Welcome to TillTalk, ${fullName}! Your free 14-day trial has started. You'll receive WhatsApp setup instructions within 24 hours.`,
        html: welcomeHtml,
      })
      console.log('[signup] welcome email sent to:', email)
    } catch (emailErr) {
      console.error('[signup] welcome email failed (non-fatal):', emailErr)
    }

    // 5. Send notification to admin
    const notificationEmail = process.env.NOTIFICATION_EMAIL || 'daniel@tilltalk.ie'
    console.log('[signup] sending admin notification to:', notificationEmail)
    try {
      await sendEmail({
        to: notificationEmail,
        subject: `New TillTalk signup: ${restaurantName}`,
        text: `New signup!\n\nName: ${fullName}\nEmail: ${email}\nRestaurant: ${restaurantName}\nPOS: ${posType}\nPlan: ${plan || 'pro'}\nWhatsApp: ${whatsappNumber}`,
        html: `
          <h2>New TillTalk Signup</h2>
          <table>
            <tr><td><strong>Name:</strong></td><td>${fullName}</td></tr>
            <tr><td><strong>Email:</strong></td><td>${email}</td></tr>
            <tr><td><strong>Restaurant:</strong></td><td>${restaurantName}</td></tr>
            <tr><td><strong>POS:</strong></td><td>${posType}</td></tr>
            <tr><td><strong>Plan:</strong></td><td>${plan || 'pro'}</td></tr>
            <tr><td><strong>WhatsApp:</strong></td><td>${whatsappNumber}</td></tr>
          </table>
        `,
      })
      console.log('[signup] admin notification sent to:', notificationEmail)
    } catch (adminEmailErr) {
      console.error('[signup] admin notification email failed (non-fatal):', adminEmailErr)
    }

    console.log('[signup] completed successfully for:', email, 'userId:', userId)
    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[signup] unhandled error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
