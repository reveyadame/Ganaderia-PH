import { PartialType } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'
import { CreateFarmaciaDto } from './create-farmacia.dto'

export class UpdateFarmaciaDto extends PartialType(CreateFarmaciaDto) {
  @IsOptional()
  @IsBoolean()
  activa?: boolean
}
