'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import type { Route } from 'next'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area, AreaChart,
} from 'recharts'
import {
  PawPrint, DollarSign, AlertTriangle, Syringe, ChevronRight, Package, TrendingUp,
} from 'lucide-react'
import { dashboardApi } from '@/lib/api/dashboard.api'
import { reportesApi, StockCriticoItem } from '@/lib/api/reportes.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/stores/auth.store'
import { ActividadUsuario, TipoUsuario } from '@ganaderia/shared'

function formatMXN(val: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)
}

type KpiColor = 'blue' | 'green' | 'amber' | 'purple' | 'default'

const kpiIconStyles: Record<KpiColor, string> = {
  blue:    'bg-info-subtle text-info-foreground border-info/20',
  green:   'bg-success-subtle text-success-foreground border-success/20',
  amber:   'bg-warning-subtle text-warning-foreground border-warning/20',
  purple:  'bg-accent-subtle text-accent-foreground border-accent/20',
  default: 'bg-muted text-foreground/60 border-border',
}

const kpiTopAccent: Record<KpiColor, string> = {
  blue:    'border-t-info/60',
  green:   'border-t-success/60',
  amber:   'border-t-warning/60',
  purple:  'border-t-accent/60',
  default: 'border-t-border',
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  loading,
  color = 'default',
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  loading: boolean
  color?: KpiColor
}) {
  return (
    <div className={cn(
      'group relative rounded-xl border border-border border-t-2 bg-surface p-5 transition-shadow duration-200 hover:shadow-sm',
      kpiTopAccent[color],
    )}>
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-3 min-w-0">
          <p className="text-[11px] font-semibold text-muted-foreground tracking-widest uppercase">
            {label}
          </p>
          {loading ? (
            <Skeleton className="h-8 w-28" />
          ) : (
            <>
              <p className="text-[26px] leading-none font-bold text-foreground tracking-tight tabular-nums">
                {value}
              </p>
              {sub && (
                <p className="text-[12px] text-muted-foreground leading-tight">{sub}</p>
              )}
            </>
          )}
        </div>
        <div className={cn(
          'w-10 h-10 rounded-xl border flex items-center justify-center shrink-0',
          kpiIconStyles[color],
        )}>
          <Icon className="h-5 w-5" strokeWidth={1.75} />
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  const [grupoCorralesId, setGrupoCorralesId] = useState<string>('')
  const { usuario } = useAuthStore()
  const hasReportesAccess = usuario?.tipo === TipoUsuario.SUPERUSUARIO
    || (usuario?.actividades.includes(ActividadUsuario.REPORTES) ?? false)

  const { data: grupos } = useQuery({
    queryKey: ['grupos-corrales-dashboard'],
    queryFn: () => gruposCorralesApi.findAll(),
  })

  const grupoFilter = grupoCorralesId || undefined

  const { data: kpis, isLoading: loadingKpis } = useQuery({
    queryKey: ['dashboard-kpis', grupoFilter],
    queryFn: () => dashboardApi.getKpis(grupoFilter),
  })

  const { data: chartData, isLoading: loadingChart } = useQuery({
    queryKey: ['dashboard-tratamientos-dia', grupoFilter],
    queryFn: () => dashboardApi.getTratamientosPorDia(30, grupoFilter),
    enabled: hasReportesAccess,
  })

  const { data: stockCritico, isLoading: loadingStock } = useQuery({
    queryKey: ['stock-critico', grupoFilter],
    queryFn: () => reportesApi.getStockCritico(grupoFilter),
    enabled: hasReportesAccess,
  })

  const { data: resumenGrupos, isLoading: loadingGrupos } = useQuery({
    queryKey: ['dashboard-grupos'],
    queryFn: dashboardApi.getResumenGrupos,
    enabled: !grupoCorralesId && hasReportesAccess,
  })

  const grupoOptions = [
    { value: '', label: 'Todos los grupos' },
    ...(grupos?.filter(g => g.activo).map(g => ({ value: g.id, label: g.nombre })) ?? []),
  ]

  const chartDataSlim = chartData?.map(d => ({
    fecha: d.fecha.slice(5),
    tratamientos: d.tratamientos,
    costo: d.costo,
  })) ?? []

  return (
    <div className="space-y-6 md:space-y-8">
      <PageHeader
        title="Dashboard"
        description="Resumen operativo en tiempo real de tus corrales y operación."
        action={
          <div className="flex items-center gap-2.5">
            <Select
              options={grupoOptions}
              value={grupoCorralesId}
              onChange={e => setGrupoCorralesId(e.target.value)}
              className="w-full sm:w-56"
            />
          </div>
        }
        meta={
          kpis?.cachedAt ? (
            <Badge variant="info" dot>
              Actualizado {new Date(kpis.cachedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
            </Badge>
          ) : null
        }
      />

      {/* KPI grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard
          icon={PawPrint}
          label="Animales activos"
          value={kpis?.animalesActivos.toLocaleString('es-MX') ?? '—'}
          loading={loadingKpis}
          color="blue"
        />
        <KpiCard
          icon={Syringe}
          label="Tratamientos hoy"
          value={kpis?.tratamientosHoy.toString() ?? '—'}
          loading={loadingKpis}
          color="purple"
        />
        <KpiCard
          icon={Syringe}
          label="Últimos 7 días"
          value={kpis?.tratamientosUltimos7dias.toString() ?? '—'}
          sub="tratamientos"
          loading={loadingKpis}
          color="purple"
        />
        {hasReportesAccess && (
          <>
            <KpiCard
              icon={DollarSign}
              label="Costo / animal"
              value={kpis ? formatMXN(kpis.costoPromedioAnimal) : '—'}
              sub="Promedio"
              loading={loadingKpis}
              color="green"
            />
            <KpiCard
              icon={DollarSign}
              label="Costo total"
              value={kpis ? formatMXN(kpis.costoTotalAcumulado) : '—'}
              sub="Acumulado"
              loading={loadingKpis}
              color="green"
            />
            <KpiCard
              icon={Package}
              label="Stock crítico"
              value={kpis?.stockCritico.toString() ?? '—'}
              sub={kpis?.stockCritico ? 'medicamentos bajo mínimo' : 'todo en orden'}
              loading={loadingKpis}
              color={kpis?.stockCritico ? 'amber' : 'default'}
            />
          </>
        )}
      </div>

      {/* Stock critical alert */}
      {hasReportesAccess && !loadingStock && stockCritico && stockCritico.length > 0 && (
        <div className="rounded-xl border border-warning/25 bg-warning-subtle/60 p-4 md:p-5">
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-lg bg-warning/15 flex items-center justify-center shrink-0">
              <AlertTriangle className="h-4 w-4 text-warning-foreground" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-3">
                <p className="text-[13px] font-semibold text-foreground tracking-tight">
                  {stockCritico.length} medicamento{stockCritico.length > 1 ? 's' : ''} bajo el stock mínimo
                </p>
                <Link
                  href="/farmacia/inventario"
                  className="text-[12px] font-medium text-foreground hover:underline flex items-center gap-1 shrink-0 cursor-pointer"
                >
                  Ver todos
                  <ChevronRight className="h-3 w-3" />
                </Link>
              </div>
              <div className="mt-3 space-y-1.5">
                {stockCritico.slice(0, 5).map((item: StockCriticoItem) => (
                  <div key={item.id} className="flex items-center justify-between text-[13px] py-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-medium text-foreground truncate">{item.nombre}</span>
                      <span className="text-muted-foreground text-[12px] hidden sm:inline">{item.presentacion}</span>
                      <Badge variant="warning" className="text-[10px] hidden sm:inline-flex">{item.farmacia.nombre}</Badge>
                    </div>
                    <div className="text-[12px] tabular-nums shrink-0">
                      <span className="text-warning-foreground font-semibold">{item.stockOperativo}</span>
                      <span className="text-muted-foreground"> / {item.stockMinimo} mín</span>
                    </div>
                  </div>
                ))}
                {stockCritico.length > 5 && (
                  <p className="text-[11px] text-muted-foreground pt-1">
                    +{stockCritico.length - 5} más...
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      {hasReportesAccess && <div className="rounded-xl border border-border bg-surface overflow-hidden">
        <div className="flex items-center justify-between px-4 md:px-5 py-4 border-b border-border">
          <div>
            <p className="text-[13px] font-semibold text-foreground tracking-tight">Tratamientos aplicados</p>
            <p className="text-[12px] text-muted-foreground mt-0.5">Últimos 30 días</p>
          </div>
          <Link
            href="/reportes/tratamientos"
            className="text-[12px] font-medium text-foreground hover:underline flex items-center gap-1 cursor-pointer"
          >
            <span className="hidden sm:inline">Ver reporte completo</span>
            <span className="sm:hidden">Ver más</span>
            <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        <div className="px-2 pt-4 pb-2">
          {loadingChart ? (
            <Skeleton className="h-48 w-full mx-3" />
          ) : (
            <ResponsiveContainer width="100%" height={220}>
              <AreaChart data={chartDataSlim} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="treatColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--accent))" stopOpacity={0.2} />
                    <stop offset="100%" stopColor="hsl(var(--accent))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                <XAxis
                  dataKey="fecha"
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  interval={4}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                  allowDecimals={false}
                  axisLine={false}
                  tickLine={false}
                  width={30}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'hsl(var(--surface-raised))',
                    border: '1px solid hsl(var(--border))',
                    borderRadius: 10,
                    fontSize: 12,
                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.06)',
                  }}
                  labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
                  cursor={{ stroke: 'hsl(var(--border-strong))', strokeWidth: 1 }}
                />
                <Area
                  type="monotone"
                  dataKey="tratamientos"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  fill="url(#treatColor)"
                  name="Tratamientos"
                />
                <Line
                  type="monotone"
                  dataKey="tratamientos"
                  stroke="hsl(var(--accent))"
                  strokeWidth={2}
                  dot={false}
                  name="Tratamientos"
                />
              </AreaChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>}

      {/* Resumen por grupos */}
      {hasReportesAccess && !grupoCorralesId && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-[13px] font-semibold text-foreground tracking-tight">
              Resumen por grupo de corrales
            </p>
            <Badge variant="muted">
              {resumenGrupos?.length ?? 0} grupos
            </Badge>
          </div>
          {loadingGrupos ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resumenGrupos?.map(g => (
                <div
                  key={g.id}
                  className="group rounded-xl border border-border bg-surface p-4 hover:border-border-strong hover:shadow-sm transition-all duration-200 cursor-pointer"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 space-y-1">
                      <p className="font-semibold text-foreground text-[13px] truncate tracking-tight">
                        {g.nombre}
                      </p>
                      {g.farmacia && (
                        <p className="text-[11px] text-muted-foreground truncate">
                          {g.farmacia.nombre}
                        </p>
                      )}
                    </div>
                    <Badge variant="info">{g.corralesCount} corrales</Badge>
                  </div>
                  <div className="mt-3 pt-3 border-t border-border flex items-baseline gap-1.5">
                    <span className="text-xl font-bold text-foreground tracking-tight tabular-nums">
                      {g.animalesActivos}
                    </span>
                    <span className="text-[12px] text-muted-foreground">animales activos</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Quick links */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          ...(hasReportesAccess ? [
            { href: '/reportes/animales' as Route, label: 'Costo por animal', sub: 'Análisis financiero', icon: PawPrint, color: 'green' as KpiColor },
            { href: '/reportes/tratamientos' as Route, label: 'Historial', sub: 'Tratamientos aplicados', icon: Syringe, color: 'purple' as KpiColor },
          ] : []),
          { href: '/farmacia' as Route, label: 'Farmacia', sub: 'Inventario y salidas', icon: Package, color: 'amber' as KpiColor },
        ].map(({ href, label, sub, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="group flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4 hover:border-border-strong hover:shadow-sm transition-all duration-200 cursor-pointer"
          >
            <div className="flex items-center gap-3 min-w-0">
              <div className={cn(
                'w-9 h-9 rounded-lg border flex items-center justify-center shrink-0',
                kpiIconStyles[color],
              )}>
                <Icon className="h-4 w-4" strokeWidth={1.75} />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-medium text-foreground truncate">{label}</p>
                <p className="text-[11px] text-muted-foreground truncate">{sub}</p>
              </div>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground group-hover:translate-x-0.5 transition-all shrink-0" />
          </Link>
        ))}
      </div>
    </div>
  )
}
