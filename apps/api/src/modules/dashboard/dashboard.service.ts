import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

interface CacheEntry<T> { data: T; expiresAt: number }
const TTL_MS = 5 * 60 * 1000 // 5 min

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  private cache = new Map<string, CacheEntry<unknown>>()

  private getCache<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (entry && Date.now() < entry.expiresAt) return entry.data as T
    this.cache.delete(key)
    return null
  }

  private setCache<T>(key: string, data: T): T {
    this.cache.set(key, { data, expiresAt: Date.now() + TTL_MS })
    return data
  }

  // ── KPIs ─────────────────────────────────────────────────────────────────

  async getKpis(organizacionId: string, grupoCorralesId?: string) {
    const cacheKey = `kpis:${organizacionId}:${grupoCorralesId ?? 'all'}`
    const cached = this.getCache<object>(cacheKey)
    if (cached) return cached

    const animalWhere = {
      organizacionId,
      estado: 'ACTIVO' as const,
      ...(grupoCorralesId && { corral: { grupoCorralesId } }),
    }

    const [
      animalesActivos,
      costoResult,
      stockCritico,
      tratamientos7dias,
      tratamientosHoy,
    ] = await Promise.all([
      this.prisma.animal.count({ where: animalWhere }),

      this.prisma.aplicacionTratamiento.aggregate({
        where: {
          animal: animalWhere,
        },
        _sum: { costoTotalCalculado: true },
        _count: { id: true },
      }),

      this.prisma.medicamento.count({
        where: {
          activo: true,
          farmacia: { organizacionId },
          ...(grupoCorralesId && {
            farmacia: {
              organizacionId,
              gruposCorrales: { some: { id: grupoCorralesId } },
            },
          }),
        },
      }),

      this.prisma.aplicacionTratamiento.count({
        where: {
          animal: animalWhere,
          fechaAplicacion: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        },
      }),

      this.prisma.aplicacionTratamiento.count({
        where: {
          animal: animalWhere,
          fechaAplicacion: {
            gte: new Date(new Date().setHours(0, 0, 0, 0)),
          },
        },
      }),
    ])

    // Stock crítico real: medicamentos donde unidades DISPONIBLE+SALIDA_TEMPORAL <= stockMinimo
    const medicamentosOrg = await this.prisma.medicamento.findMany({
      where: {
        activo: true,
        farmacia: {
          organizacionId,
          ...(grupoCorralesId && { gruposCorrales: { some: { id: grupoCorralesId } } }),
        },
      },
      select: { id: true, stockMinimo: true },
    })

    const stockRows = await this.prisma.unidadMedicamento.groupBy({
      by: ['medicamentoId', 'estado'],
      where: {
        medicamentoId: { in: medicamentosOrg.map(m => m.id) },
        estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] },
      },
      _count: { id: true },
    })

    const stockCriticoCount = medicamentosOrg.filter(med => {
      const total = stockRows
        .filter(r => r.medicamentoId === med.id)
        .reduce((s, r) => s + r._count.id, 0)
      return total <= med.stockMinimo
    }).length

    const costoTotal = Number(costoResult._sum.costoTotalCalculado ?? 0)
    const costoPromedio = costoResult._count.id > 0
      ? costoTotal / animalesActivos
      : 0

    const data = {
      animalesActivos,
      costoPromedioAnimal: costoPromedio,
      costoTotalAcumulado: costoTotal,
      stockCritico: stockCriticoCount,
      tratamientosUltimos7dias: tratamientos7dias,
      tratamientosHoy,
      cachedAt: new Date().toISOString(),
    }

    return this.setCache(cacheKey, data)
  }

  // ── Gráfica de tratamientos por día ──────────────────────────────────────

  async getTratamientosPorDia(organizacionId: string, dias = 30, grupoCorralesId?: string) {
    const cacheKey = `trat-por-dia:${organizacionId}:${grupoCorralesId ?? 'all'}:${dias}`
    const cached = this.getCache<object[]>(cacheKey)
    if (cached) return cached

    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)

    const aplicaciones = await this.prisma.aplicacionTratamiento.findMany({
      where: {
        animal: {
          organizacionId,
          ...(grupoCorralesId && { corral: { grupoCorralesId } }),
        },
        fechaAplicacion: { gte: desde },
      },
      select: { fechaAplicacion: true, costoTotalCalculado: true },
      orderBy: { fechaAplicacion: 'asc' },
    })

    // Agrupar por fecha (YYYY-MM-DD)
    const agrupado = new Map<string, { count: number; costo: number }>()
    for (const ap of aplicaciones) {
      const fecha = ap.fechaAplicacion.toISOString().slice(0, 10)
      const actual = agrupado.get(fecha) ?? { count: 0, costo: 0 }
      agrupado.set(fecha, {
        count: actual.count + 1,
        costo: actual.costo + Number(ap.costoTotalCalculado),
      })
    }

    // Rellenar días sin datos
    const resultado: { fecha: string; tratamientos: number; costo: number }[] = []
    for (let i = dias - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000)
      const fecha = d.toISOString().slice(0, 10)
      const entry = agrupado.get(fecha)
      resultado.push({ fecha, tratamientos: entry?.count ?? 0, costo: entry?.costo ?? 0 })
    }

    return this.setCache(cacheKey, resultado)
  }

  // ── KPIs por grupo ────────────────────────────────────────────────────────

  async getResumenGrupos(organizacionId: string) {
    const cacheKey = `grupos:${organizacionId}`
    const cached = this.getCache<object[]>(cacheKey)
    if (cached) return cached

    const grupos = await this.prisma.grupoCorrales.findMany({
      where: { organizacionId, activo: true },
      include: {
        corrales: {
          where: { activo: true },
          include: { _count: { select: { animales: { where: { estado: 'ACTIVO' } } } } },
        },
        farmacia: { select: { id: true, nombre: true } },
      },
    })

    const data = grupos.map(g => ({
      id: g.id,
      nombre: g.nombre,
      farmacia: g.farmacia,
      corralesCount: g.corrales.length,
      animalesActivos: g.corrales.reduce((s, c) => s + c._count.animales, 0),
    }))

    return this.setCache(cacheKey, data)
  }
}
