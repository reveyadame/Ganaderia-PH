import {
  IsString, IsOptional, IsArray, IsEnum, IsNumber, IsDateString,
  Min, MinLength, MaxLength, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UnidadMedida } from '@ganaderia/shared'

export class TratamientoItemIndividualDto {
  @ApiProperty()
  @IsString()
  medicamentoId!: string

  @ApiProperty({ example: 10.5 })
  @IsNumber()
  @Min(0.001)
  dosis!: number

  @ApiProperty({ enum: UnidadMedida })
  @IsEnum(UnidadMedida)
  unidadDosis!: UnidadMedida
}

export class CreateTratamientoDto {
  @ApiProperty({ description: 'ID del animal a tratar' })
  @IsString()
  animalId!: string

  @ApiPropertyOptional({ description: 'ID del kit (templateId). Mutuamente excluyente con items.' })
  @IsOptional()
  @IsString()
  templateId?: string

  @ApiPropertyOptional({ description: 'Items individuales. Solo si no se usa templateId.' })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => TratamientoItemIndividualDto)
  items?: TratamientoItemIndividualDto[]

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  notas?: string

  @ApiPropertyOptional({ description: 'Fecha de aplicación (ISO). Default: ahora.' })
  @IsOptional()
  @IsDateString()
  fechaAplicacion?: string
}
