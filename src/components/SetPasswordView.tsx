import { useState } from 'react'
import { supabase } from '../lib/supabase'

interface SetPasswordViewProps {
  error?: string | null
  onComplete: () => void
  onCancel: () => void
}

function PasswordInput({
  label,
  value,
  disabled,
  placeholder,
  onChange,
  onEnter,
}: {
  label: string
  value: string
  disabled?: boolean
  placeholder: string
  onChange: (value: string) => void
  onEnter?: () => void
}) {
  const [visible, setVisible] = useState(false)

  return (
    <div>
      <label style={{ fontSize: 12, fontWeight: 500, color: 'var(--color-text-muted)', display: 'block', marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ position: 'relative' }}>
        <input
          type={visible ? 'text' : 'password'}
          value={value}
          disabled={disabled}
          onChange={e => onChange(e.target.value)}
          placeholder={placeholder}
          autoComplete="new-password"
          onKeyDown={e => e.key === 'Enter' && onEnter?.()}
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
          onClick={() => setVisible(v => !v)}
          disabled={disabled}
          title={visible ? 'Ocultar contraseña' : 'Mostrar contraseña'}
          style={{
            position: 'absolute', right: 8, top: '50%',
            transform: 'translateY(-50%)',
            width: 32, height: 32,
            border: 'none',
            background: 'transparent',
            color: 'var(--color-text-muted)',
            cursor: disabled ? 'default' : 'pointer',
            fontSize: 16,
          }}
        >
          {visible ? '◐' : '○'}
        </button>
      </div>
    </div>
  )
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

        <PasswordInput
          label="Nueva contraseña"
          value={password}
          disabled={Boolean(error)}
          placeholder="Mínimo 8 caracteres"
          onChange={setPassword}
        />

        <PasswordInput
          label="Confirmar contraseña"
          value={confirm}
          disabled={Boolean(error)}
          placeholder="Repite la contraseña"
          onChange={setConfirm}
          onEnter={handleSubmit}
        />

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
