import { Module } from '@nestjs/common'
import { FarmaciasController } from './farmacias.controller'
import { FarmaciasService } from './farmacias.service'

@Module({
  controllers: [FarmaciasController],
  providers: [FarmaciasService],
  exports: [FarmaciasService],
})
export class FarmaciasModule {}
