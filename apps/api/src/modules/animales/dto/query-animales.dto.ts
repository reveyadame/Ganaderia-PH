import { IsOptional, IsEnum, IsString, IsInt, Min, Max } from 'class-validator'
import { Type } from 'class-transformer'
import { ApiPropertyOptional } from '@nestjs/swagger'
import { SexoAnimal, EstadoAnimal } from '@ganaderia/shared'

export class QueryAnimalesDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  corralId?: string

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  grupoCorralesId?: string

  @ApiPropertyOptional({ enum: SexoAnimal })
  @IsOptional()
  @IsEnum(SexoAnimal)
  sexo?: SexoAnimal

  @ApiPropertyOptional({ enum: EstadoAnimal, default: EstadoAnimal.ACTIVO })
  @IsOptional()
  @IsEnum(EstadoAnimal)
  estado?: EstadoAnimal

  @ApiPropertyOptional({ default: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1

  @ApiPropertyOptional({ default: 50 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(200)
  limit?: number = 50
}
