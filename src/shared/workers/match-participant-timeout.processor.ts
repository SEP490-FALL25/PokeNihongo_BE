import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchStatus, MatchStatusType } from '@/common/constants/match.constant'
import { PrismaService } from '@/shared/services/prisma.service'
import { Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job } from 'bull'
import { MatchingGateway } from 'src/websockets/matching.gateway'

interface MatchParticipantTimeoutJobData {
  matchParticipantId: number
  matchId: number
  userId: number
}

@Processor(BullQueue.MATCH_PARTICIPANT_TIMEOUT)
export class MatchParticipantTimeoutProcessor {
  private readonly logger = new Logger(MatchParticipantTimeoutProcessor.name)

  constructor(
    private readonly prisma: PrismaService,
    private readonly matchingGateway: MatchingGateway
  ) {}

  /**
   * Xử lý timeout cho MatchParticipant acceptance
   * Sau 25s, nếu hasAccepted vẫn null → set thành false
   * Sau đó check cả 2 participants để update Match status
   */
  @Process(BullAction.CHECK_ACCEPTANCE_TIMEOUT)
  async handleAcceptanceTimeout(job: Job<MatchParticipantTimeoutJobData>): Promise<void> {
    const { matchParticipantId, matchId, userId } = job.data

    try {
      this.logger.log(
        `[MatchParticipant Timeout] Processing timeout for participant ${matchParticipantId}, user ${userId}, match ${matchId}`
      )

      await this.prisma.$transaction(async (tx) => {
        // 1. Lấy participant hiện tại
        const participant = await tx.matchParticipant.findUnique({
          where: { id: matchParticipantId, deletedAt: null }
        })

        if (!participant) {
          this.logger.warn(
            `[MatchParticipant Timeout] Participant ${matchParticipantId} not found`
          )
          return
        }

        // 2. Nếu hasAccepted vẫn null, set thành false
        if (participant.hasAccepted === null) {
          await tx.matchParticipant.update({
            where: { id: matchParticipantId },
            data: { hasAccepted: false }
          })

          this.logger.log(
            `[MatchParticipant Timeout] Set hasAccepted = false for participant ${matchParticipantId}`
          )
        }

        // 3. Lấy tất cả participants của match này
        const allParticipants = await tx.matchParticipant.findMany({
          where: { matchId, deletedAt: null }
        })

        // 4. Check nếu tất cả participants đều có hasAccepted !== null
        const allAnswered = allParticipants.every((p) => p.hasAccepted !== null)

        if (!allAnswered) {
          this.logger.debug(
            `[MatchParticipant Timeout] Not all participants answered yet for match ${matchId}`
          )
          return
        }

        // 5. Determine match status based on acceptance
        const allAccepted = allParticipants.every((p) => p.hasAccepted === true)
        const anyRejected = allParticipants.some((p) => p.hasAccepted === false)

        let newStatus: (typeof MatchStatus)[keyof typeof MatchStatus] | null = null

        if (allAccepted) {
          newStatus = MatchStatus.IN_PROGRESS
          this.logger.log(
            `[MatchParticipant Timeout] All participants accepted match ${matchId} → IN_PROGRESS`
          )
        } else if (anyRejected) {
          newStatus = MatchStatus.CANCELLED
          this.logger.log(
            `[MatchParticipant Timeout] At least one participant rejected match ${matchId} → CANCELLED`
          )
        }

        // 6. Update match status
        if (newStatus) {
          await tx.match.update({
            where: { id: matchId },
            data: { status: newStatus as MatchStatusType }
          })

          this.logger.log(
            `[MatchParticipant Timeout] Updated match ${matchId} status to ${newStatus}`
          )

          // 7. Send WebSocket notification to all participants
          const userIds = allParticipants.map((p) => p.userId)
          const message =
            newStatus === MatchStatus.IN_PROGRESS
              ? 'Tất cả đã chấp nhận. Trận đấu bắt đầu!'
              : 'Có người từ chối. Trận đấu đã bị hủy.'

          this.matchingGateway.notifyMatchStatusUpdate(
            userIds,
            matchId,
            newStatus,
            message
          )
        }
      })
    } catch (error) {
      this.logger.error(
        `[MatchParticipant Timeout] Error processing timeout for participant ${matchParticipantId}:`,
        error
      )
      throw error
    }
  }
}
