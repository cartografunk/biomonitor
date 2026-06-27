/// <reference types="@types/google.maps" />
import { useEffect, useRef, useState } from 'react'
import { importLibrary, setOptions } from '@googlemaps/js-api-loader'

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

const STATUS_COLOR: Record<PointStatus, string> = {
  completo:    '#38B000',
  pendiente:   '#E85D04',
  sin_registro:'#6B6B67',
}

export default function MapView() {
  const mapRef = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<google.maps.Map | null>(null)
  const markersRef = useRef<google.maps.marker.AdvancedMarkerElement[]>([])
  const [selectedPoint, setSelectedPoint] = useState<number | null>(null)
  const [visitDate, setVisitDate] = useState(new Date().toISOString().split('T')[0])

  // Demo states — will come from Supabase later
  const [pointStates] = useState<PointState[]>([
    { id: 1, status: 'completo' },
    { id: 2, status: 'pendiente' },
    { id: 3, status: 'sin_registro' },
  ])

  useEffect(() => {
    let isMounted = true

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
        const state = pointStates.find(s => s.id === point.id)
        const status = state?.status ?? 'sin_registro'
        const color = STATUS_COLOR[status]

        const pin = document.createElement('div')
        pin.style.cssText = `
          width: 32px; height: 32px; border-radius: 50%;
          background: ${color}; border: 2px solid white;
          display: flex; align-items: center; justify-content: center;
          font-family: 'DM Sans', sans-serif;
          font-size: 12px; font-weight: 500; color: white;
          box-shadow: 0 2px 6px rgba(0,0,0,0.3);
          cursor: pointer;
        `
        pin.textContent = `P${point.id}`

        const marker = new AdvancedMarkerElement({
          map,
          position: point.coords,
          content: pin,
          title: point.label,
        })

        marker.addListener('click', () => {
          setSelectedPoint(point.id)
        })

        return marker
      })
    }

    initMap().catch(error => {
      console.error('No se pudo cargar Google Maps', error)
    })

    return () => {
      isMounted = false
      markersRef.current.forEach(m => m.map = null)
      markersRef.current = []
    }
  }, [])

  const selected = FIXED_POINTS.find(p => p.id === selectedPoint)
  const selectedState = pointStates.find(s => s.id === selectedPoint)

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
          onChange={e => setVisitDate(e.target.value)}
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
          <button
            onClick={() => setSelectedPoint(null)}
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
