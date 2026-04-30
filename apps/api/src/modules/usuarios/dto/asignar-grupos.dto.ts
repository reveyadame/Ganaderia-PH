import { IsArray, IsString } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'

export class AsignarGruposDto {
  @ApiProperty({ type: [String] })
  @IsArray()
  @IsString({ each: true })
  gruposCorralesIds!: string[]
}
