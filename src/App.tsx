import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import MapView from './components/MapView'
import VisitaView from './components/VisitaView'
import AguaView from './components/AguaView'
import ReportesView from './components/ReportesView'
import LoginView from './components/LoginView'

type Tab = 'mapa' | 'visita' | 'agua' | 'reportes'

const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: 'mapa',     label: 'Mapa' },
  { id: 'visita',   label: 'Visita' },
  { id: 'agua',     label: 'Agua' },
  { id: 'reportes', label: 'Reportes' },
]

export default function App() {
  const [tab, setTab] = useState<Tab>('mapa')
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  if (loading) return (
    <div style={{
      height: '100dvh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Cargando...</div>
    </div>
  )

  if (!session) return <LoginView />

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

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
        <button
          onClick={handleLogout}
          title="Cerrar sesión"
          style={{
            width: 32, height: 32, borderRadius: '50%',
            background: 'var(--color-accent-light)',
            color: 'var(--color-accent)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 500, fontSize: 13,
            border: 'none', cursor: 'pointer',
          }}
        >
          {session.user.email?.[0].toUpperCase()}
        </button>
      </header>

      {/* Main content */}
      <main style={{ flex: 1, overflow: 'hidden', position: 'relative' }}>
        {tab === 'mapa'     && <MapView />}
        {tab === 'visita'   && <VisitaView />}
        {tab === 'agua'     && <AguaView />}
        {tab === 'reportes' && <ReportesView />}
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
