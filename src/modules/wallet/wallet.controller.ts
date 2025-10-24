import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { IsPublic } from '@/common/decorators/auth.decorator'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { PaginationQueryDTO } from '@/shared/dtos/request.dto'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { PaginationResponseSchema } from '@/shared/models/response.model'
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  UseGuards
} from '@nestjs/common'
import { ApiBearerAuth } from '@nestjs/swagger'
import { ZodSerializerDto } from 'nestjs-zod'
import {
  CreatedWalletBodyDTO,
  CreateWalletResDTO,
  GetWalletDetailResDTO,
  GetWalletParamsDTO,
  UpdateWalletBodyDTO,
  UpdateWalletResDTO
} from './dto/walletzod-dto'
import { WalletService } from './wallet.service'

@Controller('wallet')
@UseGuards(AuthenticationGuard)
@ApiBearerAuth()
export class WalletController {
  constructor(private readonly walletService: WalletService) {}

  @Get()
  @IsPublic()
  @ZodSerializerDto(PaginationResponseSchema)
  list(@Query() query: PaginationQueryDTO, @I18nLang() lang: string) {
    return this.walletService.list(query, lang)
  }

  @Get(':walletId')
  @IsPublic()
  @ZodSerializerDto(GetWalletDetailResDTO)
  findById(@Param() params: GetWalletParamsDTO, @I18nLang() lang: string) {
    return this.walletService.findById(params.walletId, lang)
  }

  @Post()
  @ZodSerializerDto(CreateWalletResDTO)
  create(
    @Body() body: CreatedWalletBodyDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.walletService.create(
      {
        data: body,
        createdById: userId
      },
      lang
    )
  }

  @Put(':walletId')
  @ZodSerializerDto(UpdateWalletResDTO)
  update(
    @Body() body: UpdateWalletBodyDTO,
    @Param() params: GetWalletParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.walletService.update(
      {
        data: body,
        id: params.walletId,
        updatedById: userId
      },
      lang
    )
  }

  @Delete(':walletId')
  @ZodSerializerDto(MessageResDTO)
  delete(
    @Param() params: GetWalletParamsDTO,
    @ActiveUser('userId') userId: number,
    @I18nLang() lang: string
  ) {
    return this.walletService.delete(
      {
        id: params.walletId,
        deletedById: userId
      },
      lang
    )
  }
}
