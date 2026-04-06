import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/sendgrid'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, restaurantName, posType, whatsappNumber, plan, recaptchaToken } = body

    if (!email || !password || !fullName || !restaurantName || !posType || !whatsappNumber) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    // Verify reCAPTCHA token
    const recaptchaSecret = process.env.RECAPTCHA_SECRET_KEY
    if (!recaptchaSecret) {
      console.error('RECAPTCHA_SECRET_KEY is not set')
      return NextResponse.json({ error: 'Server misconfiguration.' }, { status: 500 })
    }
    if (!recaptchaToken) {
      return NextResponse.json({ error: 'reCAPTCHA token missing.' }, { status: 400 })
    }
    const verifyRes = await fetch('https://www.google.com/recaptcha/api/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `secret=${recaptchaSecret}&response=${recaptchaToken}`,
    })
    const verifyData = await verifyRes.json()
    if (!verifyData.success || verifyData.score < 0.5) {
      console.warn('reCAPTCHA failed:', verifyData)
      return NextResponse.json({ error: 'reCAPTCHA verification failed. Please try again.' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    // 1. Create Supabase auth user and generate confirmation link in one call
    const { data: authData, error: authError } = await admin.auth.admin.generateLink({
      type: 'signup',
      email,
      password,
      options: {
        redirectTo: 'https://tilltalk.ie/dashboard',
      },
    })

    if (authError) {
      console.error('Auth error:', authError)
      if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
        return NextResponse.json({ error: 'An account with this email already exists.' }, { status: 409 })
      }
      return NextResponse.json({ error: authError.message }, { status: 400 })
    }

    const userId = authData.user?.id
    if (!userId) {
      return NextResponse.json({ error: 'Failed to create user.' }, { status: 500 })
    }

    const confirmationUrl = authData.properties?.action_link ?? null

    // 2. Provision client in Railway (TillTalk bot database)
    const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
    const onboardingKey = process.env.ONBOARDING_API_KEY
    if (railwayUrl && onboardingKey) {
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
        if (!railwayRes.ok) {
          const railwayBody = await railwayRes.json().catch(() => ({}))
          // 409 = duplicate trial — surface this to the user
          if (railwayRes.status === 409) {
            await admin.auth.admin.deleteUser(userId)
            return NextResponse.json(
              { error: railwayBody.message || 'This POS account has already had a free trial.' },
              { status: 409 },
            )
          }
          // Other errors: log and continue — account is still usable, admin can fix
          console.error('Railway onboard non-fatal error:', railwayRes.status, railwayBody)
        }
      } catch (railwayErr) {
        // Network error — log but don't block signup
        console.error('Railway onboard request failed (non-fatal):', railwayErr)
      }
    } else {
      console.warn('RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not set — skipping Railway provisioning')
    }

    // 3. Insert profile record
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
      console.error('Profile error:', profileError)
      // Clean up auth user if profile insert fails
      await admin.auth.admin.deleteUser(userId)
      return NextResponse.json({ error: 'Failed to create profile. ' + profileError.message }, { status: 500 })
    }

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

    await sendEmail({
      to: email,
      subject: `Welcome to TillTalk — your free trial has started`,
      text: `Welcome to TillTalk, ${fullName}! Your free 14-day trial has started. You'll receive WhatsApp setup instructions within 24 hours.`,
      html: welcomeHtml,
    })

    // 5. Send notification to admin
    const notificationEmail = process.env.NOTIFICATION_EMAIL || 'daniel@tilltalk.ie'
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

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('Signup error:', err)
    return NextResponse.json({ error: 'Internal server error.' }, { status: 500 })
  }
}
