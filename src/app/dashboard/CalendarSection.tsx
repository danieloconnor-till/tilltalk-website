'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  ChevronLeft, ChevronRight, Cloud, Wind, Droplets, MapPin,
  CloudRain, Thermometer, Snowflake, AlertTriangle, RefreshCw,
} from 'lucide-react'

// ---------------------------------------------------------------------------
// Irish public holidays 2026 + 2027
// ---------------------------------------------------------------------------

const IRISH_HOLIDAYS: Record<string, string> = {
  '2026-01-01': "New Year's Day",
  '2026-02-02': "St Brigid's Day",
  '2026-03-17': "St Patrick's Day",
  '2026-04-03': 'Good Friday',
  '2026-04-06': 'Easter Monday',
  '2026-05-04': 'May Bank Holiday',
  '2026-06-01': 'June Bank Holiday',
  '2026-08-03': 'August Bank Holiday',
  '2026-10-26': 'October Bank Holiday',
  '2026-12-25': 'Christmas Day',
  '2026-12-26': "St Stephen's Day",
  '2027-01-01': "New Year's Day",
  '2027-02-01': "St Brigid's Day",
  '2027-03-17': "St Patrick's Day",
  '2027-03-26': 'Good Friday',
  '2027-03-29': 'Easter Monday',
  '2027-05-03': 'May Bank Holiday',
  '2027-06-07': 'June Bank Holiday',
  '2027-08-02': 'August Bank Holiday',
  '2027-10-25': 'October Bank Holiday',
  '2027-12-25': 'Christmas Day',
  '2027-12-26': "St Stephen's Day",
}

// ---------------------------------------------------------------------------
// Weather types
// ---------------------------------------------------------------------------

interface WeatherDay {
  tempMax:     number
  tempMin:     number
  rain:        number
  wind:        number
  snowfall:    number
  weatherCode: number
}

const FOG_CODES = new Set([45, 48])

type AlertType = 'rain' | 'wind' | 'heat' | 'snow' | 'fog'

interface WeatherAlert {
  type:   AlertType
  label:  string
  impact: string
}

// Per-day hourly time windows for peak rain / wind
interface DayWindows { rain_window: string | null; wind_window: string | null }

function fmtHour(h: number): string {
  if (h === 0 || h === 24) return 'midnight'
  if (h === 12) return 'noon'
  return h < 12 ? `${h}am` : `${h - 12}pm`
}

function peakWindow(hours: number[], values: number[], threshold: number): string | null {
  const above = hours.filter((_, i) => values[i] >= threshold)
  if (above.length === 0) return null
  return `${fmtHour(above[0])}–${fmtHour(above[above.length - 1] + 1)}`
}

function classifyAlerts(wx: WeatherDay, windows?: DayWindows): WeatherAlert[] {
  const alerts: WeatherAlert[] = []
  if (wx.rain > 10) {
    const t = windows?.rain_window ? `, heaviest ${windows.rain_window}` : ''
    alerts.push({ type: 'rain', label: `Heavy rain — ${wx.rain} mm forecast${t}`, impact: 'Expect fewer walk-ins. Consider pushing delivery promotions and reducing outdoor seating prep.' })
  }
  if (wx.wind > 50) {
    const t = windows?.wind_window ? `, peaking ${windows.wind_window}` : ''
    alerts.push({ type: 'wind', label: `Storm-force winds — ${wx.wind} km/h${t}`, impact: 'Significant disruption likely. Secure outdoor furniture, check for event cancellations, and review staffing.' })
  }
  if (wx.tempMax > 28)
    alerts.push({ type: 'heat', label: `Extreme heat — ${wx.tempMax}°C`, impact: 'Unusually hot for Ireland — expect higher demand for cold drinks and lighter dishes. Ensure adequate refrigeration.' })
  if (wx.snowfall > 0.5)
    alerts.push({ type: 'snow', label: `Snow or ice — ${wx.snowfall} cm`, impact: 'Snow expected — footfall will drop sharply. Consider reduced staffing and a slower trading day.' })
  if (FOG_CODES.has(wx.weatherCode))
    alerts.push({ type: 'fog', label: 'Dense fog forecast', impact: 'Reduced visibility may lower morning footfall. Allow extra time for deliveries.' })
  return alerts
}

const ALERT_STYLES: Record<AlertType, {
  Icon: React.ComponentType<{ size: number; className?: string }>
  bg: string; border: string; text: string; iconClass: string
}> = {
  rain: { Icon: CloudRain,   bg: 'bg-blue-50',  border: 'border-blue-200',  text: 'text-blue-900',  iconClass: 'text-blue-500'  },
  wind: { Icon: Wind,        bg: 'bg-slate-50', border: 'border-slate-200', text: 'text-slate-900', iconClass: 'text-slate-500' },
  heat: { Icon: Thermometer, bg: 'bg-red-50',   border: 'border-red-200',   text: 'text-red-900',   iconClass: 'text-red-500'   },
  snow: { Icon: Snowflake,   bg: 'bg-sky-50',   border: 'border-sky-200',   text: 'text-sky-900',   iconClass: 'text-sky-500'   },
  fog:  { Icon: Cloud,       bg: 'bg-gray-100', border: 'border-gray-200',  text: 'text-gray-800',  iconClass: 'text-gray-400'  },
}

// ---------------------------------------------------------------------------
// Geocoding (Nominatim) + weather (Open-Meteo)
// ---------------------------------------------------------------------------

// Simple in-memory cache so navigating tabs doesn't re-geocode the same address
const _geocodeCache: Record<string, [number, number] | null> = {}

async function geocodeAddress(address: string): Promise<[number, number] | null> {
  if (address in _geocodeCache) return _geocodeCache[address]
  try {
    const res  = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&limit=1`,
      { headers: { 'Accept-Language': 'en' } },
    )
    const data = await res.json()
    const coords: [number, number] | null = data[0]
      ? [parseFloat(data[0].lat), parseFloat(data[0].lon)]
      : null
    _geocodeCache[address] = coords
    return coords
  } catch {
    _geocodeCache[address] = null
    return null
  }
}

async function fetchForecast(lat: number, lng: number): Promise<Record<string, WeatherDay>> {
  try {
    const params = new URLSearchParams({
      latitude:      String(lat),
      longitude:     String(lng),
      daily:         'temperature_2m_max,temperature_2m_min,precipitation_sum,windspeed_10m_max,snowfall_sum,weather_code',
      timezone:      'Europe/Dublin',
      forecast_days: '14',
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) return {}
    const data = await res.json()
    const d = data.daily
    if (!d?.time) return {}
    const map: Record<string, WeatherDay> = {}
    for (let i = 0; i < d.time.length; i++) {
      map[d.time[i]] = {
        tempMax:     Math.round(d.temperature_2m_max?.[i]  ?? 0),
        tempMin:     Math.round(d.temperature_2m_min?.[i]  ?? 0),
        rain:        Math.round((d.precipitation_sum?.[i]  ?? 0) * 10) / 10,
        wind:        Math.round(d.windspeed_10m_max?.[i]   ?? 0),
        snowfall:    Math.round((d.snowfall_sum?.[i]        ?? 0) * 10) / 10,
        weatherCode: d.weather_code?.[i] ?? 0,
      }
    }
    return map
  } catch {
    return {}
  }
}

async function fetchHourlyWindows(lat: number, lng: number): Promise<Record<string, DayWindows>> {
  try {
    const params = new URLSearchParams({
      latitude:      String(lat),
      longitude:     String(lng),
      hourly:        'precipitation,windspeed_10m',
      timezone:      'Europe/Dublin',
      forecast_days: '14',
    })
    const res = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`)
    if (!res.ok) return {}
    const data = await res.json()
    const h = data.hourly
    if (!h?.time) return {}

    // Group hourly values by date
    const byDate: Record<string, { hours: number[]; rain: number[]; wind: number[] }> = {}
    for (let i = 0; i < h.time.length; i++) {
      const [date, timeStr] = (h.time[i] as string).split('T')
      const hour = parseInt(timeStr.slice(0, 2), 10)
      if (!byDate[date]) byDate[date] = { hours: [], rain: [], wind: [] }
      byDate[date].hours.push(hour)
      byDate[date].rain.push(h.precipitation?.[i] ?? 0)
      byDate[date].wind.push(h.windspeed_10m?.[i] ?? 0)
    }

    const result: Record<string, DayWindows> = {}
    for (const [date, { hours, rain, wind }] of Object.entries(byDate)) {
      result[date] = {
        rain_window: peakWindow(hours, rain, 0.5),   // any hour ≥ 0.5 mm
        wind_window: peakWindow(hours, wind, 40),    // any hour ≥ 40 km/h
      }
    }
    return result
  } catch {
    return {}
  }
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface ReminderItem { id: number; text: string; remind_at: string }
interface EventItem {
  name:        string
  venue:       string
  date:        string
  start_time:  string
  end_time:    string
  capacity:    number | null
  category:    string
  distance_km: number | null
  url:         string
  source?:     'ticketmaster' | 'eventbrite' | string
}
interface LocationItem { id: number; nickname: string; address: string | null }

interface CalendarProps {
  reminders: ReminderItem[]
  locations: LocationItem[]
}

// ---------------------------------------------------------------------------
// Calendar helpers
// ---------------------------------------------------------------------------

function toISO(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}
function daysInMonth(y: number, m: number) { return new Date(y, m + 1, 0).getDate() }
function firstDayOfWeek(y: number, m: number) {
  const d = new Date(y, m, 1).getDay()
  return d === 0 ? 6 : d - 1
}

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December']
const DAY_NAMES   = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']

// ---------------------------------------------------------------------------
// Staffing suggestion
// ---------------------------------------------------------------------------

function staffingSuggestion(
  dateStr: string,
  wx: WeatherDay | undefined,
  alerts: WeatherAlert[],
  hasEvents: boolean,
): string {
  const holiday   = IRISH_HOLIDAYS[dateStr]
  const dow       = new Date(dateStr).getDay()
  const isWeekend = dow === 0 || dow === 6
  const isFri     = dow === 5

  if (holiday) return `Public holiday (${holiday}) — expect significantly higher footfall. Consider full staffing.`

  const snow = alerts.find(a => a.type === 'snow')
  const wind = alerts.find(a => a.type === 'wind')
  const rain = alerts.find(a => a.type === 'rain')

  if (snow) return 'Snow forecast — expect very low footfall. Consider a skeleton crew and contact staff early.'
  if (wind) return 'Storm-force winds — disruption likely. Review staffing levels and check for delivery delays.'
  if (hasEvents && rain) return 'Nearby event plus heavy rain — event-goers may still come but expect some drop-off. Monitor from midday.'
  if (hasEvents) return 'Event nearby — expect higher footfall around the event. Plan for a busier shift.'
  if (rain) return 'Heavy rain — walk-ins likely lower. Consider lighter staffing and push delivery/takeaway.'
  if (isFri || isWeekend) return `${isWeekend ? 'Weekend' : 'Friday'} — typically your busiest period. Schedule accordingly.`
  return 'No significant disruptions expected. Standard staffing should be sufficient.'
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarSection({ reminders, locations }: CalendarProps) {
  const today  = new Date()
  const [year,  setYear]  = useState(today.getFullYear())
  const [month, setMonth] = useState(today.getMonth())
  const [selected, setSelected] = useState<string | null>(null)

  // Active location tab
  const [activeLocId, setActiveLocId] = useState<number | null>(
    locations.length > 0 ? locations[0].id : null
  )

  // Per-location data
  const [forecast,        setForecast]        = useState<Record<string, WeatherDay>>({})
  const [hourlyWindows,   setHourlyWindows]   = useState<Record<string, DayWindows>>({})
  const [events,          setEvents]          = useState<EventItem[]>([])
  const [forecastLoading, setForecastLoading] = useState(false)
  const [eventsLoading,   setEventsLoading]   = useState(false)
  const [refreshing,      setRefreshing]      = useState(false)
  const [locationLabel,   setLocationLabel]   = useState<string | null>(null)

  const activeLoc = locations.find(l => l.id === activeLocId) ?? locations[0] ?? null

  // Sync activeLocId when locations list changes (e.g. first load)
  useEffect(() => {
    if (locations.length > 0 && (activeLocId === null || !locations.find(l => l.id === activeLocId))) {
      setActiveLocId(locations[0].id)
    }
  }, [locations, activeLocId])

  const loadData = useCallback(async (loc: LocationItem, isRefresh = false) => {
    if (isRefresh) setRefreshing(true)
    setForecastLoading(true)
    setEventsLoading(true)
    setEvents([])
    setForecast({})
    setHourlyWindows({})

    const address = loc.address

    // Geocode then fetch daily + hourly weather in parallel
    if (address) {
      const coords = await geocodeAddress(address)
      setLocationLabel(address)
      if (coords) {
        const [lat, lng] = coords
        Promise.all([
          fetchForecast(lat, lng),
          fetchHourlyWindows(lat, lng),
        ]).then(([daily, hourly]) => {
          setForecast(daily)
          setHourlyWindows(hourly)
          setForecastLoading(false)
        })
      } else {
        setForecastLoading(false)
      }
    } else {
      setLocationLabel(loc.nickname)
      setForecastLoading(false)
    }

    // Fetch events for this location
    fetch(`/api/dashboard/events?location_id=${loc.id}`)
      .then(r => (r.ok ? r.json() : null)).catch(() => null)
      .then(d => {
        setEvents(d?.events ?? [])
        setEventsLoading(false)
        if (isRefresh) setRefreshing(false)
      })
  }, [])

  useEffect(() => {
    if (activeLoc) loadData(activeLoc)
  }, [activeLoc, loadData]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleTabChange(loc: LocationItem) {
    setActiveLocId(loc.id)
    setSelected(null)
  }

  async function handleRefresh() {
    if (!activeLoc || refreshing) return
    setRefreshing(true)

    // Trigger a Songkick scrape for the nearest metro area — non-fatal if it fails
    try {
      const address = activeLoc.address
      if (address) {
        const coords = await geocodeAddress(address)
        if (coords) {
          const [lat, lng] = coords
          await fetch('/api/trigger-event-scrape', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ lat, lng }),
          }).catch(() => null)
        }
      }
    } catch {
      // scrape failure is non-fatal — still reload the calendar
    }

    loadData(activeLoc, true)
  }

  function prevMonth() {
    if (month === 0) { setYear(y => y - 1); setMonth(11) }
    else setMonth(m => m - 1)
    setSelected(null)
  }
  function nextMonth() {
    if (month === 11) { setYear(y => y + 1); setMonth(0) }
    else setMonth(m => m + 1)
    setSelected(null)
  }

  const reminderDays = new Set(reminders.map(r => r.remind_at.slice(0, 10)))
  const eventDays    = new Set(events.map(e => (e.date || '').slice(0, 10)))
  const alertDays    = new Set(
    Object.entries(forecast)
      .filter(([, wx]) => classifyAlerts(wx).length > 0)
      .map(([date]) => date)
  )

  const totalDays  = daysInMonth(year, month)
  const startDow   = firstDayOfWeek(year, month)
  const todayISO   = toISO(today.getFullYear(), today.getMonth(), today.getDate())

  const cells: (string | null)[] = []
  for (let i = 0; i < startDow; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(toISO(year, month, d))
  while (cells.length % 7 !== 0) cells.push(null)

  const selWx        = selected ? forecast[selected]                                           : undefined
  const selAlerts    = selWx    ? classifyAlerts(selWx, selected ? hourlyWindows[selected] : undefined) : []
  const selReminders = selected ? reminders.filter(r => r.remind_at.slice(0, 10) === selected) : []
  const selEvents    = selected ? events.filter(e => (e.date || '').slice(0, 10) === selected)  : []
  const selHoliday   = selected ? IRISH_HOLIDAYS[selected] ?? null                              : null
  const inForecast   = selected ? !!forecast[selected]                                          : false
  const isPast       = selected ? new Date(selected).getTime() < new Date(todayISO).getTime()   : false

  const dataLoading = forecastLoading || eventsLoading

  return (
    <div className="space-y-4">

      {/* ── Location tabs (only shown for multi-location clients) ──────── */}
      {locations.length > 1 && (
        <div className="flex gap-1.5 flex-wrap">
          {locations.map(loc => (
            <button
              key={loc.id}
              onClick={() => handleTabChange(loc)}
              className={`flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border transition-colors min-h-[32px] ${
                loc.id === activeLocId
                  ? 'bg-green-600 text-white border-green-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-green-300 hover:text-green-700'
              }`}
            >
              <MapPin size={11} />
              {loc.nickname}
            </button>
          ))}
        </div>
      )}

      {/* ── Calendar card ──────────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl border border-gray-200 p-5">

        {/* Month nav + refresh button */}
        <div className="flex items-center justify-between mb-4">
          <button onClick={prevMonth}
            className="p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600">
            <ChevronLeft size={18} />
          </button>
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-900">{MONTH_NAMES[month]} {year}</h3>
            <button
              onClick={handleRefresh}
              disabled={refreshing || dataLoading}
              title="Refresh events and weather"
              className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-40 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <RefreshCw size={13} className={refreshing ? 'animate-spin' : ''} />
            </button>
          </div>
          <button onClick={nextMonth}
            className="p-2 rounded-lg hover:bg-gray-100 min-h-[44px] min-w-[44px] flex items-center justify-center text-gray-600">
            <ChevronRight size={18} />
          </button>
        </div>

        {/* Day headers */}
        <div className="grid grid-cols-7 mb-1">
          {DAY_NAMES.map(d => (
            <div key={d} className="text-center text-[11px] font-semibold text-gray-400 py-1">{d}</div>
          ))}
        </div>

        {/* Grid */}
        <div className="grid grid-cols-7 gap-y-1">
          {cells.map((dateStr, i) => {
            if (!dateStr) return <div key={i} />

            const isToday    = dateStr === todayISO
            const isSelected = dateStr === selected
            const isHoliday  = !!IRISH_HOLIDAYS[dateStr]
            const hasEvent   = eventDays.has(dateStr)
            const hasRemind  = reminderDays.has(dateStr)
            const hasAlert   = alertDays.has(dateStr)
            const day        = Number(dateStr.slice(8))

            return (
              <button
                key={dateStr}
                onClick={() => setSelected(p => p === dateStr ? null : dateStr)}
                className={`
                  relative flex flex-col items-center justify-start pt-1.5 pb-2 rounded-xl text-sm
                  transition-colors min-h-[44px]
                  ${isSelected
                    ? 'bg-green-600 text-white'
                    : isToday
                      ? 'bg-green-50 text-green-700 font-bold'
                      : 'hover:bg-gray-50 text-gray-700'}
                `}
              >
                <span className={`text-sm leading-none ${isHoliday && !isSelected ? 'text-red-600 font-semibold' : ''}`}>
                  {day}
                </span>
                <div className="flex gap-0.5 mt-1">
                  {isHoliday  && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-red-400'}`} />}
                  {hasEvent   && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-blue-400'}`} />}
                  {hasRemind  && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-green-500'}`} />}
                  {hasAlert && !forecastLoading && <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-white/80' : 'bg-orange-400'}`} />}
                </div>
              </button>
            )
          })}
        </div>

        {/* Legend */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 pt-3 border-t border-gray-100">
          {[
            { color: 'bg-red-400',    label: 'Public holiday' },
            { color: 'bg-blue-400',   label: 'Nearby event'   },
            { color: 'bg-green-500',  label: 'Reminder'       },
            { color: 'bg-orange-400', label: 'Weather alert'  },
          ].map(({ color, label }) => (
            <div key={label} className="flex items-center gap-1.5">
              <span className={`w-2 h-2 rounded-full ${color}`} />
              <span className="text-xs text-gray-500">{label}</span>
            </div>
          ))}
          {(eventsLoading || forecastLoading) && (
            <span className="text-xs text-gray-400 ml-auto flex items-center gap-1">
              <RefreshCw size={10} className="animate-spin" /> Loading…
            </span>
          )}
        </div>
      </div>

      {/* ── Day detail panel ───────────────────────────────────────────── */}
      {selected && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5 space-y-4">

          <h3 className="text-sm font-semibold text-gray-900">
            {new Date(selected + 'T12:00:00').toLocaleDateString('en-IE', {
              weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
            })}
          </h3>

          {/* Weather alerts */}
          {selAlerts.length > 0 && (
            <div className="space-y-2">
              {selAlerts.map(alert => {
                const style = ALERT_STYLES[alert.type]
                const { Icon } = style
                return (
                  <div key={alert.type} className={`flex items-start gap-3 ${style.bg} border ${style.border} rounded-xl px-3.5 py-3`}>
                    <div className="shrink-0 mt-0.5"><Icon size={16} className={style.iconClass} /></div>
                    <div>
                      <p className={`text-sm font-semibold ${style.text}`}>{alert.label}</p>
                      <p className={`text-xs mt-0.5 ${style.text} opacity-80`}>{alert.impact}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Holiday */}
          {selHoliday && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
              <span className="w-2 h-2 rounded-full bg-red-400 shrink-0" />
              <span className="text-sm text-red-800 font-medium">{selHoliday}</span>
            </div>
          )}

          {/* Nearby events */}
          {selEvents.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Nearby events</p>
              {selEvents.map((ev, i) => (
                <div key={i} className="bg-blue-50 border border-blue-100 rounded-lg px-3 py-2.5">
                  <div className="flex items-start gap-2">
                    <span className="w-2 h-2 rounded-full bg-blue-400 shrink-0 mt-1.5" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-blue-900 leading-snug">{ev.name}</p>
                      {ev.venue && (
                        <p className="text-xs text-blue-700 mt-0.5">{ev.venue}</p>
                      )}
                      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-0.5 mt-1">
                        {(ev.start_time || ev.end_time) && (
                          <span className="text-xs text-blue-600 font-medium">
                            {ev.start_time}{ev.end_time ? `–${ev.end_time}` : ''}
                          </span>
                        )}
                        {ev.distance_km !== null && ev.distance_km !== undefined && (
                          <span className="text-xs text-blue-500">{Number(ev.distance_km).toFixed(1)} km away</span>
                        )}
                        {ev.capacity && (
                          <span className="text-xs text-blue-500">~{ev.capacity.toLocaleString()} capacity</span>
                        )}
                        {ev.category && ev.category !== 'Event' && (
                          <span className="text-xs text-blue-400">{ev.category}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1 shrink-0">
                      {ev.url && (
                        <a href={ev.url} target="_blank" rel="noopener noreferrer"
                          className="text-xs font-medium text-blue-600 hover:text-blue-800 hover:underline whitespace-nowrap">
                          Event info →
                        </a>
                      )}
                      {ev.source === 'eventbrite' && (
                        <span className="text-[10px] text-orange-500 font-medium bg-orange-50 border border-orange-100 px-1.5 py-0.5 rounded">
                          Eventbrite
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Reminders */}
          {selReminders.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your reminders</p>
              {selReminders.map(r => (
                <div key={r.id} className="flex items-start gap-2 bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                  <span className="w-2 h-2 rounded-full bg-green-500 shrink-0 mt-1.5" />
                  <div>
                    <p className="text-sm text-green-900">{r.text}</p>
                    <p className="text-xs text-green-600 mt-0.5">
                      {new Date(r.remind_at).toLocaleTimeString('en-IE', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Weather detail */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">
              Weather forecast
              {locationLabel && (
                <span className="ml-1 font-normal normal-case text-gray-400 inline-flex items-center gap-0.5">
                  <MapPin size={10} />{locationLabel}
                </span>
              )}
            </p>
            {isPast ? (
              <p className="text-xs text-gray-400">No forecast available for past dates.</p>
            ) : !inForecast ? (
              <p className="text-xs text-gray-400">
                {forecastLoading
                  ? 'Loading forecast…'
                  : activeLoc?.address
                    ? 'Forecast not available — Open-Meteo provides up to 14 days ahead.'
                    : 'Add an address to this location to enable weather forecasts.'}
              </p>
            ) : selWx ? (
              <div className="grid grid-cols-4 gap-2">
                <div className="bg-sky-50 rounded-xl p-2.5 text-center">
                  <Cloud size={14} className="text-sky-400 mx-auto mb-1" />
                  <p className="text-[11px] text-gray-500">Temp</p>
                  <p className="text-sm font-semibold text-gray-900">{selWx.tempMin}–{selWx.tempMax}°C</p>
                </div>
                <div className="bg-blue-50 rounded-xl p-2.5 text-center">
                  <Droplets size={14} className="text-blue-400 mx-auto mb-1" />
                  <p className="text-[11px] text-gray-500">Rain</p>
                  <p className="text-sm font-semibold text-gray-900">{selWx.rain} mm</p>
                </div>
                <div className="bg-gray-50 rounded-xl p-2.5 text-center">
                  <Wind size={14} className="text-gray-400 mx-auto mb-1" />
                  <p className="text-[11px] text-gray-500">Wind</p>
                  <p className="text-sm font-semibold text-gray-900">{selWx.wind} km/h</p>
                </div>
                <div className="bg-sky-50 rounded-xl p-2.5 text-center">
                  <AlertTriangle size={14} className="text-sky-300 mx-auto mb-1" />
                  <p className="text-[11px] text-gray-500">Snow</p>
                  <p className="text-sm font-semibold text-gray-900">{selWx.snowfall} cm</p>
                </div>
              </div>
            ) : null}
          </div>

          {/* Staffing suggestion */}
          <div className="bg-amber-50 border border-amber-100 rounded-xl px-3.5 py-3">
            <p className="text-xs font-semibold text-amber-700 mb-1">Staffing suggestion</p>
            <p className="text-sm text-amber-900">
              {staffingSuggestion(selected, selWx, selAlerts, selEvents.length > 0)}
            </p>
          </div>

          {!selHoliday && selEvents.length === 0 && selReminders.length === 0 &&
           selAlerts.length === 0 && !inForecast && !isPast && (
            <p className="text-sm text-gray-400 text-center py-2">No events or reminders on this day.</p>
          )}
        </div>
      )}
    </div>
  )
}
