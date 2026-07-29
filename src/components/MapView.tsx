/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

const R2_PUBLIC_URL = (import.meta.env.VITE_R2_PUBLIC_URL as string | undefined)?.replace(/\/$/, '') ?? ''

const FIXED_POINTS = [
  { id: 1, label: 'Punto 1', required_photos: 2, coords: { lat: 20.61893648698355, lng: -100.39686279037221 } },
  { id: 2, label: 'Punto 2', required_photos: 1, coords: { lat: 20.62047785614087, lng: -100.39348856712448 } },
  { id: 3, label: 'Punto 3', required_photos: 1, coords: { lat: 20.620813731591337, lng: -100.40010022232315 } },
]

const CENTER = { lat: 20.6199, lng: -100.3969 }
let googleMapsOptionsSet = false

type PointStatus = 'completo' | 'pendiente' | 'sin_registro'

interface PointState {
  id: number
  status: PointStatus
}

interface VisitPointStatusRow {
  point_number: number
  photo_status: 'completo' | 'pendiente'
}

interface MapPhoto {
  id: string
  imageUrl: string
  fullUrl: string
  label: string
}

const STATUS_COLOR: Record<PointStatus, string> = {
  completo:    '#38B000',
  pendiente:   '#E85D04',
  sin_registro:'#6B6B67',
}

function getMexicoCityDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function applyPointColors(
  pins: Map<number, HTMLDivElement>,
  states: PointState[] | null,
) {
  pins.forEach(pin => {
    pin.style.opacity = states ? '1' : '0'
    pin.style.pointerEvents = states ? 'auto' : 'none'
  })

  states?.forEach(state => {
    const pin = pins.get(state.id)
    if (pin) {
      pin.style.background = STATUS_COLOR[state.status]
    }
  })
}

function r2Url(key: string | null | undefined) {
  if (!R2_PUBLIC_URL || !key) return ''
  return `${R2_PUBLIC_URL}/${key.replace(/^\/+/, '')}`
}

export default function MapView({
  session,
  visitDate,
  onVisitDateChange,
  refreshKey,
}: {
  session: Session
  visitDate: string
  onVisitDateChange: (date: string) => void
  refreshKey: number
}) {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const markerPinsRef = useRef<Map<number, HTMLDivElement>>(new Map())
  const pointStatesRef = useRef<PointState[] | null>(null)
  const [hoveredPoint, setHoveredPoint] = useState<number | null>(null)
  const [pinnedPoint, setPinnedPoint] = useState<number | null>(null)

  const [pointStates, setPointStates] = useState<PointState[] | null>(null)
  const [photosByPoint, setPhotosByPoint] = useState<Record<number, MapPhoto[]>>({})
  const [photosLoading, setPhotosLoading] = useState(false)

  useEffect(() => {
    if (!session.user.id) return

    let isMounted = true

    async function loadPointStates(attempt = 0) {
      if (attempt === 0) {
        setPointStates(null)
      }

      const { data, error } = await supabase
        .from('visit_point_status')
        .select('point_number, photo_status')
        .eq('visit_date', visitDate)

      if (!isMounted) return

      if (error) {
        if (attempt < 2) {
          window.setTimeout(() => {
            if (isMounted) void loadPointStates(attempt + 1)
          }, attempt === 0 ? 350 : 800)
          return
        }

        console.error('No se pudo cargar visit_point_status', error)
        return
      }

      const statusByPoint = new Map(
        ((data ?? []) as VisitPointStatusRow[]).map(row => [
          row.point_number,
          row.photo_status === 'completo' ? 'completo' : 'pendiente',
        ] as const)
      )

      setPointStates(FIXED_POINTS.map(point => ({
        id: point.id,
        status: statusByPoint.get(point.id) ?? 'sin_registro',
      })))
    }

    void loadPointStates()

    return () => {
      isMounted = false
    }
  }, [session.user.id, visitDate, refreshKey])

  useEffect(() => {
    let isMounted = true

    async function loadPhotosForDate() {
      setPhotosLoading(true)

      const { data: visit, error: visitError } = await supabase
        .from('visits')
        .select('id')
        .eq('visit_date', visitDate)
        .maybeSingle()

      if (!isMounted) return

      if (visitError || !visit?.id) {
        setPhotosByPoint({})
        setPhotosLoading(false)
        return
      }

      const { data, error } = await supabase
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
          )
        `)
        .eq('visit_id', visit.id)
        .not('visit_point_record_id', 'is', null)
        .order('captured_at', { ascending: true })

      if (!isMounted) return

      if (error) {
        setPhotosByPoint({})
        setPhotosLoading(false)
        return
      }

      const next: Record<number, MapPhoto[]> = {}
      ;((data ?? []) as unknown as {
        id: string
        storage_key: string
        thumbnail_key: string | null
        visit_point_records: {
          fixed_points: {
            point_number: number
            label: string
          } | null
        } | null
      }[]).forEach(photo => {
        const point = photo.visit_point_records?.fixed_points
        if (!point?.point_number) return
        next[point.point_number] ??= []
        next[point.point_number].push({
          id: photo.id,
          imageUrl: r2Url(photo.thumbnail_key || photo.storage_key),
          fullUrl: r2Url(photo.storage_key),
          label: point.label,
        })
      })

      setPhotosByPoint(next)
      setPhotosLoading(false)
    }

    void loadPhotosForDate()

    return () => {
      isMounted = false
    }
  }, [visitDate, refreshKey])

  useEffect(() => {
    let isMounted = true
    const markerPins = markerPinsRef.current

    if (!googleMapsOptionsSet) {
      setOptions({
        key: import.meta.env.VITE_GOOGLE_MAPS_KEY as string,
        v: 'weekly',
        libraries: ['marker'],
      })
      googleMapsOptionsSet = true
    }

    async function initMap() {
      const { Map } = await importLibrary('maps')
      const { AdvancedMarkerElement } = await importLibrary('marker')

      if (!isMounted || !mapRef.current) return

      const map = new Map(mapRef.current, {
        center: CENTER,
        zoom: 16,
        mapId: '311d7a7cdaf062c1ac656a2f',
        disableDefaultUI: true,
        zoomControl: true,
        mapTypeId: 'satellite',
      })

      mapInstance.current = map

      // Create markers for each fixed point
      markersRef.current = FIXED_POINTS.map(point => {
        const currentStatus =
          pointStatesRef.current?.find(state => state.id === point.id)?.status
          ?? 'sin_registro'
        const pin = document.createElement('div')
        pin.style.cssText = `
          width: 32px; height: 32px; border-radius: 50%;
          background: ${STATUS_COLOR[currentStatus]}; border: 2px solid white;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 500; color: white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
          opacity: ${pointStatesRef.current ? 1 : 0};
          pointer-events: ${pointStatesRef.current ? 'auto' : 'none'};
        `
        pin.textContent = `P${point.id}`
        pin.addEventListener('mouseenter', () => setHoveredPoint(point.id))
        pin.addEventListener('mouseleave', () => setHoveredPoint(null))
        markerPins.set(point.id, pin)

        const marker = new AdvancedMarkerElement({
          map,
          position: point.coords,
          content: pin,
          title: point.label,
        })

        marker.addListener('click', () => {
          setPinnedPoint(point.id)
        })

        return marker
      })

      applyPointColors(markerPins, pointStatesRef.current)
    }

    initMap().catch(error => {
      console.error('No se pudo cargar Google Maps', error)
    })

    return () => {
      isMounted = false
      markersRef.current.forEach(m => m.map = null)
      markersRef.current = []
      markerPins.clear()
    }
  }, [])

  useEffect(() => {
    pointStatesRef.current = pointStates
    applyPointColors(markerPinsRef.current, pointStates)
  }, [pointStates])

  const selectedPoint = hoveredPoint ?? pinnedPoint
  const selected = FIXED_POINTS.find(p => p.id === selectedPoint)
  const selectedState = pointStates?.find(s => s.id === selectedPoint)
  const selectedPhotos = selectedPoint ? photosByPoint[selectedPoint] ?? [] : []
  const today = getMexicoCityDate()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>

      {/* Date slider */}
      <div style={{
        padding: '12px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', gap: 10,
      }}>
        <span style={{ fontSize: 13, color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
          📅
        </span>
        <input
          type="date"
          value={visitDate}
          max={today}
          onChange={e => {
            if (!e.target.value || e.target.value > today) return
            onVisitDateChange(e.target.value)
          }}
          style={{
            flex: 1, border: 'none', background: 'none',
            fontSize: 14, fontWeight: 500, color: 'var(--color-text-primary)',
            fontFamily: 'var(--font-sans)',
          }}
        />
      </div>

      {/* Map */}
      <div ref={mapRef} style={{ flex: 1, minHeight: 0 }} />

      {/* Legend */}
      <div style={{
        padding: '8px 16px',
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex', gap: 16, alignItems: 'center',
      }}>
        {([['completo', 'Completo'], ['pendiente', 'Pendiente'], ['sin_registro', 'Sin registro']] as [PointStatus, string][]).map(([s, label]) => (
          <div key={s} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: STATUS_COLOR[s],
            }} />
            <span style={{ fontSize: 11, color: 'var(--color-text-muted)' }}>{label}</span>
          </div>
        ))}
      </div>

      {/* Point detail panel */}
      {selectedPoint && selected && (
        <div style={{
          position: 'absolute', bottom: 80, left: 16, right: 16,
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-lg)',
          border: '1px solid var(--color-border)',
          padding: '14px 16px',
          boxShadow: 'var(--shadow-md)',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontWeight: 500, fontSize: 15 }}>{selected.label}</div>
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
                {selected.required_photos} foto{selected.required_photos > 1 ? 's' : ''} requerida{selected.required_photos > 1 ? 's' : ''}
              </div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <div style={{
                width: 8, height: 8, borderRadius: '50%',
                background: STATUS_COLOR[selectedState?.status ?? 'sin_registro'],
              }} />
              <span style={{
                fontSize: 12, fontWeight: 500,
                color: STATUS_COLOR[selectedState?.status ?? 'sin_registro'],
              }}>
                {selectedState?.status === 'completo' ? 'Completo'
                  : selectedState?.status === 'pendiente' ? 'Pendiente'
                  : 'Sin registro'}
              </span>
            </div>
          </div>

          <div style={{ marginTop: 12 }}>
            {photosLoading ? (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Cargando fotos...</div>
            ) : selectedPhotos.length > 0 ? (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(72px, 1fr))',
                gap: 8,
                maxHeight: 150,
                overflowY: 'auto',
              }}>
                {selectedPhotos.map(photo => (
                  <a
                    key={photo.id}
                    href={photo.fullUrl || photo.imageUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      display: 'block',
                      aspectRatio: '4 / 3',
                      background: '#000',
                      borderRadius: 'var(--radius-sm)',
                      overflow: 'hidden',
                      border: '1px solid var(--color-border)',
                    }}
                  >
                    {photo.imageUrl ? (
                      <img
                        src={photo.imageUrl}
                        alt={photo.label}
                        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
                      />
                    ) : (
                      <span style={{
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        color: '#fff',
                        fontSize: 11,
                      }}>
                        Sin URL
                      </span>
                    )}
                  </a>
                ))}
              </div>
            ) : (
              <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
                Sin fotos cargadas para este punto en la fecha seleccionada
              </div>
            )}
          </div>
          <button
            onClick={() => {
              setHoveredPoint(null)
              setPinnedPoint(null)
            }}
            style={{
              position: 'absolute', top: 10, right: 12,
              background: 'none', border: 'none',
              fontSize: 18, color: 'var(--color-text-muted)',
              lineHeight: 1, padding: '0 4px',
            }}
          >×</button>
        </div>
      )}
    </div>
  )
}
