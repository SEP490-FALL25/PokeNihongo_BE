import { RewardClaimStatus, RewardTarget } from '@/common/constants/reward.constant'
import { LeaderboardSeasonRepo } from '@/modules/leaderboard-season/leaderboard-season.repo'
import { addDaysUTC0000, convertEloToRank, todayUTCWith0000 } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { Injectable, Logger } from '@nestjs/common'
import { Cron, CronExpression } from '@nestjs/schedule'
import { LeaderboardStatus } from '@prisma/client'

@Injectable()
export class HandleLeaderboardSeasonCronjob {
  private readonly logger = new Logger(HandleLeaderboardSeasonCronjob.name)
  constructor(
    private prisma: PrismaService,
    private leaderboardRepo: LeaderboardSeasonRepo
  ) {}

  // Run daily at 00:00 UTC to expire/activate seasons
  @Cron(CronExpression.EVERY_10_SECONDS, { timeZone: 'UTC' })
  async handleLeaderboardSeasonStatus() {
    const now = todayUTCWith0000()
    this.logger.log(`[LeaderboardSeason Cron] Running at ${now.toISOString()}`)

    try {
      // 1) Find ACTIVE seasons that ended before today and finalize them
      const seasonsToExpire = await this.prisma.leaderboardSeason.findMany({
        where: { status: 'ACTIVE', endDate: { lt: now }, deletedAt: null },
        select: { id: true }
      })
      this.logger.log(
        `[LeaderboardSeason Cron] Found ${seasonsToExpire.length} season(s) to finalize`
      )

      for (const s of seasonsToExpire) {
        try {
          await this.finalizeSeason(s.id)
          // Precreate the next season right after finalizing this one
          await this.precreateNextSeasonFromTemplate(s.id)
          await this.prisma.leaderboardSeason.update({
            where: { id: s.id },
            data: { status: 'EXPIRED' }
          })
          this.logger.log(`[LeaderboardSeason Cron] Finalized and expired season ${s.id}`)
        } catch (err) {
          this.logger.error(
            `[LeaderboardSeason Cron] Error finalizing season ${s.id}:`,
            err
          )
        }
      }

      // 2) Find PREVIEW seasons valid for today
      // Query all PREVIEW seasons and filter in code (simpler than complex Prisma OR with nulls)
      const allPreview = await this.prisma.leaderboardSeason.findMany({
        where: {
          status: 'PREVIEW',
          deletedAt: null
        }
      })

      // Filter: (startDate null OR startDate <= now) AND (endDate null OR endDate >= now)
      const candidatesRaw = allPreview.filter((s) => {
        const startOk = s.startDate === null || s.startDate <= now
        const endOk = s.endDate === null || s.endDate >= now
        return startOk && endOk
      })

      // Sort manually: startDate asc (nulls last)
      const candidates = candidatesRaw.sort((a, b) => {
        if (a.startDate === null && b.startDate === null) return 0
        if (a.startDate === null) return 1 // nulls last
        if (b.startDate === null) return -1
        return a.startDate.getTime() - b.startDate.getTime()
      })

      if (candidates.length > 0) {
        const activeCount = await this.prisma.leaderboardSeason.count({
          where: { status: 'ACTIVE', deletedAt: null }
        })
        if (activeCount === 0) {
          const toActivate = candidates[0]
          await this.prisma.leaderboardSeason.update({
            where: { id: toActivate.id },
            data: { status: 'ACTIVE', hasOpened: true }
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
  @Cron(CronExpression.EVERY_5_SECONDS)
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

  /**
   * Finalize a season: compute final elo/rank, assign rewards, mark claimed, and reset user eloscore.
   * Steps:
   * - Load season details (userHistories, seasonRankRewards)
   * - Compute finalElo/finalRank from current user eloscore
   * - Rank within each rankName by elo desc to get per-rank order
   * - Map (rankName, order) -> SeasonRankReward (and its reward ids)
   * - Update UserSeasonHistory: finalElo, finalRank, seasonRankRewardId, rewardsClaimed=CLAIMED
   * - Reset each participant user's eloscore = max(0, eloscore - 1000)
   */
  private async finalizeSeason(seasonId: number) {
    // 1) Get season details via repo (userHistories + bare seasonRankRewards)
    const season = await this.leaderboardRepo.findWithDetailsWithoutLang(seasonId)
    if (!season) {
      this.logger.warn(`[FinalizeSeason] Season ${seasonId} not found or deleted`)
      return
    }

    const userHistories = season.userHistories || []
    if (userHistories.length === 0) {
      this.logger.log(`[FinalizeSeason] Season ${seasonId} has no participants`)
      return
    }

    // 2) Load SeasonRankRewards with reward ids for mapping
    const srrList = await this.prisma.seasonRankReward.findMany({
      where: { seasonId, deletedAt: null },
      include: { rewards: { select: { id: true } } }
    })

    // Separate null-order rewards (for all users) from ranked rewards
    const commonRewards = srrList.filter((srr) => srr.order === null)
    const rankedRewards = srrList.filter((srr) => srr.order !== null)

    // Build map: rankName->order->SeasonRankReward (only for ranked rewards)
    const rewardMap = new Map<string, Map<number, { id: number; rewardIds: number[] }>>()
    for (const srr of rankedRewards) {
      if (!rewardMap.has(srr.rankName)) rewardMap.set(srr.rankName, new Map())
      rewardMap
        .get(srr.rankName)!
        .set(srr.order!, { id: srr.id, rewardIds: (srr.rewards || []).map((r) => r.id) })
    }

    // 3) Compute finalElo and finalRank from current user eloscore
    type Participant = {
      ushId: number
      userId: number
      finalElo: number
      finalRank: string
    }
    const participants: Participant[] = userHistories.map((uh: any) => {
      const elo = (uh.user?.eloscore as number) || 0
      const rank = convertEloToRank(elo)
      return { ushId: uh.id, userId: uh.userId, finalElo: elo, finalRank: rank }
    })

    // 4) Persist finalElo/finalRank on UserSeasonHistory
    await this.prisma.$transaction(
      participants.map((p) =>
        this.prisma.userSeasonHistory.update({
          where: { id: p.ushId },
          data: { finalElo: p.finalElo, finalRank: p.finalRank }
        })
      )
    )

    // 5) Rank within each rank group by elo desc and determine order
    const rankOrderPriority = ['N3', 'N4', 'N5'] // Highest rank first
    const grouped: Record<string, Participant[]> = {}
    for (const p of participants) {
      grouped[p.finalRank] = grouped[p.finalRank] || []
      grouped[p.finalRank].push(p)
    }
    const rankAssignments: Array<{
      ushId: number
      userId: number
      rankName: string
      order: number
      seasonRankRewardId?: number
      rewardIds?: number[]
    }> = []

    for (const rankName of rankOrderPriority) {
      const list = (grouped[rankName] || []).sort((a, b) => b.finalElo - a.finalElo)
      let order = 1
      for (const p of list) {
        const found = rewardMap.get(rankName)?.get(order)
        // Collect rewards from ranked position + common rewards for all
        const allRewardIds = [
          ...(found?.rewardIds || []),
          ...commonRewards.flatMap((cr) => (cr.rewards || []).map((r) => r.id))
        ]
        rankAssignments.push({
          ushId: p.ushId,
          userId: p.userId,
          rankName,
          order,
          seasonRankRewardId: found?.id,
          rewardIds: allRewardIds
        })
        order += 1
      }
    }

    // 6) Update USH with seasonRankRewardId and mark rewardsClaimed as CLAIMED
    const ushUpdates = rankAssignments.map((ra) =>
      this.prisma.userSeasonHistory.update({
        where: { id: ra.ushId },
        data: {
          seasonRankRewardId: ra.seasonRankRewardId ?? null,
          rewardsClaimed: RewardClaimStatus.CLAIMED
        }
      })
    )
    await this.prisma.$transaction(ushUpdates)

    // Note: We only link to SeasonRankReward and mark CLAIMED. Actual delivery of rewards
    // (EXP/Coins/Sparkles/Pokemon) can be handled elsewhere by a worker if needed.

    // 7) Reset user eloscore: new = max(0, old - 1000)
    const uniqueUserIds = Array.from(new Set(participants.map((p) => p.userId)))
    const userRows = await this.prisma.user.findMany({
      where: { id: { in: uniqueUserIds } },
      select: { id: true, eloscore: true }
    })

    const userUpdateTx = userRows.map((u) => {
      const current = u.eloscore || 0
      const next = Math.max(0, current - 1000)
      return this.prisma.user.update({ where: { id: u.id }, data: { eloscore: next } })
    })
    await this.prisma.$transaction(userUpdateTx)

    this.logger.log(
      `[FinalizeSeason] Season ${seasonId} finalized: participants=${participants.length}, rewardsAssigned=${rankAssignments.filter((a) => a.seasonRankRewardId).length}`
    )
  }

  /**
   * Create the next season in PREVIEW based on a template (the just-finalized season).
   * - Dates: start = template.endDate, end = start + duration(template)
   * - Copy translations and config flags
   * - SeasonRankRewards:
   *   - if isRandomItemAgain=false: clone previous rewards
   *   - if true: re-randomize rewards from pool (EXP, SPARKLES) keeping same structure counts
   */
  private async precreateNextSeasonFromTemplate(templateSeasonId: number) {
    const template = await this.prisma.leaderboardSeason.findUnique({
      where: { id: templateSeasonId, deletedAt: null },
      include: {
        nameTranslations: true,
        seasonRankRewards: { include: { rewards: { select: { id: true } } } }
      }
    })
    if (!template) return

    if (!template.enablePrecreate) {
      this.logger.debug(
        `[PrecreateNext] Template season ${templateSeasonId} has enablePrecreate=false, skip`
      )
      return
    }

    if (!template.startDate || !template.endDate) {
      this.logger.warn(
        `[PrecreateNext] Template season ${templateSeasonId} missing dates, skip`
      )
      return
    }

    // Avoid duplicate by checking same newStartDate already exists
    const durationMs = template.endDate.getTime() - template.startDate.getTime()
    const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)))

    const newStartDate = template.endDate
    const newEndDate = addDaysUTC0000(template.endDate, durationDays)

    const exists = await this.prisma.leaderboardSeason.findFirst({
      where: { startDate: newStartDate, status: 'PREVIEW', deletedAt: null }
    })
    if (exists) {
      this.logger.log(
        `[PrecreateNext] Already has PREVIEW season starting ${newStartDate.toISOString()} (id=${exists.id}), skip`
      )
      return
    }

    // Prepare reward pool if randomization is needed
    let rewardPool: { id: number }[] = []
    if (template.isRandomItemAgain) {
      rewardPool = await this.prisma.reward.findMany({
        where: {
          deletedAt: null,
          rewardTarget: { in: [RewardTarget.EXP as any, RewardTarget.SPARKLES as any] }
        },
        select: { id: true }
      })
    }

    // Transaction: create season, set nameKey + translations, create seasonRankRewards
    await this.prisma.$transaction(async (tx) => {
      const timestamp = Date.now()
      const created = await tx.leaderboardSeason.create({
        data: {
          nameKey: `leaderboardSeason.name.temp.${timestamp}`,
          startDate: newStartDate,
          endDate: newEndDate,
          status: 'PREVIEW' as any,
          enablePrecreate: template.enablePrecreate,
          precreateBeforeEndDays: template.precreateBeforeEndDays,
          isRandomItemAgain: template.isRandomItemAgain,
          createdById: template.createdById ?? undefined
        }
      })

      const finalNameKey = `leaderboardSeason.name.${created.id}`
      const upserts = template.nameTranslations.map((t) => ({
        where: { languageId_key: { languageId: t.languageId, key: finalNameKey } },
        update: { value: t.value },
        create: { languageId: t.languageId, key: finalNameKey, value: t.value }
      }))

      await tx.leaderboardSeason.update({
        where: { id: created.id },
        data: {
          nameKey: finalNameKey,
          ...(upserts.length ? { nameTranslations: { upsert: upserts as any } } : {})
        }
      })

      // Create SeasonRankRewards for new season
      for (const item of template.seasonRankRewards) {
        // Decide reward ids to connect
        let rewardIds: number[] = []
        if (!template.isRandomItemAgain) {
          rewardIds = (item.rewards || []).map((r) => r.id)
        } else {
          // Random pick based on previous count; ensure at least 1 if pool not empty
          const count = Math.max(1, (item.rewards || []).length || 1)
          if (rewardPool.length > 0) {
            // sample without replacement up to pool size
            const shuffled = [...rewardPool].sort(() => Math.random() - 0.5)
            rewardIds = shuffled
              .slice(0, Math.min(count, shuffled.length))
              .map((r) => r.id)
          } else {
            rewardIds = []
          }
        }

        await tx.seasonRankReward.create({
          data: {
            seasonId: created.id,
            rankName: item.rankName as any,
            order: item.order,
            ...(rewardIds.length
              ? { rewards: { connect: rewardIds.map((rid) => ({ id: rid })) } }
              : {})
          }
        })
      }

      this.logger.log(
        `[PrecreateNext] Created next season ${created.id} from template ${template.id} (${finalNameKey})`
      )
    })
  }
}
