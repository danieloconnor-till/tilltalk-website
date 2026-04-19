'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'

type Status = 'loading' | 'ok' | 'not_found' | 'expired' | 'error'

export default function PromptPage() {
  const params  = useParams()
  const id      = params?.id as string

  const [content, setContent] = useState<string | null>(null)
  const [status,  setStatus]  = useState<Status>('loading')
  const [copied,  setCopied]  = useState(false)

  useEffect(() => {
    if (!id) { setStatus('not_found'); return }
    fetch(`/api/prompt?id=${encodeURIComponent(id)}`)
      .then(async res => {
        if (res.status === 410) { setStatus('expired'); return }
        if (res.status === 404) { setStatus('not_found'); return }
        if (!res.ok)            { setStatus('error'); return }
        const data = await res.json()
        if (data?.content) { setContent(data.content); setStatus('ok') }
        else { setStatus('not_found') }
      })
      .catch(() => setStatus('error'))
  }, [id])

  function handleCopy() {
    if (!content) return
    navigator.clipboard.writeText(content).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (status === 'not_found') {
    return (
      <div style={styles.page}>
        <p style={styles.expired}>This prompt does not exist.</p>
      </div>
    )
  }

  if (status === 'expired') {
    return (
      <div style={styles.page}>
        <p style={styles.expired}>This prompt has expired (prompts are valid for 24 hours).</p>
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div style={styles.page}>
        <p style={styles.expired}>Failed to load prompt — please try again.</p>
      </div>
    )
  }

  if (!content) {
    return (
      <div style={styles.page}>
        <p style={styles.loading}>Loading…</p>
      </div>
    )
  }

  return (
    <div style={styles.page}>
      <pre style={styles.code}>{content}</pre>
      <button
        style={copied ? { ...styles.button, ...styles.buttonCopied } : styles.button}
        onClick={handleCopy}
      >
        {copied ? 'Copied ✓' : 'Copy'}
      </button>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  page: {
    minHeight:      '100vh',
    display:        'flex',
    flexDirection:  'column',
    alignItems:     'center',
    justifyContent: 'center',
    padding:        '2rem',
    background:     '#f9fafb',
    fontFamily:     'system-ui, sans-serif',
  },
  code: {
    background:   '#1e1e1e',
    color:        '#d4d4d4',
    borderRadius: '0.5rem',
    padding:      '1.5rem',
    maxWidth:     '860px',
    width:        '100%',
    whiteSpace:   'pre-wrap',
    wordBreak:    'break-word',
    fontSize:     '0.875rem',
    lineHeight:   '1.6',
    overflowX:    'auto',
    boxShadow:    '0 4px 24px rgba(0,0,0,0.12)',
  },
  button: {
    marginTop:    '1.5rem',
    padding:      '0.75rem 2.5rem',
    fontSize:     '1.125rem',
    fontWeight:   600,
    borderRadius: '0.5rem',
    border:       'none',
    cursor:       'pointer',
    background:   '#16a34a',
    color:        '#fff',
    transition:   'background 0.15s',
  },
  buttonCopied: {
    background: '#15803d',
  },
  expired: {
    fontSize:  '1.125rem',
    color:     '#6b7280',
    textAlign: 'center',
  },
  loading: {
    fontSize: '1rem',
    color:    '#9ca3af',
  },
}
