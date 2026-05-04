import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { NotificacionesService } from './notificaciones.service'
import { CreateNotificacionDto } from './dto/create-notificacion.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { UsuarioSesion, TipoUsuario } from '@ganaderia/shared'

@ApiTags('Notificaciones')
@ApiBearerAuth()
@Controller('notificaciones')
export class NotificacionesController {
  constructor(private readonly service: NotificacionesService) {}

  @Get('mias')
  @ApiOperation({ summary: 'Listar mis notificaciones recibidas' })
  listarMias(@CurrentUser() user: UsuarioSesion) {
    return this.service.listarMias(user)
  }

  @Patch(':id/leer')
  @ApiOperation({ summary: 'Marcar notificación como leída' })
  marcarLeida(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.marcarLeida(id, user)
  }

  @Patch(':id/confirmar')
  @ApiOperation({ summary: 'Confirmar lectura (CRITICAS)' })
  confirmar(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.confirmar(id, user)
  }

  // ── Endpoints de autor ───────────────────────────────────
  @Post()
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Crear y enviar notificación' })
  create(@Body() dto: CreateNotificacionDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user)
  }

  @Get()
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Listar notificaciones que envié' })
  listarEmitidas(@CurrentUser() user: UsuarioSesion) {
    return this.service.listarEmitidas(user)
  }

  @Get(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Detalle de una notificación con destinatarios' })
  detalle(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.detalle(id, user)
  }

  @Delete(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Eliminar notificación (autor o superusuario)' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user)
  }
}
