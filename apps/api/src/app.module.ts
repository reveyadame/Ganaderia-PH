import { Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core'
import { PrismaModule } from './prisma/prisma.module'
import { AuthModule } from './modules/auth/auth.module'
import { FarmaciasModule } from './modules/farmacias/farmacias.module'
import { GruposCorralesModule } from './modules/grupos-corrales/grupos-corrales.module'
import { CorralesModule } from './modules/corrales/corrales.module'
import { UsuariosModule } from './modules/usuarios/usuarios.module'
import { AnimalesModule } from './modules/animales/animales.module'
import { AretesModule } from './modules/aretes/aretes.module'
import { ScanModule } from './modules/scan/scan.module'
import { MedicamentosModule } from './modules/medicamentos/medicamentos.module'
import { InventarioModule } from './modules/inventario/inventario.module'
import { TratamientoTemplatesModule } from './modules/tratamiento-templates/tratamiento-templates.module'
import { TratamientosModule } from './modules/tratamientos/tratamientos.module'
import { ComederoModule } from './modules/comederos/comederos.module'
import { RacionesModule } from './modules/raciones/raciones.module'
import { DashboardModule } from './modules/dashboard/dashboard.module'
import { ReportesModule } from './modules/reportes/reportes.module'
import { JwtAuthGuard } from './common/guards/jwt-auth.guard'
import { RolesGuard } from './common/guards/roles.guard'
import { ActividadGuard } from './common/guards/actividad.guard'
import { AllExceptionsFilter } from './common/filters/http-exception.filter'
import { AuditInterceptor } from './common/interceptors/audit.interceptor'

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    FarmaciasModule,
    GruposCorralesModule,
    CorralesModule,
    UsuariosModule,
    AnimalesModule,
    AretesModule,
    ScanModule,
    MedicamentosModule,
    InventarioModule,
    TratamientoTemplatesModule,
    TratamientosModule,
    ComederoModule,
    RacionesModule,
    DashboardModule,
    ReportesModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
    { provide: APP_GUARD, useClass: ActividadGuard },
    { provide: APP_INTERCEPTOR, useClass: AuditInterceptor },
  ],
})
export class AppModule {}
