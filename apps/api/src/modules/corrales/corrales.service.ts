import { Injectable, NotFoundException, ConflictException, BadRequestException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateCorralDto } from './dto/create-corral.dto'
import { UpdateCorralDto } from './dto/update-corral.dto'

@Injectable()
export class CorralesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizacionId: string, grupoCorralesId?: string) {
    return this.prisma.corral.findMany({
      where: {
        grupoCorrales: { organizacionId },
        ...(grupoCorralesId ? { grupoCorralesId } : {}),
      },
      orderBy: [{ grupoCorrales: { nombre: 'asc' } }, { nombre: 'asc' }],
      include: {
        grupoCorrales: { select: { id: true, nombre: true } },
        _count: { select: { animales: { where: { estado: 'ACTIVO' } } } },
      },
    })
  }

  async findOne(id: string, organizacionId: string) {
    const corral = await this.prisma.corral.findFirst({
      where: { id, grupoCorrales: { organizacionId } },
      include: {
        grupoCorrales: {
          select: { id: true, nombre: true, farmacia: { select: { id: true, nombre: true } } },
        },
        _count: { select: { animales: { where: { estado: 'ACTIVO' } } } },
      },
    })
    if (!corral) throw new NotFoundException('Corral no encontrado')
    return corral
  }

  async create(dto: CreateCorralDto, organizacionId: string) {
    const grupoExiste = await this.prisma.grupoCorrales.findFirst({
      where: { id: dto.grupoCorralesId, organizacionId, activo: true },
    })
    if (!grupoExiste) throw new BadRequestException('Grupo de corrales no encontrado o inactivo')

    const existe = await this.prisma.corral.findUnique({
      where: { grupoCorralesId_codigo: { grupoCorralesId: dto.grupoCorralesId, codigo: dto.codigo } },
    })
    if (existe) throw new ConflictException(`El código "${dto.codigo}" ya existe en este grupo de corrales`)

    return this.prisma.corral.create({
      data: dto,
      include: { grupoCorrales: { select: { id: true, nombre: true } } },
    })
  }

  async update(id: string, dto: UpdateCorralDto, organizacionId: string) {
    await this.findOne(id, organizacionId)

    if (dto.codigo && dto.grupoCorralesId) {
      const existe = await this.prisma.corral.findUnique({
        where: { grupoCorralesId_codigo: { grupoCorralesId: dto.grupoCorralesId, codigo: dto.codigo } },
      })
      if (existe && existe.id !== id)
        throw new ConflictException(`El código "${dto.codigo}" ya existe en este grupo de corrales`)
    }

    return this.prisma.corral.update({
      where: { id },
      data: dto,
      include: { grupoCorrales: { select: { id: true, nombre: true } } },
    })
  }

  async remove(id: string, organizacionId: string) {
    await this.findOne(id, organizacionId)

    const tieneAnimales = await this.prisma.animal.count({
      where: { corralId: id, estado: 'ACTIVO' },
    })
    if (tieneAnimales > 0) {
      throw new ConflictException('No se puede desactivar el corral: tiene animales activos')
    }

    return this.prisma.corral.update({ where: { id }, data: { activo: false } })
  }
}
