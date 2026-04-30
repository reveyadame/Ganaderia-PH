import { api } from './client'

export interface DashboardKpis {
  animalesActivos: number
  costoPromedioAnimal: number
  costoTotalAcumulado: number
  stockCritico: number
  tratamientosUltimos7dias: number
  tratamientosHoy: number
  cachedAt: string
}

export interface TratamientosDia {
  fecha: string
  tratamientos: number
  costo: number
}

export interface ResumenGrupo {
  id: string
  nombre: string
  farmacia: { id: string; nombre: string } | null
  corralesCount: number
  animalesActivos: number
}

function qs(params: Record<string, string | number | undefined>) {
  const p = new URLSearchParams()
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) p.set(k, String(v)) })
  const s = p.toString()
  return s ? `?${s}` : ''
}

export const dashboardApi = {
  getKpis: (grupoCorralesId?: string) =>
    api.get<DashboardKpis>(`/dashboard/kpis${qs({ grupoCorralesId })}`),

  getTratamientosPorDia: (dias = 30, grupoCorralesId?: string) =>
    api.get<TratamientosDia[]>(`/dashboard/tratamientos-por-dia${qs({ dias, grupoCorralesId })}`),

  getResumenGrupos: () =>
    api.get<ResumenGrupo[]>('/dashboard/grupos'),
}
