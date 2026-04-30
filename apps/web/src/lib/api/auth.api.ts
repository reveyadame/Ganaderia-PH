import { api } from './client'
import { TokensResponse, UsuarioSesion } from '@ganaderia/shared'

export const authApi = {
  login: (email: string, password: string) =>
    api.post<TokensResponse>('/auth/login', { email, password }),

  me: () => api.get<UsuarioSesion>('/auth/me'),
}
