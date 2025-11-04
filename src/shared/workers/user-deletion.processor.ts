import { BullAction, BullQueue } from '@/common/constants/bull-action.constant'
import { PrismaService } from '@/shared/services/prisma.service'
import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'

@Processor(BullQueue.USER_DELETION)
export class SharedUserDeletionProcessor {
  constructor(private readonly prisma: PrismaService) {}

  @Process(BullAction.DELETE_INACTIVE_USER)
  async handleDeletion(job: Job<{ userId: number }>): Promise<void> {
    const { userId } = job.data
    await this.prisma.user.deleteMany({
      where: { id: userId, status: 'INACTIVE', deletedAt: null }
    })
  }
}
