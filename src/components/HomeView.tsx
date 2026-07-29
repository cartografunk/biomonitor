import type { MouseEvent } from 'react'
import { STUDY_AREAS } from '../studyAreas'

export default function HomeView({ onNavigate }: { onNavigate?: (path: string) => void }) {
  const firstStudyArea = STUDY_AREAS[0]
  const handleNavigate = (event: MouseEvent<HTMLAnchorElement>, path: string) => {
    if (!onNavigate) return
    event.preventDefault()
    onNavigate(path)
  }

  return (
    <div style={{
      minHeight: '100dvh',
      background: 'var(--color-bg)',
      color: 'var(--color-text-primary)',
      display: 'flex',
      flexDirection: 'column',
    }}>
      <header style={{
        background: 'var(--color-surface)',
        borderBottom: '1px solid var(--color-border)',
        padding: '18px 22px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: '-0.01em' }}>
            biomonitor
          </div>
          <div style={{ fontSize: 12, color: 'var(--color-text-muted)', marginTop: 1 }}>
            monitoreo ambiental en campo
          </div>
        </div>
        {firstStudyArea && (
          <a
            href={firstStudyArea.path}
            onClick={event => handleNavigate(event, firstStudyArea.path)}
            style={{
              border: '1.5px solid var(--color-border)',
              borderRadius: 'var(--radius-md)',
              background: 'var(--color-surface)',
              color: 'var(--color-text-primary)',
              padding: '9px 12px',
              fontSize: 13,
              fontWeight: 700,
            }}
          >
            Entrar
          </a>
        )}
      </header>

      <main style={{
        width: 'min(100%, 920px)',
        margin: '0 auto',
        padding: '42px 20px 64px',
        display: 'flex',
        flexDirection: 'column',
        gap: 28,
      }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--color-accent)', textTransform: 'uppercase' }}>
            Plataforma de seguimiento
          </div>
          <h1 style={{
            fontSize: 38,
            lineHeight: 1.08,
            letterSpacing: 0,
            fontWeight: 700,
            maxWidth: 680,
          }}>
            Sistema Digital de Monitoreo
          </h1>
          <p style={{
            fontSize: 16,
            color: 'var(--color-text-muted)',
            maxWidth: 620,
          }}>
            Biomonitor organiza visitas de campo, fotografías, puntos de muestreo y parámetros físico-químicos para proyectos de restauración y seguimiento.
          </p>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--color-text-muted)' }}>
            Proyectos
          </div>
          {STUDY_AREAS.map(area => (
            <a
              key={area.slug}
              href={area.path}
              onClick={event => handleNavigate(event, area.path)}
              style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: 14,
                alignItems: 'center',
                background: 'var(--color-surface)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                padding: '16px',
                boxShadow: 'var(--shadow-sm)',
                color: 'var(--color-text-primary)',
              }}
            >
              <span>
                <span style={{ display: 'block', fontSize: 16, fontWeight: 700 }}>
                  {area.name}
                </span>
                <span style={{ display: 'block', fontSize: 13, color: 'var(--color-text-muted)', marginTop: 2 }}>
                  {area.description}
                </span>
              </span>
              <span style={{
                width: 34,
                height: 34,
                borderRadius: '50%',
                background: 'var(--color-accent-light)',
                color: 'var(--color-accent)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 20,
                fontWeight: 500,
              }}>
                ›
              </span>
            </a>
          ))}
        </section>
      </main>
    </div>
  )
}
