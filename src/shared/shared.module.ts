import { BullQueueModule } from '@/3rdService/bull/bull-queue.module'
import { AccessTokenGuard } from '@/common/guards/access-token.guard'
import { APIKeyGuard } from '@/common/guards/api-key.guard'
import { AuthenticationGuard } from '@/common/guards/authentication.guard'
import { SharedRoleRepository } from '@/shared/repositories/shared-role.repo'
import { SharedUserRepository } from '@/shared/repositories/shared-user.repo'
import { HashingService } from '@/shared/services/hashing.service'
import { PrismaService } from '@/shared/services/prisma.service'
import { TokenService } from '@/shared/services/token.service'
import { Global, Module } from '@nestjs/common'
import { APP_GUARD } from '@nestjs/core'
import { JwtModule } from '@nestjs/jwt'
import { SharedUserDeletionProcessor } from './workers/user-deletion.processor'

const sharedServices = [
  PrismaService,
  HashingService,
  TokenService,
  // EmailService,
  SharedUserRepository,
  SharedRoleRepository
]
@Global()
@Module({
  imports: [
    JwtModule,
    BullQueueModule.forRoot(),
    BullQueueModule.registerQueue('user-deletion')
  ],
  controllers: [],
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    APIKeyGuard,
    SharedUserDeletionProcessor,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard
    }
  ],
  exports: sharedServices
})
export class SharedModule {}
