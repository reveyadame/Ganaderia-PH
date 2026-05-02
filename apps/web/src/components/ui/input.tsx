import { cn } from '@/lib/utils'

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  hint?: string
}

export function Input({ label, error, hint, className, id, ...props }: InputProps) {
  const inputId = id ?? label?.toLowerCase().replace(/\s+/g, '-')

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={inputId} className="block text-[13px] font-medium text-foreground">
          {label}
          {props.required && <span className="text-danger ml-0.5">*</span>}
        </label>
      )}
      <input
        id={inputId}
        {...props}
        className={cn(
          'w-full h-9 px-3 rounded-md border bg-surface text-sm text-foreground',
          'placeholder:text-muted-foreground/70',
          'shadow-xs',
          'transition-[border,box-shadow] duration-150 ease-out',
          'focus:outline-none focus:border-accent/50 focus:shadow-[0_0_0_3px_hsl(var(--accent)/0.1)]',
          'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-muted',
          error
            ? 'border-danger focus:border-danger focus:shadow-[0_0_0_3px_hsl(var(--danger)/0.12)]'
            : 'border-border',
          className,
        )}
      />
      {error && <p className="text-xs text-danger flex items-center gap-1">{error}</p>}
      {hint && !error && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  )
}
