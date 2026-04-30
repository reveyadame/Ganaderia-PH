import { api } from './client'

export interface CostoAnimalItem {
  id: string
  areteSiniiga: string | null
  areteBlanco: string | null
  sexo: string
  fechaEntrada: string
  corral: {
    id: string
    codigo: string
    grupoCorrales: { id: string; nombre: string }
  }
  tratamientosCount: number
  costoTotal: number
}

export interface PaginatedResult<T> {
  items: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface StockCriticoItem {
  id: string
  nombre: string
  presentacion: string
  stockMinimo: number
  stockOperativo: number
  enAlerta: boolean
  farmacia: { id: string; nombre: string }
}

export interface TratamientoReporteItem {
  id: string
  fechaAplicacion: string
  costoTotalCalculado: number
  templateNombre: string | null
  animal: {
    id: string
    areteSiniiga: string | null
    areteBlanco: string | null
    corral: {
      codigo: string
      grupoCorrales: { nombre: string }
    }
  }
}

function qs(params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const reportesApi = {
  getCostoAnimal: (params: {
    page?: number
    limit?: number
    grupoCorralesId?: string
    corralId?: string
    busqueda?: string
  }) =>
    api.get<PaginatedResult<CostoAnimalItem>>(`/reportes/costo-animal${qs(params as Record<string, string | number | undefined>)}`),

  getStockCritico: (grupoCorralesId?: string) =>
    api.get<StockCriticoItem[]>(`/reportes/stock-critico${qs({ grupoCorralesId })}`),

  getTratamientos: (params: {
    desde?: string
    hasta?: string
    grupoCorralesId?: string
    corralId?: string
    page?: number
    limit?: number
  }) =>
    api.get<PaginatedResult<TratamientoReporteItem>>(`/reportes/tratamientos${qs(params as Record<string, string | number | undefined>)}`),
}
