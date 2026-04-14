'use client'

import { useState, useEffect } from 'react'
import {
  User, Mail, Lock, MapPin, Phone, Trash2,
  CheckCircle2, AlertCircle, RefreshCw, Pencil, X,
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import type { User as SupabaseUser } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface Profile {
  id: string
  restaurant_name?: string | null
  pos_type?: string | null
}

interface LocationEntry {
  id: number
  nickname: string
  pos_type: string
  active: boolean
}

interface NumberEntry {
  id: number
  phone_number: string
  name: string | null
  active: boolean
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

function SectionHeader({
  icon: Icon, title,
}: { icon: React.ComponentType<{ size: number; className?: string }>; title: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
        <Icon size={18} className="text-green-600" />
      </div>
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
    </div>
  )
}

function FieldRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start sm:items-center gap-2">
      <dt className="text-sm text-gray-500 w-32 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-gray-900 break-all">{value || '—'}</dd>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function AccountTab({
  profile,
  user,
  onProfileUpdate,
  onGoToManage,
}: {
  profile: Profile | null
  user: SupabaseUser
  onProfileUpdate: () => void
  onGoToManage: () => void
}) {
  const router = useRouter()
  const supabase = createClient()

  // ── Business name ────────────────────────────────────────────────────────
  const [editingName,  setEditingName]  = useState(false)
  const [nameValue,    setNameValue]    = useState(profile?.restaurant_name || '')
  const [savingName,   setSavingName]   = useState(false)
  const [nameMsg,      setNameMsg]      = useState('')

  async function handleSaveName() {
    setSavingName(true); setNameMsg('')
    const { error } = await supabase.from('profiles').update({ restaurant_name: nameValue }).eq('id', user.id)
    setSavingName(false)
    if (error) { setNameMsg('Error saving. Please try again.') }
    else        { setNameMsg('Saved!'); setEditingName(false); onProfileUpdate() }
  }

  // ── Email change ─────────────────────────────────────────────────────────
  const [showEmailForm, setShowEmailForm] = useState(false)
  const [newEmail,      setNewEmail]      = useState('')
  const [emailLoading,  setEmailLoading]  = useState(false)
  const [emailMsg,      setEmailMsg]      = useState('')

  async function handleEmailChange() {
    setEmailLoading(true); setEmailMsg('')
    const { error } = await supabase.auth.updateUser({ email: newEmail })
    setEmailLoading(false)
    if (error) { setEmailMsg(error.message) }
    else        { setEmailMsg('Confirmation sent to both addresses. Click the link in the new email to complete the change.') }
  }

  // ── Password change ──────────────────────────────────────────────────────
  const [showPwForm,   setShowPwForm]   = useState(false)
  const [currentPw,    setCurrentPw]    = useState('')
  const [newPw,        setNewPw]        = useState('')
  const [confirmPw,    setConfirmPw]    = useState('')
  const [pwLoading,    setPwLoading]    = useState(false)
  const [pwMsg,        setPwMsg]        = useState('')

  async function handlePasswordChange() {
    if (newPw !== confirmPw) { setPwMsg('New passwords do not match.'); return }
    if (newPw.length < 8)    { setPwMsg('Password must be at least 8 characters.'); return }
    setPwLoading(true); setPwMsg('')
    // Verify current password
    const { error: verifyErr } = await supabase.auth.signInWithPassword({
      email:    user.email!,
      password: currentPw,
    })
    if (verifyErr) { setPwLoading(false); setPwMsg('Current password is incorrect.'); return }
    const { error } = await supabase.auth.updateUser({ password: newPw })
    setPwLoading(false)
    if (error) { setPwMsg(error.message) }
    else        { setPwMsg('Password updated successfully.'); setShowPwForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw('') }
  }

  // ── POS connections ──────────────────────────────────────────────────────
  const [locations,        setLocations]        = useState<LocationEntry[]>([])
  const [locationsLoading, setLocationsLoading] = useState(true)
  const [disconnecting,    setDisconnecting]    = useState<number | null>(null)

  useEffect(() => {
    fetch('/api/manage/locations')
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => {
        setLocations((d?.locations ?? []).filter((l: LocationEntry) => l.active))
        setLocationsLoading(false)
      })
  }, [])

  async function handleDisconnect(id: number) {
    setDisconnecting(id)
    try {
      const res = await fetch(`/api/manage/locations/${id}`, { method: 'DELETE' })
      if (res.ok) setLocations(prev => prev.filter(l => l.id !== id))
    } finally {
      setDisconnecting(null)
    }
  }

  // ── WhatsApp numbers ─────────────────────────────────────────────────────
  const [numbers,        setNumbers]        = useState<NumberEntry[]>([])
  const [numbersLoading, setNumbersLoading] = useState(true)

  useEffect(() => {
    fetch('/api/manage/numbers')
      .then(r => r.ok ? r.json() : null).catch(() => null)
      .then(d => {
        setNumbers((d?.numbers ?? []).filter((n: NumberEntry) => n.active))
        setNumbersLoading(false)
      })
  }, [])

  // ── Delete account ───────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirm,   setDeleteConfirm]   = useState('')
  const [deleting,        setDeleting]        = useState(false)
  const [deleteError,     setDeleteError]     = useState('')

  async function handleDeleteAccount() {
    setDeleting(true); setDeleteError('')
    try {
      const res = await fetch('/api/account/delete', { method: 'DELETE' })
      if (!res.ok) {
        const body = await res.json().catch(() => ({}))
        throw new Error(body?.error ?? `Error ${res.status}`)
      }
      await supabase.auth.signOut()
      router.push('/')
    } catch (err) {
      setDeleteError(err instanceof Error ? err.message : 'Delete failed. Please contact support.')
      setDeleting(false)
    }
  }

  // ── Render ───────────────────────────────────────────────────────────────

  return (
    <div className="space-y-4">

      {/* ── Business Info ──────────────────────────────────────────────── */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-4">
          <SectionHeader icon={User} title="Account Details" />
          {!editingName && (
            <button
              onClick={() => { setEditingName(true); setNameValue(profile?.restaurant_name || '') }}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 min-h-[40px] px-2 shrink-0"
            >
              <Pencil size={13} />
              Edit
            </button>
          )}
        </div>

        {editingName ? (
          <div className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Business Name</label>
              <input
                type="text"
                value={nameValue}
                onChange={e => setNameValue(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
              />
            </div>
            {nameMsg && (
              <p className={`text-sm ${nameMsg.includes('Error') ? 'text-red-600' : 'text-green-600'}`}>{nameMsg}</p>
            )}
            <div className="flex gap-2">
              <button
                onClick={handleSaveName}
                disabled={savingName}
                className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors min-h-[40px]"
              >
                {savingName ? 'Saving…' : 'Save'}
              </button>
              <button
                onClick={() => { setEditingName(false); setNameMsg('') }}
                className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 min-h-[40px]"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <dl className="space-y-2.5">
            <FieldRow label="Business name" value={profile?.restaurant_name || ''} />
            <FieldRow label="Email"         value={user.email || ''} />
            <FieldRow label="POS system"    value={profile?.pos_type ? profile.pos_type.charAt(0).toUpperCase() + profile.pos_type.slice(1) : ''} />
          </dl>
        )}
      </Card>

      {/* ── Email & Password ───────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Mail} title="Email &amp; Password" />
        <div className="space-y-3">

          {/* Email change */}
          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Email address</p>
                <p className="text-xs text-gray-500 mt-0.5">{user.email}</p>
              </div>
              {!showEmailForm && (
                <button
                  onClick={() => { setShowEmailForm(true); setEmailMsg('') }}
                  className="text-sm text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Change
                </button>
              )}
            </div>
            {showEmailForm && (
              <div className="mt-3 space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">New email address</label>
                  <input
                    type="email"
                    value={newEmail}
                    onChange={e => setNewEmail(e.target.value)}
                    placeholder="new@example.com"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                </div>
                {emailMsg && (
                  <div className={`flex items-start gap-2 text-sm ${emailMsg.startsWith('Confirmation') ? 'text-green-600' : 'text-red-600'}`}>
                    {emailMsg.startsWith('Confirmation')
                      ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      : <AlertCircle  size={14} className="shrink-0 mt-0.5" />}
                    {emailMsg}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handleEmailChange}
                    disabled={emailLoading || !newEmail}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors min-h-[36px]"
                  >
                    {emailLoading ? <RefreshCw size={13} className="animate-spin" /> : 'Send confirmation'}
                  </button>
                  <button
                    onClick={() => { setShowEmailForm(false); setNewEmail(''); setEmailMsg('') }}
                    className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 min-h-[36px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Password change */}
          <div className="border border-gray-100 rounded-xl p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-sm font-medium text-gray-900">Password</p>
                <p className="text-xs text-gray-500 mt-0.5">Last changed: unknown</p>
              </div>
              {!showPwForm && (
                <button
                  onClick={() => { setShowPwForm(true); setPwMsg('') }}
                  className="text-sm text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-3 py-1.5 rounded-lg transition-colors"
                >
                  Change
                </button>
              )}
            </div>
            {showPwForm && (
              <div className="mt-3 space-y-3">
                {[
                  { label: 'Current password', value: currentPw, onChange: setCurrentPw },
                  { label: 'New password',      value: newPw,     onChange: setNewPw     },
                  { label: 'Confirm new password', value: confirmPw, onChange: setConfirmPw },
                ].map(({ label, value, onChange }) => (
                  <div key={label}>
                    <label className="block text-xs font-medium text-gray-700 mb-1">{label}</label>
                    <input
                      type="password"
                      value={value}
                      onChange={e => onChange(e.target.value)}
                      autoComplete="new-password"
                      className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    />
                  </div>
                ))}
                {pwMsg && (
                  <div className={`flex items-start gap-2 text-sm ${pwMsg.includes('successfully') ? 'text-green-600' : 'text-red-600'}`}>
                    {pwMsg.includes('successfully')
                      ? <CheckCircle2 size={14} className="shrink-0 mt-0.5" />
                      : <AlertCircle  size={14} className="shrink-0 mt-0.5" />}
                    {pwMsg}
                  </div>
                )}
                <div className="flex gap-2">
                  <button
                    onClick={handlePasswordChange}
                    disabled={pwLoading || !currentPw || !newPw || !confirmPw}
                    className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors min-h-[36px]"
                  >
                    {pwLoading ? <RefreshCw size={13} className="animate-spin" /> : 'Update password'}
                  </button>
                  <button
                    onClick={() => { setShowPwForm(false); setCurrentPw(''); setNewPw(''); setConfirmPw(''); setPwMsg('') }}
                    className="text-sm text-gray-600 hover:text-gray-900 px-4 py-2 rounded-lg border border-gray-200 min-h-[36px]"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* ── POS Connections ────────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={MapPin} title="POS Connections" />
        {locationsLoading ? (
          <div className="space-y-2">
            {[1, 2].map(i => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : locations.length === 0 ? (
          <div className="text-center py-6">
            <MapPin className="mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-sm text-gray-500 mb-3">No POS connections yet.</p>
            <button
              onClick={onGoToManage}
              className="text-sm text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-4 py-2 rounded-lg transition-colors"
            >
              Add a location
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {locations.map(loc => (
              <div key={loc.id} className="flex items-center justify-between gap-3 border border-gray-100 rounded-xl px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center shrink-0">
                    <MapPin size={14} className="text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{loc.nickname}</p>
                    <p className="text-xs text-gray-500 capitalize">{loc.pos_type}</p>
                  </div>
                </div>
                <button
                  onClick={() => handleDisconnect(loc.id)}
                  disabled={disconnecting === loc.id}
                  className="flex items-center gap-1.5 text-xs text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-3 py-1.5 rounded-lg transition-colors shrink-0 disabled:opacity-50"
                >
                  {disconnecting === loc.id
                    ? <RefreshCw size={12} className="animate-spin" />
                    : <Trash2 size={12} />}
                  Disconnect
                </button>
              </div>
            ))}
            <button
              onClick={onGoToManage}
              className="text-xs text-green-600 hover:text-green-700 mt-1"
            >
              Manage all locations →
            </button>
          </div>
        )}
      </Card>

      {/* ── WhatsApp Numbers ───────────────────────────────────────────── */}
      <Card>
        <SectionHeader icon={Phone} title="WhatsApp Numbers" />
        {numbersLoading ? (
          <div className="space-y-2">
            {[1].map(i => (
              <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />
            ))}
          </div>
        ) : numbers.length === 0 ? (
          <div className="text-center py-6">
            <Phone className="mx-auto mb-2 text-gray-300" size={32} />
            <p className="text-sm text-gray-500 mb-3">No WhatsApp numbers registered.</p>
            <button
              onClick={onGoToManage}
              className="text-sm text-green-600 hover:text-green-700 border border-green-200 hover:border-green-300 px-4 py-2 rounded-lg transition-colors"
            >
              Add a number
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            {numbers.map(num => (
              <div key={num.id} className="flex items-center gap-3 border border-gray-100 rounded-xl px-4 py-3">
                <div className="w-8 h-8 bg-green-50 rounded-lg flex items-center justify-center shrink-0">
                  <Phone size={14} className="text-green-600" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900">{num.phone_number}</p>
                  {num.name && <p className="text-xs text-gray-500">{num.name}</p>}
                </div>
              </div>
            ))}
            <button
              onClick={onGoToManage}
              className="text-xs text-green-600 hover:text-green-700 mt-1"
            >
              Manage all numbers →
            </button>
          </div>
        )}
      </Card>

      {/* ── Danger zone ────────────────────────────────────────────────── */}
      <Card className="border-red-100">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-red-100 rounded-lg flex items-center justify-center shrink-0">
            <Trash2 size={18} className="text-red-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Danger Zone</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">
          Permanently delete your account and all associated data. This cannot be undone.
        </p>
        <button
          onClick={() => { setShowDeleteModal(true); setDeleteConfirm(''); setDeleteError('') }}
          className="flex items-center gap-2 text-sm font-medium text-red-600 hover:text-red-700 border border-red-200 hover:border-red-300 px-4 py-2.5 rounded-lg transition-colors min-h-[40px]"
        >
          <Trash2 size={14} />
          Delete account
        </button>
      </Card>

      {/* ── Delete confirmation modal ───────────────────────────────────── */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center shrink-0">
                <Trash2 size={20} className="text-red-600" />
              </div>
              <button
                onClick={() => setShowDeleteModal(false)}
                className="text-gray-400 hover:text-gray-600 mt-1"
              >
                <X size={18} />
              </button>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Delete account</h3>
            <p className="text-sm text-gray-600 mb-4">
              This will permanently delete your account, all your data, and cancel any active subscriptions. This action cannot be undone.
            </p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Type <span className="font-mono font-bold text-red-600">DELETE</span> to confirm
              </label>
              <input
                type="text"
                value={deleteConfirm}
                onChange={e => setDeleteConfirm(e.target.value)}
                placeholder="DELETE"
                className="w-full border border-gray-300 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
              />
            </div>
            {deleteError && (
              <div className="flex items-start gap-2 text-sm text-red-600 mb-3">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                {deleteError}
              </div>
            )}
            <div className="flex gap-3">
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirm !== 'DELETE' || deleting}
                className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white text-sm font-semibold px-4 py-2.5 rounded-lg transition-colors min-h-[40px]"
              >
                {deleting ? <RefreshCw size={14} className="animate-spin" /> : <Trash2 size={14} />}
                {deleting ? 'Deleting…' : 'Delete permanently'}
              </button>
              <button
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
                className="flex-1 text-sm font-medium text-gray-700 hover:text-gray-900 border border-gray-200 px-4 py-2.5 rounded-lg min-h-[40px] disabled:opacity-50"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  )
}
