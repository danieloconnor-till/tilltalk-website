import { NextResponse } from 'next/server'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/sendgrid'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, restaurantName, posType, whatsappNumber, plan } = body

    if (!email || !password || !fullName || !restaurantName || !posType || !whatsappNumber) {
      return NextResponse.json({ error: 'All fields are required.' }, { status: 400 })
    }

    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters.' }, { status: 400 })
    }

    const admin = createServiceRoleClient()

    // 1. Create Supabase auth user
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: false,
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

    // 2. Insert profile record
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

    // 3. Send welcome email
    const welcomeHtml = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #16a34a;">Welcome to TillTalk, ${fullName}!</h1>
        <p>Your free 14-day trial has started.</p>
        <h2>What happens next?</h2>
        <ul>
          <li>Check your email to confirm your account</li>
          <li>You'll receive WhatsApp setup instructions within 24 hours</li>
          <li>Your 14-day free trial is now active — no credit card needed</li>
        </ul>
        <h2>Your account details</h2>
        <ul>
          <li><strong>Restaurant:</strong> ${restaurantName}</li>
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

    // 4. Send notification to admin
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
