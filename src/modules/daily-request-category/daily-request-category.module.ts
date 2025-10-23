import { Module } from '@nestjs/common'
import { DailyRequestModule } from '../daily-request/daily-request.module'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { DailyRequestCategoryController } from './daily-request-category.controller'
import { DailyRequestCategoryRepo } from './daily-request-category.repo'
import { DailyRequestCategoryService } from './daily-request-category.service'

@Module({
  imports: [LanguagesModule, TranslationModule, DailyRequestModule],
  controllers: [DailyRequestCategoryController],
  providers: [DailyRequestCategoryService, DailyRequestCategoryRepo]
})
export class DailyRequestCategoryModule {}
