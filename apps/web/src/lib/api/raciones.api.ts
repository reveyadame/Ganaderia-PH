import { api } from './client'
import { TurnoRacion } from '@ganaderia/shared'

export interface RacionDefinicion {
  id: string
  corralId: string
  definidaPorId: string
  cantidadKgManana: number
  cantidadKgTarde: number
  descripcion: string | null
  fechaInicio: string
  fechaFin: string | null
  activa: boolean
  createdAt: string
  corral?: { id: string; nombre: string; codigo: string }
  definidaPor: { id: string; nombre: string }
  _count?: { surtidos: number }
}

export interface SurtidoRacion {
  id: string
  corralId: string
  racionDefinicionId: string | null
  surtidoPorId: string
  turno: TurnoRacion
  fechaSurtido: string
  cantidadDefinida: number | null
  cantidadSurtida: number
  diferencia: number | null
  notas: string | null
  corral: { id: string; nombre: string; codigo: string }
  surtidoPor: { id: string; nombre: string }
  racionDefinicion: { cantidadKgManana: number; cantidadKgTarde: number; descripcion: string | null } | null
}

export interface CreateRacionInput {
  corralId: string
  cantidadKgManana: number
  cantidadKgTarde: number
  descripcion?: string
}

export interface CreateSurtidoInput {
  corralId: string
  racionDefinicionId?: string
  turno: TurnoRacion
  cantidadSurtida: number
  notas?: string
}

export const racionesApi = {
  getRacionActiva: (corralId: string) =>
    api.get<RacionDefinicion | null>(`/raciones/activa?corralId=${corralId}`),
  getRacionesCorral: (corralId: string) =>
    api.get<RacionDefinicion[]>(`/raciones/corral/${corralId}`),
  crearRacion: (data: CreateRacionInput) =>
    api.post<RacionDefinicion>('/raciones/definir', data),
  getSurtidosRecientes: (corralId: string, limite?: number) => {
    const qs = new URLSearchParams({ corralId })
    if (limite) qs.set('limite', String(limite))
    return api.get<SurtidoRacion[]>(`/raciones/surtidos?${qs}`)
  },
  registrarSurtido: (data: CreateSurtidoInput) =>
    api.post<SurtidoRacion>('/raciones/surtir', data),
}
