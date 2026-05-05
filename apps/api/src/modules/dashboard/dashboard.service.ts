import { Injectable } from '@nestjs/common'
import { UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { getGruposCorralesAccesibles } from '../../common/utils/grupos-corrales-access.util'

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

  async getKpis(user: UsuarioSesion, grupoCorralesId?: string) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) {
      return {
        animalesActivos: 0, costoPromedioAnimal: 0, costoTotalAcumulado: 0,
        stockCritico: 0, tratamientosUltimos7dias: 0, tratamientosHoy: 0,
        cachedAt: new Date().toISOString(),
      }
    }

    const gruposFilter = grupoCorralesId && accesibles.includes(grupoCorralesId)
      ? [grupoCorralesId]
      : accesibles

    const cacheKey = `kpis:${user.organizacionId}:${gruposFilter.join(',')}`
    const cached = this.getCache<object>(cacheKey)
    if (cached) return cached

    const animalWhere = {
      organizacionId: user.organizacionId,
      estado: 'ACTIVO' as const,
      corral: { grupoCorralesId: { in: gruposFilter } },
    }

    const [animalesActivos, costoResult, tratamientos7dias, tratamientosHoy] = await Promise.all([
      this.prisma.animal.count({ where: animalWhere }),
      this.prisma.aplicacionTratamiento.aggregate({
        where: { animal: animalWhere },
        _sum: { costoTotalCalculado: true },
        _count: { id: true },
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
          fechaAplicacion: { gte: new Date(new Date().setHours(0, 0, 0, 0)) },
        },
      }),
    ])

    // Stock crítico: combinaciones (medicamento, farmacia) bajo el mínimo
    const farmaciasOrg = await this.prisma.farmacia.findMany({
      where: {
        organizacionId: user.organizacionId,
        activa: true,
        gruposCorrales: { some: { id: { in: gruposFilter } } },
      },
      select: { id: true },
    })
    const medicamentosOrg = await this.prisma.medicamento.findMany({
      where: { organizacionId: user.organizacionId, activo: true },
      select: { id: true, stockMinimo: true },
    })

    const stockRows = farmaciasOrg.length === 0 || medicamentosOrg.length === 0
      ? []
      : await this.prisma.unidadMedicamento.groupBy({
          by: ['medicamentoId', 'farmaciaId'],
          where: {
            medicamentoId: { in: medicamentosOrg.map(m => m.id) },
            farmaciaId: { in: farmaciasOrg.map(f => f.id) },
            estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] },
          },
          _count: { id: true },
        })

    let stockCriticoCount = 0
    for (const med of medicamentosOrg) {
      for (const farm of farmaciasOrg) {
        const total = stockRows
          .filter(r => r.medicamentoId === med.id && r.farmaciaId === farm.id)
          .reduce((s, r) => s + r._count.id, 0)
        if (total <= med.stockMinimo) stockCriticoCount++
      }
    }

    const costoTotal = Number(costoResult._sum.costoTotalCalculado ?? 0)
    const costoPromedio = animalesActivos > 0 ? costoTotal / animalesActivos : 0

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

  async getTratamientosPorDia(user: UsuarioSesion, dias = 30, grupoCorralesId?: string) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) return []

    const gruposFilter = grupoCorralesId && accesibles.includes(grupoCorralesId)
      ? [grupoCorralesId]
      : accesibles

    const cacheKey = `trat-por-dia:${user.organizacionId}:${gruposFilter.join(',')}.${dias}`
    const cached = this.getCache<object[]>(cacheKey)
    if (cached) return cached

    const desde = new Date(Date.now() - dias * 24 * 60 * 60 * 1000)

    const aplicaciones = await this.prisma.aplicacionTratamiento.findMany({
      where: {
        animal: {
          organizacionId: user.organizacionId,
          corral: { grupoCorralesId: { in: gruposFilter } },
        },
        fechaAplicacion: { gte: desde },
      },
      select: { fechaAplicacion: true, costoTotalCalculado: true },
      orderBy: { fechaAplicacion: 'asc' },
    })

    const agrupado = new Map<string, { count: number; costo: number }>()
    for (const ap of aplicaciones) {
      const fecha = ap.fechaAplicacion.toISOString().slice(0, 10)
      const actual = agrupado.get(fecha) ?? { count: 0, costo: 0 }
      agrupado.set(fecha, { count: actual.count + 1, costo: actual.costo + Number(ap.costoTotalCalculado) })
    }

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

  async getResumenGrupos(user: UsuarioSesion) {
    const accesibles = await getGruposCorralesAccesibles(this.prisma, user)
    if (accesibles.length === 0) return []

    const cacheKey = `grupos:${user.organizacionId}:${accesibles.join(',')}`
    const cached = this.getCache<object[]>(cacheKey)
    if (cached) return cached

    const grupos = await this.prisma.grupoCorrales.findMany({
      where: { organizacionId: user.organizacionId, activo: true, id: { in: accesibles } },
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
