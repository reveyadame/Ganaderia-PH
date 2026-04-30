import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common'
import { Prisma } from '@ganaderia/database'
import { PrismaService } from '../../prisma/prisma.service'
import { AltaUnidadDto } from './dto/alta-unidad.dto'
import { SalidaTemporalDto } from './dto/salida-temporal.dto'
import { RegresoUnidadDto } from './dto/regreso-unidad.dto'
import { BajaUnidadDto } from './dto/baja-unidad.dto'
import { EstadoRegreso, TipoBajaMedicamento } from '@ganaderia/shared'

const REQUIEREN_JUSTIFICACION: TipoBajaMedicamento[] = [
  TipoBajaMedicamento.AJUSTE,
  TipoBajaMedicamento.PERDIDA,
  TipoBajaMedicamento.ROBO,
  TipoBajaMedicamento.DANO,
]

@Injectable()
export class InventarioService {
  constructor(private prisma: PrismaService) {}

  // ── Stock summary ──────────────────────────────────────────────────────────

  async getStock(farmaciaId: string, organizacionId: string) {
    await this.validateFarmaciaAccess(farmaciaId, organizacionId)

    const medicamentos = await this.prisma.medicamento.findMany({
      where: { farmaciaId, activo: true },
      orderBy: { nombre: 'asc' },
    })

    const stockRows = await this.prisma.unidadMedicamento.groupBy({
      by: ['medicamentoId', 'estado'],
      where: { farmaciaId },
      _count: { id: true },
    })

    const resultado = medicamentos.map(med => {
      const rows = stockRows.filter(r => r.medicamentoId === med.id)
      const disponibles = rows.find(r => r.estado === 'DISPONIBLE')?._count.id ?? 0
      const salidas = rows.find(r => r.estado === 'SALIDA_TEMPORAL')?._count.id ?? 0
      const preIngreso = rows.find(r => r.estado === 'PRE_INGRESO')?._count.id ?? 0
      const stockOperativo = disponibles + salidas
      return {
        medicamento: med,
        disponibles,
        salidas,
        preIngreso,
        stockOperativo,
        alerta: stockOperativo <= med.stockMinimo,
      }
    })

    const alertas = resultado.filter(r => r.alerta)
    return { medicamentos: resultado, totalAlertas: alertas.length }
  }

  // ── Unidades ───────────────────────────────────────────────────────────────

  async getUnidades(
    farmaciaId: string,
    organizacionId: string,
    opts: { medicamentoId?: string; estado?: string; page?: number; limit?: number },
  ) {
    await this.validateFarmaciaAccess(farmaciaId, organizacionId)

    const page = opts.page ?? 1
    const limit = opts.limit ?? 50
    const skip = (page - 1) * limit

    const where = {
      farmaciaId,
      ...(opts.medicamentoId ? { medicamentoId: opts.medicamentoId } : {}),
      ...(opts.estado ? { estado: opts.estado as never } : {}),
    }

    const [unidades, total] = await Promise.all([
      this.prisma.unidadMedicamento.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaEntrada: 'desc' },
        include: {
          medicamento: { select: { nombre: true, presentacion: true, unidadMedida: true, volumenPresentacion: true } },
          ingresadoPor: { select: { nombre: true } },
          salidasTemporales: {
            where: { fechaRegreso: null },
            include: { medico: { select: { nombre: true } } },
          },
        },
      }),
      this.prisma.unidadMedicamento.count({ where }),
    ])

    return { data: unidades, total, page, totalPages: Math.ceil(total / limit) }
  }

  // ── Alta de unidad (FIFO / PRE_INGRESO) ───────────────────────────────────

  async altaUnidad(dto: AltaUnidadDto, userId: string, organizacionId: string) {
    const medicamento = await this.prisma.medicamento.findFirst({
      where: { id: dto.medicamentoId, activo: true },
      include: { farmacia: true },
    })
    if (!medicamento) throw new NotFoundException('Medicamento no encontrado')
    if (medicamento.farmacia.organizacionId !== organizacionId) throw new ForbiddenException()

    const farmaciaId = medicamento.farmaciaId
    const costoUnitario = dto.costoUnitario
    const costoPorMedida = Number(costoUnitario) / Number(medicamento.volumenPresentacion)

    // BR-FA-002: si ya hay unidades DISPONIBLE → entra como PRE_INGRESO
    const hayDisponibles = await this.prisma.unidadMedicamento.count({
      where: { medicamentoId: dto.medicamentoId, farmaciaId, estado: 'DISPONIBLE' },
    })

    const estado = hayDisponibles > 0 ? 'PRE_INGRESO' : 'DISPONIBLE'

    return this.prisma.unidadMedicamento.create({
      data: {
        medicamentoId: dto.medicamentoId,
        farmaciaId,
        costoUnitario,
        costoPorMedida,
        estado,
        notasProveedor: dto.notasProveedor,
        ingresadoPorId: userId,
      },
      include: { medicamento: { select: { nombre: true } } },
    })
  }

  // ── Salidas temporales ─────────────────────────────────────────────────────

  async getSalidas(
    farmaciaId: string,
    organizacionId: string,
    opts: { abierta?: boolean; page?: number; limit?: number },
  ) {
    await this.validateFarmaciaAccess(farmaciaId, organizacionId)

    const page = opts.page ?? 1
    const limit = opts.limit ?? 50
    const skip = (page - 1) * limit

    const where = {
      unidadMedicamento: { farmaciaId },
      ...(opts.abierta === true ? { fechaRegreso: null } : {}),
      ...(opts.abierta === false ? { NOT: { fechaRegreso: null } } : {}),
    }

    const [salidas, total] = await Promise.all([
      this.prisma.salidaTemporal.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaSalida: 'desc' },
        include: {
          unidadMedicamento: {
            include: { medicamento: { select: { nombre: true, presentacion: true } } },
          },
          medico: { select: { nombre: true, email: true } },
          autorizadoPor: { select: { nombre: true } },
        },
      }),
      this.prisma.salidaTemporal.count({ where }),
    ])

    return { data: salidas, total, page, totalPages: Math.ceil(total / limit) }
  }

  async crearSalidaTemporal(dto: SalidaTemporalDto, autorizadorId: string, organizacionId: string) {
    const unidad = await this.prisma.unidadMedicamento.findFirst({
      where: { id: dto.unidadMedicamentoId },
      include: { farmacia: true },
    })
    if (!unidad) throw new NotFoundException('Unidad no encontrada')
    if (unidad.farmacia.organizacionId !== organizacionId) throw new ForbiddenException()
    if (unidad.estado !== 'DISPONIBLE') {
      throw new BadRequestException(`La unidad no está disponible (estado: ${unidad.estado})`)
    }

    const medico = await this.prisma.usuario.findFirst({ where: { id: dto.medicoId, organizacionId } })
    if (!medico) throw new NotFoundException('Médico no encontrado')

    return this.prisma.$transaction(async tx => {
      const salida = await tx.salidaTemporal.create({
        data: {
          unidadMedicamentoId: dto.unidadMedicamentoId,
          medicoId: dto.medicoId,
          autorizadoPorId: autorizadorId,
          notas: dto.notas,
        },
        include: {
          unidadMedicamento: { include: { medicamento: { select: { nombre: true } } } },
          medico: { select: { nombre: true } },
          autorizadoPor: { select: { nombre: true } },
        },
      })
      await tx.unidadMedicamento.update({
        where: { id: dto.unidadMedicamentoId },
        data: { estado: 'SALIDA_TEMPORAL', fechaEstadoCambio: new Date() },
      })
      return salida
    })
  }

  async registrarRegreso(salidaId: string, dto: RegresoUnidadDto, organizacionId: string) {
    const salida = await this.prisma.salidaTemporal.findFirst({
      where: { id: salidaId },
      include: { unidadMedicamento: { include: { farmacia: true, medicamento: true } } },
    })
    if (!salida) throw new NotFoundException('Salida no encontrada')
    if (salida.unidadMedicamento.farmacia.organizacionId !== organizacionId) throw new ForbiddenException()
    if (salida.fechaRegreso) throw new BadRequestException('Esta salida ya tiene regreso registrado')
    if (salida.unidadMedicamento.estado !== 'SALIDA_TEMPORAL') {
      throw new BadRequestException('La unidad no está en salida temporal')
    }

    const nuevoEstado =
      dto.estadoRegreso === EstadoRegreso.REGRESO_VACIO ? 'CONSUMIDO' : 'DISPONIBLE'

    return this.prisma.$transaction(async tx => {
      await tx.salidaTemporal.update({
        where: { id: salidaId },
        data: { fechaRegreso: new Date(), estadoRegreso: dto.estadoRegreso, notas: dto.notas ?? salida.notas },
      })
      await tx.unidadMedicamento.update({
        where: { id: salida.unidadMedicamentoId },
        data: { estado: nuevoEstado, fechaEstadoCambio: new Date() },
      })

      // Si el frasco regresó consumido → verificar si hay PRE_INGRESO que promover (BR-FA-003)
      if (nuevoEstado === 'CONSUMIDO') {
        await this.promoverPreIngreso(
          tx,
          salida.unidadMedicamento.medicamentoId,
          salida.unidadMedicamento.farmaciaId,
        )
      }

      return tx.salidaTemporal.findUnique({
        where: { id: salidaId },
        include: {
          unidadMedicamento: { include: { medicamento: { select: { nombre: true } } } },
        },
      })
    })
  }

  // ── Bajas definitivas ──────────────────────────────────────────────────────

  async registrarBaja(dto: BajaUnidadDto, userId: string, organizacionId: string) {
    if (REQUIEREN_JUSTIFICACION.includes(dto.tipo) && !dto.justificacion?.trim()) {
      throw new BadRequestException(`El tipo ${dto.tipo} requiere justificación`)
    }

    const unidad = await this.prisma.unidadMedicamento.findFirst({
      where: { id: dto.unidadMedicamentoId },
      include: { farmacia: true, medicamento: true },
    })
    if (!unidad) throw new NotFoundException('Unidad no encontrada')
    if (unidad.farmacia.organizacionId !== organizacionId) throw new ForbiddenException()
    if (!['DISPONIBLE', 'PRE_INGRESO'].includes(unidad.estado)) {
      throw new BadRequestException(`La unidad no puede darse de baja (estado: ${unidad.estado})`)
    }

    return this.prisma.$transaction(async tx => {
      await tx.bajaMedicamento.create({
        data: {
          unidadMedicamentoId: dto.unidadMedicamentoId,
          tipo: dto.tipo,
          justificacion: dto.justificacion,
          registradoPorId: userId,
        },
      })
      await tx.unidadMedicamento.update({
        where: { id: dto.unidadMedicamentoId },
        data: { estado: 'BAJA', fechaEstadoCambio: new Date() },
      })

      // BR-FA-003: verificar promoción de PRE_INGRESO
      if (unidad.estado === 'DISPONIBLE') {
        await this.promoverPreIngreso(tx, unidad.medicamentoId, unidad.farmaciaId)
      }

      return tx.unidadMedicamento.findUnique({
        where: { id: dto.unidadMedicamentoId },
        include: { medicamento: { select: { nombre: true } }, baja: true },
      })
    })
  }

  // ── Privados ───────────────────────────────────────────────────────────────

  private async promoverPreIngreso(
    tx: Prisma.TransactionClient,
    medicamentoId: string,
    farmaciaId: string,
  ) {
    const hayActivos = await tx.unidadMedicamento.count({
      where: { medicamentoId, farmaciaId, estado: { in: ['DISPONIBLE', 'SALIDA_TEMPORAL'] } },
    })
    if (hayActivos > 0) return

    // Promover la unidad PRE_INGRESO más antigua
    const candidato = await tx.unidadMedicamento.findFirst({
      where: { medicamentoId, farmaciaId, estado: 'PRE_INGRESO' },
      orderBy: { fechaEntrada: 'asc' },
    })
    if (candidato) {
      await tx.unidadMedicamento.update({
        where: { id: candidato.id },
        data: { estado: 'DISPONIBLE', fechaEstadoCambio: new Date() },
      })
    }
  }

  private async validateFarmaciaAccess(farmaciaId: string, organizacionId: string) {
    const farmacia = await this.prisma.farmacia.findFirst({ where: { id: farmaciaId, organizacionId } })
    if (!farmacia) throw new NotFoundException('Farmacia no encontrada o sin acceso')
    return farmacia
  }
}
