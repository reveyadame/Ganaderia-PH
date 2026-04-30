import { Injectable, NotFoundException, ConflictException, ForbiddenException } from '@nestjs/common'
import { PrismaService } from '../../prisma/prisma.service'
import { CreateMedicamentoDto } from './dto/create-medicamento.dto'
import { UpdateMedicamentoDto } from './dto/update-medicamento.dto'

@Injectable()
export class MedicamentosService {
  constructor(private prisma: PrismaService) {}

  async findAll(farmaciaId: string, organizacionId: string) {
    await this.validateFarmaciaAccess(farmaciaId, organizacionId)

    const medicamentos = await this.prisma.medicamento.findMany({
      where: { farmaciaId, activo: true },
      orderBy: { nombre: 'asc' },
      include: {
        _count: { select: { unidades: true } },
      },
    })

    const stockPorMedicamento = await this.prisma.unidadMedicamento.groupBy({
      by: ['medicamentoId', 'estado'],
      where: { farmaciaId },
      _count: { id: true },
    })

    return medicamentos.map(med => {
      const stockRows = stockPorMedicamento.filter(r => r.medicamentoId === med.id)
      const disponibles = stockRows.find(r => r.estado === 'DISPONIBLE')?._count.id ?? 0
      const salidas = stockRows.find(r => r.estado === 'SALIDA_TEMPORAL')?._count.id ?? 0
      const preIngreso = stockRows.find(r => r.estado === 'PRE_INGRESO')?._count.id ?? 0
      const stockOperativo = disponibles + salidas
      return {
        ...med,
        stock: { disponibles, salidas, preIngreso, stockOperativo },
        alerta: stockOperativo <= med.stockMinimo,
      }
    })
  }

  async findOne(id: string, organizacionId: string) {
    const med = await this.prisma.medicamento.findFirst({
      where: { id, activo: true },
      include: { farmacia: true },
    })
    if (!med) throw new NotFoundException('Medicamento no encontrado')
    if (med.farmacia.organizacionId !== organizacionId) throw new ForbiddenException()

    const stockRows = await this.prisma.unidadMedicamento.groupBy({
      by: ['estado'],
      where: { medicamentoId: id },
      _count: { id: true },
    })
    const disponibles = stockRows.find(r => r.estado === 'DISPONIBLE')?._count.id ?? 0
    const salidas = stockRows.find(r => r.estado === 'SALIDA_TEMPORAL')?._count.id ?? 0
    const preIngreso = stockRows.find(r => r.estado === 'PRE_INGRESO')?._count.id ?? 0

    return {
      ...med,
      stock: { disponibles, salidas, preIngreso, stockOperativo: disponibles + salidas },
      alerta: (disponibles + salidas) <= med.stockMinimo,
    }
  }

  async create(dto: CreateMedicamentoDto, organizacionId: string) {
    await this.validateFarmaciaAccess(dto.farmaciaId, organizacionId)

    const existe = await this.prisma.medicamento.findFirst({
      where: { farmaciaId: dto.farmaciaId, nombre: { equals: dto.nombre, mode: 'insensitive' }, activo: true },
    })
    if (existe) throw new ConflictException('Ya existe un medicamento con ese nombre en esta farmacia')

    return this.prisma.medicamento.create({
      data: {
        farmaciaId: dto.farmaciaId,
        nombre: dto.nombre,
        nombreGenerico: dto.nombreGenerico,
        presentacion: dto.presentacion,
        volumenPresentacion: dto.volumenPresentacion,
        unidadMedida: dto.unidadMedida,
        stockMinimo: dto.stockMinimo,
      },
    })
  }

  async update(id: string, dto: UpdateMedicamentoDto, organizacionId: string) {
    const med = await this.findOne(id, organizacionId)

    if (dto.nombre) {
      const existe = await this.prisma.medicamento.findFirst({
        where: { farmaciaId: med.farmaciaId, nombre: { equals: dto.nombre, mode: 'insensitive' }, activo: true, NOT: { id } },
      })
      if (existe) throw new ConflictException('Ya existe un medicamento con ese nombre en esta farmacia')
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

  async remove(id: string, organizacionId: string) {
    await this.findOne(id, organizacionId)
    return this.prisma.medicamento.update({ where: { id }, data: { activo: false } })
  }

  private async validateFarmaciaAccess(farmaciaId: string, organizacionId: string) {
    const farmacia = await this.prisma.farmacia.findFirst({ where: { id: farmaciaId, organizacionId } })
    if (!farmacia) throw new NotFoundException('Farmacia no encontrada o sin acceso')
    return farmacia
  }
}
