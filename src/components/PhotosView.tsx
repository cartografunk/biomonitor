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
  thumbnail_key: string | null
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
  kind: 'fixed_point' | 'extra_event'
}

function getMexicoCityDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function r2Url(key: string | null | undefined) {
  if (!R2_PUBLIC_URL || !key) return ''
  return `${R2_PUBLIC_URL}/${key.replace(/^\/+/, '')}`
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

  const currentVisitIndex = visits.findIndex(visit => visit.visit_date === visitDate)
  const canGoPrevious = currentVisitIndex >= 0 && currentVisitIndex < visits.length - 1
  const canGoNext = currentVisitIndex > 0

  const goPrevious = () => {
    if (canGoPrevious) setVisitDate(visits[currentVisitIndex + 1].visit_date)
  }

  const goNext = () => {
    if (canGoNext) setVisitDate(visits[currentVisitIndex - 1].visit_date)
  }

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

      const gallery: GalleryPhoto[] = ((data ?? []) as unknown as PhotoRow[]).map(photo => {
        const fixedPoint = photo.visit_point_records?.fixed_points
        const event = photo.extra_events
        const imageUrl = r2Url(photo.thumbnail_key || photo.storage_key)
        const fullUrl = r2Url(photo.storage_key)

        console.info('[PhotosView] resolved photo URL', {
          id: photo.id,
          thumbnail_key: photo.thumbnail_key,
          storage_key: photo.storage_key,
          imageUrl,
          fullUrl,
        })

        return {
          id: photo.id,
          title: fixedPoint ? `P${fixedPoint.point_number} \u00B7 ${fixedPoint.label}` : 'Evento extraordinario',
          subtitle: event
            ? `${event.observations ?? 'Sin observaciones'} \u00B7 importancia ${event.importance}`
            : new Intl.DateTimeFormat('es-MX', {
                hour: '2-digit',
                minute: '2-digit',
                timeZone: 'America/Mexico_City',
              }).format(new Date(photo.captured_at)),
          imageUrl,
          fullUrl,
          kind: fixedPoint ? 'fixed_point' : 'extra_event',
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
        flexDirection: 'column',
        gap: 10,
      }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={goPrevious}
            disabled={!canGoPrevious}
            title="Fecha anterior"
            style={{
              width: 36, height: 36,
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              cursor: canGoPrevious ? 'pointer' : 'not-allowed',
              opacity: canGoPrevious ? 1 : 0.45,
              fontSize: 18,
            }}
          >
            ‹
          </button>
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
          <button
            onClick={goNext}
            disabled={!canGoNext}
            title="Fecha siguiente"
            style={{
              width: 36, height: 36,
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              cursor: canGoNext ? 'pointer' : 'not-allowed',
              opacity: canGoNext ? 1 : 0.45,
              fontSize: 18,
            }}
          >
            ›
          </button>
        </div>

        {visits.length > 0 && (
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
            {visits.map(visit => {
              const active = visit.visit_date === visitDate
              return (
                <button
                  key={visit.id}
                  onClick={() => setVisitDate(visit.visit_date)}
                  style={{
                    flex: '0 0 auto',
                    border: active ? '1.5px solid var(--color-accent)' : '1.5px solid var(--color-border)',
                    background: active ? 'var(--color-accent-light)' : 'var(--color-surface)',
                    color: active ? 'var(--color-accent)' : 'var(--color-text-muted)',
                    borderRadius: 'var(--radius-md)',
                    padding: '7px 10px',
                    fontSize: 12,
                    fontWeight: active ? 600 : 500,
                    fontFamily: 'var(--font-sans)',
                    cursor: 'pointer',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {formatDate(visit.visit_date)}
                </button>
              )
            })}
          </div>
        )}
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

        {!loading && !error && photos.length > 0 && !R2_PUBLIC_URL && (
          <div style={{
            fontSize: 13,
            color: 'var(--color-warning)',
            background: 'var(--color-warning-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            marginBottom: 12,
          }}>
            Falta configurar VITE_R2_PUBLIC_URL para construir las URLs públicas de las fotos.
          </div>
        )}

        {!loading && !error && selectedPhoto && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {selectedPhoto.imageUrl || selectedPhoto.fullUrl ? (
              <a href={selectedPhoto.fullUrl || selectedPhoto.imageUrl} target="_blank" rel="noreferrer" style={{
                display: 'block',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#000',
                border: '1px solid var(--color-border)',
              }}>
                <img
                  src={selectedPhoto.imageUrl || selectedPhoto.fullUrl}
                  alt={selectedPhoto.title}
                  style={{ width: '100%', height: 260, objectFit: 'contain', display: 'block' }}
                />
              </a>
            ) : (
              <div style={{
                height: 180,
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                background: 'var(--color-surface)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--color-text-muted)',
                fontSize: 13,
                textAlign: 'center',
                padding: 20,
              }}>
                URL de imagen no disponible
              </div>
            )}

            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                <div style={{ fontWeight: 600, fontSize: 15 }}>{selectedPhoto.title}</div>
                {selectedPhoto.kind === 'extra_event' && (
                  <span style={{
                    background: 'var(--color-warning-light)',
                    color: 'var(--color-warning)',
                    borderRadius: 'var(--radius-sm)',
                    padding: '3px 6px',
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    Evento extraordinario
                  </span>
                )}
              </div>
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
                    position: 'relative',
                    padding: 0,
                    border: photo.id === selectedPhoto.id
                      ? '2px solid var(--color-accent)'
                      : '1px solid var(--color-border)',
                    borderRadius: 'var(--radius-sm)',
                    overflow: 'hidden',
                    background: 'var(--color-surface)',
                    cursor: 'pointer',
                    aspectRatio: '4 / 3',
                  }}
                  title={photo.title}
                >
                  {(photo.imageUrl || photo.fullUrl) && (
                    <img
                      src={photo.imageUrl || photo.fullUrl}
                      alt={photo.title}
                      style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                    />
                  )}
                  {photo.kind === 'extra_event' && (
                    <span style={{
                      position: 'absolute',
                      left: 4,
                      bottom: 4,
                      background: 'rgba(232,93,4,0.92)',
                      color: '#fff',
                      borderRadius: 4,
                      padding: '2px 4px',
                      fontSize: 9,
                      fontWeight: 700,
                    }}>
                      Evento
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
