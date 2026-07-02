import { useState } from 'react'
import { supabase } from '../lib/supabase'

export default function LoginView() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [guestLoading, setGuestLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const guestEmail = import.meta.env.VITE_GUEST_EMAIL as string | undefined
  const guestPassword = import.meta.env.VITE_GUEST_PASSWORD as string | undefined
  const hasGuestAccess = Boolean(guestEmail && guestPassword)

  const handleLogin = async () => {
    setLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) setError('Correo o contraseña incorrectos')
    setLoading(false)
  }

  const handleGuestLogin = async () => {
    if (!guestEmail || !guestPassword) return

    setGuestLoading(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({
      email: guestEmail,
      password: guestPassword,
    })
    if (error) setError('No se pudo entrar como invitado')
    setGuestLoading(false)
  }

  return (
    <div style={{
      height: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'var(--color-bg)',
      padding: '0 32px',
    }}>
      <div style={{ marginBottom: 32, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💧</div>
        <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>biomonitor</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4 }}>
          Bordo Benito Juárez
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>
            Correo
          </label>
          <input
            type="email"
            value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="correo@ejemplo.com"
            autoComplete="email"
            style={{
              width: '100%', boxSizing: 'border-box',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              padding: '11px 14px',
              fontSize: 15, fontFamily: 'var(--font-sans)',
              color: 'var(--color-text-primary)',
              background: 'var(--color-surface)', outline: 'none',
            }}
          />
        </div>

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>
            Contraseña
          </label>
          <div style={{ position: 'relative' }}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete="current-password"
              onKeyDown={e => e.key === 'Enter' && handleLogin()}
              style={{
                width: '100%', boxSizing: 'border-box',
                border: '1.5px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '11px 48px 11px 14px',
                fontSize: 15, fontFamily: 'var(--font-sans)',
                color: 'var(--color-text-primary)',
                background: 'var(--color-surface)', outline: 'none',
              }}
            />
            <button
              type="button"
              onClick={() => setShowPassword(v => !v)}
              title={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
              style={{
                position: 'absolute', right: 8, top: '50%',
                transform: 'translateY(-50%)',
                width: 32, height: 32,
                border: 'none',
                background: 'transparent',
                color: 'var(--color-text-muted)',
                cursor: 'pointer',
                fontSize: 16,
              }}
            >
              {showPassword ? '◐' : '○'}
            </button>
          </div>
        </div>

        {error && (
          <div style={{
            fontSize: 13, color: 'var(--color-warning)',
            background: 'var(--color-warning-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
          }}>
            {error}
          </div>
        )}

        <button
          onClick={handleLogin}
          disabled={loading || !email || !password}
          style={{
            marginTop: 4,
            width: '100%', padding: '13px 0',
            background: loading || !email || !password ? 'var(--color-border)' : 'var(--color-accent)',
            color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 15, fontWeight: 600,
            cursor: loading || !email || !password ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'background .15s',
          }}
        >
          {loading ? 'Entrando...' : 'Entrar'}
        </button>

        {hasGuestAccess && (
          <button
            onClick={handleGuestLogin}
            disabled={guestLoading || loading}
            style={{
              width: '100%', padding: '12px 0',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              fontSize: 14,
              fontWeight: 600,
              cursor: guestLoading || loading ? 'not-allowed' : 'pointer',
              fontFamily: 'var(--font-sans)',
            }}
          >
            {guestLoading ? 'Entrando...' : 'Ver sin iniciar sesión'}
          </button>
        )}
      </div>
    </div>
  )
}
