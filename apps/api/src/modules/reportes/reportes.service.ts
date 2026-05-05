import { Injectable } from '@nestjs/common'
import { UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { resolverFiltroGrupos } from '../../common/utils/grupos-corrales-access.util'

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async getCostoAnimal(
    user: UsuarioSesion,
    page = 1,
    limit = 20,
    grupoCorralesId?: string,
    corralId?: string,
    busqueda?: string,
  ) {
    const skip = (page - 1) * limit

    const filtro = await resolverFiltroGrupos(this.prisma, user, grupoCorralesId)
    if (!filtro) return { items: [], total: 0, page, limit, totalPages: 0 }

    const animalWhere = {
      organizacionId: user.organizacionId,
      estado: 'ACTIVO' as const,
      corral: { grupoCorralesId: filtro.filter },
      ...(corralId && { corralId }),
      ...(busqueda && {
        OR: [
          { areteSiniiga: { contains: busqueda, mode: 'insensitive' as const } },
          {
            asignacionesArete: {
              some: {
                fechaLiberacion: null,
                areteBlanco: { codigo: { contains: busqueda, mode: 'insensitive' as const } },
              },
            },
          },
        ],
      }),
    }

    const [total, animales] = await Promise.all([
      this.prisma.animal.count({ where: animalWhere }),
      this.prisma.animal.findMany({
        where: animalWhere,
        skip,
        take: limit,
        orderBy: { fechaEntrada: 'desc' },
        include: {
          corral: {
            select: {
              id: true,
              codigo: true,
              grupoCorrales: { select: { id: true, nombre: true } },
            },
          },
          asignacionesArete: {
            where: { fechaLiberacion: null },
            take: 1,
            include: { areteBlanco: { select: { codigo: true } } },
          },
          _count: { select: { aplicaciones: true } },
          aplicaciones: {
            select: { costoTotalCalculado: true },
          },
        },
      }),
    ])

    const items = animales.map(a => ({
      id: a.id,
      areteSiniiga: a.areteSiniiga,
      areteBlanco: a.asignacionesArete[0]?.areteBlanco.codigo ?? null,
      sexo: a.sexo,
      fechaEntrada: a.fechaEntrada,
      corral: a.corral,
      tratamientosCount: a._count.aplicaciones,
      costoTotal: a.aplicaciones.reduce((s, t) => s + Number(t.costoTotalCalculado ?? 0), 0),
    }))

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }

  async getStockCritico(user: UsuarioSesion, grupoCorralesId?: string) {
    const filtro = await resolverFiltroGrupos(this.prisma, user, grupoCorralesId)
    if (!filtro) return []

    const farmacias = await this.prisma.farmacia.findMany({
      where: {
        organizacionId: user.organizacionId,
        activa: true,
        gruposCorrales: { some: { id: filtro.filter } },
      },
      select: { id: true, nombre: true },
    })
    if (farmacias.length === 0) return []

    const medicamentos = await this.prisma.medicamento.findMany({
      where: { organizacionId: user.organizacionId, activo: true },
      select: { id: true, nombre: true, presentacion: true, stockMinimo: true },
    })
    if (medicamentos.length === 0) return []

    const stockRows = await this.prisma.unidadMedicamento.groupBy({
      by: ['medicamentoId', 'farmaciaId'],
      where: {
        medicamentoId: { in: medicamentos.map(m => m.id) },
        farmaciaId: { in: farmacias.map(f => f.id) },
        estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] },
      },
      _count: { id: true },
    })

    const items: Array<{
      id: string
      nombre: string
      presentacion: string
      stockMinimo: number
      stockOperativo: number
      enAlerta: boolean
      farmacia: { id: string; nombre: string }
    }> = []

    for (const med of medicamentos) {
      for (const farm of farmacias) {
        const stockOperativo = stockRows
          .filter(r => r.medicamentoId === med.id && r.farmaciaId === farm.id)
          .reduce((s, r) => s + r._count.id, 0)
        if (stockOperativo <= med.stockMinimo) {
          items.push({
            id: med.id,
            nombre: med.nombre,
            presentacion: med.presentacion,
            stockMinimo: med.stockMinimo,
            stockOperativo,
            enAlerta: true,
            farmacia: { id: farm.id, nombre: farm.nombre },
          })
        }
      }
    }

    return items.sort((a, b) => a.stockOperativo - b.stockOperativo)
  }

  async getTratamientosPorPeriodo(
    user: UsuarioSesion,
    desde: Date,
    hasta: Date,
    grupoCorralesId?: string,
    corralId?: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit

    const filtro = await resolverFiltroGrupos(this.prisma, user, grupoCorralesId)
    if (!filtro) return { items: [], total: 0, page, limit, totalPages: 0 }

    const where = {
      animal: {
        organizacionId: user.organizacionId,
        corral: { grupoCorralesId: filtro.filter },
        ...(corralId && { corralId }),
      },
      fechaAplicacion: { gte: desde, lte: hasta },
    }

    const [total, tratamientos] = await Promise.all([
      this.prisma.aplicacionTratamiento.count({ where }),
      this.prisma.aplicacionTratamiento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaAplicacion: 'desc' },
        include: {
          template: { select: { nombre: true } },
          animal: {
            include: {
              corral: {
                select: {
                  codigo: true,
                  grupoCorrales: { select: { nombre: true } },
                },
              },
              asignacionesArete: {
                where: { fechaLiberacion: null },
                take: 1,
                include: { areteBlanco: { select: { codigo: true } } },
              },
            },
          },
        },
      }),
    ])

    const items = tratamientos.map(t => ({
      id: t.id,
      fechaAplicacion: t.fechaAplicacion,
      costoTotalCalculado: Number(t.costoTotalCalculado ?? 0),
      templateNombre: t.template?.nombre ?? null,
      animal: {
        id: t.animal.id,
        areteSiniiga: t.animal.areteSiniiga,
        areteBlanco: t.animal.asignacionesArete[0]?.areteBlanco.codigo ?? null,
        corral: t.animal.corral,
      },
    }))

    return { items, total, page, limit, totalPages: Math.ceil(total / limit) }
  }
}
