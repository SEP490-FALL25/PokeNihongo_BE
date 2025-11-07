import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { addTimeUTC } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { MatchingGateway } from '@/websockets/matching.gateway'
import {
  InjectQueue,
  OnQueueActive,
  OnQueueCompleted,
  OnQueueFailed,
  OnQueueWaiting,
  Process,
  Processor
} from '@nestjs/bull'
import { Logger, OnModuleInit } from '@nestjs/common'
import { Job, Queue } from 'bull'

@Processor(BullQueue.ROUND_QUESTION_TIMEOUT)
export class RoundQuestionTimeoutProcessor implements OnModuleInit {
  private readonly logger = new Logger(RoundQuestionTimeoutProcessor.name)

  constructor(
    private readonly prismaService: PrismaService,
    private readonly matchingGateway: MatchingGateway,
    @InjectQueue(BullQueue.ROUND_QUESTION_TIMEOUT)
    private readonly roundQuestionTimeoutQueue: Queue
  ) {}

  async onModuleInit() {
    this.logger.log('RoundQuestionTimeoutProcessor initialized')
    try {
      await this.roundQuestionTimeoutQueue.isReady()
      try {
        await this.roundQuestionTimeoutQueue.resume(true)
        this.logger.log('[RoundQuestion Timeout] Queue resumed (global=true)')
      } catch (e) {
        this.logger.warn('[RoundQuestion Timeout] Queue resume skipped/failed', e as any)
      }
      const counts = await this.roundQuestionTimeoutQueue.getJobCounts()
      this.logger.log(
        `[RoundQuestion Timeout] Queue job counts on init: ${Object.entries(counts)
          .map(([k, v]) => `${k}=${v}`)
          .join(', ')}`
      )
    } catch (e) {
      this.logger.error(
        '[RoundQuestion Timeout] Error during onModuleInit diagnostics',
        e
      )
    }
  }

  @OnQueueWaiting()
  onWaiting(jobId: number) {
    this.logger.debug(`[RoundQuestion Timeout] ⏳ (jobId=${jobId}) WAITING in queue`)
  }

  @OnQueueActive()
  onActive(job: Job) {
    this.logger.log(
      `[RoundQuestion Timeout] ▶️ (jobId=${job.id}) ACTIVE - Processing roundQuestionId=${job.data?.roundQuestionId}`
    )
  }

  @OnQueueCompleted()
  onCompleted(job: Job) {
    this.logger.log(
      `[RoundQuestion Timeout] ✅ (jobId=${job.id}) COMPLETED for roundQuestionId=${job.data?.roundQuestionId}`
    )
  }

  @OnQueueFailed()
  onFailed(job: Job, err: any) {
    this.logger.error(
      `[RoundQuestion Timeout] ❌ (jobId=${job?.id}) FAILED for roundQuestionId=${job?.data?.roundQuestionId}: ${err?.message}`,
      err?.stack
    )
  }

  @Process(BullAction.CHECK_QUESTION_TIMEOUT)
  async handleQuestionTimeout(
    job: Job<{ roundQuestionId: number; matchRoundParticipantId: number }>
  ): Promise<void> {
    const { roundQuestionId, matchRoundParticipantId } = job.data

    this.logger.log(
      `[RoundQuestion Timeout] Processing question timeout for roundQuestionId: ${roundQuestionId}, jobId=${job.id}`
    )

    try {
      // Fetch the round question
      const roundQuestion = await this.prismaService.roundQuestion.findUnique({
        where: { id: roundQuestionId },
        include: {
          questionBank: {
            include: {
              answers: true
            }
          }
        }
      })

      if (!roundQuestion) {
        this.logger.warn(
          `[RoundQuestion Timeout] RoundQuestion ${roundQuestionId} not found`
        )
        return
      }

      // Check if answer already submitted
      const existingAnswerLog =
        await this.prismaService.roundQuestionsAnswerLog.findFirst({
          where: { roundQuestionId }
        })

      if (existingAnswerLog && existingAnswerLog.answerId !== null) {
        this.logger.log(
          `[RoundQuestion Timeout] RoundQuestion ${roundQuestionId} already answered, skipping auto-select`
        )
      } else {
        // Auto-select random answer
        const answers = roundQuestion.questionBank.answers
        if (answers.length === 0) {
          this.logger.warn(
            `[RoundQuestion Timeout] No answers available for question ${roundQuestion.questionBankId}`
          )
        } else {
          const randomAnswer = answers[Math.floor(Math.random() * answers.length)]

          if (existingAnswerLog) {
            // Update existing log
            await this.prismaService.roundQuestionsAnswerLog.update({
              where: { id: existingAnswerLog.id },
              data: {
                answerId: randomAnswer.id,
                timeAnswerMs: roundQuestion.timeLimitMs,
                isCorrect: randomAnswer.isCorrect
              }
            })
            this.logger.log(
              `[RoundQuestion Timeout] Updated answerlog ${existingAnswerLog.id} with random answer ${randomAnswer.id} (timeout)`
            )
          } else {
            // Create new log
            await this.prismaService.roundQuestionsAnswerLog.create({
              data: {
                roundQuestionId,
                answerId: randomAnswer.id,
                timeAnswerMs: roundQuestion.timeLimitMs,
                isCorrect: randomAnswer.isCorrect,
                pointsEarned: 0 // Timeout = 0 points
              }
            })
            this.logger.log(
              `[RoundQuestion Timeout] Created answerlog with random answer ${randomAnswer.id} (timeout)`
            )
          }
        }
      }

      // Find next question in order
      const nextQuestion = await this.prismaService.roundQuestion.findFirst({
        where: {
          matchRoundParticipantId,
          orderNumber: { gt: roundQuestion.orderNumber }
        },
        orderBy: { orderNumber: 'asc' }
      })

      // Check if this is the last question
      const matchRoundParticipant =
        await this.prismaService.matchRoundParticipant.findUnique({
          where: { id: matchRoundParticipantId },
          include: {
            matchParticipant: {
              include: {
                user: true
              }
            },
            matchRound: {
              include: {
                match: {
                  include: {
                    participants: {
                      include: {
                        user: true
                      }
                    }
                  }
                }
              }
            }
          }
        })

      if (!matchRoundParticipant) {
        this.logger.warn(
          `[RoundQuestion Timeout] MatchRoundParticipant ${matchRoundParticipantId} not found`
        )
        return
      }

      const isLastQuestion =
        roundQuestion.orderNumber >= matchRoundParticipant.questionsTotal

      if (isLastQuestion) {
        this.logger.log(
          `[RoundQuestion Timeout] Last question completed for participant ${matchRoundParticipantId}`
        )

        // Calculate total time and points from all answer logs
        const allAnswerLogs = await this.prismaService.roundQuestionsAnswerLog.findMany({
          where: {
            roundQuestion: {
              matchRoundParticipantId
            }
          }
        })

        const totalTimeMs = allAnswerLogs.reduce(
          (sum, log) => sum + (log.timeAnswerMs || 0),
          0
        )
        const points = allAnswerLogs.reduce(
          (sum, log) => sum + (log.pointsEarned || 0),
          0
        )

        // Update MatchRoundParticipant with totals
        const updatedParticipant = await this.prismaService.matchRoundParticipant.update({
          where: { id: matchRoundParticipantId },
          data: {
            totalTimeMs,
            points,
            status: 'COMPLETED'
          },
          include: {
            selectedUserPokemon: {
              include: {
                pokemon: true
              }
            },
            debuff: true
          }
        })

        this.logger.log(
          `[RoundQuestion Timeout] Updated participant ${matchRoundParticipantId}: totalTimeMs=${totalTimeMs}, points=${points}`
        )

        // Send socket notifications
        const currentUserId = matchRoundParticipant.matchParticipant.userId
        const matchId = matchRoundParticipant.matchRound.match.id

        // Find opponent userId
        const opponentParticipant =
          matchRoundParticipant.matchRound.match.participants.find(
            (p) => p.userId !== currentUserId
          )

        if (opponentParticipant) {
          // Notify current user about their completion
          this.matchingGateway.notifyQuestionCompleted(
            matchId,
            currentUserId,
            updatedParticipant
          )

          // Notify opponent that current user completed
          this.matchingGateway.notifyOpponentCompleted(
            matchId,
            opponentParticipant.userId
          )

          this.logger.log(
            `[RoundQuestion Timeout] Sent socket notifications for match ${matchId}: user ${currentUserId} completed, opponent ${opponentParticipant.userId} notified`
          )
        }

        return // No more questions to schedule
      }

      if (nextQuestion) {
        // Set endTimeQuestion for next question
        const endTimeQuestion = addTimeUTC(new Date(), nextQuestion.timeLimitMs)
        await this.prismaService.roundQuestion.update({
          where: { id: nextQuestion.id },
          data: { endTimeQuestion }
        })

        // Enqueue timeout job for next question
        await this.roundQuestionTimeoutQueue.add(
          BullAction.CHECK_QUESTION_TIMEOUT,
          {
            roundQuestionId: nextQuestion.id,
            matchRoundParticipantId
          },
          {
            delay: nextQuestion.timeLimitMs
          }
        )

        this.logger.log(
          `[RoundQuestion Timeout] Scheduled next question ${nextQuestion.id} with delay ${nextQuestion.timeLimitMs}ms`
        )
      } else {
        this.logger.log(
          `[RoundQuestion Timeout] No more questions for participant ${matchRoundParticipantId} - round completed`
        )
        // TODO: Handle round completion logic if needed
      }
    } catch (error) {
      this.logger.error(
        `[RoundQuestion Timeout] Error processing question timeout for roundQuestionId ${roundQuestionId}`,
        error
      )
      throw error
    }
  }
}
