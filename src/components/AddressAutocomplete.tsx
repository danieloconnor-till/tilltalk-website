'use client'

import { useEffect, useRef, useState } from 'react'

// ---------------------------------------------------------------------------
// Singleton script loader — only inserts the <script> tag once per page load
// ---------------------------------------------------------------------------

let _state: 'idle' | 'loading' | 'ready' | 'error' = 'idle'
const _queue: Array<() => void> = []

function loadGoogleMaps(apiKey: string, onReady: () => void): void {
  if (_state === 'ready') { onReady(); return }
  if (_state === 'error') return
  _queue.push(onReady)
  if (_state === 'loading') return
  _state = 'loading'
  const script = document.createElement('script')
  script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places`
  script.async = true
  script.defer = true
  script.onload = () => {
    _state = 'ready'
    _queue.forEach(cb => cb())
    _queue.length = 0
  }
  script.onerror = () => {
    _state = 'error'
    _queue.length = 0
  }
  document.head.appendChild(script)
}

// ---------------------------------------------------------------------------
// Minimal type stubs — avoids a @types/google.maps devDependency
// ---------------------------------------------------------------------------

interface GAutocomplete {
  addListener(event: string, handler: () => void): void
  getPlace(): { formatted_address?: string }
}

interface GGoogle {
  maps: {
    places: {
      Autocomplete: new (
        el: HTMLInputElement,
        opts: { types: string[]; fields: string[] }
      ) => GAutocomplete
    }
    event: { clearInstanceListeners(obj: unknown): void }
  }
}

declare const google: GGoogle

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface AddressAutocompleteProps {
  value: string
  onChange: (value: string) => void
  placeholder?: string
  className?: string
  inputClassName?: string
}

export default function AddressAutocomplete({
  value,
  onChange,
  placeholder = '12 Grafton Street, Dublin 2, Ireland',
  className,
  inputClassName,
}: AddressAutocompleteProps) {
  const inputRef    = useRef<HTMLInputElement>(null)
  const acRef       = useRef<GAutocomplete | null>(null)
  const onChangeRef = useRef(onChange)
  const [ready, setReady] = useState(false)

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_PLACES_API_KEY ?? ''

  // Keep the ref current without re-running effects
  useEffect(() => { onChangeRef.current = onChange })

  // Load script once
  useEffect(() => {
    if (!apiKey) return
    loadGoogleMaps(apiKey, () => setReady(true))
  }, [apiKey])

  // Attach Autocomplete once — never re-runs on onChange changes because
  // onChange is accessed via ref, not listed as a dependency.
  useEffect(() => {
    if (!ready || !inputRef.current) return
    if (typeof google === 'undefined' || !google?.maps?.places) return

    acRef.current = new google.maps.places.Autocomplete(inputRef.current, {
      types:  ['address'],
      fields: ['formatted_address'],
    })
    acRef.current.addListener('place_changed', () => {
      const place = acRef.current!.getPlace()
      if (place.formatted_address) onChangeRef.current(place.formatted_address)
    })
    return () => {
      if (acRef.current) google.maps.event.clearInstanceListeners(acRef.current)
    }
  }, [ready]) // onChange intentionally omitted — accessed via ref above

  return (
    <div className={className}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        className={
          inputClassName ??
          'w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500'
        }
      />
      {!apiKey && (
        <p className="text-[11px] text-amber-600 mt-1">
          Google Places API key not configured — type address manually.
        </p>
      )}
    </div>
  )
}
