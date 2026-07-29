import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ?? ''

interface PhotoRow {
  id: string
  storage_key: string
  thumbnail_key: string | null
  captured_at: string
  visits: {
    visit_date: string
  } | null
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
  siteKey: string
  siteLabel: string
  capturedAt: string
  visitDate: string
  pointNumber: number | null
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
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [selectedPhotoId, setSelectedPhotoId] = useState<string | null>(null)
  const [selectedSite, setSelectedSite] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const siteOptions = useMemo(() => {
    const options = new Map<string, string>()
    photos.forEach(photo => options.set(photo.siteKey, photo.siteLabel))
    return Array.from(options.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label, 'es-MX', { numeric: true }))
  }, [photos])

  const filteredPhotos = useMemo(
    () => photos.filter(photo => photo.siteKey === selectedSite),
    [photos, selectedSite]
  )

  const selectedPhoto = useMemo(
    () => filteredPhotos.find(photo => photo.id === selectedPhotoId) ?? null,
    [filteredPhotos, selectedPhotoId]
  )
  const selectedPhotoIndex = selectedPhoto
    ? filteredPhotos.findIndex(photo => photo.id === selectedPhoto.id)
    : -1
  const availableDates = useMemo(
    () => Array.from(new Set(filteredPhotos.map(photo => photo.visitDate))).sort((a, b) => b.localeCompare(a)),
    [filteredPhotos]
  )

  const currentVisitIndex = availableDates.findIndex(date => date === visitDate)
  const canGoPrevious = currentVisitIndex >= 0 && currentVisitIndex < availableDates.length - 1
  const canGoNext = currentVisitIndex > 0

  const selectPhoto = (photo: GalleryPhoto | undefined) => {
    setSelectedPhotoId(photo?.id ?? null)
    if (photo) setVisitDate(photo.visitDate)
  }

  const selectLatestPhotoForDate = (date: string, source = filteredPhotos) => {
    setVisitDate(date)
    const photo = [...source].reverse().find(item => item.visitDate === date)
    setSelectedPhotoId(photo?.id ?? null)
  }

  const handleSiteChange = (nextSite: string) => {
    const nextPhotos = photos.filter(photo => photo.siteKey === nextSite)
    const latestPhoto = nextPhotos[nextPhotos.length - 1]
    setSelectedSite(nextSite)
    setSelectedPhotoId(latestPhoto?.id ?? null)
    if (latestPhoto) setVisitDate(latestPhoto.visitDate)
  }

  const goPrevious = () => {
    if (!canGoPrevious) return
    selectLatestPhotoForDate(availableDates[currentVisitIndex + 1])
  }

  const goNext = () => {
    if (!canGoNext) return
    selectLatestPhotoForDate(availableDates[currentVisitIndex - 1])
  }

  useEffect(() => {
    let isMounted = true

    async function loadPhotos() {
      setLoading(true)
      setError(null)
      setSelectedPhotoId(null)

      const { data, error: photosError } = await supabase
        .from('photos')
        .select(`
          id,
          storage_key,
          thumbnail_key,
          captured_at,
          visits (
            visit_date
          ),
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
        .order('captured_at', { ascending: true })

      if (!isMounted) return

      if (photosError) {
        setError('No se pudieron cargar las fotos.')
        setPhotos([])
        setLoading(false)
        return
      }

      const gallery: GalleryPhoto[] = ((data ?? []) as unknown as PhotoRow[])
        .map(photo => {
          const photoVisitDate = photo.visits?.visit_date
          if (!photoVisitDate) return null

          const fixedPoint = photo.visit_point_records?.fixed_points
          const event = photo.extra_events
          const imageUrl = r2Url(photo.thumbnail_key || photo.storage_key)
          const fullUrl = r2Url(photo.storage_key)
          const siteKey = fixedPoint ? `point-${fixedPoint.point_number}` : 'extra-event'
          const siteLabel = fixedPoint ? `Punto ${fixedPoint.point_number}` : 'Eventos'
          const kind: GalleryPhoto['kind'] = fixedPoint ? 'fixed_point' : 'extra_event'

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
            kind,
            siteKey,
            siteLabel,
            capturedAt: photo.captured_at,
            visitDate: photoVisitDate,
            pointNumber: fixedPoint?.point_number ?? null,
          }
        })
        .filter((photo): photo is GalleryPhoto => photo !== null)
        .sort((a, b) => a.capturedAt.localeCompare(b.capturedAt))

      const latestPhoto = gallery[gallery.length - 1]
      setPhotos(gallery)
      setSelectedSite(latestPhoto?.siteKey ?? '')
      setSelectedPhotoId(latestPhoto?.id ?? null)
      if (latestPhoto) setVisitDate(latestPhoto.visitDate)
      setLoading(false)
    }

    loadPhotos()

    return () => {
      isMounted = false
    }
  }, [])

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
            onChange={e => selectLatestPhotoForDate(e.target.value)}
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

        {siteOptions.length > 0 && (
          <select
            value={selectedSite}
            onChange={event => handleSiteChange(event.target.value)}
            style={{
              width: '100%',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-bg)',
              padding: '9px 12px',
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)',
            }}
          >
            {siteOptions.map(option => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
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

        {!loading && !error && filteredPhotos.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 32 }}>
            Sin fotos registradas para este punto
          </div>
        )}

        {!loading && !error && filteredPhotos.length > 0 && !R2_PUBLIC_URL && (
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

        {!loading && !error && filteredPhotos.length > 0 && !selectedPhoto && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 32 }}>
            Sin fotos de {siteOptions.find(option => option.value === selectedSite)?.label ?? 'este punto'} en {formatDate(visitDate)}
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
                {formatDate(selectedPhoto.visitDate)} {'\u00B7'} {selectedPhoto.subtitle}
              </div>
            </div>

            <div style={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: 12,
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
                <button
                  onClick={() => {
                    const previous = Math.max(0, selectedPhotoIndex - 1)
                    selectPhoto(filteredPhotos[previous])
                  }}
                  disabled={selectedPhotoIndex <= 0}
                  style={{
                    width: 36,
                    height: 36,
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '50%',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    opacity: selectedPhotoIndex <= 0 ? 0.45 : 1,
                    cursor: selectedPhotoIndex <= 0 ? 'not-allowed' : 'pointer',
                    fontSize: 18,
                  }}
                >
                  ‹
                </button>
                <div style={{ flex: 1 }}>
                  <input
                    type="range"
                    min={0}
                    max={Math.max(0, filteredPhotos.length - 1)}
                    value={Math.max(0, selectedPhotoIndex)}
                    onChange={event => selectPhoto(filteredPhotos[Number(event.target.value)])}
                    style={{ width: '100%' }}
                  />
                  <div style={{ fontSize: 11, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 2 }}>
                    {selectedPhotoIndex + 1} de {filteredPhotos.length}
                  </div>
                </div>
                <button
                  onClick={() => {
                    const next = Math.min(filteredPhotos.length - 1, selectedPhotoIndex + 1)
                    selectPhoto(filteredPhotos[next])
                  }}
                  disabled={selectedPhotoIndex >= filteredPhotos.length - 1}
                  style={{
                    width: 36,
                    height: 36,
                    border: '1.5px solid var(--color-border)',
                    borderRadius: '50%',
                    background: 'var(--color-surface)',
                    color: 'var(--color-text-primary)',
                    opacity: selectedPhotoIndex >= filteredPhotos.length - 1 ? 0.45 : 1,
                    cursor: selectedPhotoIndex >= filteredPhotos.length - 1 ? 'not-allowed' : 'pointer',
                    fontSize: 18,
                  }}
                >
                  ›
                </button>
              </div>

              <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 2 }}>
                {filteredPhotos.map(photo => (
                  <button
                    key={photo.id}
                    onClick={() => setSelectedPhotoId(photo.id)}
                    style={{
                      position: 'relative',
                      flex: '0 0 72px',
                      padding: 0,
                      border: photo.id === selectedPhoto.id
                        ? '2px solid var(--color-accent)'
                        : '1px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      background: '#000',
                      cursor: 'pointer',
                      aspectRatio: '4 / 3',
                    }}
                    title={photo.title}
                  >
                    {(photo.imageUrl || photo.fullUrl) && (
                      <img
                        src={photo.imageUrl || photo.fullUrl}
                        alt={photo.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
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
          </div>
        )}
      </div>
    </div>
  )
}
