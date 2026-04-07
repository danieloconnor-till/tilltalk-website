'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Plus, Trash2, Eye, EyeOff, HelpCircle, X,
  Phone, MapPin, Lock, Users, Shield, CheckCircle2,
  AlertCircle, ToggleLeft, ToggleRight, Pencil,
} from 'lucide-react'
import { PLANS } from '@/lib/plans'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface NumberEntry {
  id: number
  phone_number: string
  name: string | null
  role: 'owner' | 'manager' | 'staff'
  active: boolean
}

interface LocationEntry {
  id: number
  nickname: string
  pos_type: string
  merchant_id: string | null
  api_key_set: boolean
  api_base: string | null
  active: boolean
}

interface ManageSectionProps {
  plan: string | null | undefined
}

type Tab = 'numbers' | 'locations' | 'permissions'

// ---------------------------------------------------------------------------
// Plan limits (mirrors manage.py)
// ---------------------------------------------------------------------------

const PLAN_LIMITS: Record<string, { numbers: number; locations: number }> = {
  starter:  { numbers: 2,   locations: 1  },
  pro:      { numbers: 4,   locations: 3  },
  business: { numbers: 999, locations: 10 },
}

function getLimits(plan: string | null | undefined) {
  return PLAN_LIMITS[(plan || 'starter').toLowerCase()] ?? PLAN_LIMITS.starter
}

// ---------------------------------------------------------------------------
// Credential help text per POS type
// ---------------------------------------------------------------------------

const CRED_GUIDE: Record<string, { idLabel: string | null; keyLabel: string; secretLabel: string | null; steps: string[] }> = {
  clover: {
    idLabel:     'Merchant ID',
    keyLabel:    'API Key',
    secretLabel: null,
    steps: [
      'Log in to your Clover dashboard at clover.com',
      'Go to Account & Setup → API Tokens',
      'Click "Create New Token" — grant Read permissions only',
      'Your Merchant ID is in the browser URL: /merchants/{MERCHANT_ID}/…',
    ],
  },
  square: {
    idLabel:     'Location ID',
    keyLabel:    'Access Token',
    secretLabel: null,
    steps: [
      'Log in to the Square Developer Portal at developer.squareup.com',
      'Select your application (or create one)',
      'Go to Credentials → Production and copy the Access Token',
      'Your Location ID is in Square Dashboard → Account & Settings → Business locations',
    ],
  },
  eposnow: {
    idLabel:     null,
    keyLabel:    'API Key',
    secretLabel: 'API Secret',
    steps: [
      'Log in to your Epos Now Back Office',
      'Navigate to App Store → API Settings',
      'Generate a new API Key and API Secret',
      'Paste both values into the fields below',
    ],
  },
}

function credGuide(posType: string) {
  return CRED_GUIDE[posType.toLowerCase()] ?? CRED_GUIDE.clover
}

// ---------------------------------------------------------------------------
// Role definitions (for Permissions tab)
// ---------------------------------------------------------------------------

const ROLES = [
  {
    role: 'owner',
    label: 'Owner',
    color: 'bg-green-100 text-green-800',
    perms: ['All reports & analytics', 'Manage numbers & locations', 'Billing & plan changes', 'Notes & reminders', 'Payroll entry'],
  },
  {
    role: 'manager',
    label: 'Manager',
    color: 'bg-blue-100 text-blue-800',
    perms: ['All reports & analytics', 'Notes & reminders', 'Payroll entry', 'No billing access', 'No team management'],
  },
  {
    role: 'staff',
    label: 'Staff',
    color: 'bg-gray-100 text-gray-700',
    perms: ['WhatsApp queries only (today\'s sales, basic info)', 'No reports', 'No billing or team management'],
  },
]

// ---------------------------------------------------------------------------
// Shared helpers
// ---------------------------------------------------------------------------

function PlanBar({ used, limit, label }: { used: number; limit: number; label: string }) {
  const atLimit = used >= limit
  const pct     = limit >= 999 ? 0 : Math.min(100, (used / limit) * 100)
  return (
    <div className="flex items-center gap-3 mb-4 bg-gray-50 rounded-xl px-3 py-2.5">
      <div className="flex-1">
        <div className="flex items-center justify-between mb-1">
          <span className="text-xs text-gray-600">{label}</span>
          <span className={`text-xs font-semibold ${atLimit ? 'text-amber-600' : 'text-gray-700'}`}>
            {used} / {limit >= 999 ? '∞' : limit}
          </span>
        </div>
        {limit < 999 && (
          <div className="w-full bg-gray-200 rounded-full h-1.5">
            <div className={`h-1.5 rounded-full transition-all ${atLimit ? 'bg-amber-500' : 'bg-green-500'}`}
              style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>
      {atLimit && (
        <a href="mailto:hello@tilltalk.ie?subject=Plan upgrade"
          className="text-xs text-amber-700 font-medium bg-amber-50 border border-amber-200 px-2 py-1 rounded-lg whitespace-nowrap hover:bg-amber-100 transition-colors">
          Upgrade
        </a>
      )}
    </div>
  )
}

function RoleBadge({ role }: { role: string }) {
  const r = ROLES.find(r => r.role === role)
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${r?.color ?? 'bg-gray-100 text-gray-700'}`}>
      {r?.label ?? role}
    </span>
  )
}

function ErrMsg({ msg }: { msg: string }) {
  return <p className="text-sm text-red-600 flex items-center gap-1.5"><AlertCircle size={14} />{msg}</p>
}

function OkMsg({ msg }: { msg: string }) {
  return <p className="text-sm text-green-600 flex items-center gap-1.5"><CheckCircle2 size={14} />{msg}</p>
}

// ---------------------------------------------------------------------------
// Numbers tab
// ---------------------------------------------------------------------------

function NumbersTab({ plan }: { plan: string | null | undefined }) {
  const [numbers,  setNumbers]  = useState<NumberEntry[]>([])
  const [count,    setCount]    = useState(0)
  const [loading,  setLoading]  = useState(true)
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null)
  const [adding,   setAdding]   = useState(false)
  const [saving,   setSaving]   = useState(false)
  const [editId,   setEditId]   = useState<number | null>(null)
  const [editRole, setEditRole] = useState<string>('staff')

  // Add form state
  const [newPhone, setNewPhone] = useState('')
  const [newName,  setNewName]  = useState('')
  const [newRole,  setNewRole]  = useState('staff')

  const limits = getLimits(plan)

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/manage/numbers').catch(() => null)
    const data = res && res.ok ? await res.json() : null
    if (data) { setNumbers(data.numbers); setCount(data.count) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    const res  = await fetch('/api/manage/numbers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ phone_number: newPhone.trim(), name: newName.trim(), role: newRole }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Failed to add number.' }); return }
    setAdding(false); setNewPhone(''); setNewName(''); setNewRole('staff')
    setMsg({ ok: true, text: `${newName} added.` })
    load()
  }

  async function handleToggleActive(n: NumberEntry) {
    const res  = await fetch(`/api/manage/numbers/${n.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !n.active }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Update failed.' }); return }
    setMsg({ ok: true, text: n.active ? 'Number disabled.' : 'Number enabled.' })
    load()
  }

  async function handleEditRole(id: number, role: string) {
    const res  = await fetch(`/api/manage/numbers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Update failed.' }); return }
    setEditId(null)
    setMsg({ ok: true, text: 'Role updated.' })
    load()
  }

  async function handleRemove(n: NumberEntry) {
    if (!confirm(`Remove ${n.phone_number}? They will lose WhatsApp access.`)) return
    const res  = await fetch(`/api/manage/numbers/${n.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Remove failed.' }); return }
    setMsg({ ok: true, text: 'Number removed.' })
    load()
  }

  return (
    <div className="space-y-4">
      <PlanBar used={count} limit={limits.numbers} label="WhatsApp numbers" />

      {msg && (msg.ok ? <OkMsg msg={msg.text} /> : <ErrMsg msg={msg.text} />)}

      {loading ? (
        <div className="space-y-2">
          {[1, 2].map(i => <div key={i} className="h-14 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {numbers.map(n => (
            <div key={n.id}
              className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 transition-opacity ${n.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center shrink-0">
                <Phone size={14} className="text-green-600" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{n.name || '—'}</p>
                <p className="text-xs text-gray-500 font-mono">{n.phone_number}</p>
              </div>

              {editId === n.id ? (
                <div className="flex items-center gap-2">
                  <select value={editRole} onChange={e => setEditRole(e.target.value)}
                    className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500">
                    <option value="owner">Owner</option>
                    <option value="manager">Manager</option>
                    <option value="staff">Staff</option>
                  </select>
                  <button onClick={() => handleEditRole(n.id, editRole)}
                    className="text-xs text-green-600 font-medium hover:underline min-h-[32px] px-2">Save</button>
                  <button onClick={() => setEditId(null)}
                    className="text-xs text-gray-500 hover:text-gray-700 min-h-[32px] px-1">Cancel</button>
                </div>
              ) : (
                <button onClick={() => { setEditId(n.id); setEditRole(n.role) }}
                  className="shrink-0 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-gray-100 rounded-lg"
                  title="Edit role">
                  <RoleBadge role={n.role} />
                </button>
              )}

              <button onClick={() => handleToggleActive(n)} title={n.active ? 'Disable' : 'Enable'}
                className="shrink-0 text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center">
                {n.active
                  ? <ToggleRight size={22} className="text-green-500" />
                  : <ToggleLeft  size={22} />}
              </button>

              <button onClick={() => handleRemove(n)} title="Remove number"
                className="shrink-0 text-gray-300 hover:text-red-500 min-h-[36px] min-w-[36px] flex items-center justify-center transition-colors">
                <Trash2 size={15} />
              </button>
            </div>
          ))}

          {numbers.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No numbers yet. Add your first WhatsApp number below.</p>
          )}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <form onSubmit={handleAdd} className="border border-green-200 bg-green-50 rounded-xl p-4 space-y-3">
          <p className="text-sm font-semibold text-gray-800">Add WhatsApp number</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Phone number (E.164)</label>
              <input type="tel" value={newPhone} onChange={e => setNewPhone(e.target.value)} required
                placeholder="+353861234567"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
              <p className="text-[11px] text-gray-400 mt-1">Include country code: +353 for Ireland</p>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Name</label>
              <input type="text" value={newName} onChange={e => setNewName(e.target.value)} required
                placeholder="Jane Smith"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Role</label>
            <select value={newRole} onChange={e => setNewRole(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
              <option value="owner">Owner — full access</option>
              <option value="manager">Manager — reports & reminders</option>
              <option value="staff">Staff — WhatsApp queries only</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors min-h-[40px]">
              {saving ? 'Adding…' : 'Add number'}
            </button>
            <button type="button" onClick={() => { setAdding(false); setMsg(null) }}
              className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 min-h-[40px]">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => { if (count >= limits.numbers) { setMsg({ ok: false, text: `You've reached the ${plan || 'starter'} plan limit. Upgrade to add more numbers.` }); return } setAdding(true); setMsg(null) }}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium border border-green-200 hover:border-green-300 rounded-xl px-4 py-2.5 transition-colors w-full justify-center bg-white min-h-[44px]"
        >
          <Plus size={16} />
          Add WhatsApp number
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Locations tab
// ---------------------------------------------------------------------------

function LocationsTab({ plan }: { plan: string | null | undefined }) {
  const [locations, setLocations] = useState<LocationEntry[]>([])
  const [count,     setCount]     = useState(0)
  const [loading,   setLoading]   = useState(true)
  const [msg,       setMsg]       = useState<{ ok: boolean; text: string } | null>(null)
  const [adding,    setAdding]    = useState(false)
  const [saving,    setSaving]    = useState(false)
  const [editId,    setEditId]    = useState<number | null>(null)
  const [showHelp,  setShowHelp]  = useState(false)
  const [showKey,   setShowKey]   = useState(false)
  const [showSec,   setShowSec]   = useState(false)

  // Add form
  const [form, setForm] = useState({
    nickname: '', pos_type: 'clover', merchant_id: '', api_key: '', api_base: '',
  })
  // Edit form
  const [editForm, setEditForm] = useState({
    nickname: '', merchant_id: '', api_key: '', api_base: '',
  })
  const [editShowKey, setEditShowKey] = useState(false)

  const limits = getLimits(plan)

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/manage/locations').catch(() => null)
    const data = res && res.ok ? await res.json() : null
    if (data) { setLocations(data.locations); setCount(data.count) }
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setMsg(null)
    const res  = await fetch('/api/manage/locations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nickname:    form.nickname.trim(),
        pos_type:    form.pos_type,
        merchant_id: form.merchant_id.trim() || undefined,
        api_key:     form.api_key.trim()     || undefined,
        api_base:    form.api_base.trim()    || undefined,
      }),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Failed to add location.' }); return }
    setAdding(false)
    setForm({ nickname: '', pos_type: 'clover', merchant_id: '', api_key: '', api_base: '' })
    setMsg({ ok: true, text: `"${form.nickname}" added.` })
    load()
  }

  function startEdit(loc: LocationEntry) {
    setEditId(loc.id)
    setEditForm({ nickname: loc.nickname, merchant_id: loc.merchant_id || '', api_key: '', api_base: loc.api_base || '' })
    setEditShowKey(false)
  }

  async function handleEditSave(id: number) {
    setSaving(true); setMsg(null)
    const body: Record<string, string> = {}
    if (editForm.nickname)    body.nickname    = editForm.nickname.trim()
    if (editForm.merchant_id) body.merchant_id = editForm.merchant_id.trim()
    if (editForm.api_key)     body.api_key     = editForm.api_key.trim()
    if (editForm.api_base)    body.api_base    = editForm.api_base.trim()

    const res  = await fetch(`/api/manage/locations/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const data = await res.json()
    setSaving(false)
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Update failed.' }); return }
    setEditId(null)
    setMsg({ ok: true, text: 'Location updated.' })
    load()
  }

  async function handleRemove(loc: LocationEntry) {
    if (!confirm(`Remove location "${loc.nickname}"? The bot will no longer connect to this POS.`)) return
    const res  = await fetch(`/api/manage/locations/${loc.id}`, { method: 'DELETE' })
    const data = await res.json()
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Remove failed.' }); return }
    setMsg({ ok: true, text: `"${loc.nickname}" removed.` })
    load()
  }

  const guide = credGuide(form.pos_type)

  return (
    <div className="space-y-4">
      <PlanBar used={count} limit={limits.locations} label="POS locations" />

      {msg && (msg.ok ? <OkMsg msg={msg.text} /> : <ErrMsg msg={msg.text} />)}

      {loading ? (
        <div className="space-y-2">
          {[1].map(i => <div key={i} className="h-20 bg-gray-100 rounded-xl animate-pulse" />)}
        </div>
      ) : (
        <div className="space-y-3">
          {locations.map(loc => (
            <div key={loc.id} className={`border rounded-xl transition-opacity ${loc.active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
              {editId === loc.id ? (
                <div className="p-4 space-y-3">
                  <p className="text-sm font-semibold text-gray-800">Edit "{loc.nickname}"</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">Location name</label>
                      <input type="text" value={editForm.nickname}
                        onChange={e => setEditForm(p => ({ ...p, nickname: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 mb-1">
                        {credGuide(loc.pos_type).idLabel ?? 'Merchant / Location ID'}
                      </label>
                      <input type="text" value={editForm.merchant_id}
                        onChange={e => setEditForm(p => ({ ...p, merchant_id: e.target.value }))}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      {credGuide(loc.pos_type).keyLabel} {loc.api_key_set && '(leave blank to keep current)'}
                    </label>
                    <div className="relative">
                      <input type={editShowKey ? 'text' : 'password'} value={editForm.api_key}
                        onChange={e => setEditForm(p => ({ ...p, api_key: e.target.value }))}
                        placeholder={loc.api_key_set ? '(already set — enter to replace)' : ''}
                        className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
                      <button type="button" onClick={() => setEditShowKey(p => !p)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center">
                        {editShowKey ? <EyeOff size={15} /> : <Eye size={15} />}
                      </button>
                    </div>
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => handleEditSave(loc.id)} disabled={saving}
                      className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg min-h-[40px]">
                      {saving ? 'Saving…' : 'Save'}
                    </button>
                    <button onClick={() => setEditId(null)}
                      className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 min-h-[40px]">
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-3 px-3 py-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0 mt-0.5">
                    <MapPin size={14} className="text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900">{loc.nickname}</p>
                    <p className="text-xs text-gray-500 mt-0.5">
                      {loc.pos_type.charAt(0).toUpperCase() + loc.pos_type.slice(1)}
                      {loc.merchant_id && <span className="font-mono"> · {loc.merchant_id.slice(0, 8)}…</span>}
                    </p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className={`text-[11px] font-medium flex items-center gap-1 ${loc.api_key_set ? 'text-green-600' : 'text-amber-600'}`}>
                        <Lock size={10} />
                        {loc.api_key_set ? 'API key set' : 'No API key'}
                      </span>
                      {!loc.active && <span className="text-[11px] text-gray-400">Inactive</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => startEdit(loc)} title="Edit location"
                      className="text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-gray-100 rounded-lg">
                      <Pencil size={14} />
                    </button>
                    <button onClick={() => handleRemove(loc)} title="Remove location"
                      className="text-gray-300 hover:text-red-500 min-h-[36px] min-w-[36px] flex items-center justify-center hover:bg-gray-100 rounded-lg transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}

          {locations.length === 0 && (
            <p className="text-sm text-gray-500 text-center py-4">No locations yet. Add your first POS location below.</p>
          )}
        </div>
      )}

      {/* Add form */}
      {adding ? (
        <form onSubmit={handleAdd} className="border border-blue-200 bg-blue-50 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-gray-800">Add POS location</p>
            <button type="button" onClick={() => setShowHelp(p => !p)}
              className="text-xs text-gray-500 hover:text-gray-700 flex items-center gap-1 min-h-[36px] px-2">
              <HelpCircle size={13} />
              How to find credentials
            </button>
          </div>

          {showHelp && (
            <div className="bg-white border border-blue-100 rounded-lg p-3 space-y-1.5">
              <p className="text-xs font-semibold text-gray-700 mb-2">
                {guide.steps.length > 0 ? `Finding your ${form.pos_type.charAt(0).toUpperCase() + form.pos_type.slice(1)} credentials:` : ''}
              </p>
              {guide.steps.map((s, i) => (
                <div key={i} className="flex gap-2 text-xs text-gray-600">
                  <span className="shrink-0 w-4 h-4 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center text-[10px]">{i + 1}</span>
                  {s}
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Location name *</label>
              <input type="text" value={form.nickname} required
                onChange={e => setForm(p => ({ ...p, nickname: e.target.value }))}
                placeholder="Main Bar, Cork St…"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">POS type *</label>
              <select value={form.pos_type} onChange={e => setForm(p => ({ ...p, pos_type: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="clover">Clover</option>
                <option value="square">Square</option>
                <option value="eposnow">Epos Now</option>
              </select>
            </div>
          </div>

          {guide.idLabel && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{guide.idLabel}</label>
              <input type="text" value={form.merchant_id}
                onChange={e => setForm(p => ({ ...p, merchant_id: e.target.value }))}
                placeholder={form.pos_type === 'clover' ? '7ZQ4HZBXQ84D1' : ''}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">{guide.keyLabel}</label>
            <div className="relative">
              <input type={showKey ? 'text' : 'password'} value={form.api_key}
                onChange={e => setForm(p => ({ ...p, api_key: e.target.value }))}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
              <button type="button" onClick={() => setShowKey(p => !p)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center">
                {showKey ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>

          {guide.secretLabel && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">{guide.secretLabel}</label>
              <div className="relative">
                <input type={showSec ? 'text' : 'password'}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 pr-10 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
                <button type="button" onClick={() => setShowSec(p => !p)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 min-h-[36px] min-w-[36px] flex items-center justify-center">
                  {showSec ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
          )}

          {form.pos_type === 'clover' && (
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                API Base URL <span className="font-normal text-gray-400">(leave blank for EU default)</span>
              </label>
              <input type="text" value={form.api_base}
                onChange={e => setForm(p => ({ ...p, api_base: e.target.value }))}
                placeholder="https://api.eu.clover.com"
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-green-500" />
            </div>
          )}

          <div className="flex gap-3 pt-1">
            <button type="submit" disabled={saving}
              className="bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white text-sm font-medium px-4 py-2 rounded-lg min-h-[40px]">
              {saving ? 'Adding…' : 'Add location'}
            </button>
            <button type="button" onClick={() => { setAdding(false); setMsg(null) }}
              className="text-sm text-gray-600 border border-gray-200 px-4 py-2 rounded-lg hover:bg-gray-50 min-h-[40px]">
              Cancel
            </button>
          </div>
        </form>
      ) : (
        <button
          onClick={() => { if (count >= limits.locations) { setMsg({ ok: false, text: `You've reached the ${plan || 'starter'} plan limit. Upgrade to add more locations.` }); return } setAdding(true); setMsg(null) }}
          className="flex items-center gap-2 text-sm text-green-600 hover:text-green-700 font-medium border border-green-200 hover:border-green-300 rounded-xl px-4 py-2.5 transition-colors w-full justify-center bg-white min-h-[44px]"
        >
          <Plus size={16} />
          Add POS location
        </button>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// Permissions tab
// ---------------------------------------------------------------------------

function PermissionsTab({ plan }: { plan: string | null | undefined }) {
  const [numbers,  setNumbers]  = useState<NumberEntry[]>([])
  const [loading,  setLoading]  = useState(true)
  const [msg,      setMsg]      = useState<{ ok: boolean; text: string } | null>(null)
  const [editId,   setEditId]   = useState<number | null>(null)
  const [editRole, setEditRole] = useState('staff')

  const load = useCallback(async () => {
    setLoading(true)
    const res  = await fetch('/api/manage/numbers').catch(() => null)
    const data = res && res.ok ? await res.json() : null
    if (data) setNumbers(data.numbers.filter((n: NumberEntry) => n.active))
    setLoading(false)
  }, [])

  useEffect(() => { load() }, [load])

  async function handleRoleChange(id: number, role: string) {
    const res  = await fetch(`/api/manage/numbers/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    })
    const data = await res.json()
    if (!res.ok) { setMsg({ ok: false, text: data.error || 'Update failed.' }); return }
    setEditId(null)
    setMsg({ ok: true, text: 'Role updated.' })
    load()
  }

  return (
    <div className="space-y-5">
      {/* Role legend */}
      <div className="space-y-3">
        {ROLES.map(r => (
          <div key={r.role} className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center gap-2 mb-2">
              <Shield size={15} className="text-gray-500" />
              <span className={`text-sm font-semibold px-2 py-0.5 rounded-full ${r.color}`}>{r.label}</span>
            </div>
            <ul className="space-y-1">
              {r.perms.map(p => (
                <li key={p} className="flex items-start gap-2 text-xs text-gray-600">
                  <CheckCircle2 size={12} className="text-gray-400 mt-0.5 shrink-0" />
                  {p}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      {/* Quick role edit table */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Active numbers</p>
        {msg && (msg.ok ? <OkMsg msg={msg.text} /> : <ErrMsg msg={msg.text} />)}
        {loading ? (
          <div className="space-y-2">
            {[1, 2].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl animate-pulse" />)}
          </div>
        ) : numbers.length === 0 ? (
          <p className="text-sm text-gray-500">No active numbers. Add numbers in the Numbers tab.</p>
        ) : (
          <div className="space-y-2">
            {numbers.map(n => (
              <div key={n.id} className="flex items-center gap-3 border border-gray-200 rounded-xl px-3 py-2.5 bg-white">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{n.name || n.phone_number}</p>
                  <p className="text-xs text-gray-400 font-mono">{n.phone_number}</p>
                </div>
                {editId === n.id ? (
                  <div className="flex items-center gap-2 shrink-0">
                    <select value={editRole} onChange={e => setEditRole(e.target.value)}
                      className="text-xs border border-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-500">
                      <option value="owner">Owner</option>
                      <option value="manager">Manager</option>
                      <option value="staff">Staff</option>
                    </select>
                    <button onClick={() => handleRoleChange(n.id, editRole)}
                      className="text-xs text-green-600 font-medium hover:underline min-h-[32px] px-2">Save</button>
                    <button onClick={() => setEditId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 min-h-[32px] px-1"><X size={14} /></button>
                  </div>
                ) : (
                  <button onClick={() => { setEditId(n.id); setEditRole(n.role) }}
                    className="shrink-0 flex items-center gap-2 hover:bg-gray-50 rounded-lg px-2 py-1 min-h-[36px]">
                    <RoleBadge role={n.role} />
                    <Pencil size={12} className="text-gray-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Plan note */}
      {plan && (
        <p className="text-xs text-gray-400 text-center">
          On the {PLANS[(plan as keyof typeof PLANS)]?.name ?? plan} plan ·{' '}
          <a href="mailto:hello@tilltalk.ie?subject=Plan upgrade" className="underline hover:text-gray-600">
            upgrade for more numbers
          </a>
        </p>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------------
// ManageSection (main export)
// ---------------------------------------------------------------------------

export default function ManageSection({ plan }: ManageSectionProps) {
  const [tab, setTab] = useState<Tab>('numbers')

  const tabs: { id: Tab; label: string; Icon: React.ComponentType<{ size: number; className?: string }> }[] = [
    { id: 'numbers',     label: 'Numbers',     Icon: Phone   },
    { id: 'locations',   label: 'Locations',   Icon: MapPin  },
    { id: 'permissions', label: 'Permissions', Icon: Shield  },
  ]

  return (
    <div className="space-y-4">
      {/* Tab bar */}
      <div className="flex border-b border-gray-200">
        {tabs.map(({ id, label, Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px min-h-[44px] ${
              tab === id
                ? 'border-green-600 text-green-600'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="pt-1">
        {tab === 'numbers'     && <NumbersTab     plan={plan} />}
        {tab === 'locations'   && <LocationsTab   plan={plan} />}
        {tab === 'permissions' && <PermissionsTab plan={plan} />}
      </div>
    </div>
  )
}
