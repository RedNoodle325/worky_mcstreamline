import type { Toast as ToastType } from '../hooks/useToast'

interface Props {
  toasts: ToastType[]
  dismiss: (id: number) => void
}

export function ToastContainer({ toasts, dismiss }: Props) {
  if (!toasts.length) return null
  return (
    <div style={{ position: 'fixed', bottom: 24, right: 24, zIndex: 9999, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => (
        <div
          key={t.id}
          onClick={() => dismiss(t.id)}
          style={{
            background: t.type === 'error' ? 'var(--red)' : t.type === 'info' ? 'var(--accent)' : 'var(--green)',
            color: '#fff',
            padding: '10px 16px',
            borderRadius: 8,
            fontSize: 13,
            fontWeight: 500,
            cursor: 'pointer',
            boxShadow: '0 4px 12px rgba(0,0,0,.4)',
            maxWidth: 340,
            animation: 'fadeInUp .2s ease',
          }}
        >
          {t.message}
        </div>
      ))}
    </div>
  )
}
