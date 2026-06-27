import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Dot
} from 'recharts'

// ── Mock data ────────────────────────────────────────────────
const MOCK_DATA = [
  { fecha: '02 jun', temperatura_c: 18.2, ph: 7.1, conductividad: 1.4, solidos_disueltos: 0.9, oxigeno_mgl: 6.2, oxigeno_pct: 74 },
  { fecha: '09 jun', temperatura_c: 19.5, ph: 7.3, conductividad: 1.6, solidos_disueltos: 1.0, oxigeno_mgl: 5.8, oxigeno_pct: 70 },
  { fecha: '16 jun', temperatura_c: 21.0, ph: 7.0, conductividad: 1.5, solidos_disueltos: 0.8, oxigeno_mgl: 6.5, oxigeno_pct: 79 },
  { fecha: '23 jun', temperatura_c: 20.3, ph: 7.4, conductividad: 1.7, solidos_disueltos: 1.1, oxigeno_mgl: 5.5, oxigeno_pct: 67 },
  { fecha: '26 jun', temperatura_c: 22.1, ph: 7.2, conductividad: 1.8, solidos_disueltos: 1.2, oxigeno_mgl: 6.0, oxigeno_pct: 73 },
]

// ── Config ───────────────────────────────────────────────────
interface ParamConfig {
  key: string
  label: string
  unit: string
  color: string
  domain?: [number | 'auto', number | 'auto']
}

const PARAMS: ParamConfig[] = [
  { key: 'temperatura_c',    label: 'Temperatura',               unit: '°C',   color: '#E85D04', domain: [10, 35] },
  { key: 'ph',               label: 'pH',                        unit: '',     color: '#6A4C93', domain: [6, 9] },
  { key: 'conductividad',    label: 'Conductividad eléctrica',   unit: 'mS',   color: '#1982C4', domain: ['auto', 'auto'] },
  { key: 'solidos_disueltos',label: 'Sólidos totales disueltos', unit: 'ppt',  color: '#8AC926', domain: ['auto', 'auto'] },
  { key: 'oxigeno_mgl',      label: 'Oxígeno disuelto',         unit: 'mg/L', color: '#38B000', domain: [0, 12] },
  { key: 'oxigeno_pct',      label: 'Oxígeno disuelto',         unit: 'OD%',  color: '#FF595E', domain: [0, 100] },
]

// ── Custom dot ───────────────────────────────────────────────
function CustomDot(props: any) {
  const { cx, cy, stroke } = props
  return <circle cx={cx} cy={cy} r={4} fill={stroke} stroke="#fff" strokeWidth={2} />
}

// ── Single chart card ────────────────────────────────────────
function ParamCard({ param }: { param: ParamConfig }) {
  const latest = MOCK_DATA[MOCK_DATA.length - 1][param.key as keyof typeof MOCK_DATA[0]] as number

  return (
    <div style={{
      background: 'var(--color-surface)',
      border: '1px solid var(--color-border)',
      borderRadius: 'var(--radius-lg)',
      padding: '16px 16px 8px',
      boxShadow: 'var(--shadow-sm)',
    }}>
      {/* Header */}
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
            {latest}
          </div>
          <div style={{ fontSize: 10, color: 'var(--color-text-muted)' }}>último registro</div>
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={120}>
        <LineChart data={MOCK_DATA} margin={{ top: 4, right: 4, left: -28, bottom: 0 }}>
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
            formatter={(v: number) => [`${v}${param.unit ? ' ' + param.unit : ''}`, param.label]}
            labelStyle={{ color: 'var(--color-text-muted)', marginBottom: 2 }}
          />
          <Line
            type="monotone"
            dataKey={param.key}
            stroke={param.color}
            strokeWidth={2}
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: param.color, stroke: '#fff', strokeWidth: 2 }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  )
}

// ── Main ─────────────────────────────────────────────────────
export default function AguaView() {
  return (
    <div style={{ height: '100%', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

      {/* Header */}
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

      {/* Charts */}
      <div style={{
        flex: 1, overflowY: 'auto',
        padding: '16px 16px 32px',
        display: 'flex', flexDirection: 'column', gap: 12,
      }}>
        {PARAMS.map(p => <ParamCard key={p.key} param={p} />)}
      </div>
    </div>
  )
}
