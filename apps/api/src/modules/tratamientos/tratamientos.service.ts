import {
  Injectable,
  NotFoundException,
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common'
import { Prisma } from '@ganaderia/database'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateTratamientoDto } from './dto/create-tratamiento.dto'

interface ItemParaAplicar {
  medicamentoId: string
  dosis: number
  unidadDosis: string
}

@Injectable()
export class TratamientosService {
  constructor(private prisma: PrismaService) {}

  async findByAnimal(animalId: string, organizacionId: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: animalId, organizacionId },
    })
    if (!animal) throw new NotFoundException('Animal no encontrado')

    return this.prisma.aplicacionTratamiento.findMany({
      where: { animalId },
      orderBy: { fechaAplicacion: 'desc' },
      include: {
        aplicadoPor: { select: { id: true, nombre: true } },
        template: { select: { id: true, nombre: true } },
        items: {
          include: {
            medicamento: { select: { id: true, nombre: true, unidadMedida: true } },
          },
        },
      },
    })
  }

  async listarRecientes(organizacionId: string, gruposCorralesIds: string[], limit = 50) {
    const gruposFilter = gruposCorralesIds.length > 0
      ? { animal: { corral: { grupoCorralesId: { in: gruposCorralesIds } } } }
      : {}

    return this.prisma.aplicacionTratamiento.findMany({
      where: {
        animal: { organizacionId },
        ...gruposFilter,
      },
      orderBy: { fechaAplicacion: 'desc' },
      take: limit,
      include: {
        aplicadoPor: { select: { id: true, nombre: true, apellido: true } },
        template: { select: { id: true, nombre: true } },
        animal: {
          select: {
            id: true,
            areteSiniiga: true,
            estado: true,
            corral: {
              select: {
                id: true,
                nombre: true,
                codigo: true,
                grupoCorrales: { select: { id: true, nombre: true } },
              },
            },
            asignacionesArete: {
              where: { fechaLiberacion: null },
              take: 1,
              select: { areteBlanco: { select: { id: true, codigo: true } } },
            },
          },
        },
        items: {
          include: {
            medicamento: { select: { id: true, nombre: true, unidadMedida: true } },
          },
        },
      },
    })
  }

  async create(dto: CreateTratamientoDto, aplicadoPorId: string, organizacionId: string) {
    // Validar que sea kit o items individuales, no ambos
    if (dto.templateId && dto.items && dto.items.length > 0) {
      throw new BadRequestException('Usa templateId o items, no ambos')
    }
    if (!dto.templateId && (!dto.items || dto.items.length === 0)) {
      throw new BadRequestException('Debes proporcionar un templateId o al menos un item')
    }

    // BR-TR-001: solo animales ACTIVOS
    const animal = await this.prisma.animal.findFirst({
      where: { id: dto.animalId, organizacionId },
      include: {
        corral: {
          include: {
            grupoCorrales: {
              include: {
                farmacia: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
    })
    if (!animal) throw new NotFoundException('Animal no encontrado')
    if (animal.estado !== 'ACTIVO') {
      throw new BadRequestException(`El animal no está activo (estado: ${animal.estado})`)
    }

    const farmaciaId = animal.corral.grupoCorrales.farmaciaId
    if (!farmaciaId) {
      throw new UnprocessableEntityException('El GrupoCorrales del animal no tiene farmacia asignada')
    }

    let templateSnapshot: object | null = null
    let itemsParaAplicar: ItemParaAplicar[]

    if (dto.templateId) {
      // BR-TR-003: aplicación por kit
      const template = await this.prisma.tratamientoTemplate.findFirst({
        where: { id: dto.templateId, organizacionId, activo: true },
        include: {
          items: {
            orderBy: { orden: 'asc' },
            include: {
              medicamento: { select: { id: true, nombre: true, unidadMedida: true, presentacion: true } },
            },
          },
        },
      })
      if (!template) throw new NotFoundException('Kit no encontrado')

      // BR-TR-004: snapshot inmutable del kit
      templateSnapshot = {
        id: template.id,
        nombre: template.nombre,
        descripcion: template.descripcion,
        items: template.items.map(i => ({
          medicamentoId: i.medicamentoId,
          medicamentoNombre: i.medicamento.nombre,
          dosis: i.dosis,
          unidadDosis: i.unidadDosis,
          orden: i.orden,
        })),
      }

      itemsParaAplicar = template.items.map(i => ({
        medicamentoId: i.medicamentoId,
        dosis: Number(i.dosis),
        unidadDosis: i.unidadDosis,
      }))
    } else {
      itemsParaAplicar = dto.items!.map(i => ({
        medicamentoId: i.medicamentoId,
        dosis: i.dosis,
        unidadDosis: i.unidadDosis,
      }))
    }

    // BR-TR-002: calcular costo FIFO por cada medicamento
    const itemsConCosto = await this.calcularCostoFIFO(itemsParaAplicar, farmaciaId)

    const costoTotal = itemsConCosto.reduce((sum, i) => sum + i.costoItemCalculado, 0)

    const aplicacion = await this.prisma.aplicacionTratamiento.create({
      data: {
        animalId: dto.animalId,
        aplicadoPorId,
        templateId: dto.templateId ?? null,
        templateSnapshot: templateSnapshot ?? Prisma.DbNull,
        notas: dto.notas,
        fechaAplicacion: dto.fechaAplicacion ? new Date(dto.fechaAplicacion) : new Date(),
        costoTotalCalculado: costoTotal,
        items: {
          create: itemsConCosto.map(i => ({
            medicamento: { connect: { id: i.medicamentoId } },
            dosisAplicada: i.dosis,
            unidadDosis: i.unidadDosis as Prisma.AplicacionTratamientoItemCreateInput['unidadDosis'],
            costoPorMedidaMomento: i.costoPorMedida,
            costoItemCalculado: i.costoItemCalculado,
          })),
        },
      },
      include: {
        aplicadoPor: { select: { id: true, nombre: true } },
        template: { select: { id: true, nombre: true } },
        items: {
          include: {
            medicamento: { select: { id: true, nombre: true, unidadMedida: true } },
          },
        },
      },
    })

    return aplicacion
  }

  async previewCosto(dto: CreateTratamientoDto, organizacionId: string) {
    const animal = await this.prisma.animal.findFirst({
      where: { id: dto.animalId, organizacionId },
      include: {
        corral: {
          include: { grupoCorrales: { select: { farmaciaId: true } } },
        },
      },
    })
    if (!animal) throw new NotFoundException('Animal no encontrado')

    const farmaciaId = animal.corral.grupoCorrales.farmaciaId

    let itemsParaPreview: ItemParaAplicar[]

    if (dto.templateId) {
      const template = await this.prisma.tratamientoTemplate.findFirst({
        where: { id: dto.templateId, organizacionId, activo: true },
        include: { items: { orderBy: { orden: 'asc' } } },
      })
      if (!template) throw new NotFoundException('Kit no encontrado')
      itemsParaPreview = template.items.map(i => ({
        medicamentoId: i.medicamentoId,
        dosis: Number(i.dosis),
        unidadDosis: i.unidadDosis,
      }))
    } else {
      itemsParaPreview = (dto.items ?? []).map(i => ({
        medicamentoId: i.medicamentoId,
        dosis: i.dosis,
        unidadDosis: i.unidadDosis,
      }))
    }

    if (itemsParaPreview.length === 0) return { items: [], costoTotal: 0 }

    const itemsConCosto = await this.calcularCostoFIFO(itemsParaPreview, farmaciaId)
    const costoTotal = itemsConCosto.reduce((sum, i) => sum + i.costoItemCalculado, 0)

    return { items: itemsConCosto, costoTotal }
  }

  private async calcularCostoFIFO(items: ItemParaAplicar[], farmaciaId: string) {
    return Promise.all(
      items.map(async item => {
        // BR-TR-002: unidad DISPONIBLE o SALIDA_TEMPORAL más antigua (FIFO)
        const unidadFIFO = await this.prisma.unidadMedicamento.findFirst({
          where: {
            medicamentoId: item.medicamentoId,
            farmaciaId,
            estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] },
          },
          orderBy: { fechaEntrada: 'asc' },
          select: { costoPorMedida: true },
        })

        const costoPorMedida = unidadFIFO ? Number(unidadFIFO.costoPorMedida) : 0
        const costoItemCalculado = item.dosis * costoPorMedida

        return {
          ...item,
          costoPorMedida,
          costoItemCalculado,
          sinStock: !unidadFIFO,
        }
      }),
    )
  }
}
