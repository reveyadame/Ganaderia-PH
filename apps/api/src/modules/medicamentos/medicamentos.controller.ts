import { Controller, Get, Post, Put, Delete, Body, Param } from '@nestjs/common'
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger'
import { MedicamentosService } from './medicamentos.service'
import { CreateMedicamentoDto } from './dto/create-medicamento.dto'
import { UpdateMedicamentoDto } from './dto/update-medicamento.dto'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { UsuarioSesion, TipoUsuario } from '@ganaderia/shared'

@ApiTags('Catálogo de Medicamentos')
@ApiBearerAuth()
@Controller('medicamentos')
export class MedicamentosController {
  constructor(private readonly service: MedicamentosService) {}

  @Get()
  @ApiOperation({ summary: 'Listar catálogo de medicamentos de la organización' })
  findAll(@CurrentUser() user: UsuarioSesion) {
    return this.service.findAll(user)
  }

  @Get(':id')
  @ApiOperation({ summary: 'Obtener medicamento del catálogo por ID' })
  findOne(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.findOne(id, user)
  }

  @Post()
  @ApiOperation({ summary: 'Crear medicamento en el catálogo' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  create(@Body() dto: CreateMedicamentoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.create(dto, user)
  }

  @Put(':id')
  @ApiOperation({ summary: 'Actualizar medicamento del catálogo' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  update(@Param('id') id: string, @Body() dto: UpdateMedicamentoDto, @CurrentUser() user: UsuarioSesion) {
    return this.service.update(id, dto, user)
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Desactivar medicamento del catálogo (soft delete)' })
  @RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
  remove(@Param('id') id: string, @CurrentUser() user: UsuarioSesion) {
    return this.service.remove(id, user)
  }
}
