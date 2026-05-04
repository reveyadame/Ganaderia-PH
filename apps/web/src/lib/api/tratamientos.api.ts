import { api } from './client'
import { UnidadMedida } from '@ganaderia/shared'

// ─── Templates (Kits) ────────────────────────────────────────────────────────

export interface TemplateItem {
  id: string
  templateId: string
  medicamentoId: string
  dosis: number
  unidadDosis: UnidadMedida
  orden: number
  medicamento: {
    id: string
    nombre: string
    unidadMedida: UnidadMedida
    presentacion: string
    farmacia?: { id: string; nombre: string }
  }
}

export interface TratamientoTemplate {
  id: string
  nombre: string
  descripcion: string | null
  activo: boolean
  organizacionId: string
  createdAt: string
  updatedAt: string
  items: TemplateItem[]
  _count?: { aplicaciones: number }
}

export interface CreateTemplateItemInput {
  medicamentoId: string
  dosis: number
  unidadDosis: UnidadMedida
  orden?: number
}

export interface CreateTemplateInput {
  nombre: string
  descripcion?: string
  items: CreateTemplateItemInput[]
}

export type UpdateTemplateInput = Partial<CreateTemplateInput>

// ─── Aplicaciones ────────────────────────────────────────────────────────────

export interface AplicacionItem {
  id: string
  medicamentoId: string
  dosisAplicada: number
  unidadDosis: UnidadMedida
  costoPorMedidaMomento: number
  costoItemCalculado: number
  medicamento: { id: string; nombre: string; unidadMedida: UnidadMedida }
}

export interface AplicacionTratamiento {
  id: string
  animalId: string
  aplicadoPorId: string
  fechaAplicacion: string
  templateId: string | null
  templateSnapshot: object | null
  notas: string | null
  costoTotalCalculado: number
  createdAt: string
  aplicadoPor: { id: string; nombre: string; apellido?: string }
  template: { id: string; nombre: string } | null
  items: AplicacionItem[]
}

export interface AplicacionTratamientoConAnimal extends AplicacionTratamiento {
  animal: {
    id: string
    areteSiniiga: string | null
    estado: string
    corral: {
      id: string
      nombre: string
      codigo: string
      grupoCorrales: { id: string; nombre: string }
    }
    asignacionesArete: Array<{ areteBlanco: { id: string; codigo: string } }>
  }
}

export interface TratamientoItemIndividualInput {
  medicamentoId: string
  dosis: number
  unidadDosis: UnidadMedida
}

export interface CreateTratamientoInput {
  animalId: string
  templateId?: string
  items?: TratamientoItemIndividualInput[]
  notas?: string
  fechaAplicacion?: string
}

export interface PreviewCostoItem {
  medicamentoId: string
  dosis: number
  unidadDosis: UnidadMedida
  costoPorMedida: number
  costoItemCalculado: number
  sinStock: boolean
}

export interface PreviewCostoResult {
  items: PreviewCostoItem[]
  costoTotal: number
}

// ─── API ─────────────────────────────────────────────────────────────────────

export const tratamientoTemplatesApi = {
  findAll: () =>
    api.get<TratamientoTemplate[]>('/tratamiento-templates'),
  findOne: (id: string) =>
    api.get<TratamientoTemplate>(`/tratamiento-templates/${id}`),
  create: (data: CreateTemplateInput) =>
    api.post<TratamientoTemplate>('/tratamiento-templates', data),
  update: (id: string, data: UpdateTemplateInput) =>
    api.put<TratamientoTemplate>(`/tratamiento-templates/${id}`, data),
  remove: (id: string) =>
    api.delete<TratamientoTemplate>(`/tratamiento-templates/${id}`),
}

export const tratamientosApi = {
  findByAnimal: (animalId: string) =>
    api.get<AplicacionTratamiento[]>(`/tratamientos?animalId=${animalId}`),
  listarRecientes: (limit?: number) =>
    api.get<AplicacionTratamientoConAnimal[]>(`/tratamientos/recientes${limit ? `?limit=${limit}` : ''}`),
  previewCosto: (data: CreateTratamientoInput) =>
    api.post<PreviewCostoResult>('/tratamientos/preview-costo', data),
  create: (data: CreateTratamientoInput) =>
    api.post<AplicacionTratamiento>('/tratamientos', data),
}
