import { PartialType } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'
import { CreateCorralDto } from './create-corral.dto'

export class UpdateCorralDto extends PartialType(CreateCorralDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean
}
