import { addDaysUTC0000, todayUTCWith0000 } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { LeaderboardStatus } from '@prisma/client'

@Injectable()
export class HandleLeaderboardSeasonCronjob {
  private readonly logger = new Logger(HandleLeaderboardSeasonCronjob.name)
  constructor(private prisma: PrismaService) {}

  // Run daily at 00:00 UTC to expire/activate seasons
  @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
  async handleLeaderboardSeasonStatus() {
    const now = todayUTCWith0000()
    this.logger.log(`[LeaderboardSeason Cron] Running at ${now.toISOString()}`)

    try {
      // 1) Expire active seasons that ended before today
      const expired = await this.prisma.leaderboardSeason.updateMany({
        where: { status: 'ACTIVE', endDate: { lt: now }, deletedAt: null },
        data: { status: 'EXPIRED' }
      })
      this.logger.log(`[LeaderboardSeason Cron] Expired ${expired.count} active seasons`)

      // 2) Find PREVIEW seasons valid for today
      const candidates = await this.prisma.leaderboardSeason.findMany({
        where: {
          status: 'PREVIEW',
          deletedAt: null,
          AND: [
            { OR: [{ startDate: null as any }, { startDate: { lte: now } }] },
            { OR: [{ endDate: null as any }, { endDate: { gte: now } }] }
          ]
        },
        orderBy: { startDate: 'asc' }
      })

      if (candidates.length > 0) {
        const activeCount = await this.prisma.leaderboardSeason.count({
          where: { status: 'ACTIVE', deletedAt: null }
        })
        if (activeCount === 0) {
          const toActivate = candidates[0]
          await this.prisma.leaderboardSeason.update({
            where: { id: toActivate.id },
            data: { status: 'ACTIVE' }
          })
          this.logger.log(
            `[LeaderboardSeason Cron] Activated season ID=${toActivate.id}, nameKey=${toActivate.nameKey}`
          )
        } else {
          this.logger.log(
            `[LeaderboardSeason Cron] Skipped activation; already has ACTIVE season (count=${activeCount})`
          )
        }
      } else {
        this.logger.log('[LeaderboardSeason Cron] No PREVIEW season eligible to activate')
      }

      this.logger.log('[LeaderboardSeason Cron] Completed successfully')
    } catch (error) {
      this.logger.error('[LeaderboardSeason Cron] Error:', error)
      throw error
    }
  }

  // Run daily at 01:00 UTC to precreate next season if enabled
  @Cron(CronExpression.EVERY_DAY_AT_1AM)
  async handlePrecreateNextSeason() {
    const now = todayUTCWith0000()
    this.logger.log(`[LeaderboardSeason Precreate] Running at ${now.toISOString()}`)

    try {
      const activeSeasons = await this.prisma.leaderboardSeason.findMany({
        where: { status: 'ACTIVE', enablePrecreate: true, deletedAt: null },
        include: { nameTranslations: true }
      })

      for (const season of activeSeasons) {
        try {
          if (!season.endDate) {
            this.logger.warn(
              `[LeaderboardSeason Precreate] Season ${season.id} has no endDate, skipping`
            )
            continue
          }

          const triggerDate = addDaysUTC0000(
            season.endDate,
            -season.precreateBeforeEndDays
          )
          if (now < triggerDate) {
            this.logger.debug(
              `[LeaderboardSeason Precreate] Season ${season.id} not yet ready (trigger: ${triggerDate.toISOString()})`
            )
            continue
          }

          // Avoid duplicate precreate by checking a nameKey with ".next" prefix
          const nextKeyPrefix = `${season.nameKey}.next`
          const existingNext = await this.prisma.leaderboardSeason.findFirst({
            where: { nameKey: { startsWith: nextKeyPrefix }, deletedAt: null }
          })
          if (existingNext) {
            this.logger.log(
              `[LeaderboardSeason Precreate] Season ${season.id} already has next (${existingNext.id}), skipping`
            )
            continue
          }

          // Compute next season dates based on current season duration
          const durationMs = season.endDate.getTime() - season.startDate.getTime()
          const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)))

          const newStartDate = season.endDate
          const newEndDate = addDaysUTC0000(season.endDate, durationDays)
          const timestamp = Date.now()

          // Create new season in PREVIEW
          const created = await this.prisma.leaderboardSeason.create({
            data: {
              nameKey: `leaderboardSeason.name.temp.${timestamp}`,
              startDate: newStartDate,
              endDate: newEndDate,
              status: 'PREVIEW' as LeaderboardStatus,
              enablePrecreate: season.enablePrecreate,
              precreateBeforeEndDays: season.precreateBeforeEndDays,
              isRandomItemAgain: season.isRandomItemAgain,
              createdById: season.createdById ?? undefined
            }
          })

          const finalNameKey = `leaderboardSeason.name.${created.id}`
          const upserts = season.nameTranslations.map((t) => ({
            where: { languageId_key: { languageId: t.languageId, key: finalNameKey } },
            update: { value: t.value },
            create: { languageId: t.languageId, key: finalNameKey, value: t.value }
          }))

          await this.prisma.leaderboardSeason.update({
            where: { id: created.id },
            data: {
              nameKey: finalNameKey,
              ...(upserts.length ? { nameTranslations: { upsert: upserts as any } } : {})
            }
          })

          // Disable precreate on current season to avoid multiple next creations
          await this.prisma.leaderboardSeason.update({
            where: { id: season.id },
            data: { enablePrecreate: false, precreateBeforeEndDays: 999 }
          })

          this.logger.log(
            `[LeaderboardSeason Precreate] Created next season ${created.id} (${finalNameKey}) and disabled precreate on current ${season.id}`
          )
        } catch (err) {
          this.logger.error(
            `[LeaderboardSeason Precreate] Error creating next season for ${season.id}:`,
            err
          )
        }
      }

      this.logger.log('[LeaderboardSeason Precreate] Completed')
    } catch (error) {
      this.logger.error('[LeaderboardSeason Precreate] Error:', error)
      throw error
    }
  }
}
