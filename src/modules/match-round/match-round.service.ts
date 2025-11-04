import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { MatchRoundNumber } from '@/common/constants/match.constant'
import { I18nService } from '@/i18n/i18n.service'
import { MatchRoundMessage } from '@/i18n/message-keys'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { InjectQueue } from '@nestjs/bull'
import { HttpStatus, Injectable } from '@nestjs/common'
import { Queue } from 'bull'
import { LanguagesRepository } from '../languages/languages.repo'
import { LeaderboardSeasonRepo } from '../leaderboard-season/leaderboard-season.repo'
import { MatchRoundParticipantRepo } from '../match-round-participant/match-round-participant.repo'
import { MatchRepo } from '../match/match.repo'
import { MatchRoundAlreadyExistsException } from './dto/match-round.error'
import {
  CreateMatchRoundBodyType,
  UpdateMatchRoundBodyType
} from './entities/match-round.entity'
import { MatchRoundRepo } from './match-round.repo'

@Injectable()
export class MatchRoundService {
  constructor(
    private matchRoundRepo: MatchRoundRepo,
    private matchRepo: MatchRepo,
    private matchRoundParticipantRepo: MatchRoundParticipantRepo,
    private readonly i18nService: I18nService,
    private readonly languageRepo: LanguagesRepository,
    private readonly leaderboardSeasonRepo: LeaderboardSeasonRepo,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const langId = await this.languageRepo.getIdByCode(lang)
    const data = await this.matchRoundRepo.list(pagination, langId ?? undefined)
    return {
      data,
      message: this.i18nService.translate(MatchRoundMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async listNowByUser(
    // pagination: PaginationQueryType,
    userId: number,
    lang: string = 'vi'
  ) {
    // Lấy Match có status IN_PROGRESS của user
    const match: any = await this.matchRepo.findInProgressByUserId(userId)

    if (!match) {
      return {
        data: {
          match: null,
          rounds: []
        },
        message: this.i18nService.translate(MatchRoundMessage.GET_LIST_SUCCESS, lang)
      }
    }

    // Lấy danh sách match-rounds với matchId
    const matchRounds: any[] = await this.matchRoundRepo.listNowByUser(match.id)

    // Tìm participant và opponent từ match
    const participant = match.participants.find((p) => p.userId === userId)
    const opponent = match.participants.find((p) => p.userId !== userId)

    // Chuyển đổi mỗi match-round: participant/opponent tương ứng với user
    const roundsWithParticipants = matchRounds.map((round) => {
      const userParticipant = round.participants.find(
        (p) => p.matchParticipant.userId === userId
      )
      const opponentParticipant = round.participants.find(
        (p) => p.matchParticipant.userId !== userId
      )

      // Bỏ participants gốc, thay bằng participant/opponent
      const { participants, ...roundWithoutParticipants } = round

      return {
        ...roundWithoutParticipants,
        participant: userParticipant,
        opponent: opponentParticipant
      }
    })

    return {
      data: {
        match: {
          ...match,
          participant,
          opponent
        },
        rounds: roundsWithParticipants
      },
      message: this.i18nService.translate(MatchRoundMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async findById(id: number, lang: string = 'vi') {
    const matchRound = await this.matchRoundRepo.findById(id)
    if (!matchRound) {
      throw new NotFoundRecordException()
    }

    return {
      statusCode: HttpStatus.OK,
      data: matchRound,
      message: this.i18nService.translate(MatchRoundMessage.GET_SUCCESS, lang)
    }
  }

  async create(
    {
      createdById,
      data
    }: {
      createdById: number
      data: CreateMatchRoundBodyType
    },
    lang: string = 'vi'
  ) {
    let createdMatchRound: any = null

    try {
      // Check match có tồn tại không
      const matchExist = await this.matchRepo.findByIdWithParticipant(data.matchId)
      if (!matchExist) {
        throw new NotFoundRecordException()
      }

      // Check match-round với matchId và roundNumber đã tồn tại chưa
      const existingMatchRound = await this.matchRoundRepo.findByMatchIdAndRoundNumber(
        data.matchId,
        data.roundNumber
      )
      if (existingMatchRound) {
        throw new MatchRoundAlreadyExistsException()
      }

      return await this.matchRoundRepo.withTransaction(async (prismaTx) => {
        // Tạo match-round
        const createdMatchRound = await this.matchRoundRepo.create(
          {
            createdById,
            data
          },
          prismaTx
        )

        // Xác định order cho participants
        let participantsWithOrder: Array<{
          matchParticipantId: number
          orderSelected: number
          endTimeSelected: Date | null
        }>

        if (data.roundNumber === MatchRoundNumber.ONE) {
          // Round ONE: Random order
          const shuffledParticipants = [...matchExist.participants].sort(
            () => Math.random() - 0.5
          )

          participantsWithOrder = shuffledParticipants.map((participant, index) => {
            const orderSelected = index + 1
            const isFirstPlayer = orderSelected === 1

            return {
              matchParticipantId: participant.id,
              orderSelected,
              endTimeSelected: isFirstPlayer ? addTimeUTC(new Date(), 30000) : null
            }
          })
        } else {
          // Round TWO hoặc THREE: Đảo ngược thứ tự từ round trước
          const previousRound =
            await this.matchRoundRepo.findPreviousRoundWithParticipants(
              data.matchId,
              data.roundNumber
            )

          if (!previousRound || !previousRound.participants) {
            throw new NotFoundRecordException()
          }

          // Lấy order cao nhất từ round trước
          const maxOrderFromPrevious = Math.max(
            ...previousRound.participants.map((p) => p.orderSelected)
          )

          // Đảo ngược thứ tự: người có order cao nhất → được chọn trước
          const sortedByOrderDesc = [...previousRound.participants].sort(
            (a, b) => b.orderSelected - a.orderSelected
          )

          participantsWithOrder = sortedByOrderDesc.map((prevParticipant, index) => {
            const newOrder = maxOrderFromPrevious + 1 + index
            const isFirstPlayer = index === 0

            return {
              matchParticipantId: prevParticipant.matchParticipantId,
              orderSelected: newOrder,
              endTimeSelected: isFirstPlayer ? addTimeUTC(new Date(), 30000) : null
            }
          })
        }

        // Tạo match-round-participant với order và endTimeSelected
        const matchRoundParticipantsData = participantsWithOrder.map((participant) => ({
          matchRoundId: createdMatchRound.id,
          matchParticipantId: participant.matchParticipantId,
          selectedUserPokemonId: null,
          orderSelected: participant.orderSelected,
          endTimeSelected: participant.endTimeSelected
        }))

        await this.matchRoundParticipantRepo.createBulk(
          matchRoundParticipantsData,
          prismaTx
        )

        // Lấy danh sách match-round-participant vừa tạo để có ID
        const createdParticipants = await prismaTx.matchRoundParticipant.findMany({
          where: {
            matchRoundId: createdMatchRound.id
          },
          orderBy: {
            orderSelected: 'asc'
          }
        })

        // Tạo Bull job cho participant đầu tiên (có endTimeSelected)
        const firstParticipant = createdParticipants.find(
          (p) => p.endTimeSelected !== null
        )
        if (firstParticipant) {
          await this.matchRoundParticipantTimeoutQueue.add(
            BullAction.CHECK_POKEMON_SELECTION_TIMEOUT,
            {
              matchRoundParticipantId: firstParticipant.id
            },
            {
              delay: 30000 // 30 seconds
            }
          )
        }

        return {
          statusCode: HttpStatus.CREATED,
          data: createdMatchRound,
          message: this.i18nService.translate(MatchRoundMessage.CREATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      // Rollback: Delete matchRound if created
      if (createdMatchRound?.id) {
        try {
          await this.matchRoundRepo.delete(
            {
              id: createdMatchRound.id,
              deletedById: createdById
            },
            true
          )
        } catch (rollbackError) {}
      }

      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchRoundAlreadyExistsException()
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
      updatedById
    }: {
      id: number
      data: UpdateMatchRoundBodyType
      updatedById: number
    },
    lang: string = 'vi'
  ) {
    let existingMatchRound: any = null

    try {
      return await this.matchRoundRepo.withTransaction(async (prismaTx) => {
        existingMatchRound = await this.matchRoundRepo.findById(id)
        if (!existingMatchRound) {
          throw new NotFoundRecordException()
        }
        const updatedMatchRound = await this.matchRoundRepo.update(
          {
            id,
            updatedById,
            data
          },
          prismaTx
        )

        return {
          statusCode: HttpStatus.OK,
          data: updatedMatchRound,
          message: this.i18nService.translate(MatchRoundMessage.UPDATE_SUCCESS, lang)
        }
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      if (isUniqueConstraintPrismaError(error)) {
        throw new MatchRoundAlreadyExistsException()
      }
      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete(
    { id, deletedById }: { id: number; deletedById: number },
    lang: string = 'vi'
  ) {
    try {
      return {
        statusCode: HttpStatus.OK,
        data: null,
        message: this.i18nService.translate(MatchRoundMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }
}
