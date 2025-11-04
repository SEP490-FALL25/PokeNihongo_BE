import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchRoundNumber, RoundStatus } from '@/common/constants/match.constant'
import { I18nService } from '@/i18n/i18n.service'
import { MatchRoundParticipantMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { InjectQueue } from '@nestjs/bull'
import { Injectable, Logger } from '@nestjs/common'
import { Queue } from 'bull'
import { PrismaService } from 'src/shared/services/prisma.service'
import { MatchingGateway } from 'src/websockets/matching.gateway'
import { MatchRoundRepo } from '../match-round/match-round.repo'
import { MatchRepo } from '../match/match.repo'
import { MatchRoundParticipantNotFoundException } from './dto/match-round-participant.error'
import {
  CreateMatchRoundParticipantBodyType,
  UpdateMatchRoundParticipantBodyType
} from './entities/match-round-participant.entity'
import { MatchRoundParticipantRepo } from './match-round-participant.repo'

@Injectable()
export class MatchRoundParticipantService {
  private readonly logger = new Logger(MatchRoundParticipantService.name)

  constructor(
    private matchRoundParticipantRepo: MatchRoundParticipantRepo,
    private readonly matchRepo: MatchRepo,
    private readonly matchRoundRepo: MatchRoundRepo,
    private readonly i18nService: I18nService,
    private readonly prismaService: PrismaService,
    private readonly matchingGateway: MatchingGateway,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.matchRoundParticipantRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const matchRoundParticipant = await this.matchRoundParticipantRepo.findById(id)
    if (!matchRoundParticipant) {
      throw new MatchRoundParticipantNotFoundException()
    }

    return {
      statusCode: 200,
      data: matchRoundParticipant,
      message: this.i18nService.translate(
        MatchRoundParticipantMessage.GET_LIST_SUCCESS,
        lang
      )
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateMatchRoundParticipantBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.matchRoundParticipantRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.CREATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async update(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: UpdateMatchRoundParticipantBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      //check coi thang user nay co pity nao dang pending ko, co thi ko dc tao them
      const existingPity = await this.matchRoundParticipantRepo.findById(id)
      if (!existingPity) {
        throw new MatchRoundParticipantNotFoundException()
      }

      const matchRoundParticipant = await this.matchRoundParticipantRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: matchRoundParticipant,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async choosePokemonWithRound(
    {
      matchRoundId,
      userId,
      data
    }: {
      matchRoundId: number
      userId: number
      data: UpdateMatchRoundParticipantBodyType
    },
    lang: string = 'vi'
  ) {
    try {
      // Dựa vào matchRoundId lấy ra match-round kèm match và participants
      const existMatchRound =
        await this.matchRoundRepo.findByIdWithMatchAndParticipants(matchRoundId)
      if (!existMatchRound) {
        throw new MatchRoundParticipantNotFoundException()
      }

      // Tìm match-participant phù hợp với userId trong match
      const matchParticipant = existMatchRound.match.participants.find(
        (p) => p.userId === userId
      )
      if (!matchParticipant) {
        throw new NotFoundRecordException()
      }

      // Tìm match-round-participant tương ứng
      const existMatchRoundParticipant =
        await this.matchRoundParticipantRepo.findByMatchRoundIdAndUserId(
          matchRoundId,
          userId
        )
      if (!existMatchRoundParticipant) {
        throw new MatchRoundParticipantNotFoundException()
      }

      // Xóa Bull job của participant hiện tại
      const jobs = await this.matchRoundParticipantTimeoutQueue.getJobs([
        'waiting',
        'delayed'
      ])
      for (const job of jobs) {
        if (job.data.matchRoundParticipantId === existMatchRoundParticipant.id) {
          await job.remove()
        }
      }

      // Update selectedUserPokemonId
      const matchRoundParticipant = await this.matchRoundParticipantRepo.update({
        id: existMatchRoundParticipant.id,
        data: data,
        updatedById: userId
      })

      // Fetch đầy đủ dữ liệu match-round với participants và user info để gửi socket
      const fullMatchRound: any = await this.prismaService.matchRound.findUnique({
        where: { id: matchRoundId },
        include: {
          participants: {
            include: {
              matchParticipant: {
                include: {
                  user: true
                }
              },
              selectedUserPokemon: {
                include: {
                  pokemon: true
                }
              }
            }
          }
        }
      })

      if (!fullMatchRound) {
        throw new Error('Match round not found')
      }

      // Tìm participant và opponent
      const participant = fullMatchRound.participants.find(
        (p) => p.matchParticipant.userId === userId
      )
      const opponent = fullMatchRound.participants.find(
        (p) => p.matchParticipant.userId !== userId
      )

      // Gửi socket notification
      this.matchingGateway.notifyPokemonSelected(
        matchRoundId,
        fullMatchRound,
        participant,
        opponent
      )

      // Tìm participant tiếp theo (order cao hơn)
      const allParticipants = existMatchRound.participants.sort(
        (a, b) => a.orderSelected - b.orderSelected
      )
      const currentIndex = allParticipants.findIndex(
        (p) => p.id === existMatchRoundParticipant.id
      )

      // Update participant hiện tại trong memory với selectedUserPokemonId mới
      if (data.selectedUserPokemonId) {
        allParticipants[currentIndex].selectedUserPokemonId = data.selectedUserPokemonId
      }

      const nextParticipant = allParticipants[currentIndex + 1]

      if (nextParticipant) {
        // Set time cho participant tiếp theo
        await this.matchRoundParticipantRepo.update({
          id: nextParticipant.id,
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
      } else {
        // Không còn participant nào trong round này
        // Kiểm tra xem tất cả participants đã chọn Pokemon chưa
        const allSelected = allParticipants.every((p) => p.selectedUserPokemonId !== null)

        if (allSelected) {
          // Tất cả đã chọn → tìm round tiếp theo và set endTime cho người đầu tiên
          await this.moveToNextRound(existMatchRound)
        }
      }

      return {
        statusCode: 200,
        data: matchRoundParticipant,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.UPDATE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existMatchRoundParticipant = await this.matchRoundParticipantRepo.findById(id)
      if (!existMatchRoundParticipant) {
        throw new MatchRoundParticipantNotFoundException()
      }

      await this.matchRoundParticipantRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(
          MatchRoundParticipantMessage.DELETE_SUCCESS,
          lang
        )
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new MatchRoundParticipantNotFoundException()
      }
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
      const nextRound = await this.matchRoundRepo.findByMatchIdAndRoundNumber(
        currentMatchRound.matchId,
        nextRoundNumber
      )

      if (!nextRound) {
        this.logger.warn(
          `Next round ${nextRoundNumber} not found for match ${currentMatchRound.matchId}`
        )
        return
      }

      // Lấy participants của round tiếp theo
      const nextRoundParticipants = await this.matchRoundParticipantRepo.findMany({
        where: {
          matchRoundId: nextRound.id,
          deletedAt: null
        },
        orderBy: {
          orderSelected: 'asc'
        }
      })

      const firstParticipant = nextRoundParticipants[0]

      if (firstParticipant) {
        // Set endTimeSelected
        await this.matchRoundParticipantRepo.update({
          id: firstParticipant.id,
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
