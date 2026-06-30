import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { UserRole } from '../types'

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
    year: 'numeric',
  }).format(new Date())
}

const TODAY = getMexicoCityDate()
const TODAY_LABEL = getMexicoCityDisplayDate()

interface ReportForm {
  hora_llegada: string
  nivel_agua: string
  trabajadores: string
  aromas: string
  fauna_nociva: string
  obras_toma: string
  desmalezado: string
  fauna_local: string
}

interface WaterReport {
  temperatura_c: number | null
  ph: number | null
  conductividad: number | null
  solidos_disueltos: number | null
  oxigeno_disuelto_mgl: number | null
  oxigeno_disuelto_pct: number | null
}

interface WaterMeasurementRow extends WaterReport {
  visit_point_records: {
    fixed_points: {
      point_number: number
    } | null
  } | null
}

const EMPTY: ReportForm = {
  hora_llegada: '',
  nivel_agua: '',
  trabajadores: '',
  aromas: '',
  fauna_nociva: '',
  obras_toma: '',
  desmalezado: '',
  fauna_local: '',
}

const FIELDS: { key: keyof ReportForm; label: string; placeholder: string; optional?: boolean }[] = [
  { key: 'hora_llegada',  label: 'Hora de llegada',         placeholder: '09:00' },
  { key: 'nivel_agua',    label: 'Nivel del agua',           placeholder: 'Bajó el nivel del agua, se empiezan a notar azolves en la rivera' },
  { key: 'trabajadores',  label: 'Trabajadores in situ',     placeholder: 'Jornada de trabajo en zona oeste dedicada a la extracción de lirio con retroexcavadora' },
  { key: 'aromas',        label: 'Aromas',                   placeholder: 'No se detecta aroma en el agua' },
  { key: 'fauna_nociva',  label: 'Fauna nociva y maleza',    placeholder: 'Disminución de presencia de mosquitos en la zona de selva', optional: true },
  { key: 'obras_toma',    label: 'Obras de toma',            placeholder: 'Obra de toma alta cerrada por obra de CEA' },
  { key: 'desmalezado',   label: 'Desmalezado',              placeholder: 'Se requiere desmalezado en zona oeste y selva', optional: true },
  { key: 'fauna_local',   label: 'Fauna local observada',    placeholder: 'Gallinulas, fúlicas y testudines', optional: true },
]

function addIfPresent(lines: string[], label: string, value: number | null, unit = '') {
  if (value !== null) {
    lines.push(`• ${label}: ${value}${unit ? ` ${unit}` : ''}`)
  }
}

function buildWaterBlock(water: WaterReport | null) {
  if (!water) return []

  const lines = ['🌊 Parámetros de agua (P4):']
  addIfPresent(lines, 'Temperatura', water.temperatura_c, '°C')
  addIfPresent(lines, 'pH', water.ph)
  addIfPresent(lines, 'Conductividad', water.conductividad, 'mS')
  addIfPresent(lines, 'Sólidos disueltos', water.solidos_disueltos, 'ppt')

  const oxygen = [
    water.oxigeno_disuelto_mgl !== null ? `${water.oxigeno_disuelto_mgl} mg/L` : null,
    water.oxigeno_disuelto_pct !== null ? `${water.oxigeno_disuelto_pct} OD%` : null,
  ].filter((value): value is string => value !== null)

  if (oxygen.length > 0) {
    lines.push(`• Oxígeno disuelto: ${oxygen.join(' / ')}`)
  }

  return lines.length > 1 ? lines : []
}

function buildText(form: ReportForm, water: WaterReport | null): string {
  const lines: string[] = []
  lines.push(`📋 *Reporte de visita — Bordo Benito Juárez*`)
  lines.push(`📅 ${TODAY_LABEL}`)
  if (form.hora_llegada) lines.push(`🕐 Inicio de recorrido: ${form.hora_llegada}`)
  lines.push('')

  const freeFields = [
    form.nivel_agua,
    form.trabajadores,
    form.aromas,
    form.fauna_nociva,
    form.obras_toma,
    form.desmalezado,
    form.fauna_local ? `Fauna local observada: ${form.fauna_local}` : '',
  ].filter(Boolean)

  freeFields.forEach((value, index) => {
    lines.push(`${index + 1}. ${value}`)
  })

  const waterBlock = buildWaterBlock(water)
  if (waterBlock.length > 0) {
    if (freeFields.length > 0) lines.push('')
    lines.push(...waterBlock)
  }

  return lines.join('\n')
}

export default function ReportesView({ role }: { role: UserRole | null }) {
  const [form, setForm] = useState<ReportForm>(EMPTY)
  const [water, setWater] = useState<WaterReport | null>(null)
  const [copied, setCopied] = useState(false)
  const canEdit = role === 'editor'

  useEffect(() => {
    let isMounted = true

    async function loadTodayWater() {
      const { data: visit } = await supabase
        .from('visits')
        .select('id')
        .eq('visit_date', TODAY)
        .single()

      if (!isMounted || !visit?.id) return

      const { data: rows } = await supabase
        .from('water_measurements')
        .select(`
          temperatura_c,
          ph,
          conductividad,
          solidos_disueltos,
          oxigeno_disuelto_mgl,
          oxigeno_disuelto_pct,
          visit_point_records!inner (
            visit_id,
            fixed_points (
              point_number
            )
          )
        `)
        .eq('visit_point_records.visit_id', visit.id)

      if (!isMounted) return

      const p4 = ((rows ?? []) as unknown as WaterMeasurementRow[])
        .find(row => row.visit_point_records?.fixed_points?.point_number === 4)

      if (p4) {
        setWater({
          temperatura_c: p4.temperatura_c,
          ph: p4.ph,
          conductividad: p4.conductividad,
          solidos_disueltos: p4.solidos_disueltos,
          oxigeno_disuelto_mgl: p4.oxigeno_disuelto_mgl,
          oxigeno_disuelto_pct: p4.oxigeno_disuelto_pct,
        })
      }
    }

    loadTodayWater()

    return () => {
      isMounted = false
    }
  }, [])

  const set = (key: keyof ReportForm, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  const text = buildText(form, water)

  const handleCopy = async () => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleWhatsApp = () => {
    const encoded = encodeURIComponent(text)
    window.open(`https://wa.me/?text=${encoded}`, '_blank')
  }

  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <div style={{
        padding: '14px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Reporte del día</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{TODAY_LABEL}</div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 120px', display: 'flex', flexDirection: 'column', gap: 14 }}>
        {FIELDS.map(f => (
          <div key={f.key}>
            <label style={{
              fontSize: 12, fontWeight: 500,
              color: 'var(--color-text-muted)',
              display: 'flex', alignItems: 'center', gap: 4,
              marginBottom: 5,
            }}>
              {f.label}
              {f.optional && (
                <span style={{ fontSize: 10, color: 'var(--color-border-strong)', fontWeight: 400 }}>opcional</span>
              )}
            </label>
            {f.key === 'hora_llegada' ? (
              <input
                type="time"
                value={form[f.key]}
                disabled={!canEdit}
                onChange={e => set(f.key, e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  fontSize: 15, fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg)', outline: 'none',
                  opacity: canEdit ? 1 : 0.65,
                }}
              />
            ) : (
              <textarea
                value={form[f.key]}
                disabled={!canEdit}
                onChange={e => set(f.key, e.target.value)}
                placeholder={f.placeholder}
                rows={2}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  fontSize: 14, fontFamily: 'var(--font-sans)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg)',
                  resize: 'none', outline: 'none',
                  lineHeight: 1.5,
                  opacity: canEdit ? 1 : 0.65,
                }}
              />
            )}
          </div>
        ))}
      </div>

      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        padding: '12px 16px 24px',
        display: 'flex', flexDirection: 'column', gap: 8,
      }}>
        <button
          onClick={handleWhatsApp}
          style={{
            width: '100%', padding: '13px 0',
            background: '#25D366', color: '#fff',
            border: 'none', borderRadius: 'var(--radius-md)',
            fontSize: 15, fontWeight: 600,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
        >
          <span>💬</span> Enviar por WhatsApp
        </button>
        <button
          onClick={handleCopy}
          style={{
            width: '100%', padding: '11px 0',
            background: 'none', color: 'var(--color-text-muted)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 14, fontWeight: 500,
            cursor: 'pointer', fontFamily: 'var(--font-sans)',
          }}
        >
          {copied ? '✓ Copiado' : 'Copiar texto'}
        </button>
      </div>
    </div>
  )
}
