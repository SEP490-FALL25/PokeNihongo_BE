import { Injectable } from '@nestjs/common'

import { PrismaService } from 'src/shared/services/prisma.service'
import { CreateMatchQueueBodyType, MatchQueueType } from './entities/match-queue.entity'

@Injectable()
export class MatchQueueRepo {
  constructor(private prismaService: PrismaService) {}

  create({
    data
  }: {
    createdById: number | null
    data: CreateMatchQueueBodyType
  }): Promise<MatchQueueType> {
    return this.prismaService.matchQueue.create({
      data: {
        ...data
      }
    }) as unknown as Promise<MatchQueueType>
  }

  delete({ deletedById }: { deletedById: number }): Promise<MatchQueueType> {
    return this.prismaService.matchQueue.delete({
      where: {
        userId: deletedById
      }
    }) as unknown as Promise<MatchQueueType>
  }
}
