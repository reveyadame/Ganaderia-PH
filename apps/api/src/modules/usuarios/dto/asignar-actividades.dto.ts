import { IsArray, IsEnum } from 'class-validator'
import { ApiProperty } from '@nestjs/swagger'
import { ActividadUsuario } from '@ganaderia/shared'

export class AsignarActividadesDto {
  @ApiProperty({ enum: ActividadUsuario, isArray: true })
  @IsArray()
  @IsEnum(ActividadUsuario, { each: true })
  actividades!: ActividadUsuario[]
}
