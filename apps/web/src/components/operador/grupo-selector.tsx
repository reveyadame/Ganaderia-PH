'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, MapPin, Check } from 'lucide-react'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { useAuthStore } from '@/stores/auth.store'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'operador-grupo-activo'

export function useGrupoActivo() {
  const { usuario } = useAuthStore()
  const [grupoId, setGrupoIdState] = useState<string | null>(null)

  const { data: grupos } = useQuery({
    queryKey: ['grupos-corrales-asignados'],
    queryFn: gruposCorralesApi.findAll,
    select: (gs) =>
      gs.filter(
        (g) => g.activo && (usuario?.gruposCorralesIds.length === 0 || usuario?.gruposCorralesIds.includes(g.id)),
      ),
    enabled: !!usuario,
  })

  useEffect(() => {
    if (!grupos || grupos.length === 0) return
    const stored = localStorage.getItem(STORAGE_KEY)
    const valid = stored && grupos.some((g) => g.id === stored)
    setGrupoIdState(valid ? stored : grupos[0].id)
  }, [grupos])

  const setGrupoId = (id: string) => {
    setGrupoIdState(id)
    localStorage.setItem(STORAGE_KEY, id)
  }

  const grupoActivo = grupos?.find((g) => g.id === grupoId) ?? null

  return { grupos: grupos ?? [], grupoActivo, grupoId, setGrupoId }
}

export function GrupoSelector() {
  const { grupos, grupoActivo, grupoId, setGrupoId } = useGrupoActivo()
  const [open, setOpen] = useState(false)

  if (grupos.length === 0) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground">
        <MapPin className="h-3.5 w-3.5" />
        <span>Sin grupo asignado</span>
      </div>
    )
  }

  if (grupos.length === 1) {
    return (
      <div className="flex items-center gap-1.5 text-[12px] text-muted-foreground min-w-0">
        <MapPin className="h-3.5 w-3.5 shrink-0" />
        <span className="truncate font-medium text-foreground">{grupos[0].nombre}</span>
      </div>
    )
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-1.5 px-2 py-1 -mx-2 rounded-md hover:bg-muted/60 transition-colors active:bg-muted min-w-0"
      >
        <MapPin className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
        <span className="text-[13px] font-semibold text-foreground truncate max-w-[160px]">
          {grupoActivo?.nombre ?? 'Selecciona grupo'}
        </span>
        <ChevronDown className={cn('h-3.5 w-3.5 text-muted-foreground transition-transform', open && 'rotate-180')} />
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="absolute top-full left-0 mt-1 z-50 min-w-[220px] rounded-xl border border-border bg-surface-raised shadow-lg overflow-hidden">
            <div className="px-3 py-2 border-b border-border">
              <p className="text-[10px] font-bold tracking-widest uppercase text-muted-foreground">Cambiar grupo</p>
            </div>
            <div className="py-1 max-h-[60vh] overflow-y-auto">
              {grupos.map((g) => {
                const active = g.id === grupoId
                return (
                  <button
                    key={g.id}
                    onClick={() => {
                      setGrupoId(g.id)
                      setOpen(false)
                    }}
                    className={cn(
                      'w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-[14px] transition-colors',
                      active ? 'bg-brand/8 text-brand font-medium' : 'text-foreground hover:bg-muted/60',
                    )}
                  >
                    <span className="truncate">{g.nombre}</span>
                    {active && <Check className="h-4 w-4 shrink-0" />}
                  </button>
                )
              })}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
