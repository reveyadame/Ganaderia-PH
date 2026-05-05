import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { UsuarioSesion } from '@ganaderia/shared'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateMedicamentoDto } from './dto/create-medicamento.dto'
import { UpdateMedicamentoDto } from './dto/update-medicamento.dto'

@Injectable()
export class MedicamentosService {
  constructor(private prisma: PrismaService) {}

  async findAll(user: UsuarioSesion) {
    return this.prisma.medicamento.findMany({
      where: { organizacionId: user.organizacionId, activo: true },
      orderBy: { nombre: 'asc' },
    })
  }

  async findOne(id: string, user: UsuarioSesion) {
    const med = await this.prisma.medicamento.findFirst({
      where: { id, organizacionId: user.organizacionId },
    })
    if (!med) throw new NotFoundException('Medicamento no encontrado')
    return med
  }

  async create(dto: CreateMedicamentoDto, user: UsuarioSesion) {
    const existe = await this.prisma.medicamento.findFirst({
      where: {
        organizacionId: user.organizacionId,
        nombre: { equals: dto.nombre, mode: 'insensitive' },
        activo: true,
      },
    })
    if (existe) throw new ConflictException('Ya existe un medicamento con ese nombre en el catálogo')

    return this.prisma.medicamento.create({
      data: {
        organizacionId: user.organizacionId,
        nombre: dto.nombre,
        nombreGenerico: dto.nombreGenerico,
        presentacion: dto.presentacion,
        volumenPresentacion: dto.volumenPresentacion,
        unidadMedida: dto.unidadMedida,
        stockMinimo: dto.stockMinimo,
      },
    })
  }

  async update(id: string, dto: UpdateMedicamentoDto, user: UsuarioSesion) {
    await this.findOne(id, user)

    if (dto.nombre) {
      const existe = await this.prisma.medicamento.findFirst({
        where: {
          organizacionId: user.organizacionId,
          nombre: { equals: dto.nombre, mode: 'insensitive' },
          activo: true,
          NOT: { id },
        },
      })
      if (existe) throw new ConflictException('Ya existe un medicamento con ese nombre en el catálogo')
    }

    return this.prisma.medicamento.update({
      where: { id },
      data: {
        nombre: dto.nombre,
        nombreGenerico: dto.nombreGenerico,
        presentacion: dto.presentacion,
        volumenPresentacion: dto.volumenPresentacion,
        unidadMedida: dto.unidadMedida,
        stockMinimo: dto.stockMinimo,
      },
    })
  }

  async remove(id: string, user: UsuarioSesion) {
    await this.findOne(id, user)
    return this.prisma.medicamento.update({ where: { id }, data: { activo: false } })
  }
}
