import { setGlobalI18nService } from '@/common/pipes/custom-zod-validation.pipe'
import { Global, Module, OnModuleInit } from '@nestjs/common'
import { I18nService } from './i18n.service'

@Global()
@Module({
  providers: [I18nService],
  exports: [I18nService]
})
export class I18nModule implements OnModuleInit {
  constructor(private readonly i18nService: I18nService) {}

  onModuleInit() {
    // Set global I18nService for validation pipe
    setGlobalI18nService(this.i18nService)
  }
}
