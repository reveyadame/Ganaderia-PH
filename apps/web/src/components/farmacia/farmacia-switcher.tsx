'use client'

import { useEffect, useMemo } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { FlaskConical, ChevronDown } from 'lucide-react'
import { farmaciasApi, Farmacia } from '@/lib/api/farmacias.api'
import { cn } from '@/lib/utils'

const STORAGE_KEY = 'ganaderia.farmaciaActivaId'

function readStored(): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function writeStored(id: string) {
  if (typeof window === 'undefined') return
  try {
    window.localStorage.setItem(STORAGE_KEY, id)
  } catch {
    // localStorage no disponible (modo privado, etc.)
  }
}

interface UseFarmaciaActivaReturn {
  farmacias: Farmacia[]
  farmaciaActivaId: string
  farmaciaActiva: Farmacia | null
  setFarmaciaActivaId: (id: string) => void
  isLoading: boolean
  hasAccess: boolean
}

export function useFarmaciaActiva(): UseFarmaciaActivaReturn {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()
  const urlFarmaciaId = searchParams.get('farmaciaId') ?? ''

  const { data: farmacias = [], isLoading } = useQuery({
    queryKey: ['farmacias'],
    queryFn: farmaciasApi.findAll,
  })

  const farmaciaActivaId = useMemo(() => {
    if (urlFarmaciaId && farmacias.some((f) => f.id === urlFarmaciaId)) return urlFarmaciaId
    const stored = readStored()
    if (stored && farmacias.some((f) => f.id === stored)) return stored
    return farmacias[0]?.id ?? ''
  }, [urlFarmaciaId, farmacias])

  // Sincroniza URL y localStorage cuando se resuelve la farmacia activa
  useEffect(() => {
    if (!farmaciaActivaId) return
    if (urlFarmaciaId !== farmaciaActivaId) {
      const params = new URLSearchParams(searchParams.toString())
      params.set('farmaciaId', farmaciaActivaId)
      router.replace(`${pathname}?${params.toString()}` as never, { scroll: false })
    }
    writeStored(farmaciaActivaId)
  }, [farmaciaActivaId, urlFarmaciaId, pathname, router, searchParams])

  const setFarmaciaActivaId = (id: string) => {
    writeStored(id)
    const params = new URLSearchParams(searchParams.toString())
    params.set('farmaciaId', id)
    router.replace(`${pathname}?${params.toString()}` as never, { scroll: false })
  }

  const farmaciaActiva = farmacias.find((f) => f.id === farmaciaActivaId) ?? null

  return {
    farmacias,
    farmaciaActivaId,
    farmaciaActiva,
    setFarmaciaActivaId,
    isLoading,
    hasAccess: farmacias.length > 0,
  }
}

export function FarmaciaSwitcher() {
  const { farmacias, farmaciaActivaId, setFarmaciaActivaId, isLoading } = useFarmaciaActiva()

  if (isLoading) {
    return (
      <div className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-muted/40 text-sm text-muted-foreground">
        <FlaskConical className="h-4 w-4 animate-pulse" />
        Cargando farmacias…
      </div>
    )
  }

  if (farmacias.length === 0) return null

  if (farmacias.length === 1) {
    const f = farmacias[0]!
    return (
      <div className="inline-flex items-center gap-2 h-9 px-3 rounded-md border border-border bg-surface text-sm">
        <FlaskConical className="h-4 w-4 text-brand" />
        <span className="font-medium text-foreground">{f.nombre}</span>
      </div>
    )
  }

  return (
    <div className="relative inline-flex items-center">
      <FlaskConical className="absolute left-3 h-4 w-4 text-brand pointer-events-none" />
      <select
        value={farmaciaActivaId}
        onChange={(e) => setFarmaciaActivaId(e.target.value)}
        className={cn(
          'h-9 pl-9 pr-9 rounded-md border border-border bg-surface text-sm font-medium text-foreground appearance-none cursor-pointer min-w-[180px]',
          'shadow-xs transition-[border,box-shadow] duration-150',
          'focus:outline-none focus:border-brand/40 focus:shadow-focus hover:border-border-strong',
        )}
      >
        {farmacias.map((f) => (
          <option key={f.id} value={f.id}>
            {f.nombre}
          </option>
        ))}
      </select>
      <ChevronDown className="absolute right-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
    </div>
  )
}

interface SinFarmaciasProps {
  className?: string
}

export function SinFarmaciasMensaje({ className }: SinFarmaciasProps) {
  return (
    <div className={cn('rounded-lg border border-border bg-surface p-8 text-center space-y-2', className)}>
      <FlaskConical className="h-8 w-8 text-muted-foreground mx-auto" />
      <p className="text-[14px] font-medium text-foreground">Sin acceso a ninguna farmacia</p>
      <p className="text-[13px] text-muted-foreground max-w-md mx-auto">
        Pídele al superusuario que te asigne a un grupo de corrales con farmacia,
        o que cree una farmacia para tu organización.
      </p>
    </div>
  )
}
