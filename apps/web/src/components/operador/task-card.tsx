'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'

type Tone = 'brand' | 'success' | 'info' | 'warning' | 'accent'

const TONES: Record<Tone, string> = {
  brand:   'bg-brand/10 text-brand border-brand/20',
  success: 'bg-success-subtle text-success-foreground border-success/20',
  info:    'bg-info-subtle text-info-foreground border-info/20',
  warning: 'bg-warning-subtle text-warning-foreground border-warning/20',
  accent:  'bg-accent-subtle text-accent-foreground border-accent/20',
}

export interface TaskCardProps {
  href: Route
  label: string
  description?: string
  icon: React.ElementType
  tone?: Tone
}

export function TaskCard({ href, label, description, icon: Icon, tone = 'brand' }: TaskCardProps) {
  return (
    <Link
      href={href}
      className={cn(
        'group flex items-center gap-4 rounded-2xl border border-border bg-surface p-4',
        'min-h-[88px] active:scale-[0.98] transition-transform',
        'hover:border-border-strong hover:shadow-sm',
      )}
    >
      <div className={cn('w-14 h-14 rounded-xl border flex items-center justify-center shrink-0', TONES[tone])}>
        <Icon className="h-7 w-7" strokeWidth={1.75} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[16px] font-semibold text-foreground tracking-tight leading-tight">{label}</p>
        {description && (
          <p className="text-[13px] text-muted-foreground mt-0.5 leading-snug">{description}</p>
        )}
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-foreground group-active:translate-x-0.5 transition-all shrink-0" />
    </Link>
  )
}
