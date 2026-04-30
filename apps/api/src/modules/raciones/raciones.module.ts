import { Module } from '@nestjs/common'
import { RacionesController } from './raciones.controller'
import { RacionesService } from './raciones.service'

@Module({
  controllers: [RacionesController],
  providers: [RacionesService],
  exports: [RacionesService],
})
export class RacionesModule {}
