import { PartialType } from '@nestjs/swagger'
import { IsBoolean, IsOptional } from 'class-validator'
import { CreateGrupoCorralesDto } from './create-grupo-corrales.dto'

export class UpdateGrupoCorralesDto extends PartialType(CreateGrupoCorralesDto) {
  @IsOptional()
  @IsBoolean()
  activo?: boolean
}
