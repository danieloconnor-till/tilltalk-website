/**
 * TillTalk email template system.
 * All templates are built on a shared base that enforces consistent branding.
 */

// ---------------------------------------------------------------------------
// Base template
// ---------------------------------------------------------------------------

function baseEmail(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta http-equiv="X-UA-Compatible" content="IE=edge" />
  <title>TillTalk</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background-color: #f3f4f6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-text-size-adjust: 100%; }
    a { color: #16a34a; }
    @media only screen and (max-width: 620px) {
      .wrapper { padding: 16px !important; }
      .card    { padding: 28px 20px !important; }
      .btn     { display: block !important; text-align: center !important; }
    }
  </style>
</head>
<body style="background-color:#f3f4f6;margin:0;padding:0;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#f3f4f6;">
    <tr>
      <td class="wrapper" style="padding:40px 16px;">

        <!-- Logo header -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto 24px;">
          <tr>
            <td style="text-align:center;padding:0 0 8px;">
              <span style="font-size:22px;font-weight:800;color:#16a34a;letter-spacing:-0.5px;">TillTalk</span>
            </td>
          </tr>
        </table>

        <!-- Card -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:0 auto;">
          <tr>
            <td class="card" style="background:#ffffff;border-radius:16px;padding:40px 40px;border:1px solid #e5e7eb;">
              ${content}
            </td>
          </tr>
        </table>

        <!-- Footer -->
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:600px;margin:24px auto 0;">
          <tr>
            <td style="text-align:center;padding:0 0 8px;">
              <p style="font-size:13px;color:#6b7280;line-height:1.6;margin:0;">
                <a href="https://tilltalk.ie" style="color:#6b7280;text-decoration:none;">tilltalk.ie</a>
                &nbsp;&middot;&nbsp;
                Built in Ireland 🇮🇪
              </p>
              <p style="font-size:12px;color:#9ca3af;margin:6px 0 0;">
                You're receiving this because you have a TillTalk account.
                &nbsp;<a href="{{{unsubscribe_url}}}" style="color:#9ca3af;">Unsubscribe</a>
              </p>
            </td>
          </tr>
        </table>

      </td>
    </tr>
  </table>
</body>
</html>`
}

// ---------------------------------------------------------------------------
// Shared sub-components
// ---------------------------------------------------------------------------

function primaryButton(text: string, url: string): string {
  return `
<table role="presentation" cellpadding="0" cellspacing="0" style="margin:32px auto;">
  <tr>
    <td style="border-radius:10px;background-color:#16a34a;">
      <a class="btn" href="${url}"
         style="display:inline-block;background-color:#16a34a;color:#ffffff;
                font-size:16px;font-weight:700;text-decoration:none;
                padding:14px 36px;border-radius:10px;line-height:1;">
        ${text}
      </a>
    </td>
  </tr>
</table>
<p style="font-size:12px;color:#9ca3af;text-align:center;margin:-20px 0 0;">
  Button not working? <a href="${url}" style="color:#6b7280;word-break:break-all;">${url}</a>
</p>`
}

function divider(): string {
  return `<hr style="border:none;border-top:1px solid #e5e7eb;margin:28px 0;" />`
}

function detailTable(rows: Array<[string, string]>): string {
  const cells = rows
    .map(
      ([label, value]) => `
      <tr>
        <td style="padding:8px 0;font-size:14px;color:#6b7280;width:160px;vertical-align:top;">${label}</td>
        <td style="padding:8px 0;font-size:14px;color:#111827;font-weight:600;">${value}</td>
      </tr>`
    )
    .join('')
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:#f9fafb;border-radius:10px;padding:4px 16px;margin:20px 0;">
  <tr><td>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
      ${cells}
    </table>
  </td></tr>
</table>`
}

function greenBadge(text: string): string {
  return `<span style="display:inline-block;background:#dcfce7;color:#15803d;font-size:12px;font-weight:700;
                        padding:3px 10px;border-radius:999px;letter-spacing:0.3px;">${text}</span>`
}

function alertBox(text: string, type: 'warning' | 'danger'): string {
  const bg    = type === 'warning' ? '#fefce8' : '#fef2f2'
  const border = type === 'warning' ? '#fde047' : '#fca5a5'
  const color = type === 'warning' ? '#854d0e' : '#991b1b'
  return `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"
       style="background:${bg};border:1px solid ${border};border-radius:10px;margin:20px 0;">
  <tr>
    <td style="padding:14px 18px;font-size:14px;color:${color};line-height:1.5;">${text}</td>
  </tr>
</table>`
}

// ---------------------------------------------------------------------------
// Welcome email
// ---------------------------------------------------------------------------

export function welcomeEmail(
  name: string,
  confirmationUrl: string,
  businessName: string,
  posType: string,
  plan: string,
): { subject: string; html: string; text: string } {
  const posLabel: Record<string, string> = { clover: 'Clover', square: 'Square', eposnow: 'Epos Now' }
  const planLabel: Record<string, string> = { starter: 'Starter — €29/mo', pro: 'Pro — €49/mo', business: 'Business — €99/mo' }

  const content = `
<h1 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 8px;">Welcome to TillTalk, ${name}! 👋</h1>
<p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
  Your 14-day free trial has started. Confirm your email below to activate your account and start asking questions about your sales on WhatsApp.
</p>

${primaryButton('Confirm my account', confirmationUrl)}

${divider()}

<h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 4px;">Your account details</h2>
${detailTable([
  ['Business', businessName],
  ['POS system', posLabel[posType] ?? posType],
  ['Plan', planLabel[plan] ?? plan],
  ['Trial ends', new Date(Date.now() + 14 * 864e5).toLocaleDateString('en-IE', { day: 'numeric', month: 'long', year: 'numeric' })],
])}

${divider()}

<h2 style="font-size:16px;font-weight:700;color:#111827;margin:0 0 12px;">What happens next</h2>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  ${[
    ['1', 'Confirm your email using the button above'],
    ['2', 'You\'ll receive WhatsApp setup instructions within 24 hours'],
    ['3', 'Start asking questions like <em>"What sold best this week?"</em>'],
  ].map(([n, text]) => `
  <tr>
    <td style="width:32px;vertical-align:top;padding:0 12px 14px 0;">
      <span style="display:inline-flex;align-items:center;justify-content:center;
                   width:26px;height:26px;background:#dcfce7;border-radius:50%;
                   font-size:12px;font-weight:700;color:#16a34a;">${n}</span>
    </td>
    <td style="padding:0 0 14px;font-size:14px;color:#374151;line-height:1.5;">${text}</td>
  </tr>`).join('')}
</table>

<p style="font-size:14px;color:#6b7280;margin:8px 0 0;">
  Questions? Reply to this email or contact <a href="mailto:hello@tilltalk.ie" style="color:#16a34a;">hello@tilltalk.ie</a>
</p>`

  return {
    subject: 'Welcome to TillTalk — confirm your account',
    html: baseEmail(content),
    text: `Welcome to TillTalk, ${name}!\n\nYour 14-day free trial has started. Confirm your account:\n${confirmationUrl}\n\nBusiness: ${businessName}\nPOS: ${posLabel[posType] ?? posType}\nPlan: ${plan}\n\nQuestions? hello@tilltalk.ie`,
  }
}

// ---------------------------------------------------------------------------
// Password reset email
// ---------------------------------------------------------------------------

export function passwordResetEmail(
  name: string,
  resetUrl: string,
): { subject: string; html: string; text: string } {
  const content = `
<h1 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 8px;">Reset your password</h1>
<p style="font-size:15px;color:#6b7280;margin:0 0 4px;line-height:1.6;">Hi ${name},</p>
<p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">
  We received a request to reset your TillTalk password. Click the button below to choose a new one. This link expires in <strong>1 hour</strong>.
</p>

${primaryButton('Reset my password', resetUrl)}

${divider()}

<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0;">
  If you didn't request a password reset, you can safely ignore this email — your account is secure and your password hasn't changed.
</p>
<p style="font-size:14px;color:#6b7280;margin:12px 0 0;">
  Need help? <a href="mailto:hello@tilltalk.ie" style="color:#16a34a;">hello@tilltalk.ie</a>
</p>`

  return {
    subject: 'Reset your TillTalk password',
    html: baseEmail(content),
    text: `Hi ${name},\n\nReset your TillTalk password:\n${resetUrl}\n\nThis link expires in 1 hour. If you didn't request this, ignore this email.\n\nhello@tilltalk.ie`,
  }
}

// ---------------------------------------------------------------------------
// Trial expiry warning — sent at day 11 (3 days left)
// ---------------------------------------------------------------------------

export function trialExpiryWarningEmail(
  name: string,
  daysLeft: number,
): { subject: string; html: string; text: string } {
  const content = `
<h1 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 8px;">Your trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}</h1>
<p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">Hi ${name},</p>

${alertBox(
  `Your free trial ends in <strong>${daysLeft} day${daysLeft === 1 ? '' : 's'}</strong>. After that, your WhatsApp access will be paused until you add payment details.`,
  'warning',
)}

<p style="font-size:15px;color:#374151;margin:0 0 20px;line-height:1.6;">
  To keep your access uninterrupted, contact us to set up billing — it only takes a couple of minutes.
</p>

${primaryButton('Keep my access →', 'mailto:hello@tilltalk.ie?subject=I want to continue my TillTalk subscription')}

${divider()}

<h2 style="font-size:15px;font-weight:700;color:#111827;margin:0 0 12px;">Your trial includes</h2>
<table role="presentation" cellpadding="0" cellspacing="0" width="100%">
  ${[
    'Natural-language sales queries via WhatsApp',
    'Revenue, item, and staff performance reports',
    'Email spreadsheet reports with charts',
    'Voice note support',
  ].map(f => `
  <tr>
    <td style="width:24px;vertical-align:top;padding:0 10px 10px 0;color:#16a34a;font-size:16px;">✓</td>
    <td style="padding:0 0 10px;font-size:14px;color:#374151;">${f}</td>
  </tr>`).join('')}
</table>

<p style="font-size:14px;color:#6b7280;margin:8px 0 0;">
  Questions? <a href="mailto:hello@tilltalk.ie" style="color:#16a34a;">hello@tilltalk.ie</a>
</p>`

  return {
    subject: `Your TillTalk trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}`,
    html: baseEmail(content),
    text: `Hi ${name},\n\nYour TillTalk free trial ends in ${daysLeft} day${daysLeft === 1 ? '' : 's'}.\n\nTo keep your access, reply to this email or contact hello@tilltalk.ie to set up billing.\n\nhello@tilltalk.ie`,
  }
}

// ---------------------------------------------------------------------------
// Trial expired email — sent at day 14 when access is paused
// ---------------------------------------------------------------------------

export function trialExpiredEmail(
  name: string,
): { subject: string; html: string; text: string } {
  const content = `
<h1 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 8px;">Your trial has ended</h1>
<p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">Hi ${name},</p>

${alertBox(
  'Your 14-day free trial has ended and your WhatsApp access has been paused. Your account and all settings are still saved — reactivating takes seconds.',
  'danger',
)}

<p style="font-size:15px;color:#374151;margin:20px 0;line-height:1.6;">
  To reactivate, get in touch and we'll have you back up and running right away.
</p>

${primaryButton('Reactivate my account', 'mailto:hello@tilltalk.ie?subject=I want to reactivate my TillTalk account')}

${divider()}

<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0;">
  Prefer to cancel instead? No problem — your account is already paused and you won't be charged.
  Just reply to let us know and we'll delete your data within 30 days.
</p>
<p style="font-size:14px;color:#6b7280;margin:12px 0 0;">
  Questions? <a href="mailto:hello@tilltalk.ie" style="color:#16a34a;">hello@tilltalk.ie</a>
</p>`

  return {
    subject: 'Your TillTalk trial has ended — reactivate to keep access',
    html: baseEmail(content),
    text: `Hi ${name},\n\nYour 14-day TillTalk free trial has ended and your WhatsApp access has been paused.\n\nTo reactivate, contact hello@tilltalk.ie.\n\nIf you'd prefer to cancel, just reply and we'll delete your data within 30 days.\n\nhello@tilltalk.ie`,
  }
}

// ---------------------------------------------------------------------------
// Payment failed email — sent when a Stripe payment attempt fails
// ---------------------------------------------------------------------------

export function paymentFailedEmail(
  name: string,
): { subject: string; html: string; text: string } {
  const content = `
<h1 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 8px;">Payment failed</h1>
<p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">Hi ${name},</p>

${alertBox(
  'We weren\'t able to process your payment and your TillTalk access has been paused. Your data is safe — reactivating is quick and easy.',
  'danger',
)}

<p style="font-size:15px;color:#374151;margin:20px 0;line-height:1.6;">
  To restore access, get in touch and we'll sort out billing right away.
</p>

${primaryButton('Reactivate my account', 'mailto:hello@tilltalk.ie?subject=Payment issue - reactivate my TillTalk account')}

${divider()}

<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0;">
  Your POS connection and all your data are still intact — nothing is lost.
  Once billing is resolved, you'll have full access again immediately.
</p>
<p style="font-size:14px;color:#6b7280;margin:12px 0 0;">
  Questions? <a href="mailto:hello@tilltalk.ie" style="color:#16a34a;">hello@tilltalk.ie</a>
</p>`

  return {
    subject: 'Payment failed — your TillTalk access has been paused',
    html: baseEmail(content),
    text: `Hi ${name},\n\nWe weren't able to process your TillTalk payment and your access has been paused.\n\nTo reactivate, contact hello@tilltalk.ie.\n\nYour data is safe and your POS connection is intact.\n\nhello@tilltalk.ie`,
  }
}

// ---------------------------------------------------------------------------
// Invoice email — sent when a card is successfully charged
// ---------------------------------------------------------------------------

export function invoiceEmail(
  name: string,
  invoiceNumber: string,
  amount: number,
  plan: string,
  billingDate: string,
  nextBillingDate: string,
): { subject: string; html: string; text: string } {
  const planLabel: Record<string, string> = { starter: 'Starter', pro: 'Pro', business: 'Business' }
  const amountFormatted = `€${amount.toFixed(2)}`

  const content = `
<table role="presentation" cellpadding="0" cellspacing="0" width="100%" style="margin:0 0 24px;">
  <tr>
    <td>
      <h1 style="font-size:24px;font-weight:800;color:#111827;margin:0 0 4px;">Payment receipt</h1>
      <p style="font-size:14px;color:#6b7280;margin:0;">${greenBadge('Payment confirmed')}</p>
    </td>
    <td style="text-align:right;vertical-align:top;">
      <p style="font-size:28px;font-weight:800;color:#111827;margin:0;">${amountFormatted}</p>
      <p style="font-size:12px;color:#6b7280;margin:4px 0 0;">incl. VAT</p>
    </td>
  </tr>
</table>

<p style="font-size:15px;color:#6b7280;margin:0 0 24px;line-height:1.6;">Hi ${name}, thanks for your payment. Here's your receipt.</p>

${detailTable([
  ['Invoice', invoiceNumber],
  ['Plan', planLabel[plan] ?? plan],
  ['Amount', amountFormatted],
  ['Billing date', billingDate],
  ['Next billing', nextBillingDate],
])}

${divider()}

<p style="font-size:14px;color:#6b7280;line-height:1.6;margin:0;">
  This receipt is for your records. To make changes to your subscription, contact
  <a href="mailto:hello@tilltalk.ie" style="color:#16a34a;">hello@tilltalk.ie</a>.
</p>
<p style="font-size:14px;color:#6b7280;margin:12px 0 0;">
  Need a VAT invoice? Reply to this email with your VAT number and company details.
</p>`

  return {
    subject: `TillTalk receipt — ${amountFormatted} on ${billingDate}`,
    html: baseEmail(content),
    text: `Hi ${name},\n\nPayment confirmed: ${amountFormatted}\n\nInvoice: ${invoiceNumber}\nPlan: ${planLabel[plan] ?? plan}\nBilling date: ${billingDate}\nNext billing: ${nextBillingDate}\n\nNeed a VAT invoice? Reply with your VAT number and company details.\n\nhello@tilltalk.ie`,
  }
}
