import { Module } from '@nestjs/common'
import { GruposCorralesController } from './grupos-corrales.controller'
import { GruposCorralesService } from './grupos-corrales.service'

@Module({
  controllers: [GruposCorralesController],
  providers: [GruposCorralesService],
  exports: [GruposCorralesService],
})
export class GruposCorralesModule {}
