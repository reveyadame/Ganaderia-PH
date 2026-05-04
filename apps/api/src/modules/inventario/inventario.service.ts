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
import { CreateAjusteInventarioDto } from './dto/ajuste-inventario.dto'
import { EstadoRegreso, TipoBajaMedicamento, UsuarioSesion } from '@ganaderia/shared'
import { assertFarmaciaAccess } from '../../common/utils/farmacia-access.util'

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

  async getStock(farmaciaId: string, user: UsuarioSesion) {
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

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
    user: UsuarioSesion,
    opts: { medicamentoId?: string; estado?: string; page?: number; limit?: number },
  ) {
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

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

  // ── Alta de unidad (FIFO / PRE_INGRESO, bulk) ─────────────────────────────

  async altaUnidad(dto: AltaUnidadDto, user: UsuarioSesion) {
    const medicamento = await this.prisma.medicamento.findFirst({
      where: { id: dto.medicamentoId, activo: true },
      include: { farmacia: true },
    })
    if (!medicamento) throw new NotFoundException('Medicamento no encontrado')
    if (medicamento.farmacia.organizacionId !== user.organizacionId) throw new NotFoundException('Medicamento no encontrado')
    await assertFarmaciaAccess(this.prisma, user, medicamento.farmaciaId)

    const farmaciaId = medicamento.farmaciaId
    const cantidad = dto.cantidad ?? 1
    const costoUnitario = dto.costoUnitario
    const costoPorMedida = Number(costoUnitario) / Number(medicamento.volumenPresentacion)

    // BR-FA-002 (bulk): si ya hay alguna DISPONIBLE → todas las nuevas entran PRE_INGRESO.
    // Si no hay DISPONIBLE → la primera entra DISPONIBLE, el resto PRE_INGRESO (FIFO mantenido).
    const hayDisponibles = await this.prisma.unidadMedicamento.count({
      where: { medicamentoId: dto.medicamentoId, farmaciaId, estado: 'DISPONIBLE' },
    })

    const dataBase = {
      medicamentoId: dto.medicamentoId,
      farmaciaId,
      costoUnitario,
      costoPorMedida,
      notasProveedor: dto.notasProveedor,
      ingresadoPorId: user.id,
    }

    return this.prisma.$transaction(async (tx) => {
      const creadas: Awaited<ReturnType<typeof tx.unidadMedicamento.create>>[] = []
      for (let i = 0; i < cantidad; i++) {
        const estado = hayDisponibles === 0 && i === 0 ? 'DISPONIBLE' : 'PRE_INGRESO'
        const u = await tx.unidadMedicamento.create({ data: { ...dataBase, estado } })
        creadas.push(u)
      }
      return {
        cantidad: creadas.length,
        unidades: creadas,
        medicamento: { id: medicamento.id, nombre: medicamento.nombre },
      }
    })
  }

  // ── Salidas temporales ─────────────────────────────────────────────────────

  async getSalidas(
    farmaciaId: string,
    user: UsuarioSesion,
    opts: { abierta?: boolean; page?: number; limit?: number },
  ) {
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

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

  async crearSalidaTemporal(dto: SalidaTemporalDto, user: UsuarioSesion) {
    const medicamento = await this.prisma.medicamento.findFirst({
      where: { id: dto.medicamentoId, activo: true },
      include: { farmacia: true },
    })
    if (!medicamento) throw new NotFoundException('Medicamento no encontrado')
    if (medicamento.farmacia.organizacionId !== user.organizacionId) throw new NotFoundException('Medicamento no encontrado')
    await assertFarmaciaAccess(this.prisma, user, medicamento.farmaciaId)

    const medico = await this.prisma.usuario.findFirst({ where: { id: dto.medicoId, organizacionId: user.organizacionId } })
    if (!medico) throw new NotFoundException('Médico no encontrado')

    // FIFO: tomar las N unidades más antiguas en DISPONIBLE o PRE_INGRESO
    const candidatas = await this.prisma.unidadMedicamento.findMany({
      where: {
        medicamentoId: medicamento.id,
        farmaciaId: medicamento.farmaciaId,
        estado: { in: ['DISPONIBLE', 'PRE_INGRESO'] },
      },
      orderBy: { fechaEntrada: 'asc' },
      take: dto.cantidad,
    })

    if (candidatas.length < dto.cantidad) {
      throw new BadRequestException(
        `Stock insuficiente: solicitadas ${dto.cantidad}, disponibles ${candidatas.length}`,
      )
    }

    return this.prisma.$transaction(async (tx) => {
      const salidas: Awaited<ReturnType<typeof tx.salidaTemporal.create>>[] = []
      for (const unidad of candidatas) {
        const salida = await tx.salidaTemporal.create({
          data: {
            unidadMedicamentoId: unidad.id,
            medicoId: dto.medicoId,
            autorizadoPorId: user.id,
            notas: dto.notas,
          },
        })
        await tx.unidadMedicamento.update({
          where: { id: unidad.id },
          data: { estado: 'SALIDA_TEMPORAL', fechaEstadoCambio: new Date() },
        })
        salidas.push(salida)
      }
      return {
        cantidad: salidas.length,
        salidas,
        medicamento: { id: medicamento.id, nombre: medicamento.nombre },
      }
    })
  }

  async registrarRegreso(salidaId: string, dto: RegresoUnidadDto, user: UsuarioSesion) {
    const salida = await this.prisma.salidaTemporal.findFirst({
      where: { id: salidaId },
      include: { unidadMedicamento: { include: { farmacia: true, medicamento: true } } },
    })
    if (!salida) throw new NotFoundException('Salida no encontrada')
    if (salida.unidadMedicamento.farmacia.organizacionId !== user.organizacionId) throw new NotFoundException('Salida no encontrada')
    await assertFarmaciaAccess(this.prisma, user, salida.unidadMedicamento.farmaciaId)
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

  // ── Baja individual de una unidad ──────────────────────────────────────────

  async registrarBaja(dto: BajaUnidadDto, user: UsuarioSesion) {
    if (REQUIEREN_JUSTIFICACION.includes(dto.tipo) && !dto.justificacion?.trim()) {
      throw new BadRequestException(`El tipo ${dto.tipo} requiere justificación`)
    }

    const unidad = await this.prisma.unidadMedicamento.findFirst({
      where: { id: dto.unidadMedicamentoId },
      include: { farmacia: true, medicamento: true },
    })
    if (!unidad) throw new NotFoundException('Unidad no encontrada')
    if (unidad.farmacia.organizacionId !== user.organizacionId) throw new NotFoundException('Unidad no encontrada')
    await assertFarmaciaAccess(this.prisma, user, unidad.farmaciaId)
    if (!['DISPONIBLE', 'PRE_INGRESO'].includes(unidad.estado)) {
      throw new BadRequestException(`La unidad no puede darse de baja (estado: ${unidad.estado})`)
    }

    return this.prisma.$transaction(async (tx) => {
      await tx.bajaMedicamento.create({
        data: {
          unidadMedicamentoId: unidad.id,
          tipo: dto.tipo,
          justificacion: dto.justificacion,
          registradoPorId: user.id,
        },
      })
      await tx.unidadMedicamento.update({
        where: { id: unidad.id },
        data: { estado: 'BAJA', fechaEstadoCambio: new Date() },
      })

      if (unidad.estado === 'DISPONIBLE') {
        await this.promoverPreIngreso(tx, unidad.medicamentoId, unidad.farmaciaId)
      }

      return tx.unidadMedicamento.findUnique({
        where: { id: unidad.id },
        include: { medicamento: { select: { nombre: true } }, baja: true },
      })
    })
  }

  // ── Ajuste de inventario (SUPERUSUARIO) ────────────────────────────────────

  async crearAjuste(dto: CreateAjusteInventarioDto, user: UsuarioSesion) {
    const medicamento = await this.prisma.medicamento.findFirst({
      where: { id: dto.medicamentoId, activo: true },
      include: { farmacia: true },
    })
    if (!medicamento) throw new NotFoundException('Medicamento no encontrado')
    if (medicamento.farmacia.organizacionId !== user.organizacionId) throw new NotFoundException('Medicamento no encontrado')
    await assertFarmaciaAccess(this.prisma, user, medicamento.farmaciaId)

    const stockOperativo = await this.prisma.unidadMedicamento.count({
      where: {
        medicamentoId: medicamento.id,
        farmaciaId: medicamento.farmaciaId,
        estado: { in: ['DISPONIBLE', 'PRE_INGRESO', 'SALIDA_TEMPORAL'] },
      },
    })

    const cantidadAnterior = stockOperativo
    const cantidadNueva = dto.cantidadNueva
    const delta = cantidadNueva - cantidadAnterior

    if (delta === 0) {
      throw new BadRequestException('La cantidad nueva es igual al stock actual; no hay ajuste a realizar')
    }
    if (delta > 0 && (dto.costoUnitario === undefined || dto.costoUnitario === null)) {
      throw new BadRequestException('costoUnitario es requerido cuando cantidadNueva > stock actual')
    }
    if (delta < 0) {
      // Solo podemos bajar unidades en DISPONIBLE o PRE_INGRESO (no SALIDA_TEMPORAL)
      const bajables = await this.prisma.unidadMedicamento.count({
        where: {
          medicamentoId: medicamento.id,
          farmaciaId: medicamento.farmaciaId,
          estado: { in: ['DISPONIBLE', 'PRE_INGRESO'] },
        },
      })
      if (Math.abs(delta) > bajables) {
        throw new BadRequestException(
          `No se pueden quitar ${Math.abs(delta)} unidades: solo ${bajables} están en stock no salido (las demás están en SALIDA_TEMPORAL)`,
        )
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const ajuste = await tx.ajusteInventario.create({
        data: {
          medicamentoId: medicamento.id,
          farmaciaId: medicamento.farmaciaId,
          cantidadAnterior,
          cantidadNueva,
          delta,
          costoUnitario: delta > 0 ? dto.costoUnitario : null,
          justificacion: dto.justificacion,
          realizadoPorId: user.id,
        },
        include: {
          medicamento: { select: { nombre: true, presentacion: true, unidadMedida: true, volumenPresentacion: true } },
          realizadoPor: { select: { nombre: true, apellido: true } },
        },
      })

      if (delta > 0) {
        // Crear N unidades nuevas. Aplicamos BR-FA-002 a la primera (DISPONIBLE si no hay stock activo).
        const hayDisponibles = await tx.unidadMedicamento.count({
          where: { medicamentoId: medicamento.id, farmaciaId: medicamento.farmaciaId, estado: 'DISPONIBLE' },
        })
        const costoUnitario = dto.costoUnitario!
        const costoPorMedida = Number(costoUnitario) / Number(medicamento.volumenPresentacion)
        for (let i = 0; i < delta; i++) {
          const estado = hayDisponibles === 0 && i === 0 ? 'DISPONIBLE' : 'PRE_INGRESO'
          await tx.unidadMedicamento.create({
            data: {
              medicamentoId: medicamento.id,
              farmaciaId: medicamento.farmaciaId,
              costoUnitario,
              costoPorMedida,
              estado,
              ingresadoPorId: user.id,
              notasProveedor: `Ajuste de inventario #${ajuste.id.slice(-6)}: ${dto.justificacion}`,
            },
          })
        }
      } else {
        // Bajas newest-first
        const candidatas = await tx.unidadMedicamento.findMany({
          where: {
            medicamentoId: medicamento.id,
            farmaciaId: medicamento.farmaciaId,
            estado: { in: ['DISPONIBLE', 'PRE_INGRESO'] },
          },
          orderBy: { fechaEntrada: 'desc' },
          take: Math.abs(delta),
        })
        let huboDisponible = false
        for (const u of candidatas) {
          await tx.bajaMedicamento.create({
            data: {
              unidadMedicamentoId: u.id,
              tipo: TipoBajaMedicamento.AJUSTE,
              justificacion: `Ajuste #${ajuste.id.slice(-6)}: ${dto.justificacion}`,
              registradoPorId: user.id,
            },
          })
          await tx.unidadMedicamento.update({
            where: { id: u.id },
            data: { estado: 'BAJA', fechaEstadoCambio: new Date() },
          })
          if (u.estado === 'DISPONIBLE') huboDisponible = true
        }
        if (huboDisponible) {
          await this.promoverPreIngreso(tx, medicamento.id, medicamento.farmaciaId)
        }
      }

      return ajuste
    })
  }

  async getAjustes(
    farmaciaId: string,
    user: UsuarioSesion,
    opts: { medicamentoId?: string; page?: number; limit?: number },
  ) {
    await assertFarmaciaAccess(this.prisma, user, farmaciaId)

    const page = opts.page ?? 1
    const limit = opts.limit ?? 50
    const skip = (page - 1) * limit

    const where = {
      farmaciaId,
      ...(opts.medicamentoId ? { medicamentoId: opts.medicamentoId } : {}),
    }

    const [ajustes, total] = await Promise.all([
      this.prisma.ajusteInventario.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaAjuste: 'desc' },
        include: {
          medicamento: { select: { nombre: true, presentacion: true, unidadMedida: true } },
          realizadoPor: { select: { nombre: true, apellido: true } },
        },
      }),
      this.prisma.ajusteInventario.count({ where }),
    ])

    return { data: ajustes, total, page, totalPages: Math.ceil(total / limit) }
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
}
