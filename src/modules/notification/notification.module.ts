import { Module } from '@nestjs/common'
import { NotificationController } from './notification.controller'
import { NotificationRepo } from './notification.repo'
import { NotificationService } from './notification.service'

@Module({
  controllers: [NotificationController],
  providers: [NotificationService, NotificationRepo],
  exports: [NotificationService, NotificationRepo]
})
export class NotificationModule {}
