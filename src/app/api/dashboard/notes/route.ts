import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
// GET /api/dashboard/notes
// Returns pending reminders and open notes for the authenticated user.
// Reads directly from Supabase — no Railway proxy needed.

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ reminders: [], notes: [] })

  const [notesRes, remindersRes] = await Promise.all([
    supabase
      .from('notes')
      .select('id, note_text, created_at')
      .eq('client_id', user.id)
      .eq('is_complete', false)
      .order('created_at', { ascending: false }),

    supabase
      .from('reminders')
      .select('id, reminder_text, remind_at, appointment_at')
      .eq('client_id', user.id)
      .eq('is_sent', false)
      .order('remind_at', { ascending: true }),
  ])

  const notes = (notesRes.data ?? []).map(n => ({
    id:         n.id,
    note_text:  n.note_text,
    created_at: n.created_at,
  }))

  const reminders = (remindersRes.data ?? []).map(r => ({
    id:             r.id,
    text:           r.reminder_text,
    remind_at:      r.remind_at,
    appointment_at: r.appointment_at ?? null,
  }))

  return NextResponse.json({ notes, reminders })
}
