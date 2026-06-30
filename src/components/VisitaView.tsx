import { useCallback, useEffect, useState, useRef } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'
import type { UserRole, VisitPointStatus } from '../types'

// ── Mock data ────────────────────────────────────────────────
function getMexicoCityDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

function getMexicoCityDisplayDate() {
  return new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City',
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  }).format(new Date())
}

const TODAY = getMexicoCityDate()

const DEFAULT_POINTS: VisitPointStatus[] = [
  { visit_id: '', visit_date: TODAY, point_number: 1, label: 'Punto 1', required_photos: 2, is_lab_point: false, has_water_sampling: false, uploaded_photos: 0, photo_status: 'pendiente', has_water_measurements: false },
  { visit_id: '', visit_date: TODAY, point_number: 2, label: 'Punto 2', required_photos: 1, is_lab_point: false, has_water_sampling: false, uploaded_photos: 0, photo_status: 'pendiente', has_water_measurements: false },
  { visit_id: '', visit_date: TODAY, point_number: 3, label: 'Punto 3', required_photos: 1, is_lab_point: false, has_water_sampling: false, uploaded_photos: 0, photo_status: 'pendiente', has_water_measurements: false },
  { visit_id: '', visit_date: TODAY, point_number: 4, label: 'Punto 4 — Cono Imhoff', required_photos: 1, is_lab_point: true, has_water_sampling: true, uploaded_photos: 0, photo_status: 'pendiente', has_water_measurements: false },
]

// ── Types ────────────────────────────────────────────────────
interface LocalPhoto {
  id: string
  url: string
  name: string
}

interface WaterParams {
  temperatura_c: string
  ph: string
  conductividad: string
  solidos_disueltos: string
  oxigeno_disuelto_mgl: string
  oxigeno_disuelto_pct: string
}

interface PointDraft {
  photos: LocalPhoto[]
  observations: string
  water?: WaterParams
}

const emptyWater: WaterParams = {
  temperatura_c: '', ph: '', conductividad: '',
  solidos_disueltos: '', oxigeno_disuelto_mgl: '', oxigeno_disuelto_pct: '',
}

// ── Helpers ──────────────────────────────────────────────────
const STATUS_COLOR: Record<string, string> = {
  completo:  'var(--color-accent)',
  pendiente: 'var(--color-warning)',
}

function pointStatus(point: VisitPointStatus): 'completo' | 'pendiente' {
  return point.photo_status === 'completo' ? 'completo' : 'pendiente'
}

function numericOrNull(value: string) {
  if (value.trim() === '') return null
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

// ── Sub-components ───────────────────────────────────────────

function PhotoCarousel({ photos, onAdd, onRemove, required, disabled }: {
  photos: LocalPhoto[]
  onAdd: (files: FileList) => void
  onRemove: (id: string) => void
  required: number
  disabled?: boolean
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [current, setCurrent] = useState(0)

  const handleKey = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') setCurrent(c => Math.max(0, c - 1))
    if (e.key === 'ArrowRight') setCurrent(c => Math.min(photos.length - 1, c + 1))
  }

  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)' }}>
          Fotos ({photos.length}/{required} requerida{required > 1 ? 's' : ''})
        </span>
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          style={{
            display: 'flex', alignItems: 'center', gap: 4,
            background: 'var(--color-accent-light)', border: 'none',
            borderRadius: 'var(--radius-sm)', padding: '5px 10px',
            fontSize: 12, fontWeight: 500, color: 'var(--color-accent)',
            cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.55 : 1,
          }}
        >
          + Foto
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          capture="environment"
          style={{ display: 'none' }}
          onChange={e => e.target.files && onAdd(e.target.files)}
        />
      </div>

      {photos.length === 0 ? (
        <button
          onClick={() => inputRef.current?.click()}
          disabled={disabled}
          style={{
            width: '100%', height: 120, border: '1.5px dashed var(--color-border-strong)',
            borderRadius: 'var(--radius-md)', background: 'var(--color-bg)',
            display: 'flex', flexDirection: 'column', alignItems: 'center',
            justifyContent: 'center', gap: 6, cursor: disabled ? 'default' : 'pointer',
            opacity: disabled ? 0.55 : 1,
          }}
        >
          <span style={{ fontSize: 24 }}>📷</span>
          <span style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>Toca para agregar fotos</span>
        </button>
      ) : (
        <div
          style={{ position: 'relative', borderRadius: 'var(--radius-md)', overflow: 'hidden', background: '#000' }}
          tabIndex={0}
          onKeyDown={handleKey}
        >
          <img
            src={photos[current].url}
            alt={photos[current].name}
            style={{ width: '100%', height: 200, objectFit: 'cover', display: 'block' }}
          />
          {/* Remove button */}
          <button
            onClick={() => {
              onRemove(photos[current].id)
              setCurrent(c => Math.max(0, c - 1))
            }}
            disabled={disabled}
            style={{
              position: 'absolute', top: 8, right: 8,
              background: 'rgba(0,0,0,0.55)', border: 'none',
              borderRadius: '50%', width: 28, height: 28,
              color: '#fff', fontSize: 16, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: disabled ? 0.55 : 1,
            }}
          >×</button>

          {/* Prev / Next */}
          {photos.length > 1 && (
            <>
              <button
                onClick={() => setCurrent(c => Math.max(0, c - 1))}
                disabled={current === 0}
                style={{
                  position: 'absolute', left: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, color: '#fff', fontSize: 18, cursor: 'pointer',
                  opacity: current === 0 ? 0.3 : 1,
                }}
              >‹</button>
              <button
                onClick={() => setCurrent(c => Math.min(photos.length - 1, c + 1))}
                disabled={current === photos.length - 1}
                style={{
                  position: 'absolute', right: 8, top: '50%', transform: 'translateY(-50%)',
                  background: 'rgba(0,0,0,0.45)', border: 'none', borderRadius: '50%',
                  width: 32, height: 32, color: '#fff', fontSize: 18, cursor: 'pointer',
                  opacity: current === photos.length - 1 ? 0.3 : 1,
                }}
              >›</button>
              {/* Dots */}
              <div style={{
                position: 'absolute', bottom: 8, left: 0, right: 0,
                display: 'flex', justifyContent: 'center', gap: 4,
              }}>
                {photos.map((_, i) => (
                  <div
                    key={i}
                    onClick={() => setCurrent(i)}
                    style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: i === current ? '#fff' : 'rgba(255,255,255,0.45)',
                      cursor: 'pointer',
                    }}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ── Point Drawer ─────────────────────────────────────────────
function PointDrawer({ point, draft, onChange, onClose, onSave, canEdit }: {
  point: VisitPointStatus
  draft: PointDraft
  onChange: (d: PointDraft) => void
  onClose: () => void
  onSave: () => Promise<void>
  canEdit: boolean
}) {
  const [saving, setSaving] = useState(false)

  const addPhotos = (files: FileList) => {
    const newPhotos: LocalPhoto[] = Array.from(files).map(f => ({
      id: crypto.randomUUID(),
      url: URL.createObjectURL(f),
      name: f.name,
    }))
    onChange({ ...draft, photos: [...draft.photos, ...newPhotos] })
  }

  const removePhoto = (id: string) => {
    onChange({ ...draft, photos: draft.photos.filter(p => p.id !== id) })
  }

  const status = pointStatus(point)

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)', zIndex: 40,
        }}
      />
      {/* Drawer */}
      <div style={{
        position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 50,
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
        padding: '0 20px 32px',
        maxHeight: '85dvh',
        overflowY: 'auto',
        boxShadow: '0 -4px 24px rgba(0,0,0,0.12)',
      }}>
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 36, height: 4, borderRadius: 2, background: 'var(--color-border-strong)' }} />
        </div>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 17 }}>{point.label}</div>
            <div style={{
              display: 'inline-flex', alignItems: 'center', gap: 4,
              marginTop: 4, fontSize: 12, fontWeight: 500,
              color: STATUS_COLOR[status],
            }}>
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: STATUS_COLOR[status] }} />
              {status === 'completo' ? 'Completo' : 'Pendiente'}
            </div>
          </div>
          <button onClick={onClose} style={{
            background: 'none', border: 'none', fontSize: 22,
            color: 'var(--color-text-muted)', cursor: 'pointer', padding: '0 4px',
          }}>×</button>
        </div>

        {/* Photos */}
        <PhotoCarousel
          photos={draft.photos}
          onAdd={addPhotos}
          onRemove={removePhoto}
          required={point.required_photos}
          disabled={!canEdit}
        />

        {/* Observations */}
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 6 }}>
            Observaciones
          </label>
          <textarea
            value={draft.observations}
            onChange={e => onChange({ ...draft, observations: e.target.value })}
            disabled={!canEdit}
            placeholder="Condiciones del punto, hallazgos, novedades..."
            rows={4}
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '10px 12px',
              fontSize: 14, fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-bg)',
              opacity: canEdit ? 1 : 0.65,
              resize: 'none', outline: 'none',
              lineHeight: 1.5,
            }}
          />
        </div>

        {/* Water params form */}
        {point.has_water_sampling && (
          <div style={{ marginTop: 20 }}>
            <div style={{
              fontSize: 13, fontWeight: 600, color: 'var(--color-text-primary)',
              marginBottom: 12, display: 'flex', alignItems: 'center', gap: 6,
            }}>
              🧪 Parámetros de agua
            </div>
            {([
              ['temperatura_c',        'Temperatura',               '°C'],
              ['ph',                   'pH',                        ''],
              ['conductividad',        'Conductividad eléctrica',   'mS'],
              ['solidos_disueltos',    'Sólidos totales disueltos', 'ppt'],
              ['oxigeno_disuelto_mgl', 'Oxígeno disuelto',         'mg/L'],
              ['oxigeno_disuelto_pct', 'Oxígeno disuelto',         'OD%'],
            ] as [keyof WaterParams, string, string][]).map(([key, label, unit]) => (
              <div key={key} style={{ marginBottom: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 4 }}>
                  {label}{unit ? ` (${unit})` : ''}
                </label>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input
                    type="number"
                    inputMode="decimal"
                    step="any"
                    value={draft.water?.[key] ?? ''}
                    disabled={!canEdit}
                    onChange={e => onChange({
                      ...draft,
                      water: { ...(draft.water ?? emptyWater), [key]: e.target.value }
                    })}
                    placeholder="—"
                    style={{
                      flex: 1, border: '1.5px solid var(--color-border)',
                      borderRadius: 'var(--radius-sm)', padding: '8px 12px',
                      fontSize: 15, fontFamily: 'var(--font-mono)',
                      color: 'var(--color-text-primary)',
                      background: 'var(--color-bg)', outline: 'none',
                      opacity: canEdit ? 1 : 0.65,
                    }}
                  />
                  {unit && (
                    <span style={{ fontSize: 12, color: 'var(--color-text-muted)', minWidth: 32 }}>{unit}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Save */}
        <button
          onClick={async () => {
            setSaving(true)
            try {
              await onSave()
              onClose()
            } catch {
              // Error is shown by the parent view.
            } finally {
              setSaving(false)
            }
          }}
          disabled={saving || !canEdit}
          style={{
            marginTop: 20, width: '100%',
            background: 'var(--color-accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            padding: '13px 0', fontSize: 15, fontWeight: 600,
            cursor: saving || !canEdit ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
            opacity: saving || !canEdit ? 0.7 : 1,
          }}
        >
          {!canEdit ? 'Solo lectura' : saving ? 'Guardando...' : 'Guardar punto'}
        </button>
      </div>
    </>
  )
}

// ── Point Card ───────────────────────────────────────────────
function PointCard({ point, draft, onClick }: {
  point: VisitPointStatus
  draft: PointDraft
  onClick: () => void
}) {
  const status = pointStatus(point)
  const color = STATUS_COLOR[status]

  return (
    <button
      onClick={onClick}
      style={{
        width: '100%', background: 'var(--color-surface)',
        border: '1px solid var(--color-border)',
        borderLeft: `4px solid ${color}`,
        borderRadius: 'var(--radius-md)',
        padding: '14px 16px',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        cursor: 'pointer', textAlign: 'left',
        boxShadow: 'var(--shadow-sm)',
      }}
    >
      <div>
        <div style={{ fontWeight: 500, fontSize: 15, color: 'var(--color-text-primary)' }}>
          {point.label}
        </div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 3 }}>
          {point.uploaded_photos}/{point.required_photos} foto{point.required_photos > 1 ? 's' : ''}
          {draft.photos.length > 0 && ` Â· ${draft.photos.length} local${draft.photos.length > 1 ? 'es' : ''}`}
          {point.is_lab_point && ' · Laboratorio'}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontSize: 12, fontWeight: 500, color }}>{status === 'completo' ? 'Completo' : 'Pendiente'}</span>
        <span style={{ color: 'var(--color-text-muted)', fontSize: 18 }}>›</span>
      </div>
    </button>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function VisitaView({ session, role }: { session: Session; role: UserRole | null }) {
  const [visitId, setVisitId] = useState<string | null>(null)
  const [fixedPointIds, setFixedPointIds] = useState<Record<number, string>>({})
  const [loading, setLoading] = useState(true)
  const [creatingVisit, setCreatingVisit] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [activePoint, setActivePoint] = useState<number | null>(null)
  const [points, setPoints] = useState<VisitPointStatus[]>(DEFAULT_POINTS)
  const [drafts, setDrafts] = useState<Record<number, PointDraft>>(
    Object.fromEntries(DEFAULT_POINTS.map(p => [p.point_number, { photos: [], observations: '' }]))
  )
  const canEdit = role === 'editor'

  const loadPointStatus = useCallback(async (currentVisitId: string) => {
    const { data, error: statusError } = await supabase
      .from('visit_point_status')
      .select('*')
      .eq('visit_date', TODAY)
      .order('point_number')

    if (statusError) {
      setError('No se pudo cargar el estado de los puntos.')
      return
    }

    const statusRows = (data ?? []) as VisitPointStatus[]
    setPoints(
      statusRows.length > 0
        ? statusRows
        : DEFAULT_POINTS.map(point => ({
            ...point,
            visit_id: currentVisitId,
            visit_date: TODAY,
          }))
    )
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadVisit() {
      setLoading(true)
      setError(null)

      const fixedPointsResult = await supabase
        .from('fixed_points')
        .select('id, point_number')

      if (!isMounted) return

      if (fixedPointsResult.error) {
        setError('No se pudieron cargar los puntos fijos.')
        setLoading(false)
        return
      }

      const ids = Object.fromEntries(
        (fixedPointsResult.data ?? []).map(point => [point.point_number, point.id])
      )
      setFixedPointIds(ids)

      const { data } = await supabase
        .from('visits')
        .select('*')
        .eq('visit_date', TODAY)
        .single()

      if (!isMounted) return

      setVisitId(data?.id ?? null)
      if (data?.id) {
        await loadPointStatus(data.id)
      } else {
        setPoints(DEFAULT_POINTS)
      }
      setLoading(false)
    }

    loadVisit()

    return () => {
      isMounted = false
    }
  }, [loadPointStatus])

  const createVisit = async () => {
    if (!canEdit) return
    setCreatingVisit(true)
    setError(null)

    const { data, error: createError } = await supabase
      .from('visits')
      .insert({ created_by: session.user.id, visit_date: TODAY, status: 'incompleta' })
      .select()
      .single()

    if (createError) {
      setError('No se pudo crear la visita.')
      setCreatingVisit(false)
      return
    }

    setVisitId(data.id)
    await loadPointStatus(data.id)
    setCreatingVisit(false)
  }

  const updateDraft = (pointNumber: number, draft: PointDraft) => {
    setDrafts(d => ({ ...d, [pointNumber]: draft }))
  }

  const savePoint = async (pointNumber: number) => {
    if (!visitId) {
      setError('Primero crea una visita.')
      throw new Error('Missing visit id')
    }

    const fixedPointId = fixedPointIds[pointNumber]
    if (!fixedPointId) {
      setError('No se encontrÃ³ el UUID del punto fijo.')
      throw new Error('Missing fixed point id')
    }

    if (!canEdit) {
      setError('Tu usuario es de solo lectura.')
      throw new Error('Read only role')
    }

    const draft = drafts[pointNumber]
    const { data: record, error: saveError } = await supabase
      .from('visit_point_records')
      .upsert({
        visit_id: visitId,
        fixed_point_id: fixedPointId,
        observations: draft.observations,
      }, { onConflict: 'visit_id,fixed_point_id' })
      .select('id')
      .single()

    if (saveError) {
      setError('No se pudo guardar el punto.')
      throw saveError
    }

    if (record?.id && pointNumber === 4) {
      const water = draft.water ?? emptyWater
      const { error: waterError } = await supabase
        .from('water_measurements')
        .upsert({
          visit_point_record_id: record.id,
          temperatura_c: numericOrNull(water.temperatura_c),
          ph: numericOrNull(water.ph),
          conductividad: numericOrNull(water.conductividad),
          solidos_disueltos: numericOrNull(water.solidos_disueltos),
          oxigeno_disuelto_mgl: numericOrNull(water.oxigeno_disuelto_mgl),
          oxigeno_disuelto_pct: numericOrNull(water.oxigeno_disuelto_pct),
        }, { onConflict: 'visit_point_record_id' })

      if (waterError) {
        setError('No se pudieron guardar los parÃ¡metros de agua.')
        throw waterError
      }
    }

    setError(null)
    await loadPointStatus(visitId)
  }

  const completedCount = points.filter(p => pointStatus(p) === 'completo').length

  const activePointData = points.find(p => p.point_number === activePoint)

  // ── No visit yet ─────────────────────────────────────────
  if (loading) {
    return (
      <div style={{
        height: '100%', display: 'flex',
        alignItems: 'center', justifyContent: 'center',
        padding: 32,
      }}>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Cargando visita...</div>
      </div>
    )
  }

  if (!visitId) {
    return (
      <div style={{
        height: '100%', display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center',
        padding: 32, gap: 16,
      }}>
        <div style={{ fontSize: 40 }}>📋</div>
        <div style={{ fontWeight: 600, fontSize: 18, textAlign: 'center' }}>Sin visita hoy</div>
        <div style={{ fontSize: 14, color: 'var(--color-text-muted)', textAlign: 'center', maxWidth: 260 }}>
          No hay visita registrada para hoy. Inicia una nueva para comenzar el registro.
        </div>
        {error && (
          <div style={{ fontSize: 12, color: 'var(--color-warning)', textAlign: 'center', maxWidth: 280 }}>
            {error}
          </div>
        )}
        <button
          onClick={createVisit}
          disabled={creatingVisit || !canEdit}
          style={{
            marginTop: 8,
            background: 'var(--color-accent)', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            padding: '13px 28px', fontSize: 15, fontWeight: 600,
            cursor: creatingVisit || !canEdit ? 'default' : 'pointer', fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'center', gap: 8,
            opacity: creatingVisit || !canEdit ? 0.7 : 1,
          }}
        >
          {!canEdit ? 'Solo lectura' : creatingVisit ? 'Creando...' : '+ Nueva visita'}
        </button>
      </div>
    )
  }

  // ── Visit active ──────────────────────────────────────────
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Visit header */}
      <div style={{
        padding: '14px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 15 }}>
            {getMexicoCityDisplayDate()}
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
            {completedCount}/{points.length} puntos completados
          </div>
        </div>
        {error && (
          <div style={{ fontSize: 11, color: 'var(--color-warning)', marginTop: 2 }}>
            {error}
          </div>
        )}
        {/* Progress bar */}
        <div style={{ width: 80, height: 6, background: 'var(--color-border)', borderRadius: 3, overflow: 'hidden' }}>
          <div style={{
            height: '100%', borderRadius: 3,
            background: completedCount === points.length ? 'var(--color-accent)' : 'var(--color-warning)',
            width: `${points.length > 0 ? (completedCount / points.length) * 100 : 0}%`,
            transition: 'width .3s',
          }} />
        </div>
      </div>

      {/* Points list */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 32px', display: 'flex', flexDirection: 'column', gap: 10 }}>
        {points.map(point => (
          <PointCard
            key={point.point_number}
            point={point}
            draft={drafts[point.point_number]}
            onClick={() => setActivePoint(point.point_number)}
          />
        ))}
      </div>

      {/* Floating + button */}
      <button
        onClick={() => setActivePoint(1)}
        style={{
          position: 'absolute', bottom: 80, right: 20,
          width: 52, height: 52, borderRadius: '50%',
          background: 'var(--color-accent)', color: '#fff',
          border: 'none', fontSize: 26, fontWeight: 300,
          boxShadow: '0 4px 16px rgba(56,176,0,0.35)',
          cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
      >+</button>

      {/* Drawer */}
      {activePoint !== null && activePointData && (
        <PointDrawer
          point={activePointData}
          draft={drafts[activePoint]}
          onChange={d => updateDraft(activePoint, d)}
          onClose={() => setActivePoint(null)}
          onSave={() => savePoint(activePoint)}
          canEdit={canEdit}
        />
      )}
    </div>
  )
}
