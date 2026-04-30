import Link from 'next/link'
import { Scale, Settings } from 'lucide-react'
import { PageHeader } from '@/components/ui/page-header'

export default function RacionesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Raciones"
        description="Gestión de raciones diarias por corral"
      />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-lg">
        <Link
          href="/raciones/surtir"
          className="rounded-xl border-2 border-border hover:border-brand bg-background p-6 space-y-3 group transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <Scale className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Surtir</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Escanea un corral y registra la cantidad real de alimento surtida
            </p>
          </div>
        </Link>

        <Link
          href="/raciones/definir"
          className="rounded-xl border-2 border-border hover:border-brand bg-background p-6 space-y-3 group transition-colors"
        >
          <div className="w-10 h-10 rounded-lg bg-brand/10 flex items-center justify-center group-hover:bg-brand/20 transition-colors">
            <Settings className="h-5 w-5 text-brand" />
          </div>
          <div>
            <p className="font-semibold text-foreground">Definir ración</p>
            <p className="text-sm text-muted-foreground mt-0.5">
              Establece los kg de mañana y tarde para un corral
            </p>
          </div>
        </Link>
      </div>
    </div>
  )
}
