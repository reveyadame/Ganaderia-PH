import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateRacionCatalogoDto } from './dto/create-racion-catalogo.dto'
import { UpdateRacionCatalogoDto } from './dto/update-racion-catalogo.dto'

@Injectable()
export class RacionesCatalogoService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizacionId: string) {
    return this.prisma.racionCatalogo.findMany({
      where: { organizacionId },
      orderBy: [{ activo: 'desc' }, { nombre: 'asc' }],
      include: { _count: { select: { definiciones: true } } },
    })
  }

  async findOne(id: string, organizacionId: string) {
    const r = await this.prisma.racionCatalogo.findFirst({
      where: { id, organizacionId },
      include: { _count: { select: { definiciones: true } } },
    })
    if (!r) throw new NotFoundException('Ración no encontrada en el catálogo')
    return r
  }

  async create(dto: CreateRacionCatalogoDto, organizacionId: string) {
    const existe = await this.prisma.racionCatalogo.findFirst({
      where: { organizacionId, nombre: { equals: dto.nombre, mode: 'insensitive' } },
    })
    if (existe) throw new ConflictException('Ya existe una ración con ese nombre')

    return this.prisma.racionCatalogo.create({
      data: { ...dto, organizacionId },
    })
  }

  async update(id: string, dto: UpdateRacionCatalogoDto, organizacionId: string) {
    await this.findOne(id, organizacionId)
    if (dto.nombre) {
      const existe = await this.prisma.racionCatalogo.findFirst({
        where: { organizacionId, nombre: { equals: dto.nombre, mode: 'insensitive' }, NOT: { id } },
      })
      if (existe) throw new ConflictException('Ya existe una ración con ese nombre')
    }
    return this.prisma.racionCatalogo.update({ where: { id }, data: dto })
  }

  async remove(id: string, organizacionId: string) {
    await this.findOne(id, organizacionId)
    return this.prisma.racionCatalogo.update({ where: { id }, data: { activo: false } })
  }
}
