'use client'

import { useState, useEffect } from 'react'
import { Bell, Zap, Plus, Trash2, RefreshCw, Package, CalendarDays, ToggleLeft, ToggleRight, X, Clock, CloudRain, TrendingDown, BarChart2, Check } from 'lucide-react'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface StockAlert {
  id:                string
  item_name:         string
  threshold:         number
  active:            boolean
  last_triggered_at: string | null
  created_at:        string
}

interface AlertSettings {
  event_alerts_enabled:     boolean
  event_alert_radius_km:    number
  inventory_alerts_enabled: boolean
  inventory_threshold:      number
}

interface Preference {
  enabled:       boolean
  frequency:     'daily' | 'weekly' | 'never'
  min_threshold: number | null
  last_sent_at:  string | null
}

type AllPreferences = {
  events:        Preference
  weather:       Preference
  slow_day:      Preference
  inventory:     Preference
  daily_summary: Preference
}

const PREF_DEFAULTS: AllPreferences = {
  events:        { enabled: true,  frequency: 'weekly', min_threshold: 500, last_sent_at: null },
  weather:       { enabled: true,  frequency: 'daily',  min_threshold: null, last_sent_at: null },
  slow_day:      { enabled: true,  frequency: 'daily',  min_threshold: null, last_sent_at: null },
  inventory:     { enabled: true,  frequency: 'daily',  min_threshold: 5,   last_sent_at: null },
  daily_summary: { enabled: false, frequency: 'daily',  min_threshold: 8,   last_sent_at: null },
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function Toggle({ enabled, onToggle, busy }: { enabled: boolean; onToggle: () => void; busy: boolean }) {
  return (
    <button
      onClick={onToggle}
      disabled={busy}
      className={`flex items-center gap-1.5 text-sm font-medium transition-colors disabled:opacity-50 ${
        enabled ? 'text-green-600' : 'text-gray-400'
      }`}
    >
      {busy ? (
        <RefreshCw size={18} className="animate-spin" />
      ) : enabled ? (
        <ToggleRight size={22} />
      ) : (
        <ToggleLeft size={22} />
      )}
      {enabled ? 'On' : 'Off'}
    </button>
  )
}

// ---------------------------------------------------------------------------
// Add-alert modal
// ---------------------------------------------------------------------------

function AddAlertModal({
  onSave,
  onClose,
}: {
  onSave: (item: string, threshold: number) => Promise<void>
  onClose: () => void
}) {
  const [item,      setItem]      = useState('')
  const [threshold, setThreshold] = useState(5)
  const [saving,    setSaving]    = useState(false)

  async function handleSave() {
    if (!item.trim()) return
    setSaving(true)
    await onSave(item.trim(), threshold)
    setSaving(false)
  }

  function handleBackdrop(e: React.MouseEvent<HTMLDivElement>) {
    if (e.target === e.currentTarget) onClose()
  }

  return (
    <div
      className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4"
      onClick={handleBackdrop}
    >
      <div className="bg-white rounded-2xl shadow-xl max-w-sm w-full p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-900">New Stock Alert</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={16} />
          </button>
        </div>
        <p className="text-xs text-gray-500 mb-4">
          TillTalk will notify you on WhatsApp each day this item is below the threshold.
        </p>
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Item name</label>
            <input
              type="text"
              value={item}
              onChange={e => setItem(e.target.value)}
              placeholder="e.g. Guinness Draught, Corona"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Alert when stock drops below</label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={9999}
                value={threshold}
                onChange={e => setThreshold(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-24 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-green-400"
              />
              <span className="text-sm text-gray-500">units</span>
            </div>
          </div>
        </div>
        <div className="flex gap-3 justify-end mt-5">
          <button
            onClick={onClose}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-200 rounded-lg hover:border-gray-300 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving || !item.trim()}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-green-300 rounded-lg transition-colors"
          >
            {saving ? <RefreshCw size={13} className="animate-spin" /> : <Plus size={13} />}
            {saving ? 'Saving…' : 'Save alert'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main component
// ---------------------------------------------------------------------------

export default function AlertsSection() {
  const [alerts,       setAlerts]       = useState<StockAlert[]>([])
  const [settings,     setSettings]     = useState<AlertSettings | null>(null)
  const [prefs,        setPrefs]        = useState<AllPreferences>(PREF_DEFAULTS)
  const [draftPrefs,   setDraftPrefs]   = useState<AllPreferences>(PREF_DEFAULTS)
  const [prefsDirty,   setPrefsDirty]   = useState(false)
  const [prefsSaving,  setPrefsSaving]  = useState(false)
  const [prefsSaved,   setPrefsSaved]   = useState(false)
  const [loading,      setLoading]      = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deletingId,   setDeletingId]   = useState<string | null>(null)
  const [togglingKey,  setTogglingKey]  = useState<string | null>(null)

  async function loadData() {
    setLoading(true)
    const [alertsRes, settingsRes, prefsRes] = await Promise.all([
      fetch('/api/alerts/stock').then(r => r.ok ? r.json() : { alerts: [] }).catch(() => ({ alerts: [] })),
      fetch('/api/alerts/settings').then(r => r.ok ? r.json() : { settings: null }).catch(() => ({ settings: null })),
      fetch('/api/alerts/preferences').then(r => r.ok ? r.json() : { preferences: null }).catch(() => ({ preferences: null })),
    ])
    setAlerts(alertsRes.alerts ?? [])
    setSettings(settingsRes.settings ?? {
      event_alerts_enabled:     true,
      event_alert_radius_km:    2,
      inventory_alerts_enabled: true,
      inventory_threshold:      5,
    })
    const loaded: AllPreferences = {
      ...PREF_DEFAULTS,
      ...(prefsRes.preferences ?? {}),
    }
    setPrefs(loaded)
    setDraftPrefs(loaded)
    setLoading(false)
  }

  useEffect(() => { loadData() }, [])

  function updateDraft<K extends keyof AllPreferences>(
    type: K,
    field: keyof Preference,
    value: boolean | string | number | null,
  ) {
    setDraftPrefs(prev => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }))
    setPrefsDirty(true)
    setPrefsSaved(false)
  }

  async function savePrefs() {
    setPrefsSaving(true)
    // Build updates — only send changed fields
    const updates: Record<string, Partial<Preference>> = {}
    const keys = Object.keys(PREF_DEFAULTS) as (keyof AllPreferences)[]
    for (const type of keys) {
      const orig = prefs[type]
      const draft = draftPrefs[type]
      const diff: Partial<Preference> = {}
      if (orig.enabled       !== draft.enabled)       diff.enabled       = draft.enabled
      if (orig.frequency     !== draft.frequency)     diff.frequency     = draft.frequency
      if (orig.min_threshold !== draft.min_threshold) diff.min_threshold = draft.min_threshold
      if (Object.keys(diff).length) updates[type] = diff
    }
    if (!Object.keys(updates).length) {
      setPrefsDirty(false)
      setPrefsSaving(false)
      return
    }
    const res = await fetch('/api/alerts/preferences', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ updates }),
    })
    if (res.ok) {
      const data = await res.json()
      const updated: AllPreferences = { ...PREF_DEFAULTS, ...(data.preferences ?? {}) }
      setPrefs(updated)
      setDraftPrefs(updated)
      setPrefsDirty(false)
      setPrefsSaved(true)
      setTimeout(() => setPrefsSaved(false), 3000)
    }
    setPrefsSaving(false)
  }

  async function addAlert(item_name: string, threshold: number) {
    const res = await fetch('/api/alerts/stock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ item_name, threshold }),
    })
    if (res.ok) {
      setShowAddModal(false)
      loadData()
    }
  }

  async function deleteAlert(id: string) {
    setDeletingId(id)
    await fetch(`/api/alerts/stock/${id}`, { method: 'DELETE' })
    setDeletingId(null)
    loadData()
  }

  async function toggleSetting(key: keyof AlertSettings, currentValue: unknown) {
    if (!settings) return
    setTogglingKey(key)
    const value = typeof currentValue === 'boolean' ? !currentValue : currentValue
    const res = await fetch('/api/alerts/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) {
      const data = await res.json()
      setSettings(data.settings)
    }
    setTogglingKey(null)
  }

  async function updateNumericSetting(key: 'event_alert_radius_km' | 'inventory_threshold', value: number) {
    if (!settings) return
    setTogglingKey(key)
    const res = await fetch('/api/alerts/settings', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value }),
    })
    if (res.ok) {
      const data = await res.json()
      setSettings(data.settings)
    }
    setTogglingKey(null)
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[1, 2].map(i => (
          <div key={i} className="bg-white rounded-2xl border border-gray-200 p-5 animate-pulse">
            <div className="h-5 bg-gray-200 rounded w-40 mb-3" />
            <div className="space-y-2">
              <div className="h-10 bg-gray-100 rounded" />
              <div className="h-10 bg-gray-100 rounded" />
            </div>
          </div>
        ))}
      </div>
    )
  }

  return (
    <>
      {/* ── Alert Preferences ────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <Bell size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Alert Preferences</h2>
              <p className="text-xs text-gray-500 mt-0.5">Control which WhatsApp alerts you receive and how often</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">

          {/* Nearby Events */}
          <div className={`p-3 rounded-xl border transition-colors ${draftPrefs.events.enabled ? 'bg-gray-50 border-gray-100' : 'bg-gray-50/50 border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CalendarDays size={15} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Nearby events</p>
                  <p className="text-xs text-gray-500 mt-0.5">Alert when large events are near your venue within 1km</p>
                </div>
              </div>
              <button
                onClick={() => updateDraft('events', 'enabled', !draftPrefs.events.enabled)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors shrink-0 ${draftPrefs.events.enabled ? 'text-green-600' : 'text-gray-400'}`}
              >
                {draftPrefs.events.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                {draftPrefs.events.enabled ? 'On' : 'Off'}
              </button>
            </div>
            {draftPrefs.events.enabled && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Frequency</span>
                  <select
                    value={draftPrefs.events.frequency}
                    onChange={e => updateDraft('events', 'frequency', e.target.value)}
                    className="text-xs font-medium text-green-700 border-0 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="never">Never</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Min attendance</span>
                  <select
                    value={draftPrefs.events.min_threshold ?? 500}
                    onChange={e => updateDraft('events', 'min_threshold', parseInt(e.target.value))}
                    className="text-xs font-medium text-green-700 border-0 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value={100}>100+</option>
                    <option value={500}>500+</option>
                    <option value={1000}>1,000+</option>
                    <option value={2000}>2,000+</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Weather */}
          <div className={`p-3 rounded-xl border transition-colors ${draftPrefs.weather.enabled ? 'bg-gray-50 border-gray-100' : 'bg-gray-50/50 border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <CloudRain size={15} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Weather alerts</p>
                  <p className="text-xs text-gray-500 mt-0.5">Notified about severe weather that may affect footfall</p>
                </div>
              </div>
              <button
                onClick={() => updateDraft('weather', 'enabled', !draftPrefs.weather.enabled)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors shrink-0 ${draftPrefs.weather.enabled ? 'text-green-600' : 'text-gray-400'}`}
              >
                {draftPrefs.weather.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                {draftPrefs.weather.enabled ? 'On' : 'Off'}
              </button>
            </div>
            {draftPrefs.weather.enabled && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs text-gray-500">Frequency</span>
                  <select
                    value={draftPrefs.weather.frequency}
                    onChange={e => updateDraft('weather', 'frequency', e.target.value)}
                    className="text-xs font-medium text-green-700 border-0 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              </div>
            )}
          </div>

          {/* Slow day warnings */}
          <div className={`p-3 rounded-xl border transition-colors ${draftPrefs.slow_day.enabled ? 'bg-gray-50 border-gray-100' : 'bg-gray-50/50 border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <TrendingDown size={15} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Slow day warnings</p>
                  <p className="text-xs text-gray-500 mt-0.5">Alert when today&apos;s revenue is tracking below your average</p>
                </div>
              </div>
              <button
                onClick={() => updateDraft('slow_day', 'enabled', !draftPrefs.slow_day.enabled)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors shrink-0 ${draftPrefs.slow_day.enabled ? 'text-green-600' : 'text-gray-400'}`}
              >
                {draftPrefs.slow_day.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                {draftPrefs.slow_day.enabled ? 'On' : 'Off'}
              </button>
            </div>
          </div>

          {/* Daily revenue summary */}
          <div className={`p-3 rounded-xl border transition-colors ${draftPrefs.daily_summary.enabled ? 'bg-gray-50 border-gray-100' : 'bg-gray-50/50 border-gray-100 opacity-60'}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-2.5">
                <BarChart2 size={15} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Daily revenue summary</p>
                  <p className="text-xs text-gray-500 mt-0.5">Morning snapshot of yesterday&apos;s revenue sent via WhatsApp</p>
                </div>
              </div>
              <button
                onClick={() => updateDraft('daily_summary', 'enabled', !draftPrefs.daily_summary.enabled)}
                className={`flex items-center gap-1 text-xs font-medium transition-colors shrink-0 ${draftPrefs.daily_summary.enabled ? 'text-green-600' : 'text-gray-400'}`}
              >
                {draftPrefs.daily_summary.enabled ? <ToggleRight size={22} /> : <ToggleLeft size={22} />}
                {draftPrefs.daily_summary.enabled ? 'On' : 'Off'}
              </button>
            </div>
            {draftPrefs.daily_summary.enabled && (
              <div className="flex items-center gap-4 mt-3 pt-3 border-t border-gray-200">
                <div className="flex items-center gap-1.5">
                  <Clock size={12} className="text-gray-400" />
                  <span className="text-xs text-gray-500">Send at</span>
                  <select
                    value={draftPrefs.daily_summary.min_threshold ?? 8}
                    onChange={e => updateDraft('daily_summary', 'min_threshold', parseInt(e.target.value))}
                    className="text-xs font-medium text-green-700 border-0 bg-transparent focus:outline-none cursor-pointer"
                  >
                    <option value={7}>7:00 am</option>
                    <option value={8}>8:00 am</option>
                    <option value={9}>9:00 am</option>
                  </select>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Save button */}
        <div className="flex items-center justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
          {prefsSaved && (
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <Check size={13} />
              Saved
            </span>
          )}
          <button
            onClick={savePrefs}
            disabled={!prefsDirty || prefsSaving}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:bg-gray-200 disabled:text-gray-400 rounded-lg transition-colors"
          >
            {prefsSaving ? <RefreshCw size={13} className="animate-spin" /> : null}
            {prefsSaving ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* ── Proactive alert settings ─────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center gap-3 mb-5">
          <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
            <Bell size={18} className="text-green-600" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-gray-900">Proactive Alerts</h2>
            <p className="text-xs text-gray-500 mt-0.5">Daily WhatsApp notifications from TillTalk</p>
          </div>
        </div>

        {settings && (
          <div className="space-y-4">
            {/* Event alerts */}
            <div className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <CalendarDays size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Event alerts</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    Notified when large events (500+ people) are near your venue.
                    Radius:{' '}
                    <select
                      value={settings.event_alert_radius_km}
                      onChange={e => updateNumericSetting('event_alert_radius_km', parseInt(e.target.value))}
                      disabled={!settings.event_alerts_enabled || togglingKey === 'event_alert_radius_km'}
                      className="inline text-xs border-0 bg-transparent text-green-700 font-medium focus:outline-none disabled:opacity-50 cursor-pointer"
                    >
                      {[1, 2, 3, 5, 10].map(r => (
                        <option key={r} value={r}>{r}km</option>
                      ))}
                    </select>
                  </p>
                </div>
              </div>
              <Toggle
                enabled={settings.event_alerts_enabled}
                onToggle={() => toggleSetting('event_alerts_enabled', settings.event_alerts_enabled)}
                busy={togglingKey === 'event_alerts_enabled'}
              />
            </div>

            {/* Inventory alerts */}
            <div className="flex items-start justify-between gap-3 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-start gap-3">
                <Package size={16} className="text-gray-500 mt-0.5 shrink-0" />
                <div>
                  <p className="text-sm font-medium text-gray-800">Low stock alerts</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    General low-stock check — alert when any item drops below{' '}
                    <select
                      value={settings.inventory_threshold}
                      onChange={e => updateNumericSetting('inventory_threshold', parseInt(e.target.value))}
                      disabled={!settings.inventory_alerts_enabled || togglingKey === 'inventory_threshold'}
                      className="inline text-xs border-0 bg-transparent text-green-700 font-medium focus:outline-none disabled:opacity-50 cursor-pointer"
                    >
                      {[2, 3, 5, 10, 15, 20].map(t => (
                        <option key={t} value={t}>{t} units</option>
                      ))}
                    </select>
                    . Add item-specific alerts below.
                  </p>
                </div>
              </div>
              <Toggle
                enabled={settings.inventory_alerts_enabled}
                onToggle={() => toggleSetting('inventory_alerts_enabled', settings.inventory_alerts_enabled)}
                busy={togglingKey === 'inventory_alerts_enabled'}
              />
            </div>
          </div>
        )}
      </div>

      {/* ── Stock alerts ─────────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5 sm:p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <Zap size={18} className="text-green-600" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-gray-900">Stock Alerts</h2>
              <p className="text-xs text-gray-500 mt-0.5">Per-item thresholds — overrides the general setting above</p>
            </div>
          </div>
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
          >
            <Plus size={13} />
            Add alert
          </button>
        </div>

        {alerts.length === 0 ? (
          <div className="text-center py-6">
            <Zap className="mx-auto mb-2 text-gray-200" size={32} />
            <p className="text-sm font-medium text-gray-600 mb-1">No item-specific alerts</p>
            <p className="text-xs text-gray-400 max-w-xs mx-auto">
              Add an alert for a specific item (e.g. Guinness, Corona) to get notified at a custom threshold.
              You can also set these via WhatsApp: <span className="font-mono bg-gray-100 px-1 rounded">alert me when Guinness drops below 10</span>
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {alerts.map(alert => (
              <div
                key={alert.id}
                className="flex items-center gap-3 px-3 py-2.5 bg-gray-50 rounded-xl group"
              >
                <Zap size={14} className="text-amber-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{alert.item_name}</p>
                  <p className="text-xs text-gray-500">Alert when below {alert.threshold} units</p>
                </div>
                {alert.last_triggered_at && (
                  <span className="hidden sm:block text-xs text-amber-600 shrink-0">
                    Last triggered {new Date(alert.last_triggered_at).toLocaleDateString('en-IE')}
                  </span>
                )}
                <button
                  onClick={() => deleteAlert(alert.id)}
                  disabled={deletingId === alert.id}
                  className="w-7 h-7 flex items-center justify-center rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100 disabled:opacity-50"
                  title="Remove alert"
                >
                  {deletingId === alert.id
                    ? <RefreshCw size={12} className="animate-spin" />
                    : <Trash2 size={13} />}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── Add alert modal ───────────────────────────────────────────────── */}
      {showAddModal && (
        <AddAlertModal
          onSave={addAlert}
          onClose={() => setShowAddModal(false)}
        />
      )}
    </>
  )
}
