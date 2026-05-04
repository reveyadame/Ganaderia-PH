'use client'

import { useRouter } from 'next/navigation'
import { ArrowLeft } from 'lucide-react'

interface MobilePageHeaderProps {
  title: string
  subtitle?: string
  back?: boolean
  action?: React.ReactNode
}

export function MobilePageHeader({ title, subtitle, back = true, action }: MobilePageHeaderProps) {
  const router = useRouter()

  return (
    <div className="flex items-center gap-2 -mx-1 mb-5">
      {back && (
        <button
          onClick={() => router.back()}
          aria-label="Volver"
          className="w-10 h-10 -ml-1 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground active:bg-muted transition-colors shrink-0"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
      )}
      <div className="flex-1 min-w-0">
        <h1 className="text-[20px] font-bold text-foreground tracking-tight leading-tight truncate">
          {title}
        </h1>
        {subtitle && (
          <p className="text-[12px] text-muted-foreground leading-snug truncate">{subtitle}</p>
        )}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  )
}
