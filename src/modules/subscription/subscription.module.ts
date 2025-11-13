import { Module } from '@nestjs/common'
import { LanguagesModule } from '../languages/languages.module'
import { TranslationModule } from '../translation/translation.module'
import { SubscriptionController } from './subscription.controller'
import { SubscriptionRepo } from './subscription.repo'
import { SubscriptionService } from './subscription.service'

@Module({
  imports: [LanguagesModule, TranslationModule],
  controllers: [SubscriptionController],
  providers: [SubscriptionService, SubscriptionRepo],
  exports: [SubscriptionService, SubscriptionRepo]
})
export class SubscriptionModule {}
