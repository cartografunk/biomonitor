import { useEffect, useState } from 'react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer,
} from 'recharts'
import { supabase } from '../lib/supabase'

interface WaterChartRow {
  fecha: string
  visit_date: string
  temperatura_c: number | null
  ph: number | null
  conductividad: number | null
  solidos_disueltos: number | null
  oxigeno_disuelto_mgl: number | null
  oxigeno_disuelto_pct: number | null
}

interface WaterMeasurementRow {
  temperatura_c: number | null
  ph: number | null
  conductividad: number | null
  solidos_disueltos: number | null
  oxigeno_disuelto_mgl: number | null
  oxigeno_disuelto_pct: number | null
  visit_point_records: {
    visits: {
      visit_date: string
    } | null
  } | null
}

interface ParamConfig {
  key: keyof Pick<
    WaterChartRow,
    | 'temperatura_c'
    | 'ph'
    | 'conductividad'
    | 'solidos_disueltos'
    | 'oxigeno_disuelto_mgl'
    | 'oxigeno_disuelto_pct'
  >
  label: string
  unit: string
  color: string
  domain?: [number | 'auto', number | 'auto']
}

const PARAMS: ParamConfig[] = [
  { key: 'temperatura_c',        label: 'Temperatura',               unit: '°C',   color: '#E85D04', domain: [10, 35] },
  { key: 'ph',                   label: 'pH',                        unit: '',     color: '#6A4C93', domain: [6, 9] },
  { key: 'conductividad',        label: 'Conductividad eléctrica',   unit: 'mS',   color: '#1982C4', domain: ['auto', 'auto'] },
  { key: 'solidos_disueltos',    label: 'Sólidos totales disueltos', unit: 'ppt',  color: '#8AC926', domain: ['auto', 'auto'] },
  { key: 'oxigeno_disuelto_mgl', label: 'Oxígeno disuelto',          unit: 'mg/L', color: '#38B000', domain: [0, 12] },
  { key: 'oxigeno_disuelto_pct', label: 'Oxígeno disuelto',          unit: 'OD%',  color: '#FF595E', domain: [0, 100] },
]

function formatShortDate(date: string) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'short',
    timeZone: 'America/Mexico_City',
  }).format(new Date(`${date}T12:00:00`)).replace('.', '')
}

function ParamCard({ param, data }: { param: ParamConfig; data: WaterChartRow[] }) {
  const latest = [...data].reverse().find(row => row[param.key] !== null)?.[param.key]

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 16px 8px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--color-text-primary)' }}>
            {param.label}
          </div>
          {param.unit && (
            <div style={{ fontSize: 11, color: 'var(--color-text-muted)', marginTop: 1 }}>{param.unit}</div>
          )}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontWeight: 700, fontSize: 22, color: param.color, fontFamily: 'var(--font-mono)' }}>
            {latest ?? '—'}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>último registro</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={data} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" vertical={false} />
          <XAxis
            dataKey="fecha"
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'var(--font-sans)' }}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={param.domain}
            tick={{ fontSize: 10, fill: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)' }}
            axisLine={false}
            tickLine={false}
            width={40}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--color-surface)',
              border: '1px solid var(--color-border)',
              borderRadius: 8,
              fontSize: 12,
              fontFamily: 'var(--font-sans)',
              boxShadow: 'var(--shadow-md)',
            }}
            formatter={(value) => [`${value}${param.unit ? ' ' + param.unit : ''}`, param.label]}
            labelStyle={{ color: 'var(--color-text-muted)', marginBottom: 2 }}
          />
          <Line
            type="monotone"
            dataKey={param.key}
            stroke={param.color}
            strokeWidth={2}
            dot={{ r: 4, fill: param.color, stroke: '#fff', strokeWidth: 2 }}
            activeDot={{ r: 6, fill: param.color, stroke: '#fff', strokeWidth: 2 }}
            connectNulls
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

export default function AguaView() {
  const [data, setData] = useState<WaterChartRow[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let isMounted = true

    async function loadMeasurements() {
      setLoading(true)
      setError(null)

      const { data: rows, error: loadError } = await supabase
        .from('water_measurements')
        .select(`
          temperatura_c,
          ph,
          conductividad,
          solidos_disueltos,
          oxigeno_disuelto_mgl,
          oxigeno_disuelto_pct,
          visit_point_records (
            visits (
              visit_date
            )
          )
        `)

      if (!isMounted) return

      if (loadError) {
        setError('No se pudieron cargar las mediciones.')
        setLoading(false)
        return
      }

      const chartRows = ((rows ?? []) as unknown as WaterMeasurementRow[])
        .map(row => {
          const visitDate = row.visit_point_records?.visits?.visit_date
          if (!visitDate) return null
          return {
            fecha: formatShortDate(visitDate),
            visit_date: visitDate,
            temperatura_c: row.temperatura_c,
            ph: row.ph,
            conductividad: row.conductividad,
            solidos_disueltos: row.solidos_disueltos,
            oxigeno_disuelto_mgl: row.oxigeno_disuelto_mgl,
            oxigeno_disuelto_pct: row.oxigeno_disuelto_pct,
          }
        })
        .filter((row): row is WaterChartRow => row !== null)
        .sort((a, b) => a.visit_date.localeCompare(b.visit_date))
        .slice(-10)

      setData(chartRows)
      setLoading(false)
    }

    loadMeasurements()

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
        <div style={{ fontWeight: 600, fontSize: 15 }}>Calidad del agua</div>
        <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 2 }}>
          Punto 4 — Cono Imhoff · histórico
        </div>
      </div>

      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px 32px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {loading && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 32 }}>
            Cargando mediciones...
          </div>
        )}
        {!loading && error && (
          <div style={{ fontSize: 13, color: 'var(--color-warning)', textAlign: 'center', marginTop: 32 }}>
            {error}
          </div>
        )}
        {!loading && !error && data.length === 0 && (
          <div style={{ fontSize: 13, color: 'var(--color-text-muted)', textAlign: 'center', marginTop: 32 }}>
            Sin mediciones registradas aún
          </div>
        )}
        {!loading && !error && data.length > 0 && PARAMS.map(p => (
          <ParamCard key={p.key} param={p} data={data} />
        ))}
      </div>
    </div>
  )
}
