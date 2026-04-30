import { CheckCircle, MapPin, Tag, Scale, Calendar } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import { ScanResultAnimal } from '@ganaderia/shared'

interface ScanResultAnimalProps {
  result: ScanResultAnimal
  onClear?: () => void
}

export function ScanResultAnimalCard({ result, onClear }: ScanResultAnimalProps) {
  const { animal } = result

  return (
    <div className="rounded-xl border-2 border-green-500/40 bg-green-500/5 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-green-500 shrink-0" />
          <span className="text-sm font-semibold text-foreground">Animal identificado</span>
        </div>
        {onClear && (
          <button
            onClick={onClear}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Cambiar
          </button>
        )}
      </div>

      {/* Aretes */}
      <div className="flex flex-wrap gap-2">
        {animal.areteSiniiga && (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/20 rounded-lg px-2.5 py-1.5">
            <Tag className="h-3.5 w-3.5 text-amber-500" />
            <span className="text-xs font-mono font-semibold text-amber-600 dark:text-amber-400">
              {animal.areteSiniiga}
            </span>
            <span className="text-xs text-amber-500/70">SINIIGA</span>
          </div>
        )}
        {animal.areteBlancoActual && (
          <div className="flex items-center gap-1.5 bg-surface border border-border rounded-lg px-2.5 py-1.5">
            <Tag className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="text-xs font-mono font-semibold text-foreground">
              {animal.areteBlancoActual}
            </span>
            <span className="text-xs text-muted-foreground">Blanco</span>
          </div>
        )}
        <Badge variant={animal.sexo === 'MACHO' ? 'info' : 'warning'}>
          {animal.sexo === 'MACHO' ? '♂ Macho' : '♀ Hembra'}
        </Badge>
      </div>

      {/* Info grid */}
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-3.5 w-3.5 shrink-0" />
          <span className="truncate">{animal.corral.nombre} · {animal.corral.grupoCorrales.nombre}</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Scale className="h-3.5 w-3.5 shrink-0" />
          <span>{animal.pesoEntrada} kg entrada</span>
        </div>
        <div className="flex items-center gap-2 text-muted-foreground">
          <Calendar className="h-3.5 w-3.5 shrink-0" />
          <span>Entrada {formatDate(animal.fechaEntrada)}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Costo acumulado:</span>
          <span className="text-sm font-semibold text-foreground">
            {formatCurrency(animal.costoAcumulado)}
          </span>
        </div>
      </div>
    </div>
  )
}
