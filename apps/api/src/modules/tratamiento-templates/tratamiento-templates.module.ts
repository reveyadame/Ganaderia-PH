import { Module } from '@nestjs/common'
import { TratamientoTemplatesController } from './tratamiento-templates.controller'
import { TratamientoTemplatesService } from './tratamiento-templates.service'

@Module({
  controllers: [TratamientoTemplatesController],
  providers: [TratamientoTemplatesService],
  exports: [TratamientoTemplatesService],
})
export class TratamientoTemplatesModule {}
