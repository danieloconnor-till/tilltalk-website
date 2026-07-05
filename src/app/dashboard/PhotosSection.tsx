'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Image as ImageIcon, Upload, Check, Loader2, AlertCircle } from 'lucide-react'

// Keep in step with the proxy's server-side ceiling (Vercel body limit ~4.5MB).
const MAX_UPLOAD_BYTES = 4 * 1024 * 1024
const ACCEPTED = 'image/jpeg,image/png'

interface Photo {
  id: string
  url: string
  content_type: string | null
  used_at: string | null
  created_at: string | null
  queued: boolean
}

function formatDate(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(iso)
  return isNaN(d.getTime()) ? '' : d.toLocaleDateString()
}

function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`bg-white rounded-2xl border border-gray-200 p-5 sm:p-6 ${className}`}>
      {children}
    </div>
  )
}

export default function PhotosSection() {
  const [photos, setPhotos] = useState<Photo[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const fileInputRef = useRef<HTMLInputElement>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [queuingId, setQueuingId] = useState<string | null>(null)
  const [flash, setFlash] = useState('')

  const showFlash = useCallback((msg: string) => {
    setFlash(msg)
    window.setTimeout(() => setFlash(''), 6000)
  }, [])

  const fetchPhotos = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const res = await fetch('/api/photos', { cache: 'no-store' })
      if (!res.ok) throw new Error('failed')
      const data = await res.json()
      setPhotos((data?.photos ?? []) as Photo[])
    } catch {
      setError("Couldn't load your photos just now. Please refresh in a moment.")
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { fetchPhotos() }, [fetchPhotos])

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    // Reset the input so re-selecting the same file fires change again.
    e.target.value = ''
    if (!file) return

    setUploadError('')
    if (file.type !== 'image/jpeg' && file.type !== 'image/png') {
      setUploadError('Please choose a JPG or PNG image.')
      return
    }
    if (file.size > MAX_UPLOAD_BYTES) {
      setUploadError(
        'That photo is too large to upload here (4MB max). Send it to the bot on ' +
        'WhatsApp as a document for a full-resolution version.'
      )
      return
    }

    setUploading(true)
    try {
      const body = new FormData()
      body.append('photo', file, file.name)
      const res = await fetch('/api/photos', { method: 'POST', body })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setUploadError(data?.error || "Couldn't upload that photo. Please try again.")
        return
      }
      showFlash('Photo uploaded to your library.')
      await fetchPhotos()
    } catch {
      setUploadError("Couldn't upload that photo. Please try again.")
    } finally {
      setUploading(false)
    }
  }

  async function handleQueue(photo: Photo) {
    if (photo.queued || queuingId) return
    setQueuingId(photo.id)
    // Optimistic: mark queued immediately, revert on failure.
    setPhotos(prev => prev.map(p => (p.id === photo.id ? { ...p, queued: true } : p)))
    try {
      const res = await fetch(`/api/photos/${encodeURIComponent(photo.id)}/queue`, { method: 'POST' })
      if (!res.ok) throw new Error('failed')
      showFlash('The bot will use this photo the next time you build an ad on WhatsApp.')
    } catch {
      setPhotos(prev => prev.map(p => (p.id === photo.id ? { ...p, queued: photo.queued } : p)))
      showFlash("Couldn't queue that photo. Please try again.")
    } finally {
      setQueuingId(null)
    }
  }

  return (
    <div className="space-y-4">
      {/* Header + upload */}
      <Card>
        <div className="flex items-start justify-between gap-3 mb-2">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
              <ImageIcon size={18} className="text-green-600" />
            </div>
            <h2 className="text-base font-semibold text-gray-900">Photos</h2>
          </div>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="flex items-center gap-2 text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-60 px-3 py-2 rounded-lg transition-colors min-h-[44px] shrink-0"
          >
            {uploading ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
            <span>{uploading ? 'Uploading…' : 'Upload a photo'}</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>
        <p className="text-sm text-gray-500">
          Photos you send on WhatsApp appear here too. Anything you upload or queue is
          available to the bot for your next ad. JPG or PNG, up to 4MB — for a bigger
          file, send it to the bot on WhatsApp as a document.
        </p>
        {uploadError && (
          <div className="mt-3 flex items-start gap-2 text-sm text-red-600">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{uploadError}</span>
          </div>
        )}
      </Card>

      {/* Toast-style confirmation */}
      {flash && (
        <div className="flex items-start gap-2 bg-green-50 border border-green-200 text-green-800 text-sm rounded-xl px-4 py-3">
          <Check size={16} className="mt-0.5 shrink-0 text-green-600" />
          <span>{flash}</span>
        </div>
      )}

      {/* Grid / states */}
      {loading ? (
        <Card>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Loader2 size={16} className="animate-spin" />
            <span>Loading your photos…</span>
          </div>
        </Card>
      ) : error ? (
        <Card>
          <div className="flex items-start gap-2 text-sm text-red-600">
            <AlertCircle size={15} className="mt-0.5 shrink-0" />
            <span>{error}</span>
          </div>
        </Card>
      ) : photos.length === 0 ? (
        <Card>
          <div className="text-center py-6">
            <div className="w-12 h-12 bg-gray-100 rounded-xl flex items-center justify-center mx-auto mb-3">
              <ImageIcon size={22} className="text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-900">No photos yet</p>
            <p className="text-sm text-gray-500 mt-1">
              Upload one above, or send a photo to the bot on WhatsApp — it&apos;ll show up here.
            </p>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {photos.map(photo => (
            <div key={photo.id} className="bg-white rounded-2xl border border-gray-200 overflow-hidden flex flex-col">
              <div className="relative aspect-square bg-gray-100">
                {/* Signed, short-lived URL from the API — no service key in the browser. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={photo.url}
                  alt="Ad photo"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
                {photo.queued && (
                  <span className="absolute top-2 left-2 flex items-center gap-1 bg-green-600 text-white text-[11px] font-medium px-2 py-0.5 rounded-full">
                    <Check size={11} /> Queued for next ad
                  </span>
                )}
              </div>
              <div className="p-3 flex flex-col gap-2">
                <p className="text-xs text-gray-500">{formatDate(photo.created_at)}</p>
                <button
                  onClick={() => handleQueue(photo)}
                  disabled={photo.queued || queuingId === photo.id}
                  className="w-full flex items-center justify-center gap-1.5 text-sm font-medium min-h-[40px] px-3 rounded-lg transition-colors disabled:opacity-60 border border-green-600 text-green-700 hover:bg-green-50"
                >
                  {queuingId === photo.id ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : photo.queued ? (
                    <><Check size={14} /> Queued</>
                  ) : (
                    'Use for next ad'
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
