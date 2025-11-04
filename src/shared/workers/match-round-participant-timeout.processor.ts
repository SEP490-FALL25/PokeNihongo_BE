import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchRoundNumber, RoundStatus } from '@/common/constants/match.constant'
import { addTimeUTC } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { InjectQueue, Process, Processor } from '@nestjs/bull'
import { Logger } from '@nestjs/common'
import { Job, Queue } from 'bull'

@Processor(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
export class MatchRoundParticipantTimeoutProcessor {
  private readonly logger = new Logger(MatchRoundParticipantTimeoutProcessor.name)

  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue
  ) {}

  @Process(BullAction.CHECK_POKEMON_SELECTION_TIMEOUT)
  async handlePokemonSelectionTimeout(
    job: Job<{ matchRoundParticipantId: number }>
  ): Promise<void> {
    const { matchRoundParticipantId } = job.data

    this.logger.log(
      `Processing Pokemon selection timeout for match-round-participant: ${matchRoundParticipantId}`
    )

    try {
      // Lấy thông tin match-round-participant hiện tại
      const currentParticipant =
        await this.prismaService.matchRoundParticipant.findUnique({
          where: { id: matchRoundParticipantId },
          include: {
            matchRound: {
              include: {
                participants: {
                  orderBy: {
                    orderSelected: 'asc'
                  }
                }
              }
            }
          }
        })

      if (!currentParticipant) {
        this.logger.warn(`Match-round-participant ${matchRoundParticipantId} not found`)
        return
      }

      // Kiểm tra xem đã chọn Pokemon chưa
      if (currentParticipant.selectedUserPokemonId !== null) {
        // Đã chọn rồi, có thể user đã chọn trước khi timeout
        // Vẫn cần kiểm tra xem có cần chuyển sang participant tiếp theo không
        this.logger.log(
          `Match-round-participant ${matchRoundParticipantId} already selected Pokemon, checking next participant`
        )
      } else {
        // Chưa chọn Pokemon trong thời gian cho phép
        // TODO: Random chọn 1 Pokemon cho user (nếu cần)
        this.logger.warn(
          `Match-round-participant ${matchRoundParticipantId} timeout without selecting Pokemon`
        )
      }

      // Tìm participant tiếp theo (order cao hơn)
      const nextParticipant = currentParticipant.matchRound.participants.find(
        (p) => p.orderSelected > currentParticipant.orderSelected
      )

      if (nextParticipant) {
        // Set time cho participant tiếp theo
        await this.prismaService.matchRoundParticipant.update({
          where: { id: nextParticipant.id },
          data: {
            endTimeSelected: addTimeUTC(new Date(), 30000) // 30 seconds
          }
        })

        // Tạo Bull job cho participant tiếp theo
        await this.matchRoundParticipantTimeoutQueue.add(
          BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
          {
            matchRoundParticipantId: nextParticipant.id
          },
          {
            delay: 30000 // 30 seconds
          }
        )

        this.logger.log(
          `Set endTimeSelected and Bull job for next participant: ${nextParticipant.id}`
        )
      } else {
        // Không còn participant nào trong round này
        // Round này đã hoàn thành (tất cả participant đã có lượt)
        this.logger.log(
          `No next participant found - Round ${currentParticipant.matchRound.roundNumber} completed for match ${currentParticipant.matchRound.matchId}`
        )

        // Chuyển sang round tiếp theo
        await this.moveToNextRound(currentParticipant.matchRound)
      }
    } catch (error) {
      this.logger.error(
        `Error processing Pokemon selection timeout for match-round-participant ${matchRoundParticipantId}`,
        error
      )
      throw error
    }
  }

  /**
   * Chuyển sang round tiếp theo khi round hiện tại đã hoàn thành
   */
  private async moveToNextRound(currentMatchRound: any): Promise<void> {
    try {
      // Cập nhật status của round hiện tại thành PENDING
      await this.prismaService.matchRound.update({
        where: { id: currentMatchRound.id },
        data: {
          status: RoundStatus.PENDING
        }
      })

      const nextRoundMap = {
        [MatchRoundNumber.ONE]: MatchRoundNumber.TWO,
        [MatchRoundNumber.TWO]: MatchRoundNumber.THREE,
        [MatchRoundNumber.THREE]: null
      }

      const nextRoundNumber = nextRoundMap[currentMatchRound.roundNumber]

      if (!nextRoundNumber) {
        this.logger.log(
          `Match ${currentMatchRound.matchId} has completed all rounds (Round THREE finished)`
        )
        return
      }

      // Tìm round tiếp theo
      const nextRound = await this.prismaService.matchRound.findFirst({
        where: {
          matchId: currentMatchRound.matchId,
          roundNumber: nextRoundNumber,
          deletedAt: null
        },
        include: {
          participants: {
            orderBy: {
              orderSelected: 'asc'
            }
          }
        }
      })

      if (!nextRound) {
        this.logger.warn(
          `Next round ${nextRoundNumber} not found for match ${currentMatchRound.matchId}`
        )
        return
      }

      // Lấy participant đầu tiên của round tiếp theo
      const firstParticipant = nextRound.participants[0]

      if (firstParticipant) {
        // Set endTimeSelected
        await this.prismaService.matchRoundParticipant.update({
          where: { id: firstParticipant.id },
          data: {
            endTimeSelected: addTimeUTC(new Date(), 30000) // 30 seconds
          }
        })

        // Tạo Bull job
        await this.matchRoundParticipantTimeoutQueue.add(
          BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
          {
            matchRoundParticipantId: firstParticipant.id
          },
          {
            delay: 30000 // 30 seconds
          }
        )

        this.logger.log(
          `Moved to round ${nextRoundNumber} - Set endTime and Bull job for participant ${firstParticipant.id}`
        )
      }
    } catch (error) {
      this.logger.error(
        `Error moving to next round for match ${currentMatchRound.matchId}`,
        error
      )
    }
  }
}
