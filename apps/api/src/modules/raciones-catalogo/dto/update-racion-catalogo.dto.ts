import { PartialType } from '@nestjs/swagger'
import { CreateRacionCatalogoDto } from './create-racion-catalogo.dto'

export class UpdateRacionCatalogoDto extends PartialType(CreateRacionCatalogoDto) {}
