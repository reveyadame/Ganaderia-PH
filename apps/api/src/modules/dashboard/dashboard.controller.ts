import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { UsuarioSesion } from '@ganaderia/shared'

@ApiTags('Dashboard')
@ApiBearerAuth()
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKpis(
    @CurrentUser() user: UsuarioSesion,
    @Query('grupoCorralesId') grupoCorralesId?: string,
  ) {
    return this.dashboardService.getKpis(user.organizacionId, grupoCorralesId)
  }

  @Get('tratamientos-por-dia')
  getTratamientosPorDia(
    @CurrentUser() user: UsuarioSesion,
    @Query('dias') diasStr?: string,
    @Query('grupoCorralesId') grupoCorralesId?: string,
  ) {
    const dias = diasStr ? parseInt(diasStr, 10) : 30
    return this.dashboardService.getTratamientosPorDia(user.organizacionId, dias, grupoCorralesId)
  }

  @Get('grupos')
  getResumenGrupos(@CurrentUser() user: UsuarioSesion) {
    return this.dashboardService.getResumenGrupos(user.organizacionId)
  }
}
