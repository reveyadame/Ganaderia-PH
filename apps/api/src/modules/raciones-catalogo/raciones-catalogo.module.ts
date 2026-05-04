import { Module } from '@nestjs/common'
import { RacionesCatalogoController } from './raciones-catalogo.controller'
import { RacionesCatalogoService } from './raciones-catalogo.service'

@Module({
  controllers: [RacionesCatalogoController],
  providers: [RacionesCatalogoService],
  exports: [RacionesCatalogoService],
})
export class RacionesCatalogoModule {}
