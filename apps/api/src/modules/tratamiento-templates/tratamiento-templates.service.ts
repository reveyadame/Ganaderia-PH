import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateTemplateDto } from './dto/create-template.dto'
import { UpdateTemplateDto } from './dto/update-template.dto'

@Injectable()
export class TratamientoTemplatesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizacionId: string) {
    return this.prisma.tratamientoTemplate.findMany({
      where: { organizacionId, activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        items: {
          orderBy: { orden: 'asc' },
          include: {
            medicamento: {
              select: { id: true, nombre: true, unidadMedida: true, presentacion: true },
            },
          },
        },
        _count: { select: { aplicaciones: true } },
      },
    })
  }

  async findOne(id: string, organizacionId: string) {
    const template = await this.prisma.tratamientoTemplate.findFirst({
      where: { id, organizacionId, activo: true },
      include: {
        items: {
          orderBy: { orden: 'asc' },
          include: {
            medicamento: {
              select: {
                id: true, nombre: true, unidadMedida: true, presentacion: true,
              },
            },
          },
        },
      },
    })
    if (!template) throw new NotFoundException('Kit no encontrado')
    return template
  }

  async create(dto: CreateTemplateDto, organizacionId: string, createdById: string) {
    if (dto.items.length === 0) throw new BadRequestException('El kit debe tener al menos un medicamento')

    await this.validateMedicamentos(dto.items.map(i => i.medicamentoId), organizacionId)

    return this.prisma.tratamientoTemplate.create({
      data: {
        nombre: dto.nombre,
        descripcion: dto.descripcion,
        organizacionId,
        createdById,
        items: {
          create: dto.items.map((item, idx) => ({
            medicamentoId: item.medicamentoId,
            dosis: item.dosis,
            unidadDosis: item.unidadDosis,
            orden: item.orden ?? idx,
          })),
        },
      },
      include: {
        items: {
          orderBy: { orden: 'asc' },
          include: {
            medicamento: { select: { id: true, nombre: true, unidadMedida: true } },
          },
        },
      },
    })
  }

  async update(id: string, dto: UpdateTemplateDto, organizacionId: string) {
    const template = await this.prisma.tratamientoTemplate.findFirst({
      where: { id, organizacionId, activo: true },
    })
    if (!template) throw new NotFoundException('Kit no encontrado')

    if (dto.items !== undefined) {
      if (dto.items.length === 0) throw new BadRequestException('El kit debe tener al menos un medicamento')
      await this.validateMedicamentos(dto.items.map(i => i.medicamentoId), organizacionId)
    }

    return this.prisma.$transaction(async tx => {
      if (dto.items !== undefined) {
        await tx.tratamientoTemplateItem.deleteMany({ where: { templateId: id } })
        await tx.tratamientoTemplateItem.createMany({
          data: dto.items.map((item, idx) => ({
            templateId: id,
            medicamentoId: item.medicamentoId,
            dosis: item.dosis,
            unidadDosis: item.unidadDosis,
            orden: item.orden ?? idx,
          })),
        })
      }

      return tx.tratamientoTemplate.update({
        where: { id },
        data: {
          nombre: dto.nombre,
          descripcion: dto.descripcion,
        },
        include: {
          items: {
            orderBy: { orden: 'asc' },
            include: {
              medicamento: { select: { id: true, nombre: true, unidadMedida: true } },
            },
          },
        },
      })
    })
  }

  async remove(id: string, organizacionId: string) {
    const template = await this.prisma.tratamientoTemplate.findFirst({
      where: { id, organizacionId, activo: true },
      include: { _count: { select: { aplicaciones: true } } },
    })
    if (!template) throw new NotFoundException('Kit no encontrado')

    return this.prisma.tratamientoTemplate.update({
      where: { id },
      data: { activo: false },
    })
  }

  private async validateMedicamentos(medicamentoIds: string[], organizacionId: string) {
    const medicamentos = await this.prisma.medicamento.findMany({
      where: { id: { in: medicamentoIds }, activo: true, organizacionId },
    })

    const invalidos = medicamentoIds.filter(mid => !medicamentos.find(m => m.id === mid))

    if (invalidos.length > 0) {
      throw new BadRequestException(`Medicamentos no válidos: ${invalidos.join(', ')}`)
    }
  }
}
