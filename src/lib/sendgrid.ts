interface EmailOptions {
  to: string
  subject: string
  text: string
  html?: string
}

export async function sendEmail(options: EmailOptions): Promise<void> {
  const apiKey = process.env.SENDGRID_API_KEY

  if (!apiKey || apiKey === 'REPLACE_ME') {
    console.log('[SendGrid] Email not sent (no API key configured)')
    console.log('[SendGrid] Would have sent to:', options.to)
    console.log('[SendGrid] Subject:', options.subject)
    console.log('[SendGrid] Body:', options.text)
    return
  }

  const response = await fetch('https://api.sendgrid.com/v3/mail/send', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      personalizations: [{ to: [{ email: options.to }] }],
      from: { email: 'hello@tilltalk.ie', name: 'TillTalk' },
      subject: options.subject,
      content: [
        {
          type: 'text/plain',
          value: options.text,
        },
        ...(options.html
          ? [{ type: 'text/html', value: options.html }]
          : []),
      ],
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    console.error('[SendGrid] Failed to send email:', body)
  }
}
