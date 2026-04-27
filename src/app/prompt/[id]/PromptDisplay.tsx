'use client'

import { useState } from 'react'

export default function PromptDisplay({ content }: { content: string }) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    await navigator.clipboard.writeText(content)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      gap: '12px',
      width: '100%',
      maxWidth: '900px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={handleCopy}
          style={{
            padding: '8px 20px',
            background: copied ? '#22c55e' : '#3b82f6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            fontSize: '14px',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.15s',
          }}
        >
          {copied ? 'Copied!' : 'Copy to clipboard'}
        </button>
      </div>
      <pre style={{
        margin: 0,
        padding: '24px',
        background: '#0d1117',
        color: '#e6edf3',
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
        fontSize: '13px',
        lineHeight: '1.6',
        borderRadius: '8px',
        border: '1px solid #30363d',
        whiteSpace: 'pre-wrap',
        wordBreak: 'break-word',
        overflowX: 'auto',
        width: '100%',
        boxSizing: 'border-box',
      }}>
        {content}
      </pre>
    </div>
  )
}
