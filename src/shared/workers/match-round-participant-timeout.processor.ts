import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import {
  MatchRoundNumber,
  MatchRoundParticipantStatus,
  RoundStatus
} from '@/common/constants/match.constant'
import { addTimeUTC } from '@/shared/helpers'
import { PrismaService } from '@/shared/services/prisma.service'
import { MatchingGateway } from '@/websockets/matching.gateway'
import { InjectQueue, Process, Processor } from '@nestjs/bull'
import { Inject, Logger, OnModuleInit } from '@nestjs/common'
import { Job, Queue } from 'bull'

@Processor(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
export class MatchRoundParticipantTimeoutProcessor implements OnModuleInit {
  private readonly logger = new Logger(MatchRoundParticipantTimeoutProcessor.name)

  constructor(
    private readonly prismaService: PrismaService,
    @InjectQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT)
    private readonly matchRoundParticipantTimeoutQueue: Queue,
    @Inject(MatchingGateway)
    private readonly matchingGateway: MatchingGateway
  ) {}

  onModuleInit() {
    this.logger.log(
      'MatchRoundParticipantTimeoutProcessor initialized with MatchingGateway'
    )
  }

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
        // Auto-select random Pokemon
        const matchParticipant = await this.prismaService.matchParticipant.findUnique({
          where: { id: currentParticipant.matchParticipantId }
        })

        if (matchParticipant) {
          try {
            this.logger.log(
              `User ${matchParticipant.userId} timeout - Auto-selecting random Pokemon`
            )

            // Lấy match với tất cả rounds để check Pokemon đã chọn
            const match = await this.prismaService.match.findFirst({
              where: {
                participants: {
                  some: { id: currentParticipant.matchParticipantId }
                },
                status: 'IN_PROGRESS'
              },
              include: {
                rounds: {
                  include: {
                    participants: {
                      select: {
                        selectedUserPokemonId: true,
                        selectedUserPokemon: {
                          select: {
                            pokemonId: true
                          }
                        }
                      }
                    }
                  }
                }
              }
            })

            if (!match) {
              this.logger.warn(
                `No active match found for user ${matchParticipant.userId}`
              )
            } else {
              // Lấy danh sách Pokemon IDs đã chọn trong tất cả rounds
              const selectedPokemonIds = new Set<number>()
              match.rounds.forEach((round) => {
                round.participants.forEach((p) => {
                  if (p.selectedUserPokemon?.pokemonId) {
                    selectedPokemonIds.add(p.selectedUserPokemon.pokemonId)
                  }
                })
              })

              // Lấy danh sách UserPokemon của user này
              const userPokemons = await this.prismaService.userPokemon.findMany({
                where: { userId: matchParticipant.userId },
                select: {
                  id: true,
                  pokemonId: true
                }
              })

              // Lọc ra những Pokemon chưa được chọn (canPick = true)
              const availableUserPokemons = userPokemons.filter(
                (up) => !selectedPokemonIds.has(up.pokemonId)
              )

              if (availableUserPokemons.length > 0) {
                // Chọn ngẫu nhiên 1 UserPokemon
                const randomIndex = Math.floor(
                  Math.random() * availableUserPokemons.length
                )
                const selectedUserPokemon = availableUserPokemons[randomIndex]

                this.logger.log(
                  `Auto-selected UserPokemon ${selectedUserPokemon.id} (Pokemon ${selectedUserPokemon.pokemonId}) for user ${matchParticipant.userId}`
                )

                // Cập nhật selectedUserPokemonId
                await this.prismaService.matchRoundParticipant.update({
                  where: { id: matchRoundParticipantId },
                  data: {
                    selectedUserPokemonId: selectedUserPokemon.id,
                    status: MatchRoundParticipantStatus.PENDING
                  }
                })

                this.logger.log(
                  `Successfully auto-selected Pokemon for match-round-participant ${matchRoundParticipantId}`
                )

                // Fetch full match data for socket notification
                const matchData = await this.prismaService.match.findUnique({
                  where: { id: match.id },
                  include: {
                    participants: {
                      include: {
                        user: true
                      }
                    }
                  }
                })

                const roundsData = await this.prismaService.matchRound.findMany({
                  where: { matchId: match.id },
                  include: {
                    participants: {
                      include: {
                        selectedUserPokemon: {
                          include: {
                            pokemon: true
                          }
                        }
                      }
                    }
                  },
                  orderBy: { roundNumber: 'asc' }
                })

                if (matchData) {
                  // Format data theo GetMatchRoundDetailForUserResSchema
                  const formattedMatch = {
                    id: matchData.id,
                    status: matchData.status,
                    participants: matchData.participants.map((p) => ({
                      id: p.id,
                      userId: p.userId,
                      user: {
                        id: p.user.id,
                        email: p.user.email
                      }
                    }))
                  }

                  const formattedRounds = roundsData.map((round) => ({
                    id: round.id,
                    roundNumber: round.roundNumber,
                    status: round.status,
                    endTimeRound: round.endTimeRound,
                    participants: round.participants.map((p) => ({
                      id: p.id,
                      matchParticipantId: p.matchParticipantId,
                      orderSelected: p.orderSelected,
                      endTimeSelected: p.endTimeSelected,
                      selectedUserPokemonId: p.selectedUserPokemonId,
                      selectedUserPokemon: p.selectedUserPokemon
                        ? {
                            id: p.selectedUserPokemon.id,
                            userId: p.selectedUserPokemon.userId,
                            pokemonId: p.selectedUserPokemon.pokemonId,
                            pokemon: p.selectedUserPokemon.pokemon
                              ? {
                                  id: p.selectedUserPokemon.pokemon.id,
                                  pokedex_number:
                                    p.selectedUserPokemon.pokemon.pokedex_number,
                                  nameJp: p.selectedUserPokemon.pokemon.nameJp,
                                  imageUrl: p.selectedUserPokemon.pokemon.imageUrl,
                                  rarity: p.selectedUserPokemon.pokemon.rarity
                                }
                              : null
                          }
                        : null
                    }))
                  }))

                  // Gửi socket notification
                  try {
                    this.matchingGateway.notifyPokemonSelected(
                      match.id,
                      currentParticipant.matchRoundId,
                      {
                        match: formattedMatch as any,
                        rounds: formattedRounds as any
                      },
                      matchData.participants[0] as any,
                      matchData.participants[1] as any
                    )
                    this.logger.log(
                      `Socket notification sent for auto-selected Pokemon in match ${match.id}`
                    )
                  } catch (socketError) {
                    this.logger.error('Error sending socket notification', socketError)
                  }
                }

                // Kiểm tra xem có phải participant cuối cùng không
                const allParticipants = currentParticipant.matchRound.participants
                const allSelected = allParticipants.every(
                  (p) =>
                    p.id === matchRoundParticipantId || p.selectedUserPokemonId !== null
                )

                if (allSelected) {
                  this.logger.log(
                    `All participants in round ${currentParticipant.matchRoundId} have selected Pokemon`
                  )

                  // Update MatchRound status to PENDING
                  await this.prismaService.matchRound.update({
                    where: { id: currentParticipant.matchRoundId },
                    data: { status: RoundStatus.PENDING }
                  })

                  // Update all MatchRoundParticipant status to PENDING
                  await this.prismaService.matchRoundParticipant.updateMany({
                    where: { matchRoundId: currentParticipant.matchRoundId },
                    data: { status: RoundStatus.PENDING }
                  })

                  this.logger.log(
                    `Updated round ${currentParticipant.matchRoundId} and all participants to PENDING status`
                  )
                }
              } else {
                this.logger.warn(
                  `No available Pokemon to auto-select for user ${matchParticipant.userId}`
                )
              }
            }
          } catch (error) {
            this.logger.error(
              `Error auto-selecting Pokemon for user ${matchParticipant.userId}`,
              error
            )
          }
        }

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
