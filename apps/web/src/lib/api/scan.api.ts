import { api } from './client'
import { ScanResult } from '@ganaderia/shared'

export const scanApi = {
  resolve: (codigo: string, contexto: 'ANIMAL' | 'CORRAL' | 'AMBOS' = 'AMBOS') =>
    api.post<ScanResult>('/scan/resolve', { codigo, contexto }),
}
