import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { UsuarioSesion } from '@ganaderia/shared'

interface AuthState {
  usuario: UsuarioSesion | null
  accessToken: string | null
  setAuth: (usuario: UsuarioSesion, accessToken: string) => void
  clearAuth: () => void
  isAuthenticated: () => boolean
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      usuario: null,
      accessToken: null,

      setAuth: (usuario, accessToken) => {
        localStorage.setItem('access_token', accessToken)
        set({ usuario, accessToken })
      },

      clearAuth: () => {
        localStorage.removeItem('access_token')
        set({ usuario: null, accessToken: null })
      },

      isAuthenticated: () => !!get().accessToken && !!get().usuario,
    }),
    {
      name: 'ganaderia-auth',
      partialize: (state) => ({ usuario: state.usuario, accessToken: state.accessToken }),
    },
  ),
)
