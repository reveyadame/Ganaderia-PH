import { Module } from '@nestjs/common'
import { AretesController } from './aretes.controller'
import { AretesService } from './aretes.service'

@Module({
  controllers: [AretesController],
  providers: [AretesService],
  exports: [AretesService],
})
export class AretesModule {}
