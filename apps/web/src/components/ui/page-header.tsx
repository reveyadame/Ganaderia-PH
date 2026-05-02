interface PageHeaderProps {
  title: string
  description?: string
  action?: React.ReactNode
  meta?: React.ReactNode
}

export function PageHeader({ title, description, action, meta }: PageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-6 pb-6 border-b border-border">
      <div className="min-w-0 space-y-1.5">
        <div className="flex items-center gap-3">
          <h1 className="text-[22px] leading-tight font-bold text-foreground tracking-[-0.03em]">
            {title}
          </h1>
          {meta}
        </div>
        {description && (
          <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl font-medium">
            {description}
          </p>
        )}
      </div>
      {action && (
        <div className="shrink-0 flex items-center gap-2">
          {action}
        </div>
      )}
    </div>
  )
}
