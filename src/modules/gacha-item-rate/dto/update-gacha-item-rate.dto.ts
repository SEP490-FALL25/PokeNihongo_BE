import { PartialType } from '@nestjs/swagger';
import { CreateGachaItemRateDto } from './create-gacha-item-rate.dto';

export class UpdateGachaItemRateDto extends PartialType(CreateGachaItemRateDto) {}
