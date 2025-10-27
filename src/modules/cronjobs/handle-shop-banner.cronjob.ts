import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { PrismaService } from 'src/shared/services/prisma.service'

@Injectable()
export class HandleShopBannerCronjob {
  private readonly logger = new Logger(HandleShopBannerCronjob.name)
  constructor(private prismaService: PrismaService) {}

  @Cron(CronExpression.EVERY_1ST_DAY_OF_MONTH_AT_MIDNIGHT)
  async handleCron() {
    const refreshTokens = await this.prismaService.refreshToken.deleteMany({
      where: {
        expiresAt: {
          lt: new Date()
        }
      }
    })
    this.logger.debug(`Removed ${refreshTokens.count} expired refresh tokens!.`)
  }
}
