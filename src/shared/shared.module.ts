import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { BullQueue } from '@/common/constants/bull-action.constant'
import { AccessTokenGuard } from '@/common/guards/access-token.guard'
import { APIKeyGuard } from '@/common/guards/api-key.guard'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { InvoiceRepo } from '@/modules/invoice/invoice.repo'
import { PokemonRepo } from '@/modules/pokemon/pokemon.repo'
import { QuestionBankRepository } from '@/modules/question-bank/question-bank.repo'
import { UserSubscriptionRepo } from '@/modules/user-subscription/user-subscription.repo'
import { SharedRoleRepository } from '@/shared/repositories/shared-role.repo'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { TokenService } from '@/shared/services/token.service'
import { Global, Module, forwardRef } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { WebsocketsModule } from 'src/websockets/websockets.module'
import { PayOSService } from './services/payos.service'
import { InvoiceExpirationProcessor } from './workers/invoice-expiration.processor'
import { MatchParticipantTimeoutProcessor } from './workers/match-participant-timeout.processor'
import { MatchRoundParticipantTimeoutProcessor } from './workers/match-round-participant-timeout.processor'
import { RoundQuestionTimeoutProcessor } from './workers/round-question-timeout.processor'
import { SharedUserDeletionProcessor } from './workers/user-deletion.processor'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  // EmailService,
  SharedUserRepository,
  SharedRoleRepository,
  QuestionBankRepository,
  PokemonRepo,
  PayOSService,
  InvoiceRepo,
  UserSubscriptionRepo
]
@Global()
@Module({
  imports: [
    JwtModule,
    BullQueueModule.forRoot(),
    BullQueueModule.registerQueue(BullQueue.USER_DELETION),
    BullQueueModule.registerQueue(BullQueue.MATCH_PARTICIPANT_TIMEOUT),
    BullQueueModule.registerQueue(BullQueue.MATCH_ROUND_PARTICIPANT_TIMEOUT),
    BullQueueModule.registerQueue(BullQueue.ROUND_QUESTION_TIMEOUT),
    BullQueueModule.registerQueue(BullQueue.INVOICE_EXPIRATION),
    forwardRef(() => WebsocketsModule)

    // Không import GeminiModule ở đây để tránh circular dependency
    // GeminiModule sẽ được import trong AppModule và export GeminiService
  ],
  controllers: [],
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    APIKeyGuard,
    SharedUserDeletionProcessor,
    MatchParticipantTimeoutProcessor,
    MatchRoundParticipantTimeoutProcessor,
    RoundQuestionTimeoutProcessor,
    InvoiceExpirationProcessor,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard
    }
  ],
  exports: [
    ...sharedServices,
    AccessTokenGuard,
    APIKeyGuard
    // GeminiService sẽ được export từ GeminiModule, không cần export ở đây
  ]
})
export class SharedModule {}
