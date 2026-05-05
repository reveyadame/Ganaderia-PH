import { Controller, Get, Query } from '@nestjs/common'
import { ApiTags, ApiBearerAuth } from '@nestjs/swagger'
import { DashboardService } from './dashboard.service'
import { CurrentUser } from '../../common/decorators/current-user.decorator'
import { RequiereRoles } from '../../common/decorators/requiere-roles.decorator'
import { TipoUsuario, UsuarioSesion } from '@ganaderia/shared'

@ApiTags('Dashboard')
@ApiBearerAuth()
@RequiereRoles(TipoUsuario.SUPERUSUARIO, TipoUsuario.DIRECTOR)
@Controller('dashboard')
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('kpis')
  getKpis(
    @CurrentUser() user: UsuarioSesion,
    @Query('grupoCorralesId') grupoCorralesId?: string,
  ) {
    return this.dashboardService.getKpis(user, grupoCorralesId)
  }

  @Get('tratamientos-por-dia')
  getTratamientosPorDia(
    @CurrentUser() user: UsuarioSesion,
    @Query('dias') diasStr?: string,
    @Query('grupoCorralesId') grupoCorralesId?: string,
  ) {
    const dias = diasStr ? parseInt(diasStr, 10) : 30
    return this.dashboardService.getTratamientosPorDia(user, dias, grupoCorralesId)
  }

  @Get('grupos')
  getResumenGrupos(@CurrentUser() user: UsuarioSesion) {
    return this.dashboardService.getResumenGrupos(user)
  }
}
