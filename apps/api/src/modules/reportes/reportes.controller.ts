import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { ReportesService } from './reportes.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UsuarioSesion } from '@ganaderia/shared'

@ApiTags('Reportes')
@ApiBearerAuth()
@Controller('reportes')
export class ReportesController {
  constructor(private readonly reportesService: ReportesService) {}

  @Get('costo-animal')
  getCostoAnimal(
    @CurrentUser() user: UsuarioSesion,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('grupoCorralesId') grupoCorralesId?: string,
    @Query('corralId') corralId?: string,
    @Query('busqueda') busqueda?: string,
  ) {
    return this.reportesService.getCostoAnimal(
      user,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 20,
      grupoCorralesId,
      corralId,
      busqueda,
    )
  }

  @Get('stock-critico')
  getStockCritico(
    @CurrentUser() user: UsuarioSesion,
    @Query('grupoCorralesId') grupoCorralesId?: string,
  ) {
    return this.reportesService.getStockCritico(user, grupoCorralesId)
  }

  @Get('tratamientos')
  getTratamientosPorPeriodo(
    @CurrentUser() user: UsuarioSesion,
    @Query('desde') desdeStr?: string,
    @Query('hasta') hastaStr?: string,
    @Query('grupoCorralesId') grupoCorralesId?: string,
    @Query('corralId') corralId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const hasta = hastaStr ? new Date(hastaStr) : new Date()
    const desde = desdeStr
      ? new Date(desdeStr)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)

    return this.reportesService.getTratamientosPorPeriodo(
      user,
      desde,
      hasta,
      grupoCorralesId,
      corralId,
      page ? parseInt(page, 10) : 1,
      limit ? parseInt(limit, 10) : 50,
    )
  }
}
