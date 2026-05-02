'use client'

export function LoadingScreen() {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-background">
      <div className="relative flex flex-col items-center gap-8">
        {/* Logo */}
        <div className="relative animate-[fadeScaleIn_0.5s_ease_forwards]">
          <div className="w-20 h-20 rounded-2xl bg-brand text-brand-foreground flex items-center justify-center shadow-xl shadow-brand/20">
            <span className="text-4xl font-bold">G</span>
          </div>
          {/* Pulsing ring */}
          <div className="absolute -inset-4 rounded-3xl border-2 border-brand/30 animate-pulse" />
        </div>

        {/* Text and progress */}
        <div className="flex flex-col items-center gap-3">
          <h1
            className="text-xl font-semibold tracking-tight text-foreground opacity-0 animate-[fadeUp_0.4s_0.2s_ease_forwards]"
          >
            Ganadería PH
          </h1>

          <div className="w-48 h-1 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-brand rounded-full animate-[progress_1.8s_ease-in-out_infinite]" />
          </div>

          <p className="text-xs text-muted-foreground font-medium uppercase tracking-widest opacity-0 animate-[fadeIn_0.4s_0.4s_ease_forwards]">
            Cargando sistema
          </p>
        </div>
      </div>

      {/* Background glows */}
      <div className="absolute inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-brand/5 blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-brand/5 blur-[120px]" />
      </div>
    </div>
  )
}
