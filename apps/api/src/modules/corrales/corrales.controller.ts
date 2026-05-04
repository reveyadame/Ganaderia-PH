import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { CorralesService } from './corrales.service'
import { CreateCorralDto } from './dto/create-corral.dto'
import { UpdateCorralDto } from './dto/update-corral.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { UsuarioSesion, TipoUsuario } from '@ganaderia/shared'

@ApiTags('Corrales')
@ApiBearerAuth()
@Controller('corrales')
export class CorralesController {
  constructor(private readonly service: CorralesService) {}

  @Get()
  @ApiOperation({ summary: 'Listar corrales (operador filtrado a sus grupos)' })
  @ApiQuery({ name: 'grupoCorralesId', required: false })
  findAll(@CurrentUser() user: UsuarioSesion, @Query('grupoCorralesId') grupoCorralesId?: string) {
    const filtro = user.tipo === TipoUsuario.OPERADOR ? user.gruposCorralesIds : undefined
    return this.service.findAll(user.organizacionId, grupoCorralesId, filtro)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener corral por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user.organizacionId)
  }

  @Post()
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Crear corral' })
  create(@Body() dto: CreateCorralDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId)
  }

  @Put(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Actualizar corral' })
  update(@Param('id') id: string, @Body() dto: UpdateCorralDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.update(id, dto, user.organizacionId)
  }

  @Delete(':id')
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  @ApiOperation({ summary: 'Desactivar corral' })
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user.organizacionId)
  }
}
