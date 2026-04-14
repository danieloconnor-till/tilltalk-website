'use client'

import { useState, useRef, useEffect } from 'react'
import { Bell, MessageCircle, Pencil, Trash2, Check, X, RefreshCw } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NoteItem     { id: number; note_text: string; created_at: string }
interface ReminderItem { id: number; text: string; remind_at: string }

interface Props {
  notes:     NoteItem[]
  reminders: ReminderItem[]
  loading:   boolean
  onRefresh: () => void
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Skeleton({ className = '' }: { className?: string }) {
  return <div className={`bg-gray-200 rounded animate-pulse ${className}`} />
}

function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-IE', {
    weekday: 'short', day: 'numeric', month: 'short',
    hour: '2-digit', minute: '2-digit',
  })
}

// ---------------------------------------------------------------------------
// Confirmation modal
// ---------------------------------------------------------------------------

function DeleteModal({
  label, onConfirm, onCancel, busy,
}: { label: string; onConfirm: () => void; onCancel: () => void; busy: boolean }) {
  // Close on backdrop click
  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onCancel()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <p className="text-sm font-semibold text-gray-900 mb-1">Delete this {label}?</p>
        <p className="text-sm text-gray-500 mb-5">
          This action can&apos;t be undone. Do you want to proceed?
        </p>
        <div className="flex gap-3 justify-end">
          <button
            onClick={onCancel}
            disabled={busy}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 hover:border-gray-300 rounded-lg transition-colors min-h-[40px] disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={busy}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 disabled:bg-red-400 rounded-lg transition-colors min-h-[40px]"
          >
            {busy
              ? <RefreshCw size={13} className="animate-spin" />
              : <Trash2 size={13} />}
            {busy ? 'Deleting…' : 'Confirm'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Inline editable text — auto-grows to content
// ---------------------------------------------------------------------------

function InlineEdit({
  value, onChange, onSave, onCancel, saving, placeholder,
}: {
  value: string
  onChange: (v: string) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  placeholder?: string
}) {
  const ref = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    ref.current?.focus()
    // Place cursor at end
    const len = ref.current?.value.length ?? 0
    ref.current?.setSelectionRange(len, len)
  }, [])

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onSave() }
    if (e.key === 'Escape') onCancel()
  }

  return (
    <div className="flex items-start gap-2 w-full">
      <textarea
        ref={ref}
        value={value}
        onChange={e => onChange(e.target.value)}
        onKeyDown={handleKey}
        placeholder={placeholder}
        rows={2}
        className="flex-1 text-sm text-gray-900 bg-white border border-green-400 rounded-lg px-2.5 py-1.5 resize-none focus:outline-none focus:ring-2 focus:ring-green-400 focus:ring-offset-0 leading-snug"
      />
      <div className="flex flex-col gap-1 shrink-0 mt-0.5">
        <button
          onClick={onSave}
          disabled={saving || !value.trim()}
          title="Save (Enter)"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-green-600 hover:bg-green-700 disabled:bg-green-300 text-white transition-colors"
        >
          {saving ? <RefreshCw size={11} className="animate-spin" /> : <Check size={13} />}
        </button>
        <button
          onClick={onCancel}
          disabled={saving}
          title="Cancel (Esc)"
          className="w-7 h-7 flex items-center justify-center rounded-md bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors"
        >
          <X size={13} />
        </button>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Row action buttons (pencil + trash)
// ---------------------------------------------------------------------------

function RowActions({
  onEdit, onDelete,
}: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex gap-1 shrink-0 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
      <button
        onClick={onEdit}
        title="Edit"
        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
      >
        <Pencil size={13} />
      </button>
      <button
        onClick={onDelete}
        title="Delete"
        className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors"
      >
        <Trash2 size={13} />
      </button>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function NotesSection({ notes, reminders, loading, onRefresh }: Props) {
  // Edit state
  const [editNoteId,       setEditNoteId]       = useState<number | null>(null)
  const [editNoteText,     setEditNoteText]     = useState('')
  const [editReminderId,   setEditReminderId]   = useState<number | null>(null)
  const [editReminderText, setEditReminderText] = useState('')

  // Delete modal
  const [deleteNoteId,     setDeleteNoteId]     = useState<number | null>(null)
  const [deleteReminderId, setDeleteReminderId] = useState<number | null>(null)

  // Per-item loading
  const [savingId,   setSavingId]   = useState<number | null>(null)
  const [deletingId, setDeletingId] = useState<number | null>(null)

  // ── Notes ────────────────────────────────────────────────────────────────

  function startEditNote(n: NoteItem) {
    setEditReminderId(null)           // cancel any open reminder edit
    setEditNoteId(n.id)
    setEditNoteText(n.note_text)
  }

  async function saveNote(id: number) {
    if (!editNoteText.trim()) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ note_text: editNoteText.trim() }),
      })
      if (res.ok) { setEditNoteId(null); onRefresh() }
    } finally {
      setSavingId(null)
    }
  }

  async function confirmDeleteNote(id: number) {
    setDeletingId(id)
    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' })
      setDeleteNoteId(null)
      onRefresh()
    } finally {
      setDeletingId(null)
    }
  }

  // ── Reminders ────────────────────────────────────────────────────────────

  function startEditReminder(r: ReminderItem) {
    setEditNoteId(null)               // cancel any open note edit
    setEditReminderId(r.id)
    setEditReminderText(r.text)
  }

  async function saveReminder(id: number) {
    if (!editReminderText.trim()) return
    setSavingId(id)
    try {
      const res = await fetch(`/api/reminders/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reminder_text: editReminderText.trim() }),
      })
      if (res.ok) { setEditReminderId(null); onRefresh() }
    } finally {
      setSavingId(null)
    }
  }

  async function confirmDeleteReminder(id: number) {
    setDeletingId(id)
    try {
      await fetch(`/api/reminders/${id}`, { method: 'DELETE' })
      setDeleteReminderId(null)
      onRefresh()
    } finally {
      setDeletingId(null)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Upcoming Reminders ─────────────────────────────────────────── */}
      {!loading && reminders.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <Bell size={18} className="text-green-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Upcoming Reminders</h2>
          </div>
          <div className="space-y-2">
            {reminders.map(r => (
              <div key={r.id} className="group flex items-start gap-3 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2.5">
                <Bell size={14} className="text-amber-500 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  {editReminderId === r.id ? (
                    <InlineEdit
                      value={editReminderText}
                      onChange={setEditReminderText}
                      onSave={() => saveReminder(r.id)}
                      onCancel={() => setEditReminderId(null)}
                      saving={savingId === r.id}
                      placeholder="Reminder text…"
                    />
                  ) : (
                    <>
                      <p className="text-sm text-gray-800">{r.text}</p>
                      <p className="text-xs text-amber-600 mt-0.5">{fmtDate(r.remind_at)}</p>
                    </>
                  )}
                </div>
                {editReminderId !== r.id && (
                  <RowActions
                    onEdit={() => startEditReminder(r)}
                    onDelete={() => setDeleteReminderId(r.id)}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Notes Feed ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <MessageCircle size={18} className="text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Notes</h2>
        </div>

        {loading ? (
          <div className="space-y-3">
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
            <Skeleton className="h-14 w-full" />
          </div>
        ) : notes.length === 0 ? (
          <div className="text-center py-8">
            <MessageCircle className="mx-auto mb-3 text-gray-200" size={36} />
            <p className="text-sm font-medium text-gray-600 mb-1">No notes yet</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Send a note to TillTalk on WhatsApp — e.g.{' '}
              <span className="font-mono bg-gray-100 px-1 rounded">note: check wine stock before Saturday</span>
            </p>
          </div>
        ) : (
          <div className="divide-y divide-gray-50 max-h-[480px] overflow-y-auto -mx-1 px-1">
            {notes.map(n => (
              <div key={n.id} className="group flex items-start gap-3 py-3 first:pt-0 last:pb-0">
                <div className="w-2 h-2 rounded-full bg-green-400 shrink-0 mt-1.5" />
                <div className="flex-1 min-w-0">
                  {editNoteId === n.id ? (
                    <InlineEdit
                      value={editNoteText}
                      onChange={setEditNoteText}
                      onSave={() => saveNote(n.id)}
                      onCancel={() => setEditNoteId(null)}
                      saving={savingId === n.id}
                      placeholder="Note text…"
                    />
                  ) : (
                    <>
                      <p className="text-sm text-gray-900 leading-snug">{n.note_text}</p>
                      <p className="text-xs text-gray-400 mt-0.5">{fmtDate(n.created_at)}</p>
                    </>
                  )}
                </div>
                {editNoteId !== n.id && (
                  <RowActions
                    onEdit={() => startEditNote(n)}
                    onDelete={() => setDeleteNoteId(n.id)}
                  />
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Delete modals ──────────────────────────────────────────────── */}
      {deleteNoteId !== null && (
        <DeleteModal
          label="note"
          onConfirm={() => confirmDeleteNote(deleteNoteId)}
          onCancel={() => setDeleteNoteId(null)}
          busy={deletingId === deleteNoteId}
        />
      )}
      {deleteReminderId !== null && (
        <DeleteModal
          label="reminder"
          onConfirm={() => confirmDeleteReminder(deleteReminderId)}
          onCancel={() => setDeleteReminderId(null)}
          busy={deletingId === deleteReminderId}
        />
      )}
    </>
  )
}
