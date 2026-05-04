import { cn } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline' | 'destructive' | 'ghost'
  size?: 'sm' | 'md' | 'lg' | 'xl' | 'icon'
  loading?: boolean
}

const variants = {
  primary:
    'bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm ' +
    'border border-brand/0 hover:border-brand/0',
  secondary:
    'bg-surface text-foreground border border-border hover:bg-muted hover:border-border-strong shadow-xs',
  outline:
    'bg-transparent text-foreground border border-border hover:bg-muted',
  destructive:
    'bg-danger text-white hover:bg-danger/90 shadow-xs',
  ghost:
    'text-muted-foreground hover:text-foreground hover:bg-muted',
}

const sizes = {
  sm: 'h-8 px-3 text-xs rounded-md gap-1.5',
  md: 'h-9 px-3.5 text-sm rounded-md gap-2',
  lg: 'h-10 px-5 text-sm rounded-lg gap-2',
  xl: 'h-12 px-6 text-[15px] rounded-xl gap-2',
  icon: 'h-9 w-9 rounded-md',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading,
  className,
  children,
  disabled,
  ...props
}: ButtonProps) {
  return (
    <button
      {...props}
      disabled={disabled || loading}
      className={cn(
        'inline-flex items-center justify-center font-medium select-none cursor-pointer',
        'transition-[background,border,color,box-shadow,transform] duration-150 ease-out',
        'active:scale-[0.98]',
        'focus-visible:outline-none focus-visible:shadow-focus',
        'disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none',
        'whitespace-nowrap',
        variants[variant],
        sizes[size],
        className,
      )}
    >
      {loading && (
        <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin shrink-0" />
      )}
      {children}
    </button>
  )
}
