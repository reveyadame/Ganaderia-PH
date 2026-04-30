import { Module } from '@nestjs/common'
import { ComederoController } from './comederos.controller'
import { ComederoService } from './comederos.service'

@Module({
  controllers: [ComederoController],
  providers: [ComederoService],
  exports: [ComederoService],
})
export class ComederoModule {}
