import { IsString, IsOptional, IsInt, Min, MaxLength, MinLength, Matches } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateCorralDto {
  @ApiProperty({ example: 'C-01' })
  @IsString()
  @MinLength(1)
  @MaxLength(30)
  @Matches(/^[A-Z0-9\-_]+$/, { message: 'El código solo puede contener letras mayúsculas, números, guiones y guiones bajos' })
  codigo!: string

  @ApiProperty({ example: 'Corral 01' })
  @IsString()
  @MinLength(2)
  @MaxLength(100)
  nombre!: string

  @ApiProperty({ example: 'grupo-corrales-id' })
  @IsString()
  grupoCorralesId!: string

  @ApiPropertyOptional({ example: 50 })
  @IsOptional()
  @IsInt()
  @Min(1)
  capacidad?: number
}
