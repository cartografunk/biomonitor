import { useState } from 'react'

type Tab = 'mapa' | 'visita' | 'agua' | 'reportes'

export default function App() {
  const [tab, setTab] = useState<Tab>('mapa')

  return (
    <div style={{ minHeight: '100dvh', background: 'var(--color-bg)' }}>
      <header style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontWeight: 500, fontSize: 16, letterSpacing: '-0.01em' }}>
            biomonitor
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
            Bordo Benito Juárez
          </div>
        </div>
        <div style={{
          width: 32, height: 32, borderRadius: '50%',
          background: 'var(--color-accent-light)',
          color: 'var(--color-accent)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 500, fontSize: 13,
        }}>E</div>
      </header>

      <main style={{ padding: '20px', maxWidth: 480, margin: '0 auto' }}>
        <p style={{ color: 'var(--color-text-muted)', fontSize: 14 }}>
          Scaffold listo — aquí van las pantallas de {tab}.
        </p>
      </main>

      <nav style={{
        position: 'fixed', bottom: 0, left: 0, right: 0,
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
      }}>
        {(['mapa', 'visita', 'agua', 'reportes'] as Tab[]).map(t => (
          <button
            key={t}
            onClick={() => setTab(t)}
            style={{
              flex: 1, padding: '12px 0 14px',
              background: 'none', border: 'none',
              fontSize: 11, fontWeight: tab === t ? 500 : 400,
              color: tab === t ? 'var(--color-accent)' : 'var(--color-text-muted)',
              borderTop: tab === t ? '2px solid var(--color-accent)' : '2px solid transparent',
              transition: 'color .15s',
              textTransform: 'capitalize',
            }}
          >
            {t}
          </button>
        ))}
      </nav>
    </div>
  )
}
