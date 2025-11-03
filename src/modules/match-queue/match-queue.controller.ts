import { ActiveUser } from '@/common/decorators/active-user.decorator'
import { I18nLang } from '@/i18n/decorators/i18n-lang.decorator'
import { MessageResDTO } from '@/shared/dtos/response.dto'
import { Controller, Delete, Post } from '@nestjs/common'
import { ZodSerializerDto } from 'nestjs-zod'
import { CreateMatchQueueResDTO } from './dto/match-queue.zod-dto'
import { MatchQueueService } from './match-queue.service'

@Controller('match-queue')
export class MatchQueueController {
  constructor(private readonly matchQueueService: MatchQueueService) {}

  @Post()
  @ZodSerializerDto(CreateMatchQueueResDTO)
  create(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.matchQueueService.create(
      {
        createdById: userId
      },
      lang
    )
  }

  @Delete('user')
  @ZodSerializerDto(MessageResDTO)
  delete(@ActiveUser('userId') userId: number, @I18nLang() lang: string) {
    return this.matchQueueService.delete(
      {
        deletedById: userId
      },
      lang
    )
  }
}
