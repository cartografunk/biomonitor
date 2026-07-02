import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ?? ''

interface VisitOption {
  id: string
  visit_date: string
}

interface PhotoRow {
  id: string
  storage_key: string
  thumbnail_key: string
  captured_at: string
  visit_point_records: {
    fixed_points: {
      point_number: number
      label: string
    } | null
  } | null
  extra_events: {
    observations: string | null
    importance: 1 | 2 | 3
  } | null
}

interface GalleryPhoto {
  id: string
  title: string
  subtitle: string
  imageUrl: string
  fullUrl: string
  capturedAt: string
}

function getMexicoCityDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function r2Url(key: string) {
  return R2_PUBLIC_URL ? `${R2_PUBLIC_URL}/${key}` : ''
}

function formatDate(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    weekday: 'short',
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date(`${date}T12:00:00`)).replace('.', '')
}

export default function PhotosView() {
  const [visitDate, setVisitDate] = useState(getMexicoCityDate())
  const [visits, setVisits] = useState<VisitOption[]>([])
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const selectedPhoto = useMemo(
    () => photos.find(photo => photo.id === selectedPhotoId) ?? photos[0],
    [photos, selectedPhotoId]
  )

  useEffect(() => {
    let isMounted = true

    async function loadVisits() {
      const { data } = await supabase
        .from('visits')
        .select('id, visit_date')
        .order('visit_date', { ascending: false })

      if (!isMounted) return

      const rows = (data ?? []) as VisitOption[]
      setVisits(rows)
      if (rows.length > 0 && !rows.some(row => row.visit_date === visitDate)) {
        setVisitDate(rows[0].visit_date)
      }
    }

    loadVisits()

    return () => {
      isMounted = false
    }
  }, [visitDate])

  useEffect(() => {
    let isMounted = true

    async function loadPhotos() {
      setLoading(true)
      setError(null)
      setSelectedPhotoId(null)

      const { data: visit } = await supabase
        .from('visits')
        .select('id')
        .eq('visit_date', visitDate)
        .single()

      if (!isMounted) return

      if (!visit?.id) {
        setPhotos([])
        setLoading(false)
        return
      }

      const { data, error: photosError } = await supabase
        .from('photos')
        .select(`
          id,
          storage_key,
          thumbnail_key,
          captured_at,
          visit_point_records (
            fixed_points (
              point_number,
              label
            )
          ),
          extra_events (
            observations,
            importance
          )
        `)
        .eq('visit_id', visit.id)
        .order('captured_at', { ascending: true })

      if (!isMounted) return

      if (photosError) {
        setError('No se pudieron cargar las fotos.')
        setPhotos([])
        setLoading(false)
        return
      }

      const gallery = ((data ?? []) as unknown as PhotoRow[]).map(photo => {
        const fixedPoint = photo.visit_point_records?.fixed_points
        const event = photo.extra_events
        const title = fixedPoint
          ? `P${fixedPoint.point_number} · ${fixedPoint.label}`
          : 'Evento extraordinario'
        const subtitle = event
          ? `${event.observations ?? 'Sin observaciones'} · importancia ${event.importance}`
          : new Intl.DateTimeFormat('es-MX', {
              hour: '2-digit',
              minute: '2-digit',
              timeZone: 'America/Mexico_City',
            }).format(new Date(photo.captured_at))

        return {
          id: photo.id,
          title,
          subtitle,
          imageUrl: r2Url(photo.thumbnail_key || photo.storage_key),
          fullUrl: r2Url(photo.storage_key),
          capturedAt: photo.captured_at,
        }
      })

      setPhotos(gallery)
      setLoading(false)
    }

    loadPhotos()

    return () => {
      isMounted = false
    }
  }, [visitDate])

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '14px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Fotos</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
          Puntos fijos y eventos extraordinarios
        </div>
      </div>

      <div style={{
        padding: '12px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex',
        gap: 10,
        alignItems: 'center',
      }}>
        <input
          type="date"
          value={visitDate}
          onChange={e => setVisitDate(e.target.value)}
          style={{
            flex: 1,
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg)',
            padding: '9px 12px',
            fontSize: 14,
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-primary)',
          }}
        />
        <select
          value={visitDate}
          onChange={e => setVisitDate(e.target.value)}
          style={{
            maxWidth: 150,
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            background: 'var(--color-bg)',
            padding: '9px 10px',
            fontSize: 13,
            fontFamily: 'var(--font-sans)',
            color: 'var(--color-text-primary)',
          }}
        >
          {visits.length === 0 && <option value={visitDate}>{formatDate(visitDate)}</option>}
          {visits.map(visit => (
            <option key={visit.id} value={visit.visit_date}>{formatDate(visit.visit_date)}</option>
          ))}
        </select>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px' }}>
        {loading && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 32 }}>
            Cargando fotos...
          </div>
        )}

        {!loading && error && (
          <div style={{ fontSize: 13, color: 'var(--color-warning)', textAlign: 'center', marginTop: 32 }}>
            {error}
          </div>
        )}

        {!loading && !error && photos.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 32 }}>
            Sin fotos registradas en esta fecha
          </div>
        )}

        {!loading && !error && selectedPhoto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <a href={selectedPhoto.fullUrl} target="_blank" rel="noreferrer" style={{
              display: 'block',
              borderRadius: 'var(--radius-md)',
              overflow: 'hidden',
              background: '#000',
              border: '1px solid var(--color-border)',
            }}>
              <img
                src={selectedPhoto.imageUrl || selectedPhoto.fullUrl}
                alt={selectedPhoto.title}
                style={{ width: '100%', height: 260, objectFit: 'cover', display: 'block' }}
              />
            </a>
            <div>
              <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedPhoto.title}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {selectedPhoto.subtitle}
              </div>
            </div>

            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(88px, 1fr))',
              gap: 8,
            }}>
              {photos.map(photo => (
                <button
                  key={photo.id}
                  onClick={() => setSelectedPhotoId(photo.id)}
                  style={{
                    padding: 0,
                    border: photo.id === selectedPhoto.id
                      ? '2px solid var(--color-accent)'
                      : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                    aspectRatio: '1 / 1',
                  }}
                  title={photo.title}
                >
                  <img
                    src={photo.imageUrl || photo.fullUrl}
                    alt={photo.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                  />
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
