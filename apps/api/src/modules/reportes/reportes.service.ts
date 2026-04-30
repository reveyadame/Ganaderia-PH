import { Injectable } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'

@Injectable()
export class ReportesService {
  constructor(private prisma: PrismaService) {}

  async getCostoAnimal(
    organizacionId: string,
    page = 1,
    limit = 20,
    grupoCorralesId?: string,
    corralId?: string,
    busqueda?: string,
  ) {
    const skip = (page - 1) * limit

    const animalWhere = {
      organizacionId,
      estado: 'ACTIVO' as const,
      ...(grupoCorralesId && { corral: { grupoCorralesId } }),
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

  async getStockCritico(organizacionId: string, grupoCorralesId?: string) {
    const medicamentos = await this.prisma.medicamento.findMany({
      where: {
        activo: true,
        farmacia: {
          organizacionId,
          ...(grupoCorralesId && { gruposCorrales: { some: { id: grupoCorralesId } } }),
        },
      },
      select: {
        id: true,
        nombre: true,
        presentacion: true,
        stockMinimo: true,
        farmacia: { select: { id: true, nombre: true } },
      },
    })

    const stockRows = await this.prisma.unidadMedicamento.groupBy({
      by: ['medicamentoId', 'estado'],
      where: {
        medicamentoId: { in: medicamentos.map(m => m.id) },
        estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] },
      },
      _count: { id: true },
    })

    return medicamentos
      .map(med => {
        const total = stockRows
          .filter(r => r.medicamentoId === med.id)
          .reduce((s, r) => s + r._count.id, 0)
        return {
          ...med,
          stockOperativo: total,
          enAlerta: total <= med.stockMinimo,
        }
      })
      .filter(m => m.enAlerta)
      .sort((a, b) => a.stockOperativo - b.stockOperativo)
  }

  async getTratamientosPorPeriodo(
    organizacionId: string,
    desde: Date,
    hasta: Date,
    grupoCorralesId?: string,
    corralId?: string,
    page = 1,
    limit = 50,
  ) {
    const skip = (page - 1) * limit

    const where = {
      animal: {
        organizacionId,
        ...(grupoCorralesId && { corral: { grupoCorralesId } }),
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
