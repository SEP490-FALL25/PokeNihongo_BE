import { Module } from '@nestjs/common'
import { UserPokemonModule } from '../user-pokemon/user-pokemon.module'
import { MatchQueueController } from './match-queue.controller'
import { MatchQueueRepo } from './match-queue.repo'
import { MatchQueueService } from './match-queue.service'

@Module({
  imports: [UserPokemonModule],
  controllers: [MatchQueueController],
  providers: [MatchQueueService, MatchQueueRepo]
})
export class MatchQueueModule {}
