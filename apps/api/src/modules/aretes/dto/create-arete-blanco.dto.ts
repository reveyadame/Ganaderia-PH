import { IsString, IsArray, IsOptional, MinLength, MaxLength, Matches, ArrayMinSize, ArrayMaxSize } from 'class-validator'
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger'

export class CreateAreteBlancoDto {
  @ApiProperty({ example: 'A-001', description: 'Código único del arete' })
  @IsString()
  @MinLength(1)
  @MaxLength(50)
  codigo!: string
}

export class CreateAretesBlancosLoteDto {
  @ApiProperty({ type: [String], example: ['A-001', 'A-002', 'A-003'] })
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(200)
  @IsString({ each: true })
  codigos!: string[]
}
