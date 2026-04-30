import { Controller, Get, Post, Put, Delete, Body, Param, Query } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger'
import { MedicamentosService } from './medicamentos.service'
import { CreateMedicamentoDto } from './dto/create-medicamento.dto'
import { UpdateMedicamentoDto } from './dto/update-medicamento.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { RequiereActividad } from '../../common/decorators/requiere-actividad.decorator'
import { UsuarioSesion, TipoUsuario, ActividadUsuario } from '@ganaderia/shared'

@ApiTags('Medicamentos')
@ApiBearerAuth()
@Controller('medicamentos')
export class MedicamentosController {
  constructor(private readonly service: MedicamentosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar medicamentos de una farmacia con stock' })
  @ApiQuery({ name: 'farmaciaId', required: true })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  findAll(@Query('farmaciaId') farmaciaId: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findAll(farmaciaId, user.organizacionId)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener medicamento por ID' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN, TipoUsuario.DIRECTOR, TipoUsuario.OPERADOR)
  @RequiereActividad(ActividadUsuario.FARMACIA, ActividadUsuario.REPORTES)
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user.organizacionId)
  }

  @Post()
  @ApiOperation({ summary: 'Crear medicamento' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  create(@Body() dto: CreateMedicamentoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user.organizacionId)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar medicamento' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  update(@Param('id') id: string, @Body() dto: UpdateMedicamentoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.update(id, dto, user.organizacionId)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar medicamento (soft delete)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.ADMIN)
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user.organizacionId)
  }
}
