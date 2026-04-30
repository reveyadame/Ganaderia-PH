import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { ComederoService } from './comederos.service'
import { CreateEstadoConfigDto } from './dto/create-estado-config.dto'
import { CreateLecturaDto } from './dto/create-lectura.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { UsuarioSesion, TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

@ApiTags('Comederos')
@ApiBearerAuth()
@Controller('comederos')
export class ComederoController {
  constructor(private readonly service: ComederoService) {}

  // ── Estados comedero ──────────────────────────────────────────────────────

  @Get('estados')
  @ApiOperation({ summary: 'Listar estados de comedero de la organización' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  findAllEstados(@CurrentUser() user: UsuarioSesion) {
    return this.service.findAllEstados(user.organizacionId)
  }

  @Post('estados')
  @ApiOperation({ summary: 'Crear estado de comedero' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  createEstado(@Body() dto: CreateEstadoConfigDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.createEstado(dto, user.organizacionId)
  }

  @Put('estados/:id')
  @ApiOperation({ summary: 'Actualizar estado de comedero' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  updateEstado(
    @Param('id') id: string,
    @Body() dto: Partial<CreateEstadoConfigDto>,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.updateEstado(id, dto, user.organizacionId)
  }

  @Delete('estados/:id')
  @ApiOperation({ summary: 'Desactivar/eliminar estado de comedero' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  removeEstado(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.removeEstado(id, user.organizacionId)
  }

  // ── Lecturas ──────────────────────────────────────────────────────────────

  @Post('lecturas')
  @ApiOperation({ summary: 'Registrar lectura de comedero' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.COMEDEROS)
  registrarLectura(@Body() dto: CreateLecturaDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.registrarLectura(dto, user.id, user.organizacionId)
  }

  @Get('lecturas')
  @ApiOperation({ summary: 'Historial de lecturas de un corral' })
  @ApiQuery({ name: 'corralId', required: true })
  @ApiQuery({ name: 'limite', required: false })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.COMEDEROS, ActividadUsuario.REPORTES)
  getLecturasCorral(
    @Query('corralId') corralId: string,
    @Query('limite') limite: string,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.getLecturasCorral(corralId, user.organizacionId, limite ? parseInt(limite) : 20)
  }

  // ── Dashboard ─────────────────────────────────────────────────────────────

  @Get('estado-actual')
  @ApiOperation({ summary: 'Estado actual de comederos por GrupoCorrales (dashboard)' })
  @ApiQuery({ name: 'grupoCorralesId', required: true })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.COMEDEROS, ActividadUsuario.REPORTES)
  getEstadoActual(
    @Query('grupoCorralesId') grupoCorralesId: string,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.getEstadoActual(grupoCorralesId, user.organizacionId)
  }
}
