import { Controller, Get, Post, Patch, Body, Param, Query, ParseFloatPipe } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { InventarioService } from './inventario.service'
import { IsNumber, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { AltaUnidadDto } from './dto/alta-unidad.dto'
import { SalidaTemporalDto } from './dto/salida-temporal.dto'
import { RegresoUnidadDto } from './dto/regreso-unidad.dto'
import { BajaUnidadDto } from './dto/baja-unidad.dto'
import { CreateAjusteInventarioDto } from './dto/ajuste-inventario.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { UsuarioSesion, TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

class PromoverPreIngresoDto {
  @ApiProperty()
  @IsString()
  medicamentoId!: string

  @ApiProperty()
  @IsString()
  farmaciaId!: string

  @ApiProperty()
  @IsNumber()
  costoPorMedida!: number
}

@ApiTags('Inventario')
@ApiBearerAuth()
@Controller('inventario')
export class InventarioController {
  constructor(private readonly service: InventarioService) {}

  @Get('stock')
  @ApiOperation({ summary: 'Resumen de stock por medicamento con alertas' })
  @ApiQuery({ name: 'farmaciaId', required: true })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  getStock(@Query('farmaciaId') farmaciaId: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.getStock(farmaciaId, user)
  }

  @Get('unidades')
  @ApiOperation({ summary: 'Listar unidades de medicamento con filtros' })
  @ApiQuery({ name: 'farmaciaId', required: true })
  @ApiQuery({ name: 'medicamentoId', required: false })
  @ApiQuery({ name: 'estado', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  getUnidades(
    @Query('farmaciaId') farmaciaId: string,
    @Query('medicamentoId') medicamentoId: string | undefined,
    @Query('estado') estado: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.getUnidades(farmaciaId, user, {
      medicamentoId,
      estado,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
  }

  @Post('alta')
  @ApiOperation({ summary: 'Dar de alta una nueva unidad (FIFO: PRE_INGRESO si hay DISPONIBLES)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  altaUnidad(@Body() dto: AltaUnidadDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.altaUnidad(dto, user)
  }

  @Get('salidas')
  @ApiOperation({ summary: 'Listar salidas temporales' })
  @ApiQuery({ name: 'farmaciaId', required: true })
  @ApiQuery({ name: 'abierta', required: false, type: Boolean })
  @ApiQuery({ name: 'page', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  getSalidas(
    @Query('farmaciaId') farmaciaId: string,
    @Query('abierta') abierta: string | undefined,
    @Query('page') page: string | undefined,
    @CurrentUser() user: UsuarioSesion,
  ) {
    const abiertoFlag = abierta === 'true' ? true : abierta === 'false' ? false : undefined
    return this.service.getSalidas(farmaciaId, user, {
      abierta: abiertoFlag,
      page: page ? parseInt(page) : undefined,
    })
  }

  @Post('salidas')
  @ApiOperation({ summary: 'Registrar salida temporal a médico' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  crearSalida(@Body() dto: SalidaTemporalDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.crearSalidaTemporal(dto, user)
  }

  @Patch('salidas/:id/regreso')
  @ApiOperation({ summary: 'Registrar regreso de unidad (vacío → CONSUMIDO, con contenido → DISPONIBLE)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  registrarRegreso(
    @Param('id') id: string,
    @Body() dto: RegresoUnidadDto,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.registrarRegreso(id, dto, user)
  }

  @Post('bajas')
  @ApiOperation({ summary: 'Dar de baja una unidad (ajuste, pérdida, caducidad, etc.)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  registrarBaja(@Body() dto: BajaUnidadDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.registrarBaja(dto, user)
  }

  @Post('promover-preingreso')
  @ApiOperation({ summary: 'Promover manualmente un batch de PRE_INGRESO a DISPONIBLE (mismo precio)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA)
  promoverPreIngreso(
    @Body() body: PromoverPreIngresoDto,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.promoverPreIngresoManual(body.medicamentoId, body.farmaciaId, body.costoPorMedida, user)
  }

  // ── Ajustes de inventario (SUPERUSUARIO) ─────────────────────────────────

  @Post('ajustes')
  @ApiOperation({ summary: 'Ajustar el stock real de un medicamento (solo SUPERUSUARIO)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO)
  crearAjuste(@Body() dto: CreateAjusteInventarioDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.crearAjuste(dto, user)
  }

  @Get('ajustes')
  @ApiOperation({ summary: 'Historial de ajustes de inventario' })
  @ApiQuery({ name: 'farmaciaId', required: true })
  @ApiQuery({ name: 'medicamentoId', required: false })
  @ApiQuery({ name: 'page', required: false })
  @ApiQuery({ name: 'limit', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  getAjustes(
    @Query('farmaciaId') farmaciaId: string,
    @Query('medicamentoId') medicamentoId: string | undefined,
    @Query('page') page: string | undefined,
    @Query('limit') limit: string | undefined,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.getAjustes(farmaciaId, user, {
      medicamentoId,
      page: page ? parseInt(page) : undefined,
      limit: limit ? parseInt(limit) : undefined,
    })
  }
}
