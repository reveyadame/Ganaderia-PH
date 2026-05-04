'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { LoadingScreen } from '@/components/animations/LoadingScreen'
import { MobileShell } from '@/components/operador/mobile-shell'
import { useAuthStore } from '@/stores/auth.store'

export default function OperadorLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [hydrated, setHydrated] = useState(false)
  const accessToken = useAuthStore((s) => s.accessToken)

  useEffect(() => {
    setHydrated(true)
  }, [])

  useEffect(() => {
    if (hydrated && !accessToken) {
      router.replace('/login')
    }
  }, [hydrated, accessToken, router])

  if (!hydrated) return <LoadingScreen />
  if (!accessToken) return null

  return <MobileShell>{children}</MobileShell>
}
