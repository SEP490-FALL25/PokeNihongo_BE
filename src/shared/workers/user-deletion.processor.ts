import { PrismaService } from '@/shared/services/prisma.service'
import { Process, Processor } from '@nestjs/bull'
import { Job } from 'bull'

@Processor('user-deletion')
export class SharedUserDeletionProcessor {
  constructor(private readonly prisma: PrismaService) {}

  @Process('delete-inactive-user')
  async handleDeletion(job: Job<{ userId: number }>): Promise<void> {
    const { userId } = job.data
    await this.prisma.user.deleteMany({
      where: { id: userId, status: 'INACTIVE', deletedAt: null }
    })
  }
}
