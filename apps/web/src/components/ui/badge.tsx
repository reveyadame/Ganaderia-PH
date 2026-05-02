import { cn } from '@/lib/utils'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'muted' | 'outline'

interface BadgeProps {
  variant?: BadgeVariant
  children: React.ReactNode
  className?: string
  dot?: boolean
}

const variants: Record<BadgeVariant, string> = {
  default: 'bg-brand-subtle text-foreground border border-border-strong/40',
  success: 'bg-success-subtle text-success-foreground border border-success/15',
  warning: 'bg-warning-subtle text-warning-foreground border border-warning/15',
  danger:  'bg-danger-subtle  text-danger-foreground  border border-danger/15',
  info:    'bg-info-subtle    text-info-foreground    border border-info/15',
  muted:   'bg-muted text-muted-foreground border border-border',
  outline: 'bg-transparent text-foreground border border-border',
}

const dotColors: Record<BadgeVariant, string> = {
  default: 'bg-foreground/60',
  success: 'bg-success',
  warning: 'bg-warning',
  danger:  'bg-danger',
  info:    'bg-info',
  muted:   'bg-muted-foreground',
  outline: 'bg-foreground/60',
}

export function Badge({ variant = 'default', children, className, dot }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-medium tracking-wide',
        variants[variant],
        className,
      )}
    >
      {dot && (
        <span className={cn('h-1.5 w-1.5 rounded-full animate-pulse', dotColors[variant])} />
      )}
      {children}
    </span>
  )
}

export function ActiveBadge({ activo }: { activo: boolean }) {
  return activo
    ? <Badge variant="success" dot>Activo</Badge>
    : <Badge variant="muted" dot>Inactivo</Badge>
}
