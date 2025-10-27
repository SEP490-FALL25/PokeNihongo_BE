import { Injectable } from '@nestjs/common';
import { CreateGachaItemRateDto } from './dto/create-gacha-item-rate.dto';
import { UpdateGachaItemRateDto } from './dto/update-gacha-item-rate.dto';

@Injectable()
export class GachaItemRateService {
  create(createGachaItemRateDto: CreateGachaItemRateDto) {
    return 'This action adds a new gachaItemRate';
  }

  findAll() {
    return `This action returns all gachaItemRate`;
  }

  findOne(id: number) {
    return `This action returns a #${id} gachaItemRate`;
  }

  update(id: number, updateGachaItemRateDto: UpdateGachaItemRateDto) {
    return `This action updates a #${id} gachaItemRate`;
  }

  remove(id: number) {
    return `This action removes a #${id} gachaItemRate`;
  }
}
