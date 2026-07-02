import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface SetPasswordViewProps {
  error?: string | null
  onComplete: () => void
  onCancel: () => void
}

export default function SetPasswordView({ error, onComplete, onCancel }: SetPasswordViewProps) {
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [localError, setLocalError] = useState<string | null>(null)

  const disabled = loading || password.length < 8 || password !== confirm || Boolean(error)

  const handleSubmit = async () => {
    if (disabled) return

    setLoading(true)
    setLocalError(null)

    const { error: updateError } = await supabase.auth.updateUser({ password })

    if (updateError) {
      setLocalError('No se pudo guardar la contraseña. El enlace puede haber expirado.')
      setLoading(false)
      return
    }

    setLoading(false)
    onComplete()
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
      <div style={{ marginBottom: 28, textAlign: 'center' }}>
        <div style={{ fontSize: 32, marginBottom: 8 }}>💧</div>
        <div style={{ fontWeight: 700, fontSize: 22, letterSpacing: '-0.02em' }}>Crea tu contraseña</div>
        <div style={{ fontSize: 13, color: 'var(--color-text-muted)', marginTop: 4, maxWidth: 320 }}>
          Define una contraseña para entrar a biomonitor.
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 360, display: 'flex', flexDirection: 'column', gap: 12 }}>
        {error && (
          <div style={{
            fontSize: 13,
            color: 'var(--color-warning)',
            background: 'var(--color-warning-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '10px 12px',
            lineHeight: 1.4,
          }}>
            {error}
            <div style={{ marginTop: 6 }}>
              Solicita al administrador que reenvíe la invitación.
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>
            Nueva contraseña
          </label>
          <input
            type="password"
            value={password}
            disabled={Boolean(error)}
            onChange={e => setPassword(e.target.value)}
            placeholder="Mínimo 8 caracteres"
            autoComplete="new-password"
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
            Confirmar contraseña
          </label>
          <input
            type="password"
            value={confirm}
            disabled={Boolean(error)}
            onChange={e => setConfirm(e.target.value)}
            placeholder="Repite la contraseña"
            autoComplete="new-password"
            onKeyDown={e => e.key === 'Enter' && handleSubmit()}
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

        {!error && password && password.length < 8 && (
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)' }}>
            Usa al menos 8 caracteres.
          </div>
        )}

        {!error && confirm && password !== confirm && (
          <div style={{ fontSize: 12, color: 'var(--color-warning)' }}>
            Las contraseñas no coinciden.
          </div>
        )}

        {localError && (
          <div style={{
            fontSize: 13,
            color: 'var(--color-warning)',
            background: 'var(--color-warning-light)',
            borderRadius: 'var(--radius-sm)',
            padding: '8px 12px',
          }}>
            {localError}
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={disabled}
          style={{
            marginTop: 4,
            width: '100%', padding: '13px 0',
            background: disabled ? 'var(--color-border)' : 'var(--color-accent)',
            color: '#fff', border: 'none',
            borderRadius: 'var(--radius-md)',
            fontSize: 15, fontWeight: 600,
            cursor: disabled ? 'not-allowed' : 'pointer',
            fontFamily: 'var(--font-sans)',
            transition: 'background .15s',
          }}
        >
          {loading ? 'Guardando...' : 'Guardar contraseña'}
        </button>

        <button
          onClick={onCancel}
          style={{
            width: '100%', padding: '11px 0',
            background: 'none',
            color: 'var(--color-text-muted)',
            border: '1.5px solid var(--color-border)',
            borderRadius: 'var(--radius-md)',
            fontSize: 14,
            fontWeight: 500,
            cursor: 'pointer',
            fontFamily: 'var(--font-sans)',
          }}
        >
          Volver al inicio de sesión
        </button>
      </div>
    </div>
  )
}
