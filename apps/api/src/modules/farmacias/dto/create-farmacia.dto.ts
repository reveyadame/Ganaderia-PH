import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateFarmaciaDto {
  @ApiProperty({ example: 'Farmacia Matriz' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string

  @ApiPropertyOptional({ example: 'Almacén principal de medicamentos' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string
}
