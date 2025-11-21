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

  static registerQueue(
    queueName: string,
    options: any = {},
    useMatchRedis: boolean = false
  ): DynamicModule {
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
            // Nếu useMatchRedis = true, ưu tiên dùng REDIS_MATCH_URI, fallback về REDIS_URI
            let redisUri: string | undefined
            if (useMatchRedis) {
              redisUri =
                configService.get<string>('REDIS_MATCH_URI') ||
                configService.get<string>('REDIS_URI')
            } else {
              redisUri = configService.get<string>('REDIS_URI')
            }

            if (!redisUri) {
              throw new Error(
                useMatchRedis
                  ? 'REDIS_MATCH_URI or REDIS_URI is not defined in environment variables'
                  : 'REDIS_URI is not defined in environment variables'
              )
            }

            return {
              redis: {
                host: new URL(redisUri).hostname,
                port: parseInt(new URL(redisUri).port),
                password: new URL(redisUri).password
              },
              settings: {
                stalledInterval: 30000,
                maxStalledCount: 3,
                lockDuration: 30000,
                // CRITICAL: Poll delayed jobs every 5ms (Bull v4 requires this for delayed jobs)
                drainDelay: 5
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
