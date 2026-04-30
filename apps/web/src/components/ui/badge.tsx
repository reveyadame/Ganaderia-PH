import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
}

const variants: Record<BadgeVariant, string> = {
  default:  'bg-brand/15 text-brand border border-brand/20',
  success:  'bg-green-500/15 text-green-500 border border-green-500/20',
  warning:  'bg-amber-500/15 text-amber-500 border border-amber-500/20',
  danger:   'bg-red-500/15 text-red-500 border border-red-500/20',
  info:     'bg-blue-500/15 text-blue-500 border border-blue-500/20',
  muted:    'bg-muted text-muted-foreground border border-border',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium', variants[variant], className)}>
      {children}
    </span>
  )
}

export function ActiveBadge({ activo }: { activo: boolean }) {
  return activo
    ? <Badge variant="success">Activo</Badge>
    : <Badge variant="muted">Inactivo</Badge>
}
