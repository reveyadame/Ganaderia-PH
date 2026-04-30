import { IsString, IsOptional, MinLength, MaxLength } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateGrupoCorralesDto {
  @ApiProperty({ example: 'Corrales Matriz' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string

  @ApiProperty({ example: 'farmacia-id-aqui' })
  @IsString()
  farmaciaId!: string

  @ApiPropertyOptional({ example: 'Instalaciones principales' })
  @IsOptional()
  @IsString()
  @MaxLength(500)
  descripcion?: string
}
