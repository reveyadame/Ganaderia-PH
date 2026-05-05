'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { Package, AlertTriangle, ArrowUpFromLine, ArrowDownToLine, FlaskConical, ChevronRight } from 'lucide-react'
import { inventarioApi } from '@/lib/api/inventario.api'
import { PageHeader } from '@/components/ui/page-header'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { FarmaciaSwitcher, SinFarmaciasMensaje, useFarmaciaActiva } from '@/components/farmacia/farmacia-switcher'

export default function FarmaciaPage() {
  const router = useRouter()
  const { farmaciaActivaId: farmaciaId, hasAccess, isLoading: loadingFarmacias } = useFarmaciaActiva()

  const { data: stock, isLoading: loadingStock } = useQuery({
    queryKey: ['inventario-stock', farmaciaId],
    queryFn: () => inventarioApi.getStock(farmaciaId),
    enabled: !!farmaciaId,
  })

  const totalDisponibles = stock?.medicamentos.reduce((sum, m) => sum + m.stock.disponibles, 0) ?? 0
  const totalSalidas = stock?.medicamentos.reduce((sum, m) => sum + m.stock.salidas, 0) ?? 0
  const totalPreIngreso = stock?.medicamentos.reduce((sum, m) => sum + m.stock.preIngreso, 0) ?? 0

  return (
    <div className="space-y-6">
      <PageHeader
        title="Farmacia"
        description="Gestión de medicamentos e inventario"
        action={<FarmaciaSwitcher />}
      />

      {!loadingFarmacias && !hasAccess && <SinFarmaciasMensaje />}

      {hasAccess && farmaciaId && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KpiCard
              label="Medicamentos"
              value={stock?.medicamentos.length ?? 0}
              icon={<FlaskConical className="h-5 w-5 text-brand" />}
              loading={loadingStock}
            />
            <KpiCard
              label="Disponibles"
              value={totalDisponibles}
              icon={<Package className="h-5 w-5 text-green-500" />}
              loading={loadingStock}
              variant="success"
            />
            <KpiCard
              label="En campo"
              value={totalSalidas}
              icon={<ArrowUpFromLine className="h-5 w-5 text-blue-500" />}
              loading={loadingStock}
              variant="info"
            />
            <KpiCard
              label="Alertas de stock"
              value={stock?.totalAlertas ?? 0}
              icon={<AlertTriangle className="h-5 w-5 text-amber-500" />}
              loading={loadingStock}
              variant={stock?.totalAlertas ? 'warning' : 'default'}
            />
          </div>

          {/* Acciones rápidas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <QuickAction
              icon={<ArrowDownToLine className="h-5 w-5" />}
              label="Inventario"
              description="Unidades, altas y bajas"
              onClick={() => router.push(`/farmacia/inventario?farmaciaId=${farmaciaId}`)}
            />
            <QuickAction
              icon={<ArrowUpFromLine className="h-5 w-5" />}
              label="Salidas temporales"
              description="Entregas a médicos"
              onClick={() => router.push(`/farmacia/salidas?farmaciaId=${farmaciaId}`)}
            />
          </div>

          {/* Stock por medicamento */}
          {loadingStock ? (
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => <Skeleton key={i} className="h-14 w-full" />)}
            </div>
          ) : stock?.medicamentos.length === 0 ? (
            <div className="rounded-lg border border-border bg-surface p-8 text-center text-muted-foreground">
              No hay medicamentos en el catálogo.{' '}
              <button
                onClick={() => router.push('/admin/medicamentos')}
                className="text-brand hover:underline"
              >
                Ir al catálogo
              </button>
            </div>
          ) : (
            <div className="rounded-lg border border-border bg-surface overflow-hidden">
              <div className="px-4 py-3 border-b border-border">
                <h2 className="text-sm font-semibold text-foreground">Stock por medicamento</h2>
              </div>
              <div className="divide-y divide-border">
                {stock?.medicamentos.map(med => (
                  <div
                    key={med.id}
                    className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors cursor-pointer"
                    onClick={() => router.push(`/farmacia/inventario?farmaciaId=${farmaciaId}&medicamentoId=${med.id}`)}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-foreground truncate">{med.nombre}</span>
                        {med.alerta && (
                          <Badge variant="warning" className="text-[10px] shrink-0">
                            <AlertTriangle className="h-3 w-3 mr-1" />
                            Stock bajo
                          </Badge>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {med.presentacion} · {med.volumenPresentacion} {med.unidadMedida}
                      </span>
                    </div>

                    <div className="flex items-center gap-4 text-xs shrink-0">
                      <StockPill label="Disponibles" value={med.stock.disponibles} color="text-green-500" />
                      <StockPill label="En campo" value={med.stock.salidas} color="text-blue-500" />
                      {med.stock.preIngreso > 0 && (
                        <StockPill label="Pre-ingreso" value={med.stock.preIngreso} color="text-amber-500" />
                      )}
                      <span className="text-muted-foreground">
                        Mín: {med.stockMinimo}
                      </span>
                    </div>

                    <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Pre-ingreso info */}
          {totalPreIngreso > 0 && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-3 flex items-start gap-3">
              <AlertTriangle className="h-4 w-4 text-amber-500 mt-0.5 shrink-0" />
              <p className="text-xs text-amber-500">
                <strong>{totalPreIngreso} unidades en PRE-INGRESO.</strong>{' '}
                Pasarán a DISPONIBLE automáticamente cuando se agoten las unidades actuales.
              </p>
            </div>
          )}
        </>
      )}
    </div>
  )
}

function KpiCard({
  label,
  value,
  icon,
  loading,
  variant = 'default',
}: {
  label: string
  value: number
  icon: React.ReactNode
  loading: boolean
  variant?: 'default' | 'success' | 'info' | 'warning'
}) {
  const colors = {
    default: 'bg-surface',
    success: 'bg-surface',
    info: 'bg-surface',
    warning: value > 0 ? 'bg-amber-500/10 border-amber-500/30' : 'bg-surface',
  }
  return (
    <div className={`rounded-lg border border-border p-4 ${colors[variant]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs text-muted-foreground">{label}</span>
        {icon}
      </div>
      {loading ? (
        <Skeleton className="h-7 w-12" />
      ) : (
        <p className="text-2xl font-bold text-foreground">{value}</p>
      )}
    </div>
  )
}

function StockPill({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div className="text-center">
      <p className={`font-semibold ${color}`}>{value}</p>
      <p className="text-muted-foreground">{label}</p>
    </div>
  )
}

function QuickAction({
  icon,
  label,
  description,
  onClick,
}: {
  icon: React.ReactNode
  label: string
  description: string
  onClick: () => void
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-3 rounded-lg border border-border bg-surface hover:bg-muted/30 p-4 text-left transition-colors"
    >
      <div className="text-muted-foreground">{icon}</div>
      <div>
        <p className="text-sm font-medium text-foreground">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
    </button>
  )
}
