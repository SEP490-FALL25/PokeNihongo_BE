import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { I18nService } from '@/i18n/i18n.service'
import { RoundQuestionMessage } from '@/i18n/message-keys'
import { QuestionBankRepository } from '@/modules/question-bank/question-bank.repo'
import { NotFoundRecordException } from '@/shared/error'
import {
  addTimeUTC,
  calculateEloGain,
  calculateEloLoss,
  isForeignKeyConstraintPrismaError,
  isNotFoundPrismaError
} from '@/shared/helpers'
import { PaginationQueryType } from '@/shared/models/request.model'
import { PrismaService } from '@/shared/services/prisma.service'
import { MatchingGateway } from '@/websockets/matching.gateway'
import { InjectQueue } from '@nestjs/bull'
import { Injectable } from '@nestjs/common'
import { Queue } from 'bull'
import { RoundQuestionNotFoundException } from './dto/round-question.error'
import {
  AnswerQuestionBodyType,
  CreateRoundQuestionBodyType,
  UpdateRoundQuestionBodyType
} from './entities/round-question.entity'
import { RoundQuestionRepo } from './round-question.repo'

@Injectable()
export class RoundQuestionService {
  constructor(
    private roundQuestionRepo: RoundQuestionRepo,
    private readonly i18nService: I18nService,
    private readonly prismaService: PrismaService,
    private readonly matchingGateway: MatchingGateway,
    private readonly questionBankRepo: QuestionBankRepository,
    @InjectQueue(BullQueue.ROUND_QUESTION_TIMEOUT)
    private readonly roundQuestionTimeoutQueue: Queue,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue
  ) {}

  async list(pagination: PaginationQueryType, lang: string = 'vi') {
    const data = await this.roundQuestionRepo.list(pagination)
    return {
      statusCode: 200,
      data,
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // Helper method to calculate weaknesses for a Pokemon (copied from PokemonService)
  async findById(id: number, lang: string = 'vi') {
    const roundQuestion = await this.roundQuestionRepo.findById(id)
    if (!roundQuestion) {
      throw new RoundQuestionNotFoundException()
    }

    return {
      statusCode: 200,
      data: roundQuestion,
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  async create(
    { userId, data }: { userId: number; data: CreateRoundQuestionBodyType },
    lang: string = 'vi'
  ) {
    try {
      const result = await this.roundQuestionRepo.create({
        createdById: userId,
        data: {
          ...data
        }
      })
      return {
        statusCode: 201,
        data: result,
        message: this.i18nService.translate(RoundQuestionMessage.CREATE_SUCCESS, lang)
      }
    } catch (error) {
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
      data: UpdateRoundQuestionBodyType
      userId?: number
    },
    lang: string = 'vi'
  ) {
    try {
      const roundQuestion = await this.roundQuestionRepo.update({
        id,
        data: data,
        updatedById: userId
      })
      return {
        statusCode: 200,
        data: roundQuestion,
        message: this.i18nService.translate(RoundQuestionMessage.UPDATE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionNotFoundException()
      }

      if (isForeignKeyConstraintPrismaError(error)) {
        throw new NotFoundRecordException()
      }
      throw error
    }
  }

  async delete({ id, userId }: { id: number; userId?: number }, lang: string = 'vi') {
    try {
      const existRoundQuestion = await this.roundQuestionRepo.findById(id)
      if (!existRoundQuestion) {
        throw new RoundQuestionNotFoundException()
      }

      await this.roundQuestionRepo.delete(id)
      return {
        statusCode: 200,
        data: null,
        message: this.i18nService.translate(RoundQuestionMessage.DELETE_SUCCESS, lang)
      }
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        throw new RoundQuestionNotFoundException()
      }
      throw error
    }
  }

  private calculatePointsEarned(
    isCorrect: boolean,
    basePoints: number,
    timeAnswerMs: number,
    timeLimitMs: number,
    debuff?: { typeDebuff: string; valueDebuff: number } | null
  ): number {
    if (!isCorrect) return 0

    // Calculate points: points = basePoints * (1 - timeAnswer / timeLimit)
    const timeRatio = Math.min(timeAnswerMs / timeLimitMs, 1.0)
    let points = basePoints * (1 - timeRatio)

    // Ensure minimum 50% of base points for correct answers
    points = Math.max(points, basePoints * 0.5)

    // Apply DECREASE_POINT debuff if present
    if (debuff && debuff.typeDebuff === 'DECREASE_POINT') {
      points -= debuff.valueDebuff
      // After debuff, still ensure minimum 50% of base points
      points = Math.max(points, basePoints * 0.5)
    }

    return Math.ceil(points) // Làm tròn lên
  }

  async answerQuestion(
    {
      id,
      data,
      userId
    }: {
      id: number
      data: AnswerQuestionBodyType
      userId: number
    },
    lang: string = 'vi'
  ) {
    // Remove any scheduled timeout job for this roundQuestion
    try {
      const jobs = await this.roundQuestionTimeoutQueue.getJobs(['delayed', 'waiting'])
      await Promise.all(
        jobs
          .filter(
            (j) =>
              j.name === BullAction.CHECK_QUESTION_TIMEOUT &&
              j.data?.roundQuestionId === id
          )
          .map((j) => j.remove())
      )
    } catch (e) {
      console.warn('[RoundQuestion] Failed to remove timeout job', e)
    }

    // Fetch roundQuestion with answers and debuff
    const roundQuestion = await this.prismaService.roundQuestion.findUnique({
      where: { id },
      include: {
        questionBank: { include: { answers: true } },
        debuff: true
      }
    })

    if (!roundQuestion) throw new RoundQuestionNotFoundException()

    // Check provided answer
    const providedAnswer = roundQuestion.questionBank.answers.find(
      (a) => a.id === data.answerId
    )
    const isCorrect = !!providedAnswer && providedAnswer.isCorrect

    const pointsEarned = this.calculatePointsEarned(
      isCorrect,
      roundQuestion.basePoints,
      data.timeAnswerMs,
      roundQuestion.timeLimitMs,
      roundQuestion.debuff
    )

    // Upsert answer log
    const existingAnswerLog = await this.prismaService.roundQuestionsAnswerLog.findFirst({
      where: { roundQuestionId: id }
    })

    let finalAnswerLog: any = existingAnswerLog
    if (existingAnswerLog) {
      finalAnswerLog = await this.prismaService.roundQuestionsAnswerLog.update({
        where: { id: existingAnswerLog.id },
        data: {
          answerId: data.answerId,
          timeAnswerMs: data.timeAnswerMs,
          isCorrect,
          pointsEarned
        }
      })
    } else {
      finalAnswerLog = await this.prismaService.roundQuestionsAnswerLog.create({
        data: {
          roundQuestionId: id,
          answerId: data.answerId,
          timeAnswerMs: data.timeAnswerMs,
          isCorrect,
          pointsEarned
        }
      })
    }

    // Find participant/match info and determine next question BEFORE notifying
    const matchRoundParticipant =
      await this.prismaService.matchRoundParticipant.findUnique({
        where: { id: roundQuestion.matchRoundParticipantId },
        include: {
          matchParticipant: { include: { user: true } },
          matchRound: {
            include: { match: { include: { participants: { include: { user: true } } } } }
          }
        }
      })
    let endTimeQuestion: Date | null = null

    // Determine and schedule next question (if any) so we can include it in the socket payload
    let nextQuestion: any | null = null
    try {
      if (matchRoundParticipant) {
        nextQuestion = await this.prismaService.roundQuestion.findFirst({
          where: {
            matchRoundParticipantId: roundQuestion.matchRoundParticipantId,
            orderNumber: { gt: roundQuestion.orderNumber }
          },
          orderBy: { orderNumber: 'asc' },
          include: {
            questionBank: { include: { answers: true } },
            debuff: true
          }
        })

        if (nextQuestion) {
          endTimeQuestion = addTimeUTC(new Date(), nextQuestion.timeLimitMs)
          await this.prismaService.roundQuestion.update({
            where: { id: nextQuestion.id },
            data: { endTimeQuestion }
          })

          await this.roundQuestionTimeoutQueue.add(
            BullAction.CHECK_QUESTION_TIMEOUT,
            {
              roundQuestionId: nextQuestion.id,
              matchRoundParticipantId: roundQuestion.matchRoundParticipantId
            },
            { delay: nextQuestion.timeLimitMs }
          )
        }
      }
    } catch (e) {
      console.warn('[RoundQuestion] Failed to schedule next question timeout', e)
      // keep going even if scheduling fails - we'll still notify the answer result
    }

    // Prepare formatted nextQuestion for notification (use repository to avoid DI cycles)
    let nextQuestionForNotify: any | null = null
    if (nextQuestion) {
      try {
        const qbList = await this.questionBankRepo.findByIds(
          [nextQuestion.questionBankId],
          'vi'
        )
        nextQuestionForNotify = qbList?.[0] || null
        // Always include debuff field (null if none)
        if (nextQuestionForNotify) {
          nextQuestionForNotify.debuff = nextQuestion.debuff || null
          // Include roundQuestionId so FE can reference it
          nextQuestionForNotify.roundQuestionId = nextQuestion.id
        }
      } catch (err) {
        console.warn(
          '[RoundQuestion] Failed to fetch formatted questionBank for nextQuestion',
          err
        )
        nextQuestionForNotify = null
      }
    }

    // Notify answered including nextQuestion (null when last question)
    if (finalAnswerLog) {
      const currentUserId = matchRoundParticipant?.matchParticipant.userId
      const matchId = matchRoundParticipant?.matchRound?.match?.id
      if (matchId && currentUserId) {
        this.matchingGateway.notifyQuestionAnswered(
          matchId,
          currentUserId,
          {
            roundQuestionId: id,
            answerId: finalAnswerLog.answerId,
            isCorrect: finalAnswerLog.isCorrect,
            pointsEarned: finalAnswerLog.pointsEarned || 0,
            timeAnswerMs: finalAnswerLog.timeAnswerMs
          },
          nextQuestionForNotify
            ? {
                nextQuestion: {
                  ...nextQuestionForNotify,
                  endTimeQuestion: endTimeQuestion
                }
              }
            : null
        )
      }
    }

    // If last question, finalize participant and possibly complete round
    const isLastQuestion =
      roundQuestion.orderNumber >= (matchRoundParticipant?.questionsTotal || 0)

    // If not last question, schedule next question timeout like processor does
    if (!isLastQuestion) {
      try {
        const nextQuestion = await this.prismaService.roundQuestion.findFirst({
          where: {
            matchRoundParticipantId: roundQuestion.matchRoundParticipantId,
            orderNumber: { gt: roundQuestion.orderNumber }
          },
          orderBy: { orderNumber: 'asc' },
          include: {
            questionBank: { include: { answers: true } }
          }
        })

        if (nextQuestion) {
          const endTimeQuestion = addTimeUTC(new Date(), nextQuestion.timeLimitMs)
          await this.prismaService.roundQuestion.update({
            where: { id: nextQuestion.id },
            data: { endTimeQuestion }
          })

          await this.roundQuestionTimeoutQueue.add(
            BullAction.CHECK_QUESTION_TIMEOUT,
            {
              roundQuestionId: nextQuestion.id,
              matchRoundParticipantId: roundQuestion.matchRoundParticipantId
            },
            { delay: nextQuestion.timeLimitMs }
          )
        }
      } catch (e) {
        console.warn('[RoundQuestion] Failed to schedule next question timeout', e)
      }
    }

    if (isLastQuestion) {
      // Calculate totals
      const allAnswerLogs = await this.prismaService.roundQuestionsAnswerLog.findMany({
        where: {
          roundQuestion: {
            matchRoundParticipantId: roundQuestion.matchRoundParticipantId
          }
        }
      })

      const totalTimeMs = allAnswerLogs.reduce((sum, l) => sum + (l.timeAnswerMs || 0), 0)
      const points = allAnswerLogs.reduce((sum, l) => sum + (l.pointsEarned || 0), 0)

      const updatedParticipant = await this.prismaService.matchRoundParticipant.update({
        where: { id: roundQuestion.matchRoundParticipantId },
        data: { totalTimeMs, points, status: 'COMPLETED' },
        include: { selectedUserPokemon: { include: { pokemon: true } }, debuff: true }
      })

      // Notify completion and opponent
      const opponentMatchParticipant =
        matchRoundParticipant?.matchRound?.match?.participants.find(
          (p) => p.userId !== matchRoundParticipant?.matchParticipant?.userId
        )
      if (matchRoundParticipant && opponentMatchParticipant) {
        this.matchingGateway.notifyQuestionCompleted(
          matchRoundParticipant.matchRound.match.id,
          matchRoundParticipant.matchParticipant.userId,
          updatedParticipant
        )

        // Find opponent's MatchRoundParticipant to check their status
        const opponentRoundParticipant =
          await this.prismaService.matchRoundParticipant.findFirst({
            where: {
              matchRoundId: matchRoundParticipant.matchRoundId,
              matchParticipant: {
                userId: opponentMatchParticipant.userId
              }
            }
          })

        // Only notify opponent if they haven't completed yet
        if (opponentRoundParticipant?.status !== 'COMPLETED') {
          this.matchingGateway.notifyOpponentCompleted(
            matchRoundParticipant.matchRound.match.id,
            opponentMatchParticipant.userId
          )
        }
      }

      // Check and complete round
      if (
        matchRoundParticipant &&
        matchRoundParticipant.matchRound &&
        matchRoundParticipant.matchRound.match
      ) {
        await this.checkAndCompleteRound(
          matchRoundParticipant.matchRoundId,
          matchRoundParticipant.matchRound.match.id
        )
      }
    }

    return {
      statusCode: 200,
      data: roundQuestion,
      message: this.i18nService.translate(RoundQuestionMessage.GET_LIST_SUCCESS, lang)
    }
  }

  // The following methods are adapted from processor logic to keep behaviour consistent
  private async checkAndCompleteRound(matchRoundId: number, matchId: number) {
    // fetch round and verify both participants completed
    const matchRound = await this.prismaService.matchRound.findUnique({
      where: { id: matchRoundId },
      include: {
        participants: { include: { matchParticipant: { include: { user: true } } } }
      }
    })
    if (!matchRound) return

    const allParticipants = matchRound.participants
    const allCompleted = allParticipants.every((p) => p.status === 'COMPLETED')
    if (!allCompleted) {
      const completedParticipant = allParticipants.find((p) => p.status === 'COMPLETED')
      if (completedParticipant) {
        const completedUserId = completedParticipant.matchParticipant.userId
        this.matchingGateway.notifyWaitingForOpponent(
          matchId,
          completedUserId,
          matchRound.roundNumber
        )
      }
      return
    }

    // determine winner similar to processor
    const [p1, p2] = allParticipants
    let winnerId: number
    if ((p1.points || 0) > (p2.points || 0)) winnerId = p1.matchParticipantId
    else if ((p1.points || 0) < (p2.points || 0)) winnerId = p2.matchParticipantId
    else
      winnerId =
        (p1.totalTimeMs || 0) < (p2.totalTimeMs || 0)
          ? p1.matchParticipantId
          : p2.matchParticipantId

    const updatedRound = await this.prismaService.matchRound.update({
      where: { id: matchRoundId },
      data: { status: 'COMPLETED', roundWinnerId: winnerId },
      include: {
        participants: {
          include: {
            matchParticipant: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true
                  }
                }
              }
            },
            selectedUserPokemon: {
              include: {
                pokemon: {
                  select: {
                    id: true,
                    pokedex_number: true,
                    nameJp: true,
                    nameTranslations: true,
                    rarity: true,
                    imageUrl: true
                  }
                }
              }
            }
          }
        },
        roundWinner: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true
              }
            }
          }
        }
      }
    })

    const userId1 = allParticipants[0].matchParticipant.userId
    const userId2 = allParticipants[1].matchParticipant.userId
    this.matchingGateway.notifyRoundCompleted(matchId, userId1, userId2, updatedRound)

    await this.scheduleNextRound(matchId, updatedRound.roundNumber)
  }

  private async scheduleNextRound(matchId: number, currentRoundNumber: string) {
    const roundMap: Record<string, string | null> = {
      ONE: 'TWO',
      TWO: 'THREE',
      THREE: null
    }
    const nextRoundNumber = roundMap[currentRoundNumber]
    if (!nextRoundNumber) {
      await this.completeMatch(matchId)
      return
    }

    const nextRound = await this.prismaService.matchRound.findFirst({
      where: { matchId, roundNumber: nextRoundNumber as any, deletedAt: null },
      include: {
        participants: {
          include: { matchParticipant: { include: { user: true } } },
          orderBy: { orderSelected: 'asc' }
        }
      }
    })
    if (!nextRound) return

    const userId1 = nextRound.participants[0]?.matchParticipant.userId
    const userId2 = nextRound.participants[1]?.matchParticipant.userId
    if (!userId1 || !userId2) return

    this.matchingGateway.notifyRoundStarting(
      matchId,
      userId1,
      userId2,
      nextRoundNumber,
      5
    )

    await this.matchRoundParticipantTimeoutQueue.add(
      BullAction.START_ROUND,
      { matchRoundId: nextRound.id, matchId },
      { delay: 5000 }
    )
  }

  private async completeMatch(matchId: number) {
    // Guard check: prevent duplicate processing if match already completed
    const currentMatch = await this.prismaService.match.findUnique({
      where: { id: matchId },
      select: { status: true }
    })

    if (currentMatch?.status === 'COMPLETED') {
      console.log(
        `[RoundQuestion Service] Match ${matchId} already COMPLETED, skipping duplicate processing`
      )
      return
    }

    console.log(`[RoundQuestion Service] Starting completeMatch for matchId=${matchId}`)

    // similar to processor.completeMatch
    const allRounds = await this.prismaService.matchRound.findMany({
      where: { matchId, deletedAt: null },
      include: {
        roundWinner: { include: { user: true } },
        participants: { include: { matchParticipant: { include: { user: true } } } }
      },
      orderBy: { roundNumber: 'asc' }
    })
    if (allRounds.length !== 3) {
      console.warn(
        `[RoundQuestion Service] Match ${matchId} has ${allRounds.length} rounds, expected 3`
      )
      return
    }

    const roundWinCounts = new Map<number, number>()
    for (const round of allRounds)
      if (round.roundWinnerId)
        roundWinCounts.set(
          round.roundWinnerId,
          (roundWinCounts.get(round.roundWinnerId) || 0) + 1
        )

    let matchWinnerId: number | null = null
    let maxWins = 0
    for (const [participantId, wins] of roundWinCounts.entries())
      if (wins > maxWins) {
        maxWins = wins
        matchWinnerId = participantId
      }

    if (maxWins === 0 || !matchWinnerId) {
      const participantTotals = new Map<number, number>()
      for (const round of allRounds)
        for (const participant of round.participants)
          participantTotals.set(
            participant.matchParticipantId,
            (participantTotals.get(participant.matchParticipantId) || 0) +
              (participant.points || 0)
          )
      let maxPoints = 0
      for (const [participantId, totalPoints] of participantTotals.entries())
        if (totalPoints > maxPoints) {
          maxPoints = totalPoints
          matchWinnerId = participantId
        }
    }

    const winnerParticipant = await this.prismaService.matchParticipant.findUnique({
      where: { id: matchWinnerId! },
      include: { user: true }
    })

    console.log(
      `[RoundQuestion Service] Match winner determined: participantId=${matchWinnerId}, userId=${winnerParticipant?.userId}, maxWins=${maxWins}`
    )

    // Wrap entire flow in atomic transaction to prevent race conditions
    try {
      const result = await this.prismaService.$transaction(async (tx) => {
        // First, update match status to COMPLETED to claim ownership
        const completedMatch = await tx.match.update({
          where: { id: matchId },
          data: { status: 'COMPLETED', winnerId: winnerParticipant?.userId || null },
          include: {
            winner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                eloscore: true
              }
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    eloscore: true
                  }
                }
              }
            },
            rounds: {
              include: {
                roundWinner: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        eloscore: true
                      }
                    }
                  }
                },
                participants: {
                  include: {
                    matchParticipant: { include: { user: true } },
                    selectedUserPokemon: {
                      include: {
                        pokemon: {
                          select: {
                            id: true,
                            pokedex_number: true,
                            nameJp: true,
                            nameTranslations: true,
                            rarity: true,
                            imageUrl: true
                          }
                        }
                      }
                    }
                  }
                }
              },
              orderBy: { roundNumber: 'asc' }
            }
          }
        })

        // Calculate and update ELO within same transaction
        const participants = completedMatch.participants || []
        const winnerUserId = completedMatch.winnerId
        const loserUserId = participants.find((p) => p.userId !== winnerUserId)?.userId

        let eloGained = 0
        let eloLost = 0

        if (winnerUserId && loserUserId) {
          const winnerUser = participants.find((p) => p.userId === winnerUserId)?.user
          const loserUser = participants.find((p) => p.userId === loserUserId)?.user

          const winnerElo = (winnerUser && winnerUser.eloscore) || 0
          const loserElo = (loserUser && loserUser.eloscore) || 0

          console.log(
            `[RoundQuestion Service] ELO before: winner=${winnerElo}, loser=${loserElo}`
          )

          eloGained = calculateEloGain(winnerElo, loserElo)
          eloLost = calculateEloLoss(loserElo, winnerElo)

          console.log(
            `[RoundQuestion Service] ELO delta: gained=${eloGained}, lost=${eloLost}`
          )

          const newLoserElo = Math.max(0, loserElo - eloLost)

          // Update Match with ELO deltas
          await tx.match.update({
            where: { id: matchId },
            data: { eloGained, eloLost }
          })

          // Update winner ELO
          await tx.user.update({
            where: { id: winnerUserId },
            data: { eloscore: { increment: eloGained } as any }
          })

          // Update loser ELO
          await tx.user.update({
            where: { id: loserUserId },
            data: { eloscore: newLoserElo }
          })

          console.log(
            `[RoundQuestion Service] ELO after: winner=${winnerElo + eloGained}, loser=${newLoserElo}`
          )
        }

        return { completedMatch, eloGained, eloLost }
      })

      console.log(
        `[RoundQuestion Service] Transaction completed successfully for match ${matchId}`
      )

      // Re-fetch match with updated ELO for notification (outside transaction)
      const userId1 = result.completedMatch.participants[0]?.userId
      const userId2 = result.completedMatch.participants[1]?.userId

      if (userId1 && userId2) {
        const updatedMatch = await this.prismaService.match.findUnique({
          where: { id: matchId },
          include: {
            winner: {
              select: {
                id: true,
                name: true,
                email: true,
                avatar: true,
                eloscore: true
              }
            },
            participants: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    avatar: true,
                    eloscore: true
                  }
                }
              }
            },
            rounds: {
              include: {
                roundWinner: {
                  include: {
                    user: {
                      select: {
                        id: true,
                        name: true,
                        email: true,
                        avatar: true,
                        eloscore: true
                      }
                    }
                  }
                },
                participants: {
                  include: {
                    matchParticipant: {
                      include: {
                        user: {
                          select: {
                            id: true,
                            name: true,
                            email: true,
                            avatar: true,
                            eloscore: true
                          }
                        }
                      }
                    },
                    selectedUserPokemon: {
                      include: {
                        pokemon: {
                          select: {
                            id: true,
                            pokedex_number: true,
                            nameJp: true,
                            nameTranslations: true,
                            rarity: true,
                            imageUrl: true
                          }
                        }
                      }
                    }
                  }
                }
              },
              orderBy: { roundNumber: 'asc' }
            }
          }
        })

        console.log(
          `[RoundQuestion Service] Sending match completed notification for match ${matchId}`
        )
        this.matchingGateway.notifyMatchCompleted(
          matchId,
          userId1,
          userId2,
          updatedMatch || result.completedMatch
        )
      }
    } catch (e) {
      console.error(`[RoundQuestion Service] Error completing match ${matchId}:`, e)
      // Don't swallow errors - let them bubble up
      throw e
    }
  }
}
