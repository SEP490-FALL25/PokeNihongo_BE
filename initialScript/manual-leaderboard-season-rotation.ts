import { RewardClaimStatus, RewardTarget } from '@/common/constants/reward.constant'
import { LeaderboardSeasonRepo } from '@/modules/leaderboard-season/leaderboard-season.repo'
import { addDaysUTC0000, convertEloToRank } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { Logger } from '@nestjs/common'
import { LeaderboardStatus } from '@prisma/client'

export class ManualLeaderboardSeasonRotation {
  private readonly logger = new Logger(ManualLeaderboardSeasonRotation.name)

  constructor(
    private prisma: PrismaService,
    private leaderboardRepo: LeaderboardSeasonRepo
  ) {}

  async execute(): Promise<void> {
    try {
      this.logger.log('[LeaderboardRotate] Starting manual season rotation...')

      // 1) Find current ACTIVE season
      const activeSeason = await this.prisma.leaderboardSeason.findFirst({
        where: { status: 'ACTIVE', deletedAt: null }
      })

      if (!activeSeason) {
        this.logger.warn('[LeaderboardRotate] No ACTIVE season found to rotate')
        return
      }

      this.logger.log(
        `[LeaderboardRotate] Found ACTIVE season ID=${activeSeason.id}, nameKey=${activeSeason.nameKey}`
      )

      // 2) Check if enablePrecreate is true
      if (!activeSeason.enablePrecreate) {
        this.logger.warn(
          `[LeaderboardRotate] Season ${activeSeason.id} has enablePrecreate=false, skipping clone`
        )
      } else {
        // Clone the current season
        this.logger.log(`[LeaderboardRotate] Cloning season ${activeSeason.id}...`)
        await this.precreateNextSeasonFromTemplate(activeSeason.id)
        this.logger.log(
          `[LeaderboardRotate] Successfully cloned season ${activeSeason.id}`
        )
      }

      // 3) Finalize the current ACTIVE season
      this.logger.log(`[LeaderboardRotate] Finalizing season ${activeSeason.id}...`)
      await this.finalizeSeason(activeSeason.id)
      this.logger.log(
        `[LeaderboardRotate] Successfully finalized season ${activeSeason.id}`
      )

      // 4) Update current season to EXPIRED
      await this.prisma.leaderboardSeason.update({
        where: { id: activeSeason.id },
        data: { status: 'EXPIRED' }
      })
      this.logger.log(`[LeaderboardRotate] Season ${activeSeason.id} marked as EXPIRED`)

      // 5) Find and activate the next PREVIEW season
      const nextSeason = await this.prisma.leaderboardSeason.findFirst({
        where: { status: 'PREVIEW', deletedAt: null },
        orderBy: { startDate: 'asc' }
      })

      if (nextSeason) {
        await this.prisma.leaderboardSeason.update({
          where: { id: nextSeason.id },
          data: { status: 'ACTIVE', hasOpened: true }
        })
        this.logger.log(
          `[LeaderboardRotate] Season ${nextSeason.id} activated successfully, nameKey=${nextSeason.nameKey}`
        )
      } else {
        this.logger.warn('[LeaderboardRotate] No PREVIEW season found to activate')
      }

      this.logger.log('[LeaderboardRotate] Season rotation completed successfully')
    } catch (error) {
      this.logger.error('[LeaderboardRotate] Error during season rotation:', error)
      throw error
    }
  }

  /**
   * Finalize a season: compute final elo/rank, assign rewards, mark claimed, and reset user eloscore.
   */
  private async finalizeSeason(seasonId: number) {
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

    // Load SeasonRankRewards with reward ids for mapping
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

    // Compute finalElo and finalRank from current user eloscore
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

    // Persist finalElo/finalRank on UserSeasonHistory
    await this.prisma.$transaction(
      participants.map((p) =>
        this.prisma.userSeasonHistory.update({
          where: { id: p.ushId },
          data: { finalElo: p.finalElo, finalRank: p.finalRank }
        })
      )
    )

    // Rank within each rank group by elo desc and determine order
    const rankOrderPriority = ['N3', 'N4', 'N5']
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

    // Update USH with seasonRankRewardId and mark rewardsClaimed as CLAIMED
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

    // Reset eloscore for ALL users: new = max(0, old - 1000)
    const allUsers = await this.prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, eloscore: true }
    })

    this.logger.log(
      `[FinalizeSeason] Resetting elo for ${allUsers.length} total users (${participants.length} were participants)`
    )

    const userUpdateTx = allUsers.map((u) => {
      const current = u.eloscore || 0
      const next = Math.max(0, current - 1000)
      return this.prisma.user.update({ where: { id: u.id }, data: { eloscore: next } })
    })
    await this.prisma.$transaction(userUpdateTx)

    this.logger.log(`[FinalizeSeason] Season ${seasonId} finalized successfully`)
  }

  /**
   * Create the next season in PREVIEW based on template (current season)
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

    if (!template.startDate || !template.endDate) {
      this.logger.warn(
        `[PrecreateNext] Template season ${templateSeasonId} missing dates, skip`
      )
      return
    }

    // Compute next season dates based on current season duration
    const durationMs = template.endDate.getTime() - template.startDate.getTime()
    const durationDays = Math.max(1, Math.round(durationMs / (24 * 60 * 60 * 1000)))

    const newStartDate = template.endDate
    const newEndDate = addDaysUTC0000(template.endDate, durationDays)

    // Avoid duplicate by checking same newStartDate already exists
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
          status: 'PREVIEW' as LeaderboardStatus,
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

      // Clone SeasonRankRewards from template
      for (const item of template.seasonRankRewards) {
        let rewardIds: number[] = []
        if (!template.isRandomItemAgain) {
          rewardIds = (item.rewards || []).map((r) => r.id)
        } else {
          const count = Math.max(1, (item.rewards || []).length || 1)
          if (rewardPool.length > 0) {
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
        `[PrecreateNext] Created next season ${created.id} with ${template.seasonRankRewards.length} SeasonRankRewards from template ${template.id} (${finalNameKey})`
      )
    })
  }
}
