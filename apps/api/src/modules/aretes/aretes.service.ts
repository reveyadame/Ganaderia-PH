import { Injectable, NotFoundException, ConflictException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateAreteBlancoDto, CreateAretesBlancosLoteDto } from './dto/create-arete-blanco.dto'

@Injectable()
export class AretesService {
  constructor(private prisma: PrismaService) {}

  async findAll(organizacionId: string, estado?: 'DISPONIBLE' | 'ASIGNADO') {
    return this.prisma.areteBlanco.findMany({
      where: { organizacionId, ...(estado && { estado }) },
      orderBy: { codigo: 'asc' },
      include: {
        asignaciones: {
          where: { fechaLiberacion: null },
          take: 1,
          include: {
            animal: {
              select: {
                id: true,
                areteSiniiga: true,
                sexo: true,
                corral: { select: { id: true, nombre: true } },
              },
            },
          },
        },
      },
    })
  }

  async create(dto: CreateAreteBlancoDto, organizacionId: string) {
    const existe = await this.prisma.areteBlanco.findUnique({
      where: { organizacionId_codigo: { organizacionId, codigo: dto.codigo } },
    })
    if (existe) throw new ConflictException(`El código "${dto.codigo}" ya existe en el pool`)

    return this.prisma.areteBlanco.create({
      data: { organizacionId, codigo: dto.codigo },
    })
  }

  async createLote(dto: CreateAretesBlancosLoteDto, organizacionId: string) {
    const existentes = await this.prisma.areteBlanco.findMany({
      where: { organizacionId, codigo: { in: dto.codigos } },
      select: { codigo: true },
    })

    if (existentes.length > 0) {
      const duplicados = existentes.map((e) => e.codigo).join(', ')
      throw new ConflictException(`Los siguientes códigos ya existen: ${duplicados}`)
    }

    const result = await this.prisma.areteBlanco.createMany({
      data: dto.codigos.map((codigo) => ({ organizacionId, codigo })),
    })

    return { creados: result.count, codigos: dto.codigos }
  }

  async getDisponibles(organizacionId: string) {
    return this.prisma.areteBlanco.findMany({
      where: { organizacionId, estado: 'DISPONIBLE' },
      orderBy: { codigo: 'asc' },
      select: { id: true, codigo: true },
    })
  }

  async remove(id: string, organizacionId: string) {
    const arete = await this.prisma.areteBlanco.findFirst({
      where: { id, organizacionId },
    })
    if (!arete) throw new NotFoundException('Arete no encontrado')
    if (arete.estado === 'ASIGNADO') {
      throw new ConflictException('No se puede eliminar un arete actualmente asignado a un animal')
    }

    return this.prisma.areteBlanco.delete({ where: { id } })
  }
}
