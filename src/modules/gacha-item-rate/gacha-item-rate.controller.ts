import { Controller, Get, Post, Body, Patch, Param, Delete } from '@nestjs/common';
import { GachaItemRateService } from './gacha-item-rate.service';
import { CreateGachaItemRateDto } from './dto/create-gacha-item-rate.dto';
import { UpdateGachaItemRateDto } from './dto/update-gacha-item-rate.dto';

@Controller('gacha-item-rate')
export class GachaItemRateController {
  constructor(private readonly gachaItemRateService: GachaItemRateService) {}

  @Post()
  create(@Body() createGachaItemRateDto: CreateGachaItemRateDto) {
    return this.gachaItemRateService.create(createGachaItemRateDto);
  }

  @Get()
  findAll() {
    return this.gachaItemRateService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.gachaItemRateService.findOne(+id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateGachaItemRateDto: UpdateGachaItemRateDto) {
    return this.gachaItemRateService.update(+id, updateGachaItemRateDto);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.gachaItemRateService.remove(+id);
  }
}
