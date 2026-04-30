import {
  IsString, IsOptional, IsArray, IsEnum, IsNumber, IsInt, Min, MinLength, MaxLength, ValidateNested,
} from 'class-validator'
import { Type } from 'class-transformer'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'
import { UnidadMedida } from '@ganaderia/shared'

export class CreateTemplateItemDto {
  @ApiProperty()
  @IsString()
  medicamentoId!: string

  @ApiProperty({ example: 10.5, description: 'Dosis a aplicar' })
  @IsNumber()
  @Min(0.001)
  dosis!: number

  @ApiProperty({ enum: UnidadMedida })
  @IsEnum(UnidadMedida)
  unidadDosis!: UnidadMedida

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsInt()
  @Min(0)
  orden?: number
}

export class CreateTemplateDto {
  @ApiProperty({ example: 'Kit Inicial' })
  @IsString()
  @MinLength(2)
  @MaxLength(150)
  nombre!: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string

  @ApiProperty({ type: [CreateTemplateItemDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateTemplateItemDto)
  items!: CreateTemplateItemDto[]
}
