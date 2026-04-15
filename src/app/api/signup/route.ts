import { NextResponse } from 'next/server'
import { createHash, randomBytes } from 'node:crypto'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/sendgrid'
import { welcomeEmail } from '@/lib/email-templates'

// ── Referral code helpers ─────────────────────────────────────────────────────

const REFERRAL_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'

function generateReferralCode(): string {
  const bytes = randomBytes(8)
  return Array.from(bytes).map(b => REFERRAL_CHARS[b % REFERRAL_CHARS.length]).join('')
}

// ── Trial fingerprint helpers ─────────────────────────────────────────────────

// Free/consumer email providers — we skip domain-level fingerprinting for these
// because the same domain can host millions of unrelated users.
const FREE_EMAIL_DOMAINS = new Set([
  'gmail.com', 'googlemail.com', 'yahoo.com', 'yahoo.co.uk', 'yahoo.ie',
  'hotmail.com', 'hotmail.co.uk', 'hotmail.ie', 'outlook.com', 'outlook.ie',
  'live.com', 'live.ie', 'icloud.com', 'me.com', 'msn.com', 'aol.com',
  'mail.com', 'protonmail.com', 'proton.me', 'fastmail.com', 'gmx.com',
  'gmx.net', 'ymail.com', 'rocketmail.com', 'btinternet.com', 'sky.com',
])

function sha256hex(value: string): string {
  return createHash('sha256').update(value.toLowerCase()).digest('hex')
}

function getSignupIp(request: Request): string | null {
  const h = request.headers
  return (
    (h as Headers).get('x-real-ip') ||
    (h as Headers).get('x-forwarded-for')?.split(',')[0]?.trim() ||
    null
  )
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { email, password, fullName, restaurantName, posType, whatsappNumber, plan, turnstileToken, utmSource, refCode } = body

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

    // 1a. Trial abuse fingerprint check (non-owner signups only)
    const emailDomain    = email.toLowerCase().split('@')[1] ?? ''
    const isBusinessDomain = !FREE_EMAIL_DOMAINS.has(emailDomain)
    const ipAddress      = getSignupIp(request)
    const emailDomainHash = isBusinessDomain ? sha256hex(emailDomain) : null
    const ipHash          = ipAddress ? sha256hex(ipAddress) : null

    if (!isOwner) {
      if (emailDomainHash) {
        const { data: domainMatch } = await admin
          .from('trial_fingerprints')
          .select('id')
          .eq('email_domain_hash', emailDomainHash)
          .limit(1)
          .maybeSingle()

        if (domainMatch) {
          console.warn('[signup] trial fingerprint match (email domain):', emailDomain)
          return NextResponse.json(
            { error: 'A free trial has already been used for this business. Please subscribe to continue at tilltalk.ie' },
            { status: 409 },
          )
        }
      }

      if (ipHash) {
        const { data: ipMatch } = await admin
          .from('trial_fingerprints')
          .select('id')
          .eq('ip_hash', ipHash)
          .limit(1)
          .maybeSingle()

        if (ipMatch) {
          console.warn('[signup] trial fingerprint match (IP) for:', email)
          return NextResponse.json(
            { error: 'A free trial has already been used from this location. Please subscribe to continue at tilltalk.ie' },
            { status: 409 },
          )
        }
      }
    }

    // 1b. Create Supabase auth user and generate confirmation link
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

    // 2. Provision client in Railway (required for all non-owner signups)
    // FATAL — if Railway fails, we abort and delete the auth user so we never end up
    // with an orphaned Supabase user that has no Railway client record.
    // The only non-error early-return is a 409 (duplicate trial).
    const railwayUrl = process.env.RAILWAY_ONBOARDING_URL
    const onboardingKey = process.env.ONBOARDING_API_KEY

    // Generate referral code for this new user (owner accounts don't get one)
    const newReferralCode = isOwner ? null : generateReferralCode()

    if (!isOwner) {
      if (!railwayUrl || !onboardingKey) {
        console.error('[signup] RAILWAY_ONBOARDING_URL or ONBOARDING_API_KEY not configured — aborting signup')
        await admin.auth.admin.deleteUser(userId).catch((e: unknown) =>
          console.error('[signup] deleteUser after config error (non-fatal):', e)
        )
        return NextResponse.json({ error: 'Service configuration error. Please contact support.' }, { status: 500 })
      }

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
            referral_code: newReferralCode,
          }),
          signal: AbortSignal.timeout(12000),
        })
        const railwayBody = await railwayRes.json().catch(() => ({}))
        console.log('[signup] Railway response — status:', railwayRes.status, 'body:', railwayBody)

        if (railwayRes.status === 409) {
          // Duplicate trial — clean up auth user and tell the user why.
          console.warn('[signup] Railway 409 — duplicate trial, deleting auth user and aborting')
          await admin.auth.admin.deleteUser(userId).catch((e: unknown) =>
            console.error('[signup] deleteUser after 409 failed (non-fatal):', e)
          )
          earlyReturn = NextResponse.json(
            { error: (railwayBody as { message?: string }).message || 'This POS account has already had a free trial.' },
            { status: 409 },
          )
        } else if (!railwayRes.ok) {
          // Railway returned an error — abort to avoid an orphaned Supabase user.
          console.error('[signup] Railway returned non-ok status, aborting:', railwayRes.status, railwayBody)
          await admin.auth.admin.deleteUser(userId).catch((e: unknown) =>
            console.error('[signup] deleteUser after Railway error (non-fatal):', e)
          )
          return NextResponse.json({ error: 'Failed to set up your account. Please try again.' }, { status: 500 })
        }
      } catch (railwayErr) {
        // Network error or timeout — abort to avoid an orphaned Supabase user.
        console.error('[signup] Railway request failed, aborting:', railwayErr)
        await admin.auth.admin.deleteUser(userId).catch((e: unknown) =>
          console.error('[signup] deleteUser after Railway timeout (non-fatal):', e)
        )
        return NextResponse.json({ error: 'Failed to set up your account. Please try again.' }, { status: 500 })
      }
      // Return 409 outside the try/catch so deleteUser errors don't suppress it.
      if (earlyReturn) return earlyReturn
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
      referral_code: newReferralCode,
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

    // 3a. Store trial fingerprint so future signups with the same domain/IP are blocked
    if (!isOwner && (emailDomainHash || ipHash)) {
      admin.from('trial_fingerprints').insert({
        ...(emailDomainHash ? { email_domain_hash: emailDomainHash } : {}),
        ...(ipHash          ? { ip_hash: ipHash }                    : {}),
      }).then(({ error: fpErr }) => {
        if (fpErr) console.error('[signup] fingerprint store failed (non-fatal):', fpErr)
      })
    }

    // 3b. Referral attribution — if a refCode was supplied, create a referrals record (non-fatal)
    if (!isOwner && refCode && typeof refCode === 'string') {
      ;(async () => {
        try {
          const { data: referrer } = await admin
            .from('profiles')
            .select('id')
            .eq('referral_code', refCode.trim().toUpperCase())
            .maybeSingle()

          if (referrer && referrer.id !== userId) {
            const { error: refErr } = await admin.from('referrals').insert({
              referrer_id:    referrer.id,
              referred_id:    userId,
              referred_email: email,
              status:         'signed_up',
            })
            if (refErr) {
              console.error('[signup] referral record insert failed (non-fatal):', refErr)
            } else {
              console.log('[signup] referral attributed: referrer', referrer.id, '→ referred', userId)
            }
          }
        } catch (refAttrErr) {
          console.error('[signup] referral attribution error (non-fatal):', refAttrErr)
        }
      })()
    }

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
