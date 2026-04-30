import { api } from './client'
import { PresentacionMedicamento, UnidadMedida } from '@ganaderia/shared'

export interface Medicamento {
  id: string
  farmaciaId: string
  nombre: string
  nombreGenerico: string | null
  presentacion: PresentacionMedicamento
  volumenPresentacion: number
  unidadMedida: UnidadMedida
  stockMinimo: number
  activo: boolean
  createdAt: string
}

export interface MedicamentoConStock extends Medicamento {
  stock: {
    disponibles: number
    salidas: number
    preIngreso: number
    stockOperativo: number
  }
  alerta: boolean
}

export interface CreateMedicamentoInput {
  farmaciaId: string
  nombre: string
  nombreGenerico?: string
  presentacion: PresentacionMedicamento
  volumenPresentacion: number
  unidadMedida: UnidadMedida
  stockMinimo: number
}

export type UpdateMedicamentoInput = Partial<Omit<CreateMedicamentoInput, 'farmaciaId'>>

export const medicamentosApi = {
  findAll: (farmaciaId: string) =>
    api.get<MedicamentoConStock[]>(`/medicamentos?farmaciaId=${farmaciaId}`),
  findOne: (id: string) =>
    api.get<MedicamentoConStock>(`/medicamentos/${id}`),
  create: (data: CreateMedicamentoInput) =>
    api.post<Medicamento>('/medicamentos', data),
  update: (id: string, data: UpdateMedicamentoInput) =>
    api.put<Medicamento>(`/medicamentos/${id}`, data),
  remove: (id: string) =>
    api.delete<Medicamento>(`/medicamentos/${id}`),
}
