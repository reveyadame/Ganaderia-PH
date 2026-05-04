import { api } from './client'
import {
  EstadoUnidadMedicamento,
  EstadoRegreso,
  TipoBajaMedicamento,
  PresentacionMedicamento,
} from '@ganaderia/shared'
import { MedicamentoConStock } from './medicamentos.api'

export interface UnidadMedicamento {
  id: string
  medicamentoId: string
  farmaciaId: string
  costoUnitario: number
  costoPorMedida: number
  estado: EstadoUnidadMedicamento
  fechaEntrada: string
  fechaEstadoCambio: string | null
  notasProveedor: string | null
  medicamento: {
    nombre: string
    presentacion: PresentacionMedicamento
    unidadMedida: string
    volumenPresentacion: number
  }
  ingresadoPor: { nombre: string }
  salidasTemporales: {
    id: string
    fechaSalida: string
    medico: { nombre: string }
  }[]
}

export interface SalidaTemporal {
  id: string
  unidadMedicamentoId: string
  medicoId: string
  autorizadoPorId: string
  fechaSalida: string
  fechaRegreso: string | null
  estadoRegreso: EstadoRegreso | null
  notas: string | null
  unidadMedicamento: {
    medicamento: { nombre: string; presentacion: PresentacionMedicamento }
  }
  medico: { nombre: string; email: string }
  autorizadoPor: { nombre: string }
}

export interface StockResumen {
  medicamentos: (MedicamentoConStock & {
    disponibles: number
    salidas: number
    preIngreso: number
    stockOperativo: number
    alerta: boolean
  })[]
  totalAlertas: number
}

export interface PaginatedUnidades {
  data: UnidadMedicamento[]
  total: number
  page: number
  totalPages: number
}

export interface PaginatedSalidas {
  data: SalidaTemporal[]
  total: number
  page: number
  totalPages: number
}

export const inventarioApi = {
  getStock: (farmaciaId: string) =>
    api.get<StockResumen>(`/inventario/stock?farmaciaId=${farmaciaId}`),

  getUnidades: (params: {
    farmaciaId: string
    medicamentoId?: string
    estado?: string
    page?: number
    limit?: number
  }) => {
    const qs = new URLSearchParams({ farmaciaId: params.farmaciaId })
    if (params.medicamentoId) qs.set('medicamentoId', params.medicamentoId)
    if (params.estado) qs.set('estado', params.estado)
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    return api.get<PaginatedUnidades>(`/inventario/unidades?${qs}`)
  },

  altaUnidad: (data: { medicamentoId: string; costoUnitario: number; cantidad?: number; notasProveedor?: string }) =>
    api.post<{ cantidad: number; unidades: UnidadMedicamento[]; medicamento: { id: string; nombre: string } }>(
      '/inventario/alta',
      data,
    ),

  getSalidas: (params: { farmaciaId: string; abierta?: boolean; page?: number }) => {
    const qs = new URLSearchParams({ farmaciaId: params.farmaciaId })
    if (params.abierta !== undefined) qs.set('abierta', String(params.abierta))
    if (params.page) qs.set('page', String(params.page))
    return api.get<PaginatedSalidas>(`/inventario/salidas?${qs}`)
  },

  crearSalida: (data: { medicamentoId: string; cantidad: number; medicoId: string; notas?: string }) =>
    api.post<{ cantidad: number; salidas: SalidaTemporal[]; medicamento: { id: string; nombre: string } }>(
      '/inventario/salidas',
      data,
    ),

  registrarRegreso: (salidaId: string, data: { estadoRegreso: EstadoRegreso; notas?: string }) =>
    api.patch<SalidaTemporal>(`/inventario/salidas/${salidaId}/regreso`, data),

  registrarBaja: (data: {
    unidadMedicamentoId: string
    tipo: TipoBajaMedicamento
    justificacion?: string
  }) => api.post<UnidadMedicamento>('/inventario/bajas', data),

  // ── Ajustes (SUPERUSUARIO) ────────────────────────────────────────────────
  crearAjuste: (data: {
    medicamentoId: string
    cantidadNueva: number
    costoUnitario?: number
    justificacion: string
  }) => api.post<AjusteInventario>('/inventario/ajustes', data),

  getAjustes: (params: { farmaciaId: string; medicamentoId?: string; page?: number; limit?: number }) => {
    const qs = new URLSearchParams({ farmaciaId: params.farmaciaId })
    if (params.medicamentoId) qs.set('medicamentoId', params.medicamentoId)
    if (params.page) qs.set('page', String(params.page))
    if (params.limit) qs.set('limit', String(params.limit))
    return api.get<PaginatedAjustes>(`/inventario/ajustes?${qs}`)
  },
}

export interface AjusteInventario {
  id: string
  medicamentoId: string
  farmaciaId: string
  cantidadAnterior: number
  cantidadNueva: number
  delta: number
  costoUnitario: number | null
  justificacion: string
  realizadoPorId: string
  fechaAjuste: string
  createdAt: string
  medicamento: { nombre: string; presentacion: PresentacionMedicamento; unidadMedida: string }
  realizadoPor: { nombre: string; apellido: string }
}

export interface PaginatedAjustes {
  data: AjusteInventario[]
  total: number
  page: number
  totalPages: number
}
