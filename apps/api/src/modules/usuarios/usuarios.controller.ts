import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { UsuariosService } from './usuarios.service'
import { CreateUsuarioDto } from './dto/create-usuario.dto'
import { UpdateUsuarioDto } from './dto/update-usuario.dto'
import { AsignarActividadesDto } from './dto/asignar-actividades.dto'
import { AsignarGruposDto } from './dto/asignar-grupos.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { UsuarioSesion, TipoUsuario } from '@ganaderia/shared'

@ApiTags('Usuarios')
@ApiBearerAuth()
@RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
@Controller('usuarios')
export class UsuariosController {
  constructor(private readonly service: UsuariosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar usuarios' })
  findAll(@CurrentUser() user: UsuarioSesion) {
    return this.service.findAll(user.organizacionId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener usuario por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user.organizacionId)
  }

  @Post()
  @ApiOperation({ summary: 'Crear usuario' })
  create(@Body() dto: CreateUsuarioDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar datos del usuario' })
  update(@Param('id') id: string, @Body() dto: UpdateUsuarioDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.update(id, dto, user.organizacionId)
  }

  @Put(':id/actividades')
  @ApiOperation({ summary: 'Asignar actividades al usuario (reemplaza las existentes)' })
  asignarActividades(
    @Param('id') id: string,
    @Body() dto: AsignarActividadesDto,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.asignarActividades(id, dto.actividades, user.organizacionId)
  }

  @Put(':id/grupos-corrales')
  @ApiOperation({ summary: 'Asignar grupos de corrales al usuario (reemplaza los existentes)' })
  asignarGrupos(
    @Param('id') id: string,
    @Body() dto: AsignarGruposDto,
    @CurrentUser() user: UsuarioSesion,
  ) {
    return this.service.asignarGrupos(id, dto.gruposCorralesIds, user.organizacionId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar usuario' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user.organizacionId)
  }
}
