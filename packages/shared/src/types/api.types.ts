export interface ApiResponse<T> {
  data: T
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

export interface PaginationParams {
  page?: number
  limit?: number
  search?: string
  orderBy?: string
  order?: 'asc' | 'desc'
}

export interface ApiError {
  statusCode: number
  message: string | string[]
  error: string
}

export type ScanContexto = 'ANIMAL' | 'CORRAL'

export interface ScanResultAnimal {
  tipo: 'ANIMAL'
  animal: {
    id: string
    areteSiniiga: string | null
    areteBlancoActual: string | null
    sexo: string
    pesoEntrada: number
    fechaEntrada: string
    estado: string
    corral: {
      id: string
      nombre: string
      codigo: string
      grupoCorrales: {
        id: string
        nombre: string
      }
    }
    costoAcumulado: number
    tratamientosCount: number
  }
}

export interface ScanResultCorral {
  tipo: 'CORRAL'
  corral: {
    id: string
    nombre: string
    codigo: string
    grupoCorrales: {
      id: string
      nombre: string
      farmacia: {
        id: string
        nombre: string
      }
    }
    racionActiva: {
      id: string
      nombre: string
      cantidadKgManana: number
      cantidadKgTarde: number
      descripcion: string | null
    } | null
    ultimaLectura: {
      id: string
      fechaLectura: string
      notas: string | null
      estadoConfig: {
        id: string
        nombre: string
        color: string | null
      }
    } | null
    animalesCount: number
  }
}

export interface ScanResultNoEncontrado {
  tipo: 'NO_ENCONTRADO'
}

export type ScanResult = ScanResultAnimal | ScanResultCorral | ScanResultNoEncontrado
