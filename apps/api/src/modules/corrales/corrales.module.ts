import { Module } from '@nestjs/common'
import { CorralesController } from './corrales.controller'
import { CorralesService } from './corrales.service'

@Module({
  controllers: [CorralesController],
  providers: [CorralesService],
  exports: [CorralesService],
})
export class CorralesModule {}
