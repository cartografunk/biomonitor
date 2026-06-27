import { useState } from 'react'
import MapView from './components/MapView'
import VisitaView from './components/VisitaView';
import AguaView from './components/AguaView';

type Tab = 'mapa' | 'visita' | 'agua' | 'reportes'

const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: 'mapa',     label: 'Mapa' },
  { id: 'visita',   label: 'Visita' },
  { id: 'agua',     label: 'Agua' },
  { id: 'reportes', label: 'Reportes' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('mapa')

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      background: 'var(--color-bg)',
    }}>
      {/* Header */}
      <header style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '14px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
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

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tab === 'mapa' && <MapView />}
        {tab === 'visita' && <VisitaView />}
        {tab === 'agua' && (<AguaView />)}
        {tab === 'reportes' && (
          <div style={{ padding: 20, color: 'var(--color-text-muted)', fontSize: 14 }}>
            Pantalla de reportes — próximamente
          </div>
        )}
      </main>

      {/* Bottom nav */}
      <nav style={{
        background: 'var(--color-surface)',
        borderTop: '1px solid var(--color-border)',
        display: 'flex',
        flexShrink: 0,
      }}>
        {NAV_ITEMS.map(item => (
          <button
            key={item.id}
            onClick={() => setTab(item.id)}
            style={{
              flex: 1,
              padding: '12px 0 14px',
              background: 'none',
              border: 'none',
              borderTop: tab === item.id
                ? '2px solid var(--color-accent)'
                : '2px solid transparent',
              fontSize: 12,
              fontWeight: tab === item.id ? 500 : 400,
              color: tab === item.id
                ? 'var(--color-accent)'
                : 'var(--color-text-muted)',
              transition: 'color .15s',
              cursor: 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {item.label}
          </button>
        ))}
      </nav>
    </div>
  )
}
