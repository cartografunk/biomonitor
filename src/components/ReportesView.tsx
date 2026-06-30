import { useState } from 'react'

const TODAY = new Date().toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })

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

function buildText(form: ReportForm): string {
  const lines: string[] = []
  lines.push(`📋 *Reporte de visita — Bordo Benito Juárez*`)
  lines.push(`📅 ${TODAY}`)
  if (form.hora_llegada) lines.push(`🕐 Inicio de recorrido: ${form.hora_llegada}`)
  lines.push('')
  let i = 1
  if (form.nivel_agua)   lines.push(`${i++}. ${form.nivel_agua}`)
  if (form.trabajadores) lines.push(`${i++}. ${form.trabajadores}`)
  if (form.aromas)       lines.push(`${i++}. ${form.aromas}`)
  if (form.fauna_nociva) lines.push(`${i++}. ${form.fauna_nociva}`)
  if (form.obras_toma)   lines.push(`${i++}. ${form.obras_toma}`)
  if (form.desmalezado)  lines.push(`${i++}. ${form.desmalezado}`)
  if (form.fauna_local)  lines.push(`${i++}. Fauna local observada: ${form.fauna_local}`)
  return lines.join('\n')
}

export default function ReportesView() {
  const [form, setForm] = useState<ReportForm>(EMPTY)
  const [copied, setCopied] = useState(false)

  const set = (key: keyof ReportForm, value: string) =>
    setForm(f => ({ ...f, [key]: value }))

  const text = buildText(form)

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

      {/* Header */}
      <div style={{
        padding: '14px 16px',
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        flexShrink: 0,
      }}>
        <div style={{ fontWeight: 600, fontSize: 15 }}>Reporte del día</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>{TODAY}</div>
      </div>

      {/* Form */}
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
                onChange={e => set(f.key, e.target.value)}
                style={{
                  width: '100%', boxSizing: 'border-box',
                  border: '1.5px solid var(--color-border)',
                  borderRadius: 'var(--radius-md)',
                  padding: '10px 12px',
                  fontSize: 15, fontFamily: 'var(--font-mono)',
                  color: 'var(--color-text-primary)',
                  background: 'var(--color-bg)', outline: 'none',
                }}
              />
            ) : (
              <textarea
                value={form[f.key]}
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
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Bottom actions */}
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
