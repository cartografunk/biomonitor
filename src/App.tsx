import { useState, useEffect } from 'react'
import { supabase } from './lib/supabase'
import type { Session } from '@supabase/supabase-js'
import type { UserRole } from './types'
import MapView from './components/MapView'
import VisitaView from './components/VisitaView'
import AguaView from './components/AguaView'
import PhotosView from './components/PhotosView'
import ReportesView from './components/ReportesView'
import LoginView from './components/LoginView'
import SetPasswordView from './components/SetPasswordView'

type Tab = 'mapa' | 'visita' | 'agua' | 'fotos' | 'reportes'
type PasswordFlow = 'invite' | 'recovery' | null

const NAV_ITEMS: { id: Tab; label: string }[] = [
  { id: 'mapa',     label: 'Mapa' },
  { id: 'visita',   label: 'Visita' },
  { id: 'agua',     label: 'Agua' },
  { id: 'fotos',    label: 'Fotos' },
  { id: 'reportes', label: 'Reportes' },
]

function getMexicoCityDate() {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Mexico_City',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date())
}

export default function App() {
  const [tab, setTab] = useState<Tab>('mapa')
  const [session, setSession] = useState<Session | null>(null)
  const [role, setRole] = useState<UserRole | null>(null)
  const [loading, setLoading] = useState(true)
  const [passwordFlow, setPasswordFlow] = useState<PasswordFlow>(null)
  const [passwordFlowError, setPasswordFlowError] = useState<string | null>(null)
  const [visitDate, setVisitDate] = useState(getMexicoCityDate())
  const [mapRefreshKey, setMapRefreshKey] = useState(0)

  useEffect(() => {
    async function initializeAuth() {
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      const accessToken = hash.get('access_token')
      const refreshToken = hash.get('refresh_token')
      const type = hash.get('type')
      const isPasswordFlow = type === 'invite' || type === 'recovery'

      if (window.location.hash) {
        history.replaceState(null, document.title, `${window.location.pathname}${window.location.search}`)
      }

      if (isPasswordFlow) {
        setPasswordFlow(type)

        if (!accessToken || !refreshToken) {
          setPasswordFlowError('El enlace de invitación es inválido o está incompleto.')
          setLoading(false)
          return
        }

        const { data, error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        })

        if (error || !data.session) {
          setPasswordFlowError('El enlace de invitación expiró o ya no es válido.')
          setLoading(false)
          return
        }

        setSession(data.session)
        setLoading(false)
        return
      }

      const { data } = await supabase.auth.getSession()
      setSession(data.session)
      setLoading(false)
    }

    initializeAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
    })
    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    let isMounted = true

    async function loadRole() {
      if (!session?.user.id) {
        setRole(null)
        return
      }

      const { data } = await supabase
        .from('users')
        .select('role')
        .eq('id', session.user.id)
        .single()

      if (isMounted) {
        setRole((data?.role as UserRole | undefined) ?? null)
      }
    }

    loadRole()

    return () => {
      isMounted = false
    }
  }, [session])

  if (loading) return (
    <div style={{
      height: '100dvh', display: 'flex',
      alignItems: 'center', justifyContent: 'center',
      background: 'var(--color-bg)',
    }}>
      <div style={{ fontSize: 13, color: 'var(--color-text-muted)' }}>Cargando...</div>
    </div>
  )

  if (passwordFlow) {
    return (
      <SetPasswordView
        error={passwordFlowError}
        onComplete={() => {
          setPasswordFlow(null)
          setPasswordFlowError(null)
          setTab('mapa')
        }}
        onCancel={async () => {
          await supabase.auth.signOut()
          setPasswordFlow(null)
          setPasswordFlowError(null)
          setSession(null)
        }}
      />
    )
  }

  if (!session) return <LoginView />

  const handleLogout = async () => {
    await supabase.auth.signOut()
  }

  const handleTabChange = (nextTab: Tab) => {
    setTab(nextTab)
    if (nextTab === 'mapa') {
      setMapRefreshKey(key => key + 1)
    }
  }

  const handleVisitDataChanged = () => {
    setMapRefreshKey(key => key + 1)
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
        {tab === 'mapa'     && <MapView session={session} visitDate={visitDate} onVisitDateChange={setVisitDate} refreshKey={mapRefreshKey} />}
        {tab === 'visita'   && <VisitaView session={session} role={role} visitDate={visitDate} onVisitDateChange={setVisitDate} onVisitDataChanged={handleVisitDataChanged} />}
        {tab === 'agua'     && <AguaView />}
        {tab === 'fotos'    && <PhotosView />}
        {tab === 'reportes' && <ReportesView role={role} />}
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
            onClick={() => handleTabChange(item.id)}
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
