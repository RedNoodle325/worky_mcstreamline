interface Props {
  status: string
  size?: 'sm' | 'md'
}

const STATUS_COLORS: Record<string, string> = {
  open: 'var(--status-open)',
  techs_scheduled: 'var(--accent)',
  parts_on_order: 'var(--orange)',
  in_progress: 'var(--yellow)',
  complete: 'var(--green)',
  completed: 'var(--green)',
  resolved: 'var(--green)',
  closed: 'var(--text3)',
  cancelled: 'var(--text3)',
  active: 'var(--green)',
  inactive: 'var(--text3)',
  pending: 'var(--yellow)',
  dispatched: 'var(--status-dispatched)',
  onsite: 'var(--status-onsite)',
  parts: 'var(--status-parts)',
}

const STATUS_LABELS: Record<string, string> = {
  open: 'Open',
  techs_scheduled: 'Techs Scheduled',
  parts_on_order: 'Parts on Order',
  in_progress: 'In Progress',
  complete: 'Complete',
  completed: 'Completed',
  resolved: 'Resolved',
  closed: 'Closed',
  cancelled: 'Cancelled',
  active: 'Active',
  inactive: 'Inactive',
  pending: 'Pending',
  dispatched: 'Dispatched',
  onsite: 'On Site',
  parts: 'Parts',
}

export function StatusBadge({ status, size = 'md' }: Props) {
  const color = STATUS_COLORS[status?.toLowerCase()] || 'var(--text3)'
  const label = STATUS_LABELS[status?.toLowerCase()] || status
  const pad = size === 'sm' ? '1px 6px' : '2px 10px'
  const fs = size === 'sm' ? 10 : 11

  return (
    <span style={{
      background: `${color}22`,
      color,
      border: `1px solid ${color}44`,
      borderRadius: 99,
      padding: pad,
      fontSize: fs,
      fontWeight: 600,
      whiteSpace: 'nowrap',
    }}>
      {label}
    </span>
  )
}
