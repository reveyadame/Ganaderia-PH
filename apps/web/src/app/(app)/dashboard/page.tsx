'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  PawPrint, DollarSign, AlertTriangle, Syringe, ChevronRight, Package,
} from 'lucide-react'
import { dashboardApi } from '@/lib/api/dashboard.api'
import { reportesApi, StockCriticoItem } from '@/lib/api/reportes.api'
import { gruposCorralesApi } from '@/lib/api/grupos-corrales.api'
import { PageHeader } from '@/components/ui/page-header'
import { Select } from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'

function formatMXN(val: number) {
  return new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(val)
}

function KpiCard({
  icon: Icon,
  label,
  value,
  sub,
  iconColor,
  loading,
}: {
  icon: React.ElementType
  label: string
  value: string
  sub?: string
  iconColor: string
  loading: boolean
}) {
  return (
    <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${iconColor}`}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {loading ? (
        <Skeleton className="h-8 w-24" />
      ) : (
        <>
          <p className="text-2xl font-semibold text-foreground">{value}</p>
          {sub && <p className="text-xs text-muted-foreground">{sub}</p>}
        </>
      )}
    </div>
  )
}

export default function DashboardPage() {
  const [grupoCorralesId, setGrupoCorralesId] = useState<string>('')

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
  })

  const { data: stockCritico, isLoading: loadingStock } = useQuery({
    queryKey: ['stock-critico', grupoFilter],
    queryFn: () => reportesApi.getStockCritico(grupoFilter),
  })

  const { data: resumenGrupos, isLoading: loadingGrupos } = useQuery({
    queryKey: ['dashboard-grupos'],
    queryFn: dashboardApi.getResumenGrupos,
    enabled: !grupoCorralesId,
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
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Resumen operativo de todos los corrales"
      />

      {/* Filtro de grupo */}
      <div className="flex items-center gap-3">
        <Select
          options={grupoOptions}
          value={grupoCorralesId}
          onChange={e => setGrupoCorralesId(e.target.value)}
          className="w-56"
        />
        {kpis?.cachedAt && (
          <span className="text-xs text-muted-foreground">
            Actualizado: {new Date(kpis.cachedAt).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit' })}
          </span>
        )}
      </div>

      {/* KPI cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <KpiCard
          icon={PawPrint}
          label="Animales activos"
          value={kpis?.animalesActivos.toLocaleString('es-MX') ?? '—'}
          iconColor="bg-blue-500/10 text-blue-500"
          loading={loadingKpis}
        />
        <KpiCard
          icon={DollarSign}
          label="Costo promedio / animal"
          value={kpis ? formatMXN(kpis.costoPromedioAnimal) : '—'}
          iconColor="bg-green-500/10 text-green-500"
          loading={loadingKpis}
        />
        <KpiCard
          icon={DollarSign}
          label="Costo total acumulado"
          value={kpis ? formatMXN(kpis.costoTotalAcumulado) : '—'}
          iconColor="bg-green-500/10 text-green-500"
          loading={loadingKpis}
        />
        <KpiCard
          icon={Package}
          label="Stock crítico"
          value={kpis?.stockCritico.toString() ?? '—'}
          sub={kpis?.stockCritico ? 'medicamentos bajo mínimo' : undefined}
          iconColor={kpis?.stockCritico ? 'bg-red-500/10 text-red-500' : 'bg-muted text-muted-foreground'}
          loading={loadingKpis}
        />
        <KpiCard
          icon={Syringe}
          label="Tratamientos hoy"
          value={kpis?.tratamientosHoy.toString() ?? '—'}
          iconColor="bg-amber-500/10 text-amber-500"
          loading={loadingKpis}
        />
        <KpiCard
          icon={Syringe}
          label="Últimos 7 días"
          value={kpis?.tratamientosUltimos7dias.toString() ?? '—'}
          sub="tratamientos"
          iconColor="bg-amber-500/10 text-amber-500"
          loading={loadingKpis}
        />
      </div>

      {/* Alertas stock crítico */}
      {!loadingStock && stockCritico && stockCritico.length > 0 && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/5 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-red-500" />
            <p className="text-sm font-medium text-red-500">
              {stockCritico.length} medicamento{stockCritico.length > 1 ? 's' : ''} bajo stock mínimo
            </p>
          </div>
          <div className="space-y-2">
            {stockCritico.slice(0, 5).map((item: StockCriticoItem) => (
              <div key={item.id} className="flex items-center justify-between text-sm">
                <div>
                  <span className="font-medium text-foreground">{item.nombre}</span>
                  <span className="text-muted-foreground ml-2">{item.presentacion}</span>
                  <Badge variant="muted" className="ml-2 text-xs">{item.farmacia.nombre}</Badge>
                </div>
                <div className="text-right">
                  <span className="text-red-500 font-medium">{item.stockOperativo}</span>
                  <span className="text-muted-foreground"> / {item.stockMinimo} mín</span>
                </div>
              </div>
            ))}
            {stockCritico.length > 5 && (
              <p className="text-xs text-muted-foreground">
                +{stockCritico.length - 5} más...
              </p>
            )}
          </div>
        </div>
      )}

      {/* Gráfica de tratamientos */}
      <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium text-foreground">Tratamientos — últimos 30 días</p>
          <Link
            href="/reportes/tratamientos"
            className="text-xs text-brand hover:underline flex items-center gap-1"
          >
            Ver reporte <ChevronRight className="h-3 w-3" />
          </Link>
        </div>
        {loadingChart ? (
          <Skeleton className="h-48 w-full" />
        ) : (
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={chartDataSlim} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis
                dataKey="fecha"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                interval={4}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                allowDecimals={false}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'hsl(var(--surface))',
                  border: '1px solid hsl(var(--border))',
                  borderRadius: '6px',
                  fontSize: 12,
                }}
                labelStyle={{ color: 'hsl(var(--foreground))' }}
              />
              <Line
                type="monotone"
                dataKey="tratamientos"
                stroke="hsl(var(--brand))"
                strokeWidth={2}
                dot={false}
                name="Tratamientos"
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Resumen por grupos (solo cuando no hay filtro) */}
      {!grupoCorralesId && (
        <div className="space-y-3">
          <p className="text-sm font-medium text-foreground">Resumen por grupo de corrales</p>
          {loadingGrupos ? (
            <div className="space-y-2">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-16 w-full" />)}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {resumenGrupos?.map(g => (
                <div key={g.id} className="rounded-lg border border-border bg-surface p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <p className="font-medium text-foreground text-sm">{g.nombre}</p>
                    <Badge variant="muted">{g.corralesCount} corrales</Badge>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>
                      <span className="text-foreground font-medium">{g.animalesActivos}</span> animales
                    </span>
                    {g.farmacia && (
                      <span className="truncate">{g.farmacia.nombre}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Accesos rápidos a reportes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {[
          { href: '/reportes/animales', label: 'Costo por animal', icon: PawPrint },
          { href: '/reportes/tratamientos', label: 'Historial de tratamientos', icon: Syringe },
          { href: '/farmacia', label: 'Inventario farmacia', icon: Package },
        ].map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className="flex items-center justify-between rounded-lg border border-border bg-surface p-4 hover:border-brand transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Icon className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
              <span className="text-sm font-medium text-foreground">{label}</span>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-brand transition-colors" />
          </Link>
        ))}
      </div>
    </div>
  )
}
