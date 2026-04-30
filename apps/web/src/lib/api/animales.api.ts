import { api } from './client'
import { SexoAnimal, EstadoAnimal, CausaEgresoAnimal } from '@ganaderia/shared'

export interface AnimalCorral {
  id: string; nombre: string; codigo: string
  grupoCorrales: { id: string; nombre: string; farmaciaId: string }
}

export interface AnimalResumen {
  id: string
  areteSiniiga: string | null
  areteBlancoActual: { id: string; codigo: string } | null
  sexo: SexoAnimal
  pesoEntrada: number
  fechaEntrada: string
  estado: EstadoAnimal
  corral: AnimalCorral
  lote: { id: string; codigo: string; procedencia: string | null } | null
  costoAcumulado: number
}

export interface AnimalDetalle extends AnimalResumen {
  notas: string | null
  fechaEgreso: string | null
  causaEgreso: CausaEgresoAnimal | null
  precioVenta: number | null
  asignacionesArete: {
    id: string
    fechaAsignacion: string
    fechaLiberacion: string | null
    areteBlanco: { id: string; codigo: string }
  }[]
  aplicaciones: {
    id: string
    fechaAplicacion: string
    costoTotalCalculado: number
    notas: string | null
    template: { id: string; nombre: string } | null
    aplicadoPor: { id: string; nombre: string; apellido: string }
    items: {
      id: string
      dosisAplicada: number
      unidadDosis: string
      costoItemCalculado: number
      medicamento: { id: string; nombre: string; unidadMedida: string }
    }[]
  }[]
}

export interface PaginatedAnimales {
  data: AnimalResumen[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface QueryAnimales {
  search?: string
  corralId?: string
  grupoCorralesId?: string
  sexo?: SexoAnimal
  estado?: EstadoAnimal
  page?: number
  limit?: number
}

export interface CreateAnimalInput {
  areteSiniiga?: string
  areteBlancoId?: string
  sexo: SexoAnimal
  pesoEntrada: number
  fechaEntrada: string
  corralId: string
  loteId?: string
  notas?: string
}

export interface EgresoAnimalInput {
  causa: CausaEgresoAnimal
  fechaEgreso: string
  precioVenta?: number
  notas?: string
}

export interface Lote {
  id: string; codigo: string; procedencia: string | null
  fechaEntrada: string; numAnimalesEsperados: number | null
  corral: { id: string; nombre: string; grupoCorrales: { id: string; nombre: string } }
  _count: { animales: number }
}

export const animalesApi = {
  findAll: (query?: QueryAnimales) => {
    const params = new URLSearchParams()
    if (query) {
      Object.entries(query).forEach(([k, v]) => { if (v !== undefined) params.set(k, String(v)) })
    }
    const qs = params.toString()
    return api.get<PaginatedAnimales>(`/animales${qs ? `?${qs}` : ''}`)
  },
  findOne: (id: string) => api.get<AnimalDetalle>(`/animales/${id}`),
  create: (data: CreateAnimalInput) => api.post<AnimalDetalle>('/animales', data),
  egreso: (id: string, data: EgresoAnimalInput) => api.patch<AnimalDetalle>(`/animales/${id}/egreso`, data),
  liberarArete: (id: string) => api.patch<{ message: string }>(`/animales/${id}/liberar-arete`, {}),
  findAllLotes: () => api.get<Lote[]>('/animales/lotes'),
  createLote: (data: { codigo: string; corralId: string; procedencia?: string; fechaEntrada?: string; numAnimalesEsperados?: number }) =>
    api.post<Lote>('/animales/lotes', data),
}
