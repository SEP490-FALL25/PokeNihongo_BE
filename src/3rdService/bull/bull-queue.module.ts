import { BullModule } from '@nestjs/bull'
import { DynamicModule, Module } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { RedisModule } from '../redis/redis.module'
import { BullQueueService } from './bull-queue.service'

@Module({})
export class BullQueueModule {
  static forRoot(): DynamicModule {
    return {
      module: BullQueueModule,
      imports: [RedisModule],
      providers: [BullQueueService],
      exports: [BullQueueService],
      global: true
    }
  }

  static registerQueue(queueName: string, options: any = {}): DynamicModule {
    return {
      module: BullQueueModule,
      global: true,
      imports: [
        RedisModule,
        BullModule.registerQueueAsync({
          name: queueName,
          imports: [RedisModule],
          inject: [ConfigService],
          useFactory: async (configService: ConfigService) => {
            const redisUri = configService.get<string>('REDIS_URI')

            if (!redisUri) {
              throw new Error('REDIS_URI is not defined in environment variables')
            }

            return {
              redis: {
                host: new URL(redisUri).hostname,
                port: parseInt(new URL(redisUri).port),
                password: new URL(redisUri).password
              },
              settings: {
                stalledInterval: 60000, // Check stalled jobs every 60s (increased from 30s)
                maxStalledCount: 5, // Allow up to 5 stall attempts (increased from 1)
                lockDuration: 60000, // Increase lock duration to 60s
                // CRITICAL: Poll delayed jobs every 5ms for VERY fast response (prevent race condition)
                drainDelay: 100
              },
              ...options
            }
          }
        })
      ],
      exports: [BullModule]
    }
  }
}
