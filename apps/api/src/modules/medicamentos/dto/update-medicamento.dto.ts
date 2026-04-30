import { PartialType, OmitType } from '@nestjs/swagger'
import { CreateMedicamentoDto } from './create-medicamento.dto'

export class UpdateMedicamentoDto extends PartialType(OmitType(CreateMedicamentoDto, ['farmaciaId'] as const)) {}
