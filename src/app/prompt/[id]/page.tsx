import { createServiceRoleClient } from '@/lib/supabase/admin'
import PromptDisplay from './PromptDisplay'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ id: string }>
}

const containerStyle: React.CSSProperties = {
  minHeight:      '100vh',
  display:        'flex',
  flexDirection:  'column',
  alignItems:     'center',
  justifyContent: 'center',
  padding:        '40px 20px',
  background:     '#0a0c10',
  boxSizing:      'border-box',
}

const messageStyle: React.CSSProperties = {
  color:      '#8b949e',
  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
  fontSize:   '16px',
}

export default async function PromptPage({ params }: Props) {
  const { id } = await params
  const supabase = createServiceRoleClient()

  const { data, error } = await supabase
    .from('claude_prompts')
    .select('id, content, created_at, expires_at')
    .eq('id', id)
    .single()

  if (error || !data) {
    return (
      <div style={containerStyle}>
        <p style={messageStyle}>Prompt not found.</p>
      </div>
    )
  }

  if (data.expires_at && new Date(data.expires_at) < new Date()) {
    return (
      <div style={containerStyle}>
        <p style={messageStyle}>This prompt has expired.</p>
      </div>
    )
  }

  return (
    <div style={containerStyle}>
      <PromptDisplay content={data.content} />
    </div>
  )
}
