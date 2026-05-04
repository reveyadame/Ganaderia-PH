'use client'

import { useState } from 'react'
import type { Route } from 'next'
import { useRouter } from 'next/navigation'
import { useMutation } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { AlertCircle, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/auth.store'
import { authApi } from '@/lib/api/auth.api'
import { TipoUsuario } from '@ganaderia/shared'

export default function LoginPage() {
  const router = useRouter()
  const setAuth = useAuthStore((s) => s.setAuth)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const mutation = useMutation({
    mutationFn: () => authApi.login(email, password),
    onSuccess: (data) => {
      setAuth(data.usuario, data.accessToken)
      const destino: Route = data.usuario.tipo === TipoUsuario.OPERADOR ? ('/operador' as Route) : '/dashboard'
      router.push(destino)
    },
    onError: () => {
      setError('Correo o contraseña incorrectos')
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    mutation.mutate()
  }

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as [number, number, number, number] }
    }
  }

  return (
    <div className="relative min-h-screen bg-background flex items-center justify-center p-4 overflow-hidden">
      {/* Subtle dot pattern background */}
      <div className="absolute inset-0 bg-dot-grid opacity-60" />
      <div className="absolute inset-0 bg-gradient-to-b from-background via-transparent to-background" />
      
      {/* Animated glow */}
      <motion.div 
        animate={{ 
          scale: [1, 1.2, 1],
          opacity: [0.1, 0.15, 0.1]
        }}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-brand rounded-full blur-[120px] pointer-events-none"
      />

      <motion.div 
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="relative w-full max-w-[400px]"
      >
        {/* Brand mark */}
        <motion.div variants={itemVariants} className="mb-8 flex flex-col items-center">
          <motion.div 
            whileHover={{ rotate: 10, scale: 1.1 }}
            className="w-12 h-12 rounded-xl bg-brand text-brand-foreground flex items-center justify-center shadow-lg shadow-brand/20 mb-4 cursor-default"
          >
            <span className="text-xl font-bold tracking-tight">G</span>
          </motion.div>
          <h1 className="text-[24px] font-bold text-foreground tracking-tight">
            Bienvenido de vuelta
          </h1>
          <p className="text-sm text-muted-foreground mt-1.5 font-medium">
            Sistema de Gestión Ganadera
          </p>
        </motion.div>

        {/* Card */}
        <motion.div 
          variants={itemVariants}
          className="rounded-2xl bg-surface-raised/80 backdrop-blur-sm border border-border shadow-xl p-7"
        >
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="email" className="block text-[13px] font-semibold text-foreground">
                Correo electrónico
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tu@empresa.com"
                required
                className="w-full h-11 px-3.5 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground/50 shadow-xs transition-all duration-200 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/5 focus:shadow-focus"
              />
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="password" className="block text-[13px] font-semibold text-foreground">
                  Contraseña
                </label>
                <button
                  type="button"
                  className="text-[12px] font-medium text-muted-foreground hover:text-brand transition-colors cursor-pointer"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </div>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full h-11 px-3.5 rounded-lg border border-border bg-surface text-sm text-foreground placeholder:text-muted-foreground/50 shadow-xs transition-all duration-200 focus:outline-none focus:border-brand/40 focus:ring-2 focus:ring-brand/5 focus:shadow-focus"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                role="alert"
                className="flex items-start gap-2.5 px-3 py-2.5 rounded-lg bg-danger-subtle border border-danger/20"
              >
                <AlertCircle className="h-4 w-4 text-danger shrink-0 mt-0.5" />
                <p className="text-[13px] text-danger-foreground font-medium leading-snug">{error}</p>
              </motion.div>
            )}

            <Button
              type="submit"
              loading={mutation.isPending}
              className="w-full h-11 text-sm font-semibold rounded-lg shadow-lg shadow-brand/10"
            >
              Iniciar sesión
              {!mutation.isPending && <ArrowRight className="ml-2 h-4 w-4" />}
            </Button>
          </form>
        </motion.div>

        {/* Footer */}
        <motion.div variants={itemVariants} className="mt-8 text-center">
          <p className="text-[12px] text-muted-foreground font-medium">
            Al continuar aceptas nuestros{' '}
            <a className="text-foreground hover:text-brand underline underline-offset-4 cursor-pointer transition-colors">Términos</a>
            {' '}y{' '}
            <a className="text-foreground hover:text-brand underline underline-offset-4 cursor-pointer transition-colors">Política de privacidad</a>.
          </p>
        </motion.div>
      </motion.div>
    </div>
  )
}
