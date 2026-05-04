import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { GruposCorralesService } from './grupos-corrales.service'
import { CreateGrupoCorralesDto } from './dto/create-grupo-corrales.dto'
import { UpdateGrupoCorralesDto } from './dto/update-grupo-corrales.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { UsuarioSesion, TipoUsuario } from '@ganaderia/shared'

@ApiTags('Grupos de Corrales')
@ApiBearerAuth()
@Controller('grupos-corrales')
export class GruposCorralesController {
  constructor(private readonly service: GruposCorralesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar grupos de corrales (operador filtrado a sus asignados)' })
  findAll(@CurrentUser() user: UsuarioSesion) {
    const filtro = user.tipo === TipoUsuario.OPERADOR ? user.gruposCorralesIds : undefined
    return this.service.findAll(user.organizacionId, filtro)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener grupo con sus corrales' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user.organizacionId)
  }

  @Post()
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Crear grupo de corrales' })
  create(@Body() dto: CreateGrupoCorralesDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId)
  }

  @Put(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Actualizar grupo de corrales' })
  update(@Param('id') id: string, @Body() dto: UpdateGrupoCorralesDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.update(id, dto, user.organizacionId)
  }

  @Delete(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Desactivar grupo de corrales' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user.organizacionId)
  }
}
